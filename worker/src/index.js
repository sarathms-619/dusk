import { verifyGoogleIdToken, makeSession, readSession } from "./auth.js";
import { eveningLine, weeklyReading, closingReflection } from "./reader.js";
import CARDS from "./cards.json";

const cardsById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const SPLITS = { 3: [1, 1, 1], 7: [2, 3, 2], 21: [4, 13, 4], 40: [7, 26, 7] };
const ANON_DAILY_LIMIT = 6;
const WEATHER = ["stormy", "heavy", "foggy", "still", "clear", "bright"];
const score = (v) => { const n = parseInt(v, 10); return n >= 1 && n <= 10 ? n : null; };
const compassOf = (c) => (c && score(c.steadiness) && score(c.clarity) && score(c.hope)) ? { steadiness: score(c.steadiness), clarity: score(c.clarity), hope: score(c.hope) } : null;

// Which movement a given evening belongs to.
export function movementFor(length, n) {
  const [l, t] = SPLITS[length];
  if (n <= l) return "letting-go";
  if (n <= l + t) return "threshold";
  return "return";
}

// Three cards from the movement's deck, avoiding the last few picks. The final evening is always The Fool.
export function offerFor(length, n, recentPicks) {
  if (n === length) return ["fool"];
  const movement = movementFor(length, n);
  let pool = CARDS.filter((c) => c.movement === movement && c.fixed !== "final" && !recentPicks.includes(c.id));
  if (pool.length < 3) pool = CARDS.filter((c) => c.movement === movement && c.fixed !== "final");
  const picked = [];
  while (picked.length < 3) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!picked.includes(c.id)) picked.push(c.id);
  }
  return picked;
}

function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const id = () => crypto.randomUUID();

async function loadCrossing(env, uid, crossingId) {
  const c = await env.DB.prepare("SELECT * FROM crossings WHERE id = ?1 AND user_id = ?2").bind(crossingId, uid).first();
  if (!c) throw new HttpError(404, "That crossing wasn't found.");
  return c;
}
async function crossingBundle(env, c) {
  const evenings = (await env.DB.prepare("SELECT * FROM evenings WHERE crossing_id = ?1 ORDER BY n").bind(c.id).all()).results;
  const readings = (await env.DB.prepare("SELECT * FROM readings WHERE crossing_id = ?1 ORDER BY week").bind(c.id).all()).results;
  const checkins = (await env.DB.prepare("SELECT kind, week, steadiness, clarity, hope, created_at FROM checkins WHERE crossing_id = ?1 ORDER BY created_at").bind(c.id).all()).results;
  return {
    crossing: c,
    evenings: evenings.map((e) => ({ ...e, offered: e.offered ? JSON.parse(e.offered) : [] })),
    readings: readings.map((r) => ({ ...r, text: r.text ? JSON.parse(r.text) : null })),
    checkins,
  };
}

