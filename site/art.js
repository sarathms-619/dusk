// Dusk card art: fine gold linework, arched frame, symbols rather than figures.
(function () {
  const G = "#B8925A", INK = "#2B2547";
  const BG = { "letting-go": ["#FFF6EF", "#F5C6B4"], threshold: ["#F8F4FD", "#D9CBEA"], return: ["#FFF5E6", "#F8D7AE"] };
  const f = (n) => Math.round(n * 10) / 10;
  const L = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${c ? ` stroke="${c}"` : ""}/>`;
  const C = (cx, cy, r, c, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}"${c ? ` stroke="${c}"` : ""} ${extra}/>`;
  const P = (d, c, extra = "") => `<path d="${d}"${c ? ` stroke="${c}"` : ""} ${extra}/>`;
  const rays = (cx, cy, r1, r2, n, c = G, off = 0) => {
    let s = "";
    for (let i = 0; i < n; i++) { const a = (Math.PI * 2 * i) / n + off; s += L(f(cx + r1 * Math.cos(a)), f(cy + r1 * Math.sin(a)), f(cx + r2 * Math.cos(a)), f(cy + r2 * Math.sin(a)), c); }
    return s;
  };
  const star = (cx, cy, R, r, pts, c) => {
    const p = [];
    for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + (Math.PI * i) / pts; const rr = i % 2 ? r : R; p.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`); }
    return `<polygon points="${p.join(" ")}"${c ? ` stroke="${c}"` : ""}/>`;
  };
  const spark = (x, y, s) => P(`M${x} ${y - s} L${x} ${y + s} M${x - s} ${y} L${x + s} ${y}`, G);
  const waves = (y, c = G, x0 = 26, n = 6) => P(`M${x0} ${y} q5.7 -3.5 11.3 0` + " t11.3 0".repeat(n - 1), c);
  const ground = (y = 148) => L(26, y, 94, y, G);
  const crescent = (cx, cy, r, c = G) => P(`M${cx} ${cy - r} a${r} ${r} 0 1 0 ${f(r * 0.9)} ${f(r * 1.55)} a${f(r * 0.78)} ${f(r * 0.78)} 0 1 1 ${f(-r * 0.9)} ${f(-r * 1.55)} Z`, c);

  // Suit symbols, centred on (x, y), size s.
  const SUIT = {
    cups: (x, y, s) => P(`M${f(x - s)} ${f(y - s)} L${f(x + s)} ${f(y - s)} Q${f(x + s)} ${f(y + s * 0.4)} ${x} ${f(y + s * 0.6)} Q${f(x - s)} ${f(y + s * 0.4)} ${f(x - s)} ${f(y - s)} Z M${x} ${f(y + s * 0.6)} L${x} ${f(y + s * 1.3)} M${f(x - s * 0.6)} ${f(y + s * 1.3)} L${f(x + s * 0.6)} ${f(y + s * 1.3)}`),
    swords: (x, y, s) => P(`M${x} ${f(y - s * 1.6)} L${x} ${f(y + s * 0.9)} M${f(x - s * 0.8)} ${f(y + s * 0.6)} L${f(x + s * 0.8)} ${f(y + s * 0.6)} M${x} ${f(y + s * 0.9)} L${x} ${f(y + s * 1.5)}`) + C(x, f(y + s * 1.7), f(s * 0.22)),
    wands: (x, y, s) => P(`M${x} ${f(y - s * 1.6)} L${x} ${f(y + s * 1.6)} M${x} ${f(y - s * 0.7)} q${f(s * 0.7)} ${f(-s * 0.2)} ${f(s * 0.8)} ${f(-s * 0.8)} M${x} ${f(y + s * 0.1)} q${f(-s * 0.7)} ${f(-s * 0.2)} ${f(-s * 0.8)} ${f(-s * 0.8)}`),
    pentacles: (x, y, s) => C(x, y, s) + star(x, y, f(s * 0.78), f(s * 0.3), 5),
  };
  // Pip positions inside the arch for ranks 1-10.
  const PIPS = {
    1: [[60, 104]], 2: [[60, 80], [60, 128]], 3: [[60, 74], [60, 104], [60, 134]],
    4: [[44, 82], [76, 82], [44, 126], [76, 126]], 5: [[44, 78], [76, 78], [60, 104], [44, 130], [76, 130]],
    6: [[44, 76], [76, 76], [44, 104], [76, 104], [44, 132], [76, 132]],
    7: [[44, 76], [76, 76], [60, 90], [44, 108], [76, 108], [44, 134], [76, 134]],
    8: [[44, 72], [76, 72], [44, 94], [76, 94], [44, 116], [76, 116], [44, 138], [76, 138]],
    9: [[44, 72], [76, 72], [44, 94], [76, 94], [60, 105], [44, 116], [76, 116], [44, 138], [76, 138]],
    10: [[44, 70], [76, 70], [60, 81], [44, 94], [76, 94], [44, 116], [76, 116], [60, 128], [44, 140], [76, 140]],
  };
  const RANK_N = { ace: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 };
  const COURT = {
    page: (x, y) => spark(x, y, 6) + C(x, y, 2.2, G),
    knight: (x, y) => P(`M${x - 12} ${y + 4} L${x - 4} ${y - 6} L${x + 4} ${y + 4} L${x + 12} ${y - 6}`, G),
    queen: (x, y) => P(`M${x - 13} ${y + 5} L${x - 13} ${y - 3} L${x - 6.5} ${y + 2} L${x} ${y - 7} L${x + 6.5} ${y + 2} L${x + 13} ${y - 3} L${x + 13} ${y + 5} Z`, G) + C(x, y - 9, 1.8, G),
    king: (x, y) => P(`M${x - 14} ${y + 6} L${x - 14} ${y - 6} L${x - 7} ${y} L${x} ${y - 10} L${x + 7} ${y} L${x + 14} ${y - 6} L${x + 14} ${y + 6} Z M${x - 14} ${y + 2} L${x + 14} ${y + 2}`, G),
  };

  // Major Arcana emblems.
  const MAJOR = {
    fool: () => C(80, 64, 7, G) + rays(80, 64, 9.5, 13, 12) + P("M24 118 L54 118 L60 128 L60 148", INK) + P("M56 112 q6 -14 18 -20", G, 'stroke-dasharray="1 2.2"') + C(40, 106, 3) + rays(40, 106, 3, 6, 6, INK) + P("M64 96 l10 -6 l4 6 l-10 6 Z") + ground(),
    magician: () => P("M50 62 c0 -6 10 -6 10 0 c0 6 10 6 10 0 c0 -6 -10 -6 -10 0 c0 6 -10 6 -10 0 Z", G) + L(60, 72, 60, 112) + C(60, 72, 2.2, G) + L(28, 120, 92, 120) + L(32, 120, 32, 140) + L(88, 120, 88, 140) + SUIT.cups(40, 110, 3.5) + SUIT.swords(53, 111, 3) + SUIT.wands(67, 111, 3) + SUIT.pentacles(80, 112, 3.5),
    "high-priestess": () => P("M30 70 h12 v78 h-12 Z M78 70 h12 v78 h-12 Z") + P("M42 76 Q60 96 78 76", G) + C(60, 70, 6, G) + crescent(60, 132, 8) + P("M54 104 h12 v14 h-12 Z", INK),
    empress: () => C(60, 80, 11) + L(60, 91, 60, 112) + L(51, 102, 69, 102) + [36, 84].map((x) => L(x, 148, x, 100, G) + [0, 1, 2, 3].map((i) => P(`M${x} ${106 + i * 9} q-5 -3 -6 -8 M${x} ${106 + i * 9} q5 -3 6 -8`, G)).join("")).join("") + [0, 1, 2, 3, 4, 5].map((i) => spark(36 + i * 9.6, 62, 2.2)).join(""),
    emperor: () => P("M34 148 V96 H86 V148") + P("M34 96 q-8 -8 0 -16 q8 6 0 16 M86 96 q8 -8 0 -16 q-8 6 0 16", G) + C(60, 78, 8, G) + L(60, 70, 60, 64, G) + L(56, 66, 64, 66, G) + P("M26 148 L42 124 L52 136 L60 122 L70 136 L80 124 L94 148", INK, 'stroke-width=".5"'),
    hierophant: () => P("M46 88 Q60 64 74 88 Z M48 80 h24 M50 72 h20", G) + L(60, 62, 60, 66, G) + P("M40 140 L80 104 M80 140 L40 104") + C(38, 142, 3.5) + C(82, 142, 3.5) + L(76, 104, 84, 104) + L(36, 104, 44, 104),
    lovers: () => C(60, 66, 6, G) + rays(60, 66, 8, 11, 12) + P("M34 92 Q60 72 86 92 M38 96 Q60 80 82 96", G) + C(44, 116, 6) + L(44, 122, 44, 148) + C(76, 116, 6) + L(76, 122, 76, 148) + P("M56 148 q4 -22 8 0", G),
    chariot: () => [0, 1, 2, 3, 4].map((i) => spark(36 + i * 12, 66, 2.6)).join("") + L(30, 74, 90, 74, G) + P("M40 84 h40 v30 h-40 Z") + C(60, 99, 6, G) + C(42, 132, 7) + C(78, 132, 7, G) + L(42, 139, 78, 139),
    strength: () => P("M50 66 c0 -6 10 -6 10 0 c0 6 10 6 10 0 c0 -6 -10 -6 -10 0 c0 6 -10 6 -10 0 Z", G) + C(60, 112, 12) + C(60, 112, 15, G, 'stroke-dasharray="1.2 2"') + rays(60, 112, 17, 24, 16, G) + star(60, 112, 5, 2, 5) + P("M34 148 q26 -14 52 0", G),
    hermit: () => P("M26 148 L60 92 L94 148", INK, 'stroke-width=".6"') + L(46, 84, 40, 148) + P("M66 70 l8 0 l3 6 l-3 14 l-8 0 l-3 -14 Z") + L(70, 64, 70, 70) + star(70, 82, 4.5, 1.8, 6, G),
    wheel: () => C(60, 104, 32) + C(60, 104, 22, G) + C(60, 104, 6) + rays(60, 104, 6, 32, 8, INK) + [[28, 64], [92, 64], [28, 144], [92, 144]].map(([x, y]) => spark(x, y, 3)).join(""),
    justice: () => L(60, 64, 60, 148) + L(54, 72, 66, 72) + P("M34 92 L86 92 M38 92 L32 112 L44 112 Z M82 92 L76 112 L88 112 Z", G) + P("M32 112 q6 6 12 0 M76 112 q6 6 12 0", G) + L(52, 148, 68, 148),
    "hanged-man": () => L(30, 66, 90, 66) + L(36, 66, 36, 148) + L(84, 66, 84, 148) + P("M33 70 l3 -4 3 4 M81 70 l3 -4 3 4", G) + L(60, 66, 60, 112) + P("M60 90 L71 97 L60 104", "", 'fill="none"') + P("M51 114 L60 124 L69 114", "", 'fill="none"') + L(60, 112, 60, 126) + C(60, 134, 6.5) + C(60, 134, 10, G, 'stroke-dasharray="1.5 2"') + rays(60, 134, 13, 18, 12) + ground(),
    death: () => P("M30 148 V92 h10 v56 M80 148 V92 h10 v56") + C(60, 112, 10, G) + rays(60, 112, 12, 17, 9, G, Math.PI) + L(26, 122, 94, 122, G) + waves(136, INK) + C(60, 76, 5) + rays(60, 76, 5, 9, 5, INK),
    temperance: () => P("M38 84 l-6 18 h12 Z M82 108 l-6 18 h12 Z") + P("M41 84 Q70 80 79 108", G, 'stroke-dasharray="1.2 2"') + star(60, 70, 7, 3, 3, G) + waves(140, G, 26, 3) + P("M60 148 q14 -10 30 -6", INK),
    devil: () => star(60, 76, 13, 5, 5, G) + P("M60 76 m0 0", G) + P("M40 120 q-6 10 0 18 q6 8 0 0 M80 120 q6 10 0 18", INK, 'stroke-dasharray="3 2"') + L(30, 104, 90, 104) + L(60, 92, 60, 104) + P("M86 104 l4 -14 l3 6", G) + ground(),
    tower: () => P("M46 148 V84 h28 v64") + P("M42 84 L46 76 L74 76 L78 84", G) + P("M80 56 L68 72 L76 74 L62 92", G) + [[38, 98], [84, 110], [36, 124], [86, 130]].map(([x, y]) => P(`M${x} ${y} l-3 6 l3 -2 l3 2 Z`, G)).join("") + L(56, 104, 64, 104) + L(56, 120, 64, 120) + P("M24 148 L36 140 L84 140 L96 148"),
    star: () => star(60, 82, 26, 10, 8) + C(60, 82, 4, G) + [[32, 70], [88, 70], [30, 98], [90, 98], [40, 118], [80, 118], [60, 122]].map(([x, y]) => spark(x, y, 4)).join("") + waves(136, INK) + waves(143, G) + P("M60 108 L60 131", "", 'stroke-dasharray="1 2.2"'),
    moon: () => C(60, 76, 14, G) + crescent(56, 66, 10, INK) + P("M30 148 V104 h10 v44 M80 148 V104 h10 v44") + P("M60 148 Q50 134 60 124 Q70 114 60 104", G, 'stroke-dasharray="1 2.2"') + rays(60, 76, 16, 20, 16, G),
    sun: () => C(60, 82, 15) + rays(60, 82, 18, 27, 16, G) + rays(60, 82, 18, 23, 16, G, Math.PI / 16) + L(26, 126, 94, 126) + [36, 52, 68, 84].map((x) => C(x, 118, 3.5, G) + rays(x, 118, 3.5, 6, 8, G)).join("") + P("M26 132 h68 M26 138 h68", INK, 'stroke-width=".4"'),
    judgement: () => P("M38 74 L72 92 L76 84 Z") + L(56, 82, 50, 98, G) + P("M50 98 h12 v10 h-12 Z M56 98 v10 M50 103 h12", G) + P("M40 148 v-22 M60 148 v-26 M80 148 v-22", INK) + C(40, 122, 3) + C(60, 118, 3) + C(80, 122, 3) + P("M26 148 L40 134 L52 144 L68 132 L82 142 L94 136", G),
    world: () => `<ellipse cx="60" cy="104" rx="20" ry="32"/>` + [...Array(12)].map((_, i) => { const a = (Math.PI * 2 * i) / 12; const x = f(60 + 20 * Math.cos(a)), y = f(104 + 32 * Math.sin(a)); return P(`M${x} ${y} l${f(4 * Math.cos(a + 0.9))} ${f(4 * Math.sin(a + 0.9))}`, G); }).join("") + star(60, 104, 7, 2.8, 4, G) + [[30, 66], [90, 66], [30, 144], [90, 144]].map(([x, y]) => C(x, y, 4, G)).join(""),
  };

  function emblem(card) {
    if (card.arcana === "major") return (MAJOR[card.id] || MAJOR.star)();
    const draw = SUIT[card.suit];
    if (RANK_N[card.rank]) {
      const n = RANK_N[card.rank];
      const s = n === 1 ? 14 : n <= 3 ? 6.5 : n <= 6 ? 5.6 : 4.8;
      return PIPS[n].map(([x, y]) => draw(x, y, s)).join("");
    }
    return COURT[card.rank](60, 70) + draw(60, 112, 13);
  }

  window.DuskArt = {
    card(card, opts = {}) {
      const [b1, b2] = BG[card.movement] || BG.threshold;
      const gid = "g" + card.id.replace(/[^a-z0-9]/g, "") + (opts.k || "");
      const label = card.name.toUpperCase();
      const fs = label.length > 15 ? 7.2 : label.length > 12 ? 7.8 : 8.6;
      return `<svg class="artcard" viewBox="0 0 120 200" role="img" aria-label="${card.name}">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs>
<rect x="1" y="1" width="118" height="198" rx="9" fill="url(#${gid})" stroke="${G}" stroke-width="1"/>
<rect x="6" y="6" width="108" height="188" rx="6" fill="none" stroke="${G}" stroke-width=".6"/>
<path d="M18 158 V74 A42 42 0 0 1 102 74 V158 Z" fill="none" stroke="${G}" stroke-width=".8"/>
<path d="M22 154 V75 A38 38 0 0 1 98 75 V154 Z" fill="none" stroke="${G}" stroke-width=".4"/>
<text x="60" y="22" text-anchor="middle" font-family="Cinzel, serif" font-size="9" letter-spacing="2" fill="${G}">${card.numeral.toUpperCase()}</text>
<line x1="44" y1="26.5" x2="76" y2="26.5" stroke="${G}" stroke-width=".5"/>
<text x="60" y="176" text-anchor="middle" font-family="Cinzel, serif" font-size="${fs}" letter-spacing="1.1" fill="${INK}">${label}</text>
<g fill="none" stroke="${INK}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${emblem(card)}</g>
</svg>`;
    },
    back() {
      return `<svg class="artcard back" viewBox="0 0 120 200" aria-hidden="true">
<defs><linearGradient id="gback" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9CBEA"/><stop offset="1" stop-color="#E9B8C6"/></linearGradient></defs>
<rect x="1" y="1" width="118" height="198" rx="9" fill="url(#gback)" stroke="${G}"/>
<rect x="6" y="6" width="108" height="188" rx="6" fill="none" stroke="${G}" stroke-width=".6"/>
<g fill="none" stroke="${G}" stroke-width=".7">${C(60, 100, 34)}${C(60, 100, 24)}${star(60, 100, 22, 9, 8)}${C(60, 100, 5)}${rays(60, 100, 36, 46, 24)}${C(60, 30, 6)}${C(60, 170, 6)}${crescent(57, 25, 5)}</g>
</svg>`;
    },
  };
})();
