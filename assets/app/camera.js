/* Vue « caméra Veo » de l'accueil : le même match simulé que la page vitrine (deux blocs qui coulissent ensemble avec
   le ballon, passes, pertes de balle, contre-pressing), filmé de côté et en hauteur par une caméra fixe qui tourne pour
   suivre le ballon (panoramique + inclinaison, jamais de roulis), comme une Veo.
   Joueurs = palets épais (un peu de relief), numéro dessus ; tribunes pleines autour du terrain ; aucune ligne de passe.
   CIPRIO_CAMERA.monter(canvas, { mode: "vert" | "blanc", haut: 0.64 }) -> fonction d'arrêt.
   - vert  : une analyse est en cours (pelouse verte, lignes blanches) ;
   - blanc : rien en cours (terrain blanc, lignes grises, joueurs en noir).
   `haut` = hauteur de l'horizon dans l'image (0..1) : le haut reste libre pour le texte. */
(() => {
  const L = 105, W = 68;                       // terrain en mètres, comme le SVG de la vitrine (y = 0 : touche opposée)
  const CAM = { x: L / 2, y: W + 30, z: 17 };  // caméra au niveau de la médiane, derrière la touche, en hauteur
  const BASE_A = [[6, 34], [28, 12], [25, 27], [25, 41], [28, 56], [44, 22], [40, 34], [44, 46], [60, 14], [62, 34], [60, 54]];
  const BASE_B = BASE_A.map(([x, y]) => [L - x, W - y]);
  const NUM = [1, 3, 4, 5, 2, 6, 8, 10, 7, 9, 11];

  const COUL = {
    vert: { ciel1: "#24323b", ciel2: "#3a4a52", abords: "#174a2a", gradin1: "#4a524e", gradin2: "#424a46", contre: "#2f3633", toit: "#262d2a",
      public: ["#c9d0cc", "#8b948f", "#b8423f", "#2f6fb5", "#e9eeeb", "#d9a52c", "#5d6661", "#6d4a8f"],
      herbe1: "#1d5f34", herbe2: "#1b5830", ligne: "rgba(255,255,255,.8)", a: "#f2f5f3", aCote: "#aeb6b1", aTxt: "#0c100e", b: "#2f3733", bCote: "#151a17", bTxt: "#e9eeeb", bBord: null, ballon: "#ffffff", ombre: "rgba(0,0,0,.3)" },
    blanc: { ciel1: "#ffffff", ciel2: "#f6f7f6", abords: "#f1f3f2", gradin1: "#e9ecea", gradin2: "#e2e6e4", contre: "#d5dad7", toit: "#cfd5d2",
      public: ["#b9c0bc", "#9aa29e", "#cfd5d2", "#7e8682", "#c4cac7"],
      herbe1: "#fbfbfa", herbe2: "#f4f5f4", ligne: "rgba(12,16,14,.3)", a: "#0c100e", aCote: "#3a403d", aTxt: "#ffffff", b: "#ffffff", bCote: "#d0d5d2", bTxt: "#0c100e", bBord: "#0c100e", ballon: "#ffffff", ombre: "rgba(12,16,14,.14)" },
  };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function monter(canvas, opts = {}) {
    const C = COUL[opts.mode === "blanc" ? "blanc" : "vert"];
    const HORIZON = opts.haut || 0.64;
    const ctx = canvas.getContext("2d");
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, anime = true, tPrec = performance.now(), now = 0;

    // ---------------------------------------------------------------- jeu simulé (repris de la vitrine)
    const pion = (x, y, i, ph) => ({ x, y, vx: 0, vy: 0, bx: x, by: y, i, ph });
    const A = BASE_A.map(([x, y], i) => pion(x, y, i, i * 1.7));
    const B = BASE_B.map(([x, y], i) => pion(x, y, i, i * 2.3));
    const eq = (s) => (s === "a" ? A : B);
    const ballon = { x: L / 2, y: W / 2, fx: 0, fy: 0, tx: 0, ty: 0, k: 1, dur: 0.6, hold: 0.4, team: "a", idx: 6, left: 4 };
    let press = null;
    const repere = { x: L / 2, y: W / 2 }, equipe = { v: 1 }, proche = { cote: "", i: -1 };   // ballon « lissé » : les blocs coulissent sans à-coups pendant les passes
    const proches = (list, x, y, n, sauf) => list.map((p, i) => ({ p, i, d: Math.hypot(p.x - x, p.y - y) }))
      .filter((o) => o.i !== sauf).sort((a, b) => a.d - b.d).slice(0, n);

    function action() {
      const own = eq(ballon.team);
      ballon.left--;
      if (ballon.left <= 0) {                     // perte de balle : l'adversaire le plus proche récupère
        ballon.team = ballon.team === "a" ? "b" : "a";
        const n = proches(eq(ballon.team), ballon.x, ballon.y, 1)[0];
        ballon.idx = n.i;
        ballon.left = Math.round(rnd(3, 7));
        press = { depuis: now, qui: proches(eq(ballon.team === "a" ? "b" : "a"), n.p.x, n.p.y, 2).map((o) => o.i) };
        lancer(n.p.x, n.p.y, 0.3);
        return;
      }
      const dir = ballon.team === "a" ? 1 : -1;   // passe vers un partenaire, de préférence vers l'avant
      const opts2 = proches(own, ballon.x, ballon.y, 6, ballon.idx).filter((o) => o.i !== 0 || Math.random() < 0.15);
      opts2.forEach((o) => (o.s = dir * (o.p.x - ballon.x) + rnd(-14, 14)));
      opts2.sort((a, b) => b.s - a.s);
      const c = opts2[Math.floor(Math.random() * Math.min(3, opts2.length))];
      ballon.idx = c.i;
      lancer(clamp(c.p.x + dir * rnd(1, 4), 1, 104), clamp(c.p.y + rnd(-2, 2), 1, 67), clamp(c.d / 28 + 0.3, 0.45, 1.3));
    }
    function lancer(x, y, dur) { Object.assign(ballon, { fx: ballon.x, fy: ballon.y, tx: x, ty: y, k: 0, dur, hold: rnd(0.25, 0.6) }); }

    function avancer(dt) {
      now += dt;
      if (ballon.k < 1) {
        ballon.k = Math.min(1, ballon.k + dt / ballon.dur);
        const e = 1 - Math.pow(1 - ballon.k, 2);
        ballon.x = ballon.fx + (ballon.tx - ballon.fx) * e; ballon.y = ballon.fy + (ballon.ty - ballon.fy) * e;
      } else {
        const o = eq(ballon.team)[ballon.idx];
        ballon.x += (o.x - ballon.x) * Math.min(1, dt * 6); ballon.y += (o.y - ballon.y) * Math.min(1, dt * 6);
        ballon.hold -= dt;
        if (ballon.hold <= 0) action();
      }
      if (press && now - press.depuis > 2.4) press = null;
      // les deux blocs coulissent ensemble avec le ballon (repère lissé), et le décalage attaque/défense change en douceur
      const kr = Math.min(1, dt * 1.1);
      repere.x += (ballon.x - repere.x) * kr; repere.y += (ballon.y - repere.y) * kr;
      const aBall = ballon.team === "a";
      equipe.v += ((aBall ? 1 : -1) - equipe.v) * Math.min(1, dt * 0.8);
      const sa = clamp((repere.x - L / 2) * 0.42 + 1 + equipe.v * 6, -12, 22);
      const sb = clamp((repere.x - L / 2) * 0.42 - 1 + equipe.v * 6, -22, 12);
      const ys = (repere.y - W / 2) * 0.28;
      const def = ballon.team === "a" ? "b" : "a";
      const presseurs = press ? press.qui : [];
      // le défenseur qui sort sur le porteur ne change que si un autre est nettement plus près
      const cand = proches(eq(def), ballon.x, ballon.y, 1)[0];
      if (proche.cote !== def || proche.i < 0) Object.assign(proche, { cote: def, i: cand.i });
      else { const actuel = eq(def)[proche.i]; if (Math.hypot(actuel.x - ballon.x, actuel.y - ballon.y) > cand.d + 6) proche.i = cand.i; }
      const bouger = (list, shift, cote) => list.forEach((p, i) => {
        let tx = p.bx + (i === 0 ? shift * 0.12 : shift) + Math.sin(now * 0.9 + p.ph) * 1.2;
        let ty = p.by + (i === 0 ? ys * 0.3 : ys) + Math.cos(now * 0.7 + p.ph) * 1.2;
        if (cote === ballon.team && i === ballon.idx) { tx = ballon.k < 1 ? ballon.tx : p.x; ty = ballon.k < 1 ? ballon.ty : p.y; }
        const presse = cote === def && presseurs.includes(i);
        if (presse) { tx = ballon.x + (cote === "a" ? -2.2 : 2.2); ty = ballon.y + (i % 2 ? 1.8 : -1.8); }
        if (cote === def && !presseurs.length && i === proche.i) { tx = (tx + ballon.x) / 2; ty = (ty + ballon.y) / 2; }
        // mouvement d'un vrai joueur : vitesse et accélération bornées (plus de bonds soudains)
        const porteur = cote === ballon.team && i === ballon.idx;
        const vmax = presse || porteur ? 7 : i === 0 ? 3.5 : 5.2, amax = presse || porteur ? 6 : 3.5;
        const ex = tx - p.x, ey = ty - p.y, d = Math.hypot(ex, ey);
        const vv = Math.min(vmax, d * 1.4), dx = d > 1e-3 ? (ex / d) * vv : 0, dy = d > 1e-3 ? (ey / d) * vv : 0;
        let ax = dx - p.vx, ay = dy - p.vy; const an = Math.hypot(ax, ay), amx = amax * dt;
        if (an > amx) { ax *= amx / an; ay *= amx / an; }
        p.vx += ax; p.vy += ay;
        p.x = clamp(p.x + p.vx * dt, 1.5, L - 1.5); p.y = clamp(p.y + p.vy * dt, 1.5, W - 1.5);
      });
      bouger(A, sa, "a"); bouger(B, sb, "b");
    }

    // ---------------------------------------------------------------- caméra (Veo : panoramique + inclinaison, pas de roulis)
    const cam = { yaw: 0, tilt: 0.4, f: 1 };
    function viser(dt) {
      const dx = ballon.x - CAM.x, dy = Math.max(8, CAM.y - (ballon.y - 6));
      const yaw = Math.atan2(dx, dy) * 0.9;
      const dist = Math.hypot(dx, dy);
      const tilt = Math.atan2(CAM.z, dist) * 0.8 + 0.03;
      const k = Math.min(1, dt * 1.2);
      cam.yaw += (yaw - cam.yaw) * k;
      cam.tilt += (tilt - cam.tilt) * k;
      cam.f += ((1 + Math.max(0, dist - 40) / 60) - cam.f) * k * 0.6;   // léger zoom quand l'action s'éloigne
    }
    function proj(x, y, z) {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), ct = Math.cos(cam.tilt), st = Math.sin(cam.tilt);
      const dx = x - CAM.x, dy = CAM.y - y, dz = z - CAM.z;   // dy > 0 : vers le terrain
      const xr = dx * cy - dy * sy;
      const fw = dx * sy + dy * cy;
      const zc = fw * ct - dz * st;
      const yu = fw * st + dz * ct;
      if (zc < 0.8) return null;
      const F = (w / 2) / Math.tan((70 * Math.PI) / 360) * cam.f;
      return [w / 2 + (F * xr) / zc, h * HORIZON - (F * yu) / zc, zc];
    }

    // ---------------------------------------------------------------- dessin
    function chemin(pts, ferme) {
      ctx.beginPath(); let debut = true;
      for (const p of pts) { const q = proj(p[0], p[1], 0); if (!q) { debut = true; continue; } if (debut) { ctx.moveTo(q[0], q[1]); debut = false; } else ctx.lineTo(q[0], q[1]); }
      if (ferme) ctx.closePath();
    }
    const seg = (x0, y0, x1, y1, n = 24) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    const arc = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    const LIGNES = [
      [...seg(0, 0, L, 0, 60), ...seg(L, 0, L, W), ...seg(L, W, 0, W, 60), ...seg(0, W, 0, 0)],
      seg(L / 2, 0, L / 2, W), arc(L / 2, W / 2, 9.15, 0, 2 * Math.PI, 60),
      [...seg(0, W / 2 - 20.16, 16.5, W / 2 - 20.16, 8), ...seg(16.5, W / 2 - 20.16, 16.5, W / 2 + 20.16), ...seg(16.5, W / 2 + 20.16, 0, W / 2 + 20.16, 8)],
      [...seg(L, W / 2 - 20.16, L - 16.5, W / 2 - 20.16, 8), ...seg(L - 16.5, W / 2 - 20.16, L - 16.5, W / 2 + 20.16), ...seg(L - 16.5, W / 2 + 20.16, L, W / 2 + 20.16, 8)],
      [...seg(0, W / 2 - 9.16, 5.5, W / 2 - 9.16, 4), ...seg(5.5, W / 2 - 9.16, 5.5, W / 2 + 9.16, 8), ...seg(5.5, W / 2 + 9.16, 0, W / 2 + 9.16, 4)],
      [...seg(L, W / 2 - 9.16, L - 5.5, W / 2 - 9.16, 4), ...seg(L - 5.5, W / 2 - 9.16, L - 5.5, W / 2 + 9.16, 8), ...seg(L - 5.5, W / 2 + 9.16, L, W / 2 + 9.16, 4)],
      arc(11, W / 2, 9.15, -0.93, 0.93), arc(L - 11, W / 2, 9.15, Math.PI - 0.93, Math.PI + 0.93),
    ];
    function terrain() {
      const NX = 16, NY = 6, mx = 4, my = 3;       // pelouse en bandes, par petites cases
      for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
        const x0 = -mx + ((L + 2 * mx) * i) / NX, x1 = -mx + ((L + 2 * mx) * (i + 1)) / NX, y0 = -my + ((W + 2 * my) * j) / NY, y1 = -my + ((W + 2 * my) * (j + 1)) / NY;
        const c = [proj(x0, y0, 0), proj(x1, y0, 0), proj(x1, y1, 0), proj(x0, y1, 0)];
        if (c.some((q) => !q)) continue;
        ctx.fillStyle = i % 2 ? C.herbe1 : C.herbe2;
        ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (const q of c.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = C.ligne; ctx.lineWidth = Math.max(1, w / 1000); ctx.lineJoin = "round";
      for (const l of LIGNES) { chemin(l); ctx.stroke(); }
      for (const gx of [0, L]) {                    // buts : poteaux et barre (2,44 m)
        const a = proj(gx, W / 2 - 3.66, 0), b = proj(gx, W / 2 + 3.66, 0), a2 = proj(gx, W / 2 - 3.66, 2.44), b2 = proj(gx, W / 2 + 3.66, 2.44);
        if (a && b && a2 && b2) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
    }
    // ---------------------------------------------------------------- tribunes (fond, bouts) : plus aucun noir autour du terrain
    const RANGS = 9, PROF = 3.1, MONTE = 1.9, RECUL = 6;          // gradins : profondeur et hauteur par rang, recul derrière les lignes
    const TRIB = [
      { axe: "x", de: -34, a: L + 34, pos: (u, r) => [u, -RECUL - r * PROF, r * MONTE] },                 // en face, derrière la touche éloignée
      { axe: "y", de: -26, a: W + 24, pos: (u, r) => [-RECUL - r * PROF, u, r * MONTE] },                 // derrière le but de gauche
      { axe: "y", de: -26, a: W + 24, pos: (u, r) => [L + RECUL + r * PROF, u, r * MONTE] },              // derrière le but de droite
    ];
    const PUBLIC = [];
    TRIB.forEach((t, k) => { for (let r = 0; r < RANGS; r++) for (let u = t.de; u < t.a; u += 0.85) if (Math.random() < 0.72) PUBLIC.push({ k, u: u + Math.random() * 0.3, r: r + 0.5, c: Math.floor(Math.random() * C.public.length) }); });
    function quad(a, b, c2, d) { if (!a || !b || !c2 || !d) return false; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); return true; }
    function tribunes() {
      // ciel / toit
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, C.ciel1); g.addColorStop(1, C.ciel2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // sol autour du terrain (piste, abords)
      if (quad(proj(-RECUL, -RECUL, 0), proj(L + RECUL, -RECUL, 0), proj(L + RECUL, W + 26, 0), proj(-RECUL, W + 26, 0))) { ctx.fillStyle = C.abords; ctx.fill(); }
      TRIB.forEach((t, k) => {
        const N = 14;
        for (let r = 0; r < RANGS; r++) for (let i = 0; i < N; i++) {
          const u0 = t.de + ((t.a - t.de) * i) / N, u1 = t.de + ((t.a - t.de) * (i + 1)) / N;
          const P = (u, rr) => { const q = t.pos(u, rr); return proj(q[0], q[1], q[2]); };
          // contremarche (face verticale) puis assise
          if (quad(P(u0, r), P(u1, r), (() => { const q = t.pos(u1, r); return proj(q[0], q[1], q[2] + MONTE); })(), (() => { const q = t.pos(u0, r); return proj(q[0], q[1], q[2] + MONTE); })())) { ctx.fillStyle = C.contre; ctx.fill(); }
          const a = t.pos(u0, r), b = t.pos(u1, r), c2 = t.pos(u1, r + 1), d = t.pos(u0, r + 1);
          if (quad(proj(a[0], a[1], a[2] + MONTE), proj(b[0], b[1], b[2] + MONTE), proj(c2[0], c2[1], c2[2]), proj(d[0], d[1], d[2]))) { ctx.fillStyle = r % 2 ? C.gradin1 : C.gradin2; ctx.fill(); }
        }
        // toit au-dessus du dernier rang
        const ha = RANGS * MONTE + 4.5, a = t.pos(t.de, RANGS), b = t.pos(t.a, RANGS);
        if (quad(proj(a[0], a[1], RANGS * MONTE), proj(b[0], b[1], RANGS * MONTE), proj(b[0], b[1], ha), proj(a[0], a[1], ha))) { ctx.fillStyle = C.toit; ctx.fill(); }
      });
      // spectateurs
      const F = (w / 2) / Math.tan((70 * Math.PI) / 360) * cam.f;
      for (const s of PUBLIC) {
        const q = TRIB[s.k].pos(s.u, s.r), p = proj(q[0], q[1], q[2] + MONTE * 0.5 + 0.6);
        if (!p || p[0] < -4 || p[0] > w + 4 || p[1] < -4 || p[1] > h) continue;
        const z = Math.max(1, Math.min(3.2, (F * 0.42) / p[2]));
        ctx.fillStyle = C.public[s.c]; ctx.fillRect(p[0] - z / 2, p[1] - z, z, z * 1.5);
      }
    }

    // ---------------------------------------------------------------- joueurs : palets épais (un peu de relief), numéro dessus
    function palet(x, y, r, haut, dessus, cote, bord, num, encre) {
      const c = proj(x, y, 0); if (!c) return;
      const e = 0.4, gx = proj(x + e, y, 0), gy = proj(x, y + e, 0);
      if (!gx || !gy) return;
      const plat = Math.max(0.35, Math.min(1, Math.abs(gy[1] - c[1]) / Math.max(0.01, Math.hypot(gx[0] - c[0], gx[1] - c[1]))));
      const rx = Math.max(5, Math.min(r * 13, (r * 1.45 * (w / 2)) / c[2])) * Math.min(1.3, Math.max(0.7, w / 1300)), ry = rx * plat;
      const ep = Math.max(rx * haut, 2);                        // épaisseur visible du palet
      ctx.fillStyle = C.ombre; ctx.beginPath(); ctx.ellipse(c[0] + rx * 0.25, c[1] + ry * 0.2, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI); ctx.lineTo(c[0] - rx, c[1] - ep); ctx.ellipse(c[0], c[1] - ep, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
      ctx.fillStyle = cote; ctx.fill(); if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - ep, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = dessus; ctx.fill();
      if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke(); }
      if (num != null && rx > 7) {
        ctx.fillStyle = encre; ctx.font = `600 ${Math.round(rx * 0.95)}px "Geist Mono", ui-monospace, monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.save(); ctx.translate(c[0], c[1] - ep); ctx.scale(1, Math.max(0.6, plat)); ctx.fillText(String(num), 0, 1); ctx.restore();
      }
    }
    function joueurs() {
      const tous = A.map((p) => ({ p, a: true })).concat(B.map((p) => ({ p, a: false })));
      tous.sort((u, v) => u.p.y - v.p.y);           // du fond vers la caméra
      for (const { p, a } of tous) palet(p.x, p.y, a ? 1.05 : 1.0, 0.55, a ? C.a : C.b, a ? C.aCote : C.bCote, a ? null : C.bBord, NUM[p.i], a ? C.aTxt : C.bTxt);
      const pb = proj(ballon.x, ballon.y, 0.22);
      if (pb) {
        const rb = Math.max(2.2, Math.min(4.5, (0.5 * (w / 2)) / pb[2]));
        ctx.fillStyle = C.ombre; ctx.beginPath(); ctx.ellipse(pb[0] + 1, pb[1] + rb * 0.8, rb, rb * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ballon; ctx.beginPath(); ctx.arc(pb[0], pb[1], rb, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    function image(t) {
      if (!canvas.isConnected) { anime = false; return; }
      const dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
      avancer(dt); viser(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tribunes(); terrain(); joueurs();
      if (anime && !calme) requestAnimationFrame(image);
    }
    function taille() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1); w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ro = new ResizeObserver(() => { taille(); if (calme) image(performance.now()); });
    ro.observe(canvas);
    taille();
    for (let i = 0; i < 150; i++) { avancer(1 / 30); viser(1 / 30); }   // quelques secondes déjà jouées, caméra en place
    requestAnimationFrame(image);
    return () => { anime = false; ro.disconnect(); };
  }
  window.CIPRIO_CAMERA = { monter };
})();