async function handle(request, env, ctx) {
  const { pathname } = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};

  if (pathname === "/health") {
    const r = await env.DB.prepare("SELECT count(*) AS tables FROM sqlite_master WHERE type='table'").first();
    return { ok: true, service: "dusk-worker", tables: r.tables, cards: CARDS.length, reader_key_set: Boolean(env.ANTHROPIC_API_KEY), sign_in_ready: Boolean(env.GOOGLE_CLIENT_ID && env.SESSION_SECRET) };
  }

  if (pathname === "/auth/google" && request.method === "POST") {
    const g = await verifyGoogleIdToken(body.credential, env.GOOGLE_CLIENT_ID).catch((e) => { throw new HttpError(401, "Google sign-in didn't verify: " + e.message); });
    await env.DB.prepare("INSERT INTO users (id, email, name) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET email = ?2, name = ?3")
      .bind(g.sub, g.email || null, g.name || null).run();
    return { session: await makeSession(g.sub, env.SESSION_SECRET), user: { name: g.name, email: g.email, picture: g.picture } };
  }

  // Local development only: sign in as a test user without Google.
  if (pathname === "/auth/dev" && request.method === "POST" && env.DEV_AUTH === "1") {
    await env.DB.prepare("INSERT OR IGNORE INTO users (id, email, name) VALUES ('dev-user', 'dev@example.com', 'Test traveller')").run();
    return { session: await makeSession("dev-user", env.SESSION_SECRET), user: { name: "Test traveller", email: "dev@example.com" } };
  }

  // A single dusk before signing in: three cards, the Reader's line, limited per day.
  if (pathname === "/anon/reflect" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    const day = new Date().toISOString().slice(0, 10);
    const row = await env.DB.prepare("INSERT INTO anon_usage (ip, day, count) VALUES (?1, ?2, 1) ON CONFLICT(ip, day) DO UPDATE SET count = count + 1 RETURNING count")
      .bind(ip, day).first();
    if (row.count > ANON_DAILY_LIMIT) throw new HttpError(429, "That's enough evenings for today. Sign in to begin a longer crossing.");
    const card = cardsById[body.card_id];
    if (!card) throw new HttpError(400, "Unknown card.");
    const n = Math.min(Math.max(parseInt(body.n, 10) || 1, 1), 3);
    const earlier = (Array.isArray(body.earlier) ? body.earlier : []).slice(0, 2).map((e, i) => ({
      n: i + 1, movement: movementFor(3, i + 1), picked: String(e.picked || ""), question: String(e.question || "").slice(0, 300), entry: String(e.entry || "").slice(0, 2000),
    }));
    const crossing = { junction_words: String(body.junction_words || "").slice(0, 500), length: 3 };
    const evening = { n, movement: movementFor(3, n), question: String(body.question || "").slice(0, 300), entry: String(body.entry || "").slice(0, 4000), weather: WEATHER.includes(body.weather) ? body.weather : null };
    return await eveningLine(env, { crossing, evening, card, earlier, cardsById });
  }

  const uid = await readSession(request, env.SESSION_SECRET);
  if (!uid) throw new HttpError(401, "Please sign in again.");

  if (pathname === "/me") {
    return { user: await env.DB.prepare("SELECT name, email FROM users WHERE id = ?1").bind(uid).first() };
  }

  if (pathname === "/crossing" && request.method === "GET") {
    const c = await env.DB.prepare("SELECT * FROM crossings WHERE user_id = ?1 AND status IN ('active','returned') ORDER BY created_at DESC LIMIT 1").bind(uid).first();
    return c ? await crossingBundle(env, c) : { crossing: null };
  }

  if (pathname === "/crossings" && request.method === "GET") {
    const rows = (await env.DB.prepare("SELECT id, junction_type, length, start_date, return_date, status FROM crossings WHERE user_id = ?1 AND status != 'abandoned' ORDER BY created_at DESC").bind(uid).all()).results;
    return { crossings: rows };
  }

  if (pathname === "/crossing" && request.method === "POST") {
    const length = parseInt(body.length, 10);
    if (!SPLITS[length]) throw new HttpError(400, "Choose 3, 7, 21 or 40 cards.");
    await env.DB.prepare("UPDATE crossings SET status = 'abandoned' WHERE user_id = ?1 AND status = 'active'").bind(uid).run();
    const c = {
      id: id(), user_id: uid,
      junction_type: String(body.junction_type || "").slice(0, 60),
      junction_words: String(body.junction_words || "").slice(0, 1000),
      length, start_date: String(body.start_date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      intention: String(body.intention || "").slice(0, 600),
    };
    await env.DB.prepare("INSERT INTO crossings (id, user_id, junction_type, junction_words, length, start_date, intention) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
      .bind(c.id, c.user_id, c.junction_type, c.junction_words, c.length, c.start_date, c.intention).run();
    const start = compassOf(body.compass);
    if (start) await env.DB.prepare("INSERT INTO checkins (id, crossing_id, kind, week, steadiness, clarity, hope) VALUES (?1, ?2, 'start', 0, ?3, ?4, ?5)").bind(id(), c.id, start.steadiness, start.clarity, start.hope).run();
    return await crossingBundle(env, await loadCrossing(env, uid, c.id));
  }

  if (pathname === "/evening/offer" && request.method === "POST") {
    const c = await loadCrossing(env, uid, body.crossing_id);
    if (c.status !== "active") throw new HttpError(400, "This crossing is complete.");
    const done = (await env.DB.prepare("SELECT n, picked, entry FROM evenings WHERE crossing_id = ?1 ORDER BY n").bind(c.id).all()).results;
    const open = done.find((e) => e.entry === null);
    if (open) {
      const e = await env.DB.prepare("SELECT * FROM evenings WHERE crossing_id = ?1 AND n = ?2").bind(c.id, open.n).first();
      return { evening: { ...e, offered: JSON.parse(e.offered) } };
    }
    const n = done.length + 1;
    if (n > c.length) throw new HttpError(400, "Every evening of this crossing is done.");
    const recent = done.slice(-4).map((e) => e.picked).filter(Boolean);
    const offered = offerFor(c.length, n, recent);
    const movement = movementFor(c.length, n);
    await env.DB.prepare("INSERT INTO evenings (id, crossing_id, n, movement, offered) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(id(), c.id, n, movement, JSON.stringify(offered)).run();
    return { evening: { crossing_id: c.id, n, movement, offered, picked: null } };
  }

  if (pathname === "/evening/pick" && request.method === "POST") {
    const c = await loadCrossing(env, uid, body.crossing_id);
    const e = await env.DB.prepare("SELECT * FROM evenings WHERE crossing_id = ?1 AND n = ?2").bind(c.id, body.n).first();
    if (!e) throw new HttpError(400, "Open the evening first.");
    if (e.picked) return { card: cardsById[e.picked], question: e.question };
    if (!JSON.parse(e.offered).includes(body.card_id)) throw new HttpError(400, "Pick one of tonight's three cards.");
    const prior = await env.DB.prepare("SELECT count(*) AS k FROM evenings WHERE crossing_id = ?1 AND picked = ?2").bind(c.id, body.card_id).first();
    const card = cardsById[body.card_id];
    const question = card.questions[prior.k % card.questions.length];
    await env.DB.prepare("UPDATE evenings SET picked = ?1, question = ?2 WHERE id = ?3").bind(card.id, question, e.id).run();
    return { card, question };
  }

  if (pathname === "/evening/entry" && request.method === "POST") {
    const c = await loadCrossing(env, uid, body.crossing_id);
    const e = await env.DB.prepare("SELECT * FROM evenings WHERE crossing_id = ?1 AND n = ?2").bind(c.id, body.n).first();
    if (!e || !e.picked) throw new HttpError(400, "Pick tonight's card first.");
    const entry = String(body.entry || "").slice(0, 6000);
    const weather = WEATHER.includes(body.weather) ? body.weather : null;
    const earlier = (await env.DB.prepare("SELECT n, movement, picked, question, entry, weather FROM evenings WHERE crossing_id = ?1 AND n < ?2 ORDER BY n").bind(c.id, e.n).all()).results;
    const reader = await eveningLine(env, { crossing: c, evening: { ...e, entry, weather }, card: cardsById[e.picked], earlier, cardsById });
    await env.DB.prepare("UPDATE evenings SET entry = ?1, reader_line = ?2, weather = ?3 WHERE id = ?4").bind(entry, reader.line, weather, e.id).run();

    const all = [...earlier, { n: e.n, movement: e.movement, picked: e.picked, question: e.question, entry, weather }];
    let reading = null;
    if (e.n === c.length) {
      const closing = await closingReflection(env, { crossing: c, evenings: all, cardsById });
      await env.DB.prepare("INSERT INTO readings (id, crossing_id, week, text) VALUES (?1, ?2, 99, ?3)").bind(id(), c.id, JSON.stringify(closing)).run();
      await env.DB.prepare("UPDATE crossings SET status = 'returned', return_date = ?1 WHERE id = ?2").bind(new Date().toISOString().slice(0, 10), c.id).run();
      reading = { week: 99, text: closing };
    } else if (c.length >= 21 && e.n % 7 === 0) {
      const week = e.n / 7;
      const w = await weeklyReading(env, { crossing: c, evenings: all, cardsById, week });
      await env.DB.prepare("INSERT INTO readings (id, crossing_id, week, text, question) VALUES (?1, ?2, ?3, ?4, ?5)").bind(id(), c.id, week, JSON.stringify(w), w.question).run();
      reading = { week, text: w };
    }
    return { reader_line: reader.line, needs_support: reader.needs_support, reading };
  }

  if (pathname === "/checkin" && request.method === "POST") {
    const c = await loadCrossing(env, uid, body.crossing_id);
    const kind = ["week", "return"].includes(body.kind) ? body.kind : null;
    const v = compassOf(body);
    if (!kind || !v) throw new HttpError(400, "Set all three readings between 1 and 10.");
    const week = kind === "week" ? parseInt(body.week, 10) || null : 99;
    await env.DB.prepare("DELETE FROM checkins WHERE crossing_id = ?1 AND kind = ?2 AND week IS ?3").bind(c.id, kind, week).run();
    await env.DB.prepare("INSERT INTO checkins (id, crossing_id, kind, week, steadiness, clarity, hope) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").bind(id(), c.id, kind, week, v.steadiness, v.clarity, v.hope).run();
    return await crossingBundle(env, c);
  }

  if (pathname === "/crossing/outcome" && request.method === "POST") {
    const c = await loadCrossing(env, uid, body.crossing_id);
    const answer = ["yes", "partly", "not-yet"].includes(body.answer) ? body.answer : null;
    if (!answer) throw new HttpError(400, "Choose yes, partly or not yet.");
    await env.DB.prepare("UPDATE crossings SET outcome_answer = ?1, outcome_note = ?2 WHERE id = ?3").bind(answer, String(body.note || "").slice(0, 1000), c.id).run();
    return await crossingBundle(env, await loadCrossing(env, uid, c.id));
  }

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request, env, ctx) {
    const h = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    try {
      return json(await handle(request, env, ctx), 200, h);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return json({ error: status === 500 ? "Something went wrong on our side. Please try again." : e.message }, status, h);
    }
  },
};
