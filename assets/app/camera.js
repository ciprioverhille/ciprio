/* Vue « caméra Veo » de l'accueil : un match simulé (22 joueurs, un ballon) filmé de côté, en hauteur, par une caméra
   fixe qui tourne pour suivre le ballon (panoramique + inclinaison), comme une Veo.
   CIPRIO_CAMERA.monter(canvas, { mode: "vert" | "blanc" }) -> fonction d'arrêt.
   - vert  : une analyse est en cours (pelouse verte, lignes blanches) ;
   - blanc : rien en cours (terrain blanc, lignes grises, joueurs en noir).
   Le haut de l'image reste vide (pas de tribune) : le texte de l'accueil s'y affiche. */
(() => {
  const L = 105, W = 68;                       // terrain en mètres ; x le long, y en travers (0 = touche côté caméra)
  const CAM = { x: L / 2, y: -21, z: 12.5 };   // caméra au niveau de la médiane, derrière la touche, en hauteur
  const BLOC = [[6, 34], [20, 12], [18, 27], [18, 41], [20, 56], [36, 18], [34, 34], [36, 50], [50, 14], [52, 34], [50, 54]]; // 4-3-3 (x vers l'avant)

  const COUL = {
    vert: { fond: "#0c100e", herbe1: "#1f6537", herbe2: "#1d5e33", ligne: "rgba(255,255,255,.85)", a: "#f4f6f5", aBord: "#0c100e", b: "#0c100e", bBord: "#f4f6f5", ballon: "#ffffff", ombre: "rgba(0,0,0,.28)" },
    blanc: { fond: "#ffffff", herbe1: "#fbfbfa", herbe2: "#f5f6f5", ligne: "rgba(12,16,14,.32)", a: "#0c100e", aBord: "#0c100e", b: "#ffffff", bBord: "#0c100e", ballon: "#0c100e", ombre: "rgba(12,16,14,.12)" },
  };

  function monter(canvas, opts = {}) {
    const C = COUL[opts.mode === "blanc" ? "blanc" : "vert"];
    const ctx = canvas.getContext("2d");
    const calme = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, anime = true, t0 = performance.now(), tPrec = t0;

    // ---------------------------------------------------------------- jeu simulé
    const joueurs = [];
    BLOC.forEach(([x, y], k) => {
      joueurs.push({ eq: 0, k, bx: x, by: y, x, y, vx: 0, vy: 0 });
      joueurs.push({ eq: 1, k, bx: L - x, by: W - y, x: L - x, y: W - y, vx: 0, vy: 0 });
    });
    const ballon = { x: L / 2, y: W / 2, z: 0, de: null, vers: null, t: 1, duree: 1, haut: 0, porteur: null };
    let possession = 0;
    function passe() {
      // le porteur donne le ballon à un partenaire plutôt devant ; parfois l'adversaire le récupère
      if (Math.random() < 0.18) possession = 1 - possession;
      const sens = possession === 0 ? 1 : -1;
      const cand = joueurs.filter((j) => j.eq === possession && j.k !== 0 && j !== ballon.porteur)
        .map((j) => ({ j, s: sens * j.x - Math.abs(j.x - ballon.x) * 0.25 + Math.random() * 35 })).sort((a, b) => b.s - a.s);
      const cible = cand[Math.floor(Math.random() * Math.min(5, cand.length))].j;
      const d = Math.hypot(cible.x - ballon.x, cible.y - ballon.y);
      ballon.de = { x: ballon.x, y: ballon.y };
      ballon.vers = cible;
      ballon.t = 0;
      ballon.duree = Math.max(0.6, d / 17);
      ballon.haut = d > 28 ? 3 + Math.random() * 4 : 0.2;
      ballon.porteur = null;
    }
    function avancer(dt) {
      // ballon
      if (ballon.vers) {
        ballon.t = Math.min(1, ballon.t + dt / ballon.duree);
        const e = ballon.t, cx = ballon.vers.x, cy = ballon.vers.y;
        ballon.x = ballon.de.x + (cx - ballon.de.x) * e;
        ballon.y = ballon.de.y + (cy - ballon.de.y) * e;
        ballon.z = 4 * ballon.haut * e * (1 - e);
        if (ballon.t >= 1) { ballon.porteur = ballon.vers; ballon.vers = null; ballon.garde = 0.5 + Math.random() * 1.3; }
      } else if (ballon.porteur) {
        const p = ballon.porteur;
        ballon.x = p.x + (possession === 0 ? 0.7 : -0.7); ballon.y = p.y; ballon.z = 0;
        ballon.garde -= dt;
        if (ballon.garde <= 0) passe();
      } else passe();
      // joueurs : leur poste, décalé vers le ballon et vers l'avant quand leur équipe l'a
      const bx = Math.max(10, Math.min(L - 10, ballon.x)), by = ballon.y;
      for (const j of joueurs) {
        const att = j.eq === possession ? 1 : -1, sens = j.eq === 0 ? 1 : -1;
        let tx = j.k === 0 ? j.bx + (bx - L / 2) * 0.08 : j.bx * 0.55 + bx * 0.45 + sens * att * 7 - sens * 10;
        let ty = j.k === 0 ? W / 2 + (by - W / 2) * 0.25 : j.by * 0.72 + by * 0.28;
        if (j === ballon.vers) { tx = ballon.vers.x; ty = ballon.vers.y; }
        j.vx += ((tx - j.x) * 0.9 - j.vx) * Math.min(1, dt * 1.6);
        j.vy += ((ty - j.y) * 0.9 - j.vy) * Math.min(1, dt * 1.6);
        const v = Math.hypot(j.vx, j.vy), vmax = 7.5;
        if (v > vmax) { j.vx *= vmax / v; j.vy *= vmax / v; }
        if (j !== ballon.porteur) { j.x += j.vx * dt; j.y += j.vy * dt; }
        else { j.x += j.vx * dt * 0.5; j.y += j.vy * dt * 0.5; }
        j.x = Math.max(1, Math.min(L - 1, j.x)); j.y = Math.max(1, Math.min(W - 1, j.y));
      }
    }

    // ---------------------------------------------------------------- caméra (Veo : pas de roulis)
    const cam = { yaw: 0, tilt: 0.42, f: 1 };
    function viser(dt) {
      const dx = ballon.x - CAM.x, dy = Math.max(8, ballon.y + 6 - CAM.y);
      const yaw = Math.atan2(dx, dy) * 0.92;
      const dist = Math.hypot(dx, dy);
      const tilt = Math.atan2(CAM.z, dist) * 0.78 + 0.03;
      const k = Math.min(1, dt * 1.3);
      cam.yaw += (yaw - cam.yaw) * k;
      cam.tilt += (tilt - cam.tilt) * k;
      cam.f += ((1 + Math.max(0, dist - 40) / 60) - cam.f) * k * 0.6;   // léger zoom quand l'action s'éloigne
    }
    function proj(x, y, z) {
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), ct = Math.cos(cam.tilt), st = Math.sin(cam.tilt);
      const dx = x - CAM.x, dy = y - CAM.y, dz = z - CAM.z;
      const xr = dx * cy - dy * sy;                       // vers la droite
      const fw = dx * sy + dy * cy;                       // devant, à plat
      const zc = fw * ct - dz * st;                       // profondeur
      const yu = fw * st + dz * ct;                       // vers le haut
      if (zc < 0.8) return null;
      const F = (w / 2) / Math.tan((76 * Math.PI) / 360) * cam.f;
      return [w / 2 + (F * xr) / zc, h * 0.64 - (F * yu) / zc, zc];
    }

    // ---------------------------------------------------------------- dessin
    function poly(pts, ferme) {
      ctx.beginPath(); let debut = true;
      for (const p of pts) { const q = proj(p[0], p[1], 0); if (!q) { debut = true; continue; } if (debut) { ctx.moveTo(q[0], q[1]); debut = false; } else ctx.lineTo(q[0], q[1]); }
      if (ferme) ctx.closePath();
    }
    const seg = (x0, y0, x1, y1, n = 24) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    const arc = (cx, cy, r, a0, a1, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
    function terrain() {
      // pelouse en bandes, par petites cases (les cases derrière la caméra ne sont pas dessinées)
      const NX = 16, NY = 6, mx = 4, my = 3;
      for (let i = 0; i < NX; i++) for (let jj = 0; jj < NY; jj++) {
        const x0 = -mx + ((L + 2 * mx) * i) / NX, x1 = -mx + ((L + 2 * mx) * (i + 1)) / NX, y0 = -my + ((W + 2 * my) * jj) / NY, y1 = -my + ((W + 2 * my) * (jj + 1)) / NY;
        const c = [proj(x0, y0, 0), proj(x1, y0, 0), proj(x1, y1, 0), proj(x0, y1, 0)];
        if (c.some((q) => !q)) continue;
        ctx.fillStyle = i % 2 ? C.herbe1 : C.herbe2;
        ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (const q of c.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = C.ligne; ctx.lineWidth = Math.max(1, w / 900); ctx.lineJoin = "round";
      const lignes = [
        [...seg(0, 0, L, 0, 60), ...seg(L, 0, L, W), ...seg(L, W, 0, W, 60), ...seg(0, W, 0, 0)],
        seg(L / 2, 0, L / 2, W), arc(L / 2, W / 2, 9.15, 0, 2 * Math.PI, 60),
        seg(0, W / 2 - 20.16, 16.5, W / 2 - 20.16), seg(16.5, W / 2 - 20.16, 16.5, W / 2 + 20.16), seg(16.5, W / 2 + 20.16, 0, W / 2 + 20.16),
        seg(L, W / 2 - 20.16, L - 16.5, W / 2 - 20.16), seg(L - 16.5, W / 2 - 20.16, L - 16.5, W / 2 + 20.16), seg(L - 16.5, W / 2 + 20.16, L, W / 2 + 20.16),
        seg(0, W / 2 - 9.16, 5.5, W / 2 - 9.16), seg(5.5, W / 2 - 9.16, 5.5, W / 2 + 9.16), seg(5.5, W / 2 + 9.16, 0, W / 2 + 9.16),
        seg(L, W / 2 - 9.16, L - 5.5, W / 2 - 9.16), seg(L - 5.5, W / 2 - 9.16, L - 5.5, W / 2 + 9.16), seg(L - 5.5, W / 2 + 9.16, L, W / 2 + 9.16),
        arc(11, W / 2, 9.15, -0.93, 0.93), arc(L - 11, W / 2, 9.15, Math.PI - 0.93, Math.PI + 0.93),
      ];
      for (const l of lignes) { poly(l); ctx.stroke(); }
      // buts (poteaux et barre, 2,44 m)
      for (const gx of [0, L]) {
        const a = proj(gx, W / 2 - 3.66, 0), b = proj(gx, W / 2 + 3.66, 0), a2 = proj(gx, W / 2 - 3.66, 2.44), b2 = proj(gx, W / 2 + 3.66, 2.44);
        if (a && b && a2 && b2) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      }
    }
    function personnages() {
      const objets = [];
      for (const j of joueurs) { const p = proj(j.x, j.y, 0); if (p) objets.push({ j, p }); }
      const pb = proj(ballon.x, ballon.y, ballon.z + 0.11);
      if (pb) objets.push({ ballon: true, p: pb });
      objets.sort((a, b) => b.p[2] - a.p[2]);
      for (const o of objets) {
        if (o.ballon) {
          const sol = proj(ballon.x, ballon.y, 0);
          const r = Math.max(1.6, (w * 0.11) / o.p[2]) * 1.1;
          if (sol) { ctx.fillStyle = C.ombre; ctx.beginPath(); ctx.ellipse(sol[0], sol[1], r * 1.2, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = C.ballon; ctx.strokeStyle = C.aBord; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(o.p[0], o.p[1] - r, r, 0, Math.PI * 2); ctx.fill(); if (C === COUL.vert) ctx.stroke();
          continue;
        }
        const tete = proj(o.j.x, o.j.y, 1.78), cou = proj(o.j.x, o.j.y, 1.5);
        if (!tete || !cou) continue;
        const hpx = o.p[1] - tete[1], lpx = Math.max(1.6, hpx * 0.3), r = lpx / 2;
        ctx.fillStyle = C.ombre; ctx.beginPath(); ctx.ellipse(o.p[0], o.p[1], lpx * 0.95, lpx * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        const gardien = o.j.k === 0;
        ctx.fillStyle = gardien ? (o.j.eq === 0 ? "#12a150" : "#d49a00") : o.j.eq === 0 ? C.a : C.b;
        ctx.strokeStyle = o.j.eq === 0 ? C.aBord : C.bBord; ctx.lineWidth = Math.max(0.7, lpx * 0.1);
        // corps (du sol au cou), arrondi
        ctx.beginPath();
        ctx.moveTo(o.p[0] - r * 0.8, o.p[1]); ctx.lineTo(o.p[0] - r, cou[1] + r); ctx.quadraticCurveTo(o.p[0] - r, cou[1], o.p[0], cou[1]);
        ctx.quadraticCurveTo(o.p[0] + r, cou[1], o.p[0] + r, cou[1] + r); ctx.lineTo(o.p[0] + r * 0.8, o.p[1]); ctx.closePath();
        ctx.fill(); ctx.stroke();
        // tête
        const rt = Math.max(1, (cou[1] - tete[1]) * 0.55);
        ctx.beginPath(); ctx.arc(o.p[0], tete[1] + rt * 0.6, rt, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
    }
    function image(now) {
      if (!canvas.isConnected) { anime = false; return; }
      const dt = Math.min(0.05, (now - tPrec) / 1000); tPrec = now;
      avancer(dt); viser(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.fond; ctx.fillRect(0, 0, w, h);
      terrain(); personnages();
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
    // départ : quelques secondes de jeu déjà simulées, caméra déjà en place
    for (let i = 0; i < 120; i++) { avancer(1 / 30); viser(1 / 30); }
    requestAnimationFrame(image);
    return () => { anime = false; ro.disconnect(); };
  }
  window.CIPRIO_CAMERA = { monter };
})();
