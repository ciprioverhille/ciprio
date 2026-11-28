/* Vue « caméra Veo » de l'accueil : le même match simulé que la page vitrine (deux blocs qui coulissent ensemble avec
   le ballon, passes, pertes de balle, contre-pressing), filmé de côté et en hauteur par une caméra fixe qui tourne pour
   suivre le ballon (panoramique + inclinaison, jamais de roulis), comme une Veo.
   Joueurs = petits palets plats posés sur la pelouse (pas de relief) ; seule la caméra donne la perspective.
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
    vert: { fond: "#0c100e", herbe1: "#1d5f34", herbe2: "#1b5830", ligne: "rgba(255,255,255,.78)", a: "#f2f5f3", aTxt: "#0c100e", b: "#3a433e", bTxt: "#e9eeeb", bBord: "rgba(255,255,255,.35)", ballon: "#ffffff", passe: "rgba(255,255,255,.55)", press: "#3ddc84" },
    blanc: { fond: "#ffffff", herbe1: "#fbfbfa", herbe2: "#f4f5f4", ligne: "rgba(12,16,14,.28)", a: "#0c100e", aTxt: "#ffffff", b: "#ffffff", bTxt: "#0c100e", bBord: "#0c100e", ballon: "#0c100e", passe: "rgba(12,16,14,.45)", press: "#12a150" },
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
    const pion = (x, y, i, ph) => ({ x, y, bx: x, by: y, i, ph });
    const A = BASE_A.map(([x, y], i) => pion(x, y, i, i * 1.7));
    const B = BASE_B.map(([x, y], i) => pion(x, y, i, i * 2.3));
    const eq = (s) => (s === "a" ? A : B);
    const ballon = { x: L / 2, y: W / 2, fx: 0, fy: 0, tx: 0, ty: 0, k: 1, dur: 0.6, hold: 0.4, team: "a", idx: 6, left: 4 };
    let press = null;
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
        press = { depuis: now };
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
      // les deux blocs coulissent ensemble avec le ballon
      const aBall = ballon.team === "a";
      const sa = clamp((ballon.x - L / 2) * 0.42 + (aBall ? 7 : -5), -12, 22);
      const sb = clamp((ballon.x - L / 2) * 0.42 + (aBall ? 5 : -7), -22, 12);
      const ys = (ballon.y - W / 2) * 0.28;
      const def = ballon.team === "a" ? "b" : "a";
      const presseurs = press ? proches(eq(def), ballon.x, ballon.y, 3).map((o) => o.i) : [];
      const bouger = (list, shift, cote) => list.forEach((p, i) => {
        let tx = p.bx + (i === 0 ? shift * 0.12 : shift) + Math.sin(now * 0.9 + p.ph) * 1.2;
        let ty = p.by + (i === 0 ? ys * 0.3 : ys) + Math.cos(now * 0.7 + p.ph) * 1.2;
        if (cote === ballon.team && i === ballon.idx) { tx = ballon.k < 1 ? ballon.tx : p.x; ty = ballon.k < 1 ? ballon.ty : p.y; }
        const presse = cote === def && presseurs.includes(i);
        if (presse) { tx = ballon.x + (cote === "a" ? -2.2 : 2.2); ty = ballon.y + (i % 2 ? 1.8 : -1.8); }
        if (cote === def && !presseurs.length) {
          const n = proches(list, ballon.x, ballon.y, 1)[0];
          if (n && n.i === i) { tx = (tx + ballon.x) / 2; ty = (ty + ballon.y) / 2; }
        }
        const s = Math.min(1, dt * (presse ? 3.2 : 1.8));
        p.x = clamp(p.x + (tx - p.x) * s, 1.5, L - 1.5); p.y = clamp(p.y + (ty - p.y) * s, 1.5, W - 1.5);
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
    // palet plat : un disque posé au sol, projeté (donc aplati par la perspective)
    function palet(x, y, r, fond, bord, num, encre) {
      const c = proj(x, y, 0); if (!c) return;
      const e = 0.4, gx = proj(x + e, y, 0), gy = proj(x, y + e, 0);
      if (!gx || !gy) return;
      const plat = Math.max(0.35, Math.min(1, Math.abs(gy[1] - c[1]) / Math.max(0.01, Math.hypot(gx[0] - c[0], gx[1] - c[1]))));
      const rx = Math.max(3.6, Math.min(r * 9.5, (r * 0.9 * (w / 2)) / c[2])) * Math.min(1.3, Math.max(0.7, w / 1300));
      ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, rx * plat, 0, 0, Math.PI * 2);
      ctx.fillStyle = fond; ctx.fill();
      if (bord) { ctx.strokeStyle = bord; ctx.lineWidth = 1; ctx.stroke(); }
      if (num != null && rx > 7) {
        ctx.fillStyle = encre; ctx.font = `600 ${Math.round(rx * 0.95)}px "Geist Mono", ui-monospace, monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(1, Math.max(0.6, plat)); ctx.fillText(String(num), 0, 1); ctx.restore();
      }
    }
    function joueurs() {
      if (ballon.k < 1) {                           // ligne de la passe en cours
        const a = proj(ballon.fx, ballon.fy, 0), b = proj(ballon.tx, ballon.ty, 0);
        if (a && b) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.passe; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); }
      }
      if (press) {                                  // contre-pressing : trois traits vers le ballon
        const def = ballon.team === "a" ? B : A, pb = proj(ballon.x, ballon.y, 0);
        ctx.strokeStyle = C.press; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.85;
        for (const o of proches(def, ballon.x, ballon.y, 3)) { const q = proj(o.p.x, o.p.y, 0); if (q && pb) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); } }
        ctx.globalAlpha = 1;
      }
      const tous = A.map((p) => ({ p, a: true })).concat(B.map((p) => ({ p, a: false })));
      tous.sort((u, v) => u.p.y - v.p.y);           // du fond vers la caméra
      for (const { p, a } of tous) palet(p.x, p.y, a ? 1.05 : 1.0, a ? C.a : C.b, a ? null : C.bBord, NUM[p.i], a ? C.aTxt : C.bTxt);
      palet(ballon.x, ballon.y, 0.42, C.ballon, C === COUL.vert ? "#0c100e" : null);
    }
    function image(t) {
      if (!canvas.isConnected) { anime = false; return; }
      const dt = Math.min(0.05, (t - tPrec) / 1000); tPrec = t;
      avancer(dt); viser(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.fond; ctx.fillRect(0, 0, w, h);
      terrain(); joueurs();
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
