// Carpool — schemat auta (SVG). window.CarpoolSeatMap.render(React, seats, opts)
(function () {
  const SLOTS = {
    'front-right': { label: 'Przód prawe', x: 2, y: 0 },
    'rear-left': { label: 'Tył lewe', x: 0, y: 1 }, 'rear-middle': { label: 'Tył środek', x: 1, y: 1 }, 'rear-right': { label: 'Tył prawe', x: 2, y: 1 },
    'third-left': { label: '3. rząd lewe', x: 0, y: 2 }, 'third-middle': { label: '3. rząd środek', x: 1, y: 2 }, 'third-right': { label: '3. rząd prawe', x: 2, y: 2 },
  };
  const INTERIORS = {
    sedan: { label: 'Kombi 5-osobowe', desc: '2 + 3 · duży bagażnik', slots: ['front-right', 'rear-left', 'rear-middle', 'rear-right'], trunk: 68, open: false },
    suv: { label: 'SUV 7-osobowy', desc: '2 + 3 + 2 · mniejszy bagażnik', slots: ['front-right', 'rear-left', 'rear-middle', 'rear-right', 'third-left', 'third-right'], trunk: 52, open: false },
    pickup: { label: 'Pickup 4-osobowy', desc: '2 + 2 · otwarta skrzynia', slots: ['front-right', 'rear-left', 'rear-right'], trunk: 118, open: true },
  };
  const BACKDROPS = { none: 'Czysty papier', contours: 'Poziomice', ridge: 'Grań', map: 'Mapa i szlak' };
  // default choices (picked by the user): Kombi interior, map backdrop
  const C = { accent: 'var(--color-accent)', accent100: 'var(--color-accent-100)', accent200: 'var(--color-accent-200)', accent300: 'var(--color-accent-300)', accent700: 'var(--color-accent-700)', ink: 'var(--color-neutral-900)', paper: 'var(--color-bg)',
    n200: 'var(--color-neutral-200)', n300: 'var(--color-neutral-300)', n400: 'var(--color-neutral-400)', n500: 'var(--color-neutral-500)', n600: 'var(--color-neutral-600)', n800: 'var(--color-neutral-800)', text: 'var(--color-text)' };
  const initials = (n) => String(n).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  function backdrop(h, kind, W, H) {
    if (kind === 'contours') {
      const out = [];
      for (let i = 0; i < 10; i++) {
        const y = -24 + i * (H + 48) / 9, a = (i % 2 ? 1 : -1) * (14 + (i % 3) * 6);
        out.push(h('path', { key: i, d: `M-10 ${y} Q ${W * 0.22} ${y + a} ${W * 0.45} ${y} T ${W * 0.9} ${y + a * 0.6} T ${W + 40} ${y - a * 0.4}`, fill: 'none', stroke: C.n400, strokeWidth: 1, opacity: 0.8 }));
      }
      return h('g', { key: 'bd' }, ...out);
    }
    if (kind === 'ridge') {
      const p = (pts) => pts.map(([x, y]) => `${x * W},${y * H}`).join(' ');
      return h('g', { key: 'bd' },
        h('circle', { cx: W * 0.8, cy: 46, r: 16, fill: 'none', stroke: C.n300, strokeWidth: 1 }),
        h('polygon', { points: p([[0, .6], [.16, .42], [.3, .53], [.5, .34], [.68, .5], [.84, .4], [1, .5], [1, 1], [0, 1]]), fill: C.n200 }),
        h('polygon', { points: p([[0, .8], [.14, .66], [.3, .74], [.48, .6], [.66, .72], [.82, .63], [1, .71], [1, 1], [0, 1]]), fill: C.n300, opacity: 0.55 }),
        h('polyline', { points: p([[0, .8], [.14, .66], [.3, .74], [.48, .6], [.66, .72], [.82, .63], [1, .71]]), fill: 'none', stroke: C.n400, strokeWidth: 1 }));
    }
    if (kind === 'map') {
      const g = [];
      for (let x = 16; x < W; x += 32) g.push(h('line', { key: `v${x}`, x1: x, y1: 0, x2: x, y2: H, stroke: C.n300, strokeWidth: 1, opacity: 0.55 }));
      for (let y = 16; y < H; y += 32) g.push(h('line', { key: `h${y}`, x1: 0, y1: y, x2: W, y2: y, stroke: C.n300, strokeWidth: 1, opacity: 0.55 }));
      const px = W - 30, py = H * 0.28;
      const blob = (key, d) => h('g', { key }, h('path', { d, fill: C.accent200, opacity: 0.55 }), h('path', { d, fill: 'url(#cpForest)', stroke: C.accent300, strokeWidth: 1 }));
      const tree = (x, y, k) => h('path', { key: `t${k}`, d: `M${x} ${y - 6} l4 7 h-8 z M${x} ${y - 1} l4 6 h-8 z M${x} ${y + 5} v3`, fill: C.accent100, stroke: C.accent700, strokeWidth: 0.9 });
      const trees = [[16, .12], [34, .19], [12, .27], [30, .33], [W - 20, .55], [W - 8, .63], [W - 24, .7], [W - 10, .8], [18, .68], [36, .76], [14, .84], [30, .92]].map(([x, y], i) => tree(x, H * y, i));
      return h('g', { key: 'bd' },
        h('defs', { key: 'fd' }, h('pattern', { id: 'cpForest', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: C.accent300, strokeWidth: 0.8, opacity: 0.7 }))),
        h('rect', { x: 0, y: 0, width: W, height: H, fill: C.accent100, opacity: 0.5 }),
        ...g,
        blob('f1', `M-10 ${H * 0.08} C ${W * 0.12} ${H * 0.02} ${W * 0.2} ${H * 0.14} ${W * 0.14} ${H * 0.3} S ${W * 0.02} ${H * 0.42} -10 ${H * 0.4} Z`),
        blob('f2', `M${W + 10} ${H * 0.5} C ${W * 0.86} ${H * 0.46} ${W * 0.8} ${H * 0.62} ${W * 0.88} ${H * 0.74} S ${W * 0.98} ${H * 0.9} ${W + 10} ${H * 0.92} Z`),
        blob('f3', `M-10 ${H * 0.62} C ${W * 0.1} ${H * 0.58} ${W * 0.18} ${H * 0.74} ${W * 0.1} ${H * 0.86} S ${W * 0.02} ${H + 10} -10 ${H + 10} Z`),
        h('path', { key: 'lake', d: `M${W * 0.62} -10 C ${W * 0.7} ${H * 0.03} ${W * 0.9} ${H * 0.02} ${W * 0.98} ${H * 0.06} S ${W + 10} ${H * 0.12} ${W + 10} -10 Z`, fill: C.accent200, opacity: 0.8, stroke: 'none' }),
        h('path', { key: 'ctr', d: `M${W * 0.78} ${H * 0.55} q 14 -10 30 -2 t 26 4 M${W * 0.82} ${H * 0.66} q 12 -8 24 -1 t 20 6`, fill: 'none', stroke: C.accent300, strokeWidth: 1 }),
        ...trees,
        h('path', { d: `M10 ${H - 18} C 34 ${H * 0.78} -6 ${H * 0.58} 22 ${H * 0.42} S 6 ${H * 0.16} 64 10 L ${W - 76} 10 C ${W - 36} 10 ${W} 60 ${px} ${py}`, fill: 'none', stroke: C.n600, strokeWidth: 1.4, strokeDasharray: '4 4' }),
        h('circle', { cx: 10, cy: H - 18, r: 4, fill: C.paper, stroke: C.n600, strokeWidth: 1.4 }),
        h('polygon', { points: `${px},${py - 16} ${px + 9},${py} ${px - 9},${py}`, fill: C.accent100, stroke: C.n600, strokeWidth: 1.4 }));
    }
    return null;
  }

  function seatFigure(h, s, cx, cy, o) {
    const st = s.status, isSel = o.sel === s.id;
    const fill = st === 'DRIVER' ? C.ink : st === 'MINE' ? C.accent : st === 'TAKEN' ? `url(#${o.hatchId})` : isSel ? C.accent200 : C.paper;
    const stroke = st === 'DRIVER' ? C.ink : st === 'TAKEN' ? C.n400 : C.accent;
    const sw = isSel ? 2 : 1.5;
    const inner = st === 'DRIVER' || st === 'MINE' ? C.paper : st === 'TAKEN' ? C.n500 : C.accent700;
    const parts = [
      h('rect', { key: 'hit', x: cx - 48, y: cy - 50, width: 96, height: 100, fill: 'transparent' }),
      st === 'TAKEN' ? h('rect', { key: 'under', x: cx - 31, y: cy - 41, width: 62, height: 82, rx: 10, fill: C.paper }) : null,
      h('rect', { key: 'head', x: cx - 16, y: cy - 41, width: 32, height: 13, rx: 6.5, fill, stroke, strokeWidth: sw }),
      h('path', { key: 'back', d: `M${cx - 31} ${cy - 18} q0 -8 8 -8 h46 q8 0 8 8 v8 q0 6 -6 6 h-50 q-6 0 -6 -6 z`, fill, stroke, strokeWidth: sw }),
      h('path', { key: 'cush', d: `M${cx - 30} ${cy + 2} q0 -6 6 -6 h48 q6 0 6 6 v28 q0 11 -11 11 h-38 q-11 0 -11 -11 z`, fill, stroke, strokeWidth: sw }),
      h('path', { key: 'bol', d: `M${cx - 20} ${cy} v32 M${cx + 20} ${cy} v32`, stroke: inner, strokeWidth: 1, opacity: 0.3, fill: 'none' }),
    ];
    if (isSel) parts.push(h('rect', { key: 'ring', x: cx - 42, y: cy - 50, width: 84, height: 98, rx: 12, fill: 'none', stroke: C.accent, strokeWidth: 1.5, strokeDasharray: '5 4', style: { animation: 'cpPulse 1.2s ease-in-out infinite' } }));
    const gy = cy + 18;
    if (st === 'DRIVER') parts.push(h('g', { key: 'g', stroke: inner, strokeWidth: 1.5, fill: 'none', transform: `translate(${cx} ${gy})` }, h('circle', { r: 10 }), h('circle', { r: 2.5 }), h('path', { d: 'M-10 0h7.5M2.5 0H10M0 2.5V10' })));
    else if (st === 'MINE') parts.push(h('path', { key: 'g', d: `M${cx - 8} ${gy} l5 5 l11 -11`, stroke: inner, strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
    else if (st === 'TAKEN' && o.showNames && s.who) parts.push(h('rect', { key: 'nb', x: cx - 15, y: gy - 10, width: 30, height: 20, fill: C.paper, stroke: C.n400, strokeWidth: 1 }), h('text', { key: 'g', x: cx, y: gy + 4.5, textAnchor: 'middle', fontSize: 12, fontWeight: 600, fill: C.n800, fontFamily: 'var(--font-heading)' }, initials(s.who)));
    else if (st === 'FREE' && isSel) parts.push(h('text', { key: 'g', x: cx, y: gy + 4.5, textAnchor: 'middle', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, fill: inner, fontFamily: 'var(--font-heading)' }, 'POTWIERDŹ'));
    else if (st === 'FREE') parts.push(h('path', { key: 'g', d: `M${cx - 6} ${gy} h12 M${cx} ${gy - 6} v12`, stroke: inner, strokeWidth: 1.5 }));
    if (!o.mini) parts.push(h('text', { key: 'l', x: cx, y: cy + 58, textAnchor: 'middle', fontSize: 11, fill: st === 'TAKEN' ? C.n600 : C.text, fontFamily: 'var(--font-body)' },
      st === 'DRIVER' ? (o.showNames && s.who ? s.who : 'Kierowca') : st === 'TAKEN' ? (o.showNames && s.who ? s.who : 'Zajęte') : st === 'MINE' ? 'Twoje' : (s.label || '')));
    const clickable = st === 'FREE' && !!o.onTap;
    return h('g', { key: s.id, onClick: clickable ? () => o.onTap(s) : undefined, style: { cursor: clickable ? 'pointer' : 'default' }, role: clickable ? 'button' : undefined, 'aria-label': `${s.label || s.id}: ${st.toLowerCase()}` }, ...parts.filter(Boolean));
  }

  function trunkBox(h, x, y, w, ht, mini) {
    const kids = [h('rect', { key: 'r', x, y, width: w, height: ht, fill: 'none', stroke: C.n400, strokeWidth: 1, strokeDasharray: '4 3' })];
    if (!mini) {
      const cx = x + w / 2, cy = y + ht / 2;
      kids.push(h('g', { key: 'bag', stroke: C.n500, strokeWidth: 1.3, fill: 'none', transform: `translate(${cx} ${cy - 9})` }, h('rect', { x: -9, y: -6, width: 18, height: 15, rx: 3 }), h('path', { d: 'M-4 -6 v-4 q0 -3 4 -3 q4 0 4 3 v4 M-9 3 h18' })));
      kids.push(h('text', { key: 't', x: cx, y: cy + 19, textAnchor: 'middle', fontSize: 9.5, letterSpacing: 2, fill: C.n600, fontFamily: 'var(--font-body)' }, 'BAGAŻNIK'));
    }
    return h('g', { key: 'trunk' }, ...kids);
  }

  function render(React, seats, opts) {
    const h = React.createElement, o = Object.assign({ interior: 'sedan', backdrop: 'none', mini: false, sel: null, showNames: false, onTap: null, bare: false }, opts || {});
    const inter = INTERIORS[o.interior] || INTERIORS.sedan;
    const hatchId = o.hatchId || `cpHatch-${o.mini ? 'm' : 'f'}`;
    o.hatchId = hatchId;
    const MG = (!o.mini && !o.bare && o.backdrop && o.backdrop !== 'none') ? 26 : 0;
    const CELL = 100, ROW = o.mini ? 104 : 112, PAD = o.bare ? 8 : 26 + MG, HOOD = o.bare ? 0 : 60;
    const rows = Math.max(0, ...seats.map((s) => s.y)) + 1;
    const W = 3 * CELL + 2 * PAD, yTop = PAD + HOOD;
    const trunkY = yTop + rows * ROW + 2, trunkH = o.bare ? 0 : inter.trunk;
    const H = o.bare ? yTop + rows * ROW + 8 : trunkY + trunkH + (inter.open ? 26 : 34) + MG;
    const cross = (x, y) => h('path', { key: `c${x}${y}`, d: `M${x - 6} ${y} h12 M${x} ${y - 6} v12`, stroke: C.n500, strokeWidth: 1 });
    const kids = [h('defs', { key: 'd' }, h('pattern', { id: hatchId, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: C.n400, strokeWidth: 1.2 })))];
    if (!o.bare) {
      if (!o.mini) kids.push(backdrop(h, o.backdrop, W, H));
      kids.push(cross(7, 7), cross(W - 7, 7), cross(7, H - 7), cross(W - 7, H - 7));
      const L = 14 + MG, R = W - 14 - MG, T = 14 + MG;
      const wheelY = [[PAD + HOOD - 2], [inter.open ? H - 14 - MG - 54 : trunkY - 30]];
      [[L - 6, wheelY[0]], [R - 4, wheelY[0]], [L - 6, wheelY[1]], [R - 4, wheelY[1]]].forEach(([x, y], i) => kids.push(h('rect', { key: `w${i}`, x, y, width: 10, height: 44, fill: C.paper, stroke: C.n500, strokeWidth: 1.2 })));
      if (inter.open) {
        const cabB = trunkY - 8;
        kids.push(h('path', { key: 'cab', d: `M${PAD + 14} ${T} H${R - PAD} Q${R} ${T} ${R} ${T + PAD + 14} V${cabB - 12} Q${R} ${cabB} ${R - 12} ${cabB} H${L + 12} Q${L} ${cabB} ${L} ${cabB - 12} V${T + PAD + 14} Q${L} ${T} ${PAD + 14} ${T} Z`, fill: C.paper, stroke: C.accent700, strokeWidth: 1.5 }));
        kids.push(h('rect', { key: 'bed', x: L + 4, y: trunkY, width: R - L - 8, height: H - 14 - MG - trunkY, fill: C.paper, stroke: C.accent700, strokeWidth: 1.5 }));
        kids.push(trunkBox(h, L + 16, trunkY + 12, R - L - 32, H - 14 - MG - trunkY - 24, o.mini));
      } else {
        kids.push(h('path', { key: 'body', d: `M${PAD + 14} ${T} H${R - PAD} Q${R} ${T} ${R} ${T + PAD + 14} V${H - 40 - MG} Q${R} ${H - 14 - MG} ${R - 22} ${H - 14 - MG} H${L + 22} Q${L} ${H - 14 - MG} ${L} ${H - 40 - MG} V${T + PAD + 14} Q${L} ${T} ${PAD + 14} ${T} Z`, fill: C.paper, stroke: C.accent700, strokeWidth: 1.5 }));
        kids.push(h('line', { key: 'sep', x1: L + 10, y1: trunkY, x2: R - 10, y2: trunkY, stroke: C.n300, strokeWidth: 1 }));
        kids.push(h('path', { key: 'rw', d: `M${L + PAD + 2} ${H - 22 - MG} Q${W / 2} ${H - 34 - MG} ${R - PAD - 2} ${H - 22 - MG}`, fill: 'none', stroke: C.accent700, strokeWidth: 1, strokeDasharray: '4 4' }));
        kids.push(trunkBox(h, PAD + 12, trunkY + 8, W - 2 * (PAD + 12), trunkH - 10, o.mini));
      }
      kids.push(h('path', { key: 'ws', d: `M${PAD + 12} ${yTop - 20} Q${W / 2} ${yTop - 36} ${W - PAD - 12} ${yTop - 20}`, fill: 'none', stroke: C.accent700, strokeWidth: 1, strokeDasharray: '4 4' }));
      if (!o.mini) kids.push(h('text', { key: 'front', x: W / 2, y: T + 22, textAnchor: 'middle', fontSize: 9.5, letterSpacing: 2, fill: C.n600, fontFamily: 'var(--font-body)' }, 'PRZÓD'));
    }
    const byRow = {};
    seats.forEach((s) => { (byRow[s.y] = byRow[s.y] || []).push(s.x); });
    seats.forEach((s) => {
      const xs = byRow[s.y], mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cx = W / 2 + (s.x - mid) * CELL, cy = yTop + s.y * ROW + 46;
      kids.push(seatFigure(h, s, cx, cy, o));
    });
    return h('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block', maxWidth: o.mini ? 92 : 330, margin: '0 auto', overflow: 'hidden' }, role: 'group', 'aria-label': 'Schemat miejsc w samochodzie' }, ...kids.filter(Boolean));
  }

  window.CarpoolSeatMap = { render, SLOTS, INTERIORS, BACKDROPS };
})();
