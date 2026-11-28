/* « Comment ça marche » : chaque étape est une petite démonstration animée dans une fausse fenêtre Ciprio — une souris
   se déplace, tape, fait glisser — comme un entraîneur qui le fait pour de vrai. Un clic = une onde verte (la souris
   ne bouge pas). Flèches ← → (et clavier) pour passer d'une étape à l'autre ; chaque démonstration tourne en boucle.
   Étapes : 1 vidéo, 2 plan de jeu, 3 composition, 4 Ciprio prépare + réglage du terrain, 5 suivi du match, 6 rapport.
   CIPRIO_TUTO.monter(racine, { depart }) -> fonction d'arrêt. Textes : CIPRIO.T(en, fr). */
(() => {
  const T = (...a) => CIPRIO.T(...a);
  const esc = (s) => CIPRIO.esc(s);

  // ---------------------------------------------------------------- petit stade vu par une caméra Veo (SVG) : terrain + tribunes
  function P(x, y, z = 0, F = 260, tilt = 0.32) {
    const dx = x - 52.5, dy = 88 - y, H = 12;
    const zc = dy * Math.cos(tilt) + (H - z) * Math.sin(tilt), yu = dy * Math.sin(tilt) + (z - H) * Math.cos(tilt);
    return [200 + (F * dx) / zc, 112 - (F * yu) / zc];
  }
  const f1 = (p) => p.map((v) => v.toFixed(1)).join(" ");
  const ligne = (pts) => "M" + pts.map((p) => f1(P(p[0], p[1], p[2] || 0))).join("L");
  const cercle = (cx, cy, r) => ligne(Array.from({ length: 41 }, (_, i) => { const a = (Math.PI * 2 * i) / 40; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }));
  let graine = 7;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const COUL_PUBLIC = ["#c9d0cc", "#8b948f", "#b8423f", "#2f6fb5", "#e9eeeb", "#d9a52c", "#6d4a8f"];
  function tribunesSVG() {
    graine = 7;
    let out = "";
    const R = 8, pr = 3, mo = 1.9;
    // en face (derrière la touche éloignée) puis derrière chaque but
    const T3 = [(u, r) => [u, -5 - r * pr, r * mo], (u, r) => [-5 - r * pr, u, r * mo], (u, r) => [110 + r * pr, u, r * mo]];
    const bornes = [[-45, 150], [-25, 90], [-25, 90]];
    T3.forEach((f, k) => {
      const [a, b] = bornes[k];
      for (let r = 0; r < R; r++) {
        const p = [f(a, r), f(b, r), f(b, r + 1), f(a, r + 1)];
        out += `<path d="${ligne(p)}Z" fill="${r % 2 ? "#4a524e" : "#424a46"}"/>`;
      }
      const top = [f(a, R), f(b, R), [...f(b, R).slice(0, 2), R * mo + 4], [...f(a, R).slice(0, 2), R * mo + 4]];
      out += `<path d="${ligne(top)}Z" fill="#262d2a"/>`;
      for (let r = 0; r < R; r++) for (let u = a; u < b; u += 1.6) if (alea() < 0.7) {
        const q = f(u, r + 0.5), s = P(q[0], q[1], q[2] + 0.8);
        if (s[0] < -5 || s[0] > 405 || s[1] < -5 || s[1] > 230) continue;
        out += `<rect x="${s[0].toFixed(1)}" y="${s[1].toFixed(1)}" width="1.6" height="2" fill="${COUL_PUBLIC[Math.floor(alea() * COUL_PUBLIC.length)]}"/>`;
      }
    });
    return out;
  }
  let STADE = null;
  function terrainSVG(extra = "", vb = "0 0 400 225") {
    if (!STADE) {
      const d = [
        ligne([[0, 0], [105, 0], [105, 68], [0, 68], [0, 0]]), ligne([[52.5, 0], [52.5, 68]]), cercle(52.5, 34, 9.15),
        ligne([[0, 13.84], [16.5, 13.84], [16.5, 54.16], [0, 54.16]]), ligne([[105, 13.84], [88.5, 13.84], [88.5, 54.16], [105, 54.16]]),
        ligne([[0, 24.84], [5.5, 24.84], [5.5, 43.16], [0, 43.16]]), ligne([[105, 24.84], [99.5, 24.84], [99.5, 43.16], [105, 43.16]]),
      ];
      STADE = `<defs><linearGradient id="tw-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24323b"/><stop offset="1" stop-color="#3a4a52"/></linearGradient></defs>
        <rect width="400" height="225" fill="url(#tw-ciel)"/>${tribunesSVG()}
        <path d="${ligne([[-8, -4], [113, -4], [113, 90], [-8, 90]])}Z" fill="#174a2a"/><path d="${ligne([[-3, -2], [108, -2], [108, 90], [-3, 90]])}Z" fill="#1d5f34"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="${ligne([[i * 13.1, -2], [i * 13.1 + 6.5, -2], [i * 13.1 + 6.5, 90], [i * 13.1, 90]])}Z" fill="#1b5830"/>`).join("")}
        <g fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.1">${d.map((x) => `<path d="${x}"/>`).join("")}</g>`;
    }
    return `<svg class="tw-pitch" viewBox="${vb}" preserveAspectRatio="xMidYMid slice">${STADE}${extra}</svg>`;
  }
  // repères à pointer : même façon de demander que la vraie page (nom + description + petit schéma)
  const REPERES = () => [
    { k: "p1", x: 0, y: 0, n: T("Far left corner", "Coin éloigné gauche"), d: T("Where the left goal line meets the far touchline.", "Là où la ligne de but de gauche rencontre la touche éloignée.") },
    { k: "p2", x: 16.5, y: 13.84, bas: true, n: T("Left box, far corner", "Surface gauche, coin éloigné"), d: T("Corner of the left penalty box, on the far touchline side.", "Coin de la grande surface de gauche, côté touche éloignée.") },
    { k: "p3", x: 52.5, y: 0, n: T("Halfway, far touchline", "Médiane, touche éloignée"), d: T("Where the halfway line meets the far touchline.", "Là où la ligne médiane rencontre la touche éloignée.") },
    { k: "p4", x: 52.5, y: 34, n: T("Centre spot", "Point central"), d: T("The spot in the middle of the centre circle.", "Le point au milieu du rond central.") },
    { k: "p5", x: 88.5, y: 13.84, n: T("Right box, far corner", "Surface droite, coin éloigné"), d: T("Corner of the right penalty box, on the far touchline side.", "Coin de la grande surface de droite, côté touche éloignée.") },
  ];
  const pt = (r) => { const [u, v] = P(r.x, r.y); return `<circle data-t="${r.k}" class="tw-pt" cx="${u.toFixed(1)}" cy="${v.toFixed(1)}" r="5"/><text class="tw-ptn" data-t="${r.k}n" x="${(u + 7).toFixed(1)}" y="${(r.bas ? v + 13 : v - 7).toFixed(1)}"></text>`; };
  const schema = (r) => `<svg class="tw-schema" viewBox="-3 -3 111 74"><rect x="-3" y="-3" width="111" height="74" rx="3" fill="#1d5f34"/><g fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.2"><rect x="0" y="0" width="105" height="68"/><line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/><rect x="0" y="13.84" width="16.5" height="40.32"/><rect x="88.5" y="13.84" width="16.5" height="40.32"/></g><circle cx="${r.x}" cy="${r.y}" r="4.5" fill="#ff4d4f" stroke="#fff" stroke-width="1.5"/></svg>`;

  // petit tableau tactique (paysage, notre but à gauche)
  const BASE = [[6, 50], [22, 16], [20, 38], [20, 62], [22, 84], [44, 50], [52, 28], [52, 72], [74, 18], [80, 50], [74, 82]];
  const NUMS = [1, 2, 4, 5, 3, 6, 8, 10, null, 9, 11];
  const boardSVG = () => `<div class="tw-board" data-t="board"><svg viewBox="0 0 105 68" preserveAspectRatio="none"><rect width="105" height="68" fill="#1d5f34"/><g fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".4"><rect x=".5" y=".5" width="104" height="67"/><line x1="52.5" y1="0" x2="52.5" y2="68"/><circle cx="52.5" cy="34" r="9.15"/><rect x=".5" y="13.84" width="16.5" height="40.32"/><rect x="88" y="13.84" width="16.5" height="40.32"/></g></svg>
    ${BASE.map(([l, t], i) => `<span class="tw-pawn${NUMS[i] != null ? " on" : ""}" data-t="pw${i}" style="left:${l}%;top:${t}%">${NUMS[i] ?? ""}</span>`).join("")}</div>`;

  // ---------------------------------------------------------------- fausse fenêtre Ciprio (construite à l'ouverture, dans la langue du moment)
  function construire() {
  const MENU = [["nouveau", T("+ New video", "+ Nouvelle vidéo")], ["accueil", T("Home", "Accueil")], ["videos", T("Videos", "Vidéos")], ["rapports", T("Reports", "Rapports")], ["plans", T("Game plans", "Plans de jeu")], ["equipe", T("Your team", "Votre équipe")]];
  const curseur = `<svg class="tw-cursor" data-t="cursor" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9.5 19z" fill="#0c100e" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><span class="tw-ripple" data-t="ripple"></span><span class="tw-toast" data-t="toast"></span>`;
  const fenetre = (pages, cur = "accueil", extra = "") => `<div class="tw" data-t="tw">
      <div class="tw-bar"><i></i><i></i><i></i><span>ciprio.ai/app</span></div>
      <div class="tw-body"><aside class="tw-side">${MENU.map(([k, t]) => `<span data-t="m-${k}" class="${k === "nouveau" ? "pri" : ""}${k === cur ? " cur" : ""}">${esc(t)}</span>`).join("")}</aside>
        <div class="tw-main">${pages}</div></div>${extra}${curseur}</div>`;
  const page = (k, html, on) => `<section class="tw-page${on ? " on" : ""}" data-p="${k}">${html}</section>`;
  const tete = (t, s, btn) => `<div class="tw-h"><div><b>${t}</b>${s ? `<small>${s}</small>` : ""}</div>${btn || ""}</div>`;
  const accueilVide = page("accueil", tete(T("Home", "Accueil"), T("Hello, coach", "Bonjour, coach")) + `<div class="tw-ghost"><i></i><i></i><i style="width:60%"></i></div>`, true);
  const R5 = REPERES();
  const pointer = (r, i) => [["text", "ask", r.n], ["text", "askd", r.d], ["html", "sch", schema(r)], ["wait", 700], ["move", r.k, 850], ["click"], ["add", r.k, "on"], ["text", r.k + "n", r.n], ["text", "cnt", `${i + 1} / 5`], ["wait", 250]];

  const ETAPES = [
    {
      t: T("Send the video", "Envoyez la vidéo"), qui: T("You · 2 min", "Vous · 2 min"),
      l: [T("Film the whole match with a fixed camera, high up, at the halfway line (Veo or similar).", "Filmez tout le match avec une caméra fixe, en hauteur, au niveau de la médiane (Veo ou équivalent)."),
        T("Click “New video”: opponent, date, game plan of the match.", "Cliquez sur « Nouvelle vidéo » : adversaire, date, plan de jeu du match."),
        T("Drop the video file. Until file upload opens, paste the Veo share link instead.", "Déposez le fichier vidéo. En attendant l'ouverture de l'envoi de fichiers, collez le lien de partage Veo.")],
      a: ["#/nouveau", T("New video", "Nouvelle vidéo")],
      html: () => fenetre(accueilVide + page("nouveau", tete(T("New video", "Nouvelle vidéo"), T("Describe the match, then send the video", "Décrivez le match, puis envoyez la vidéo")) + `
        <div class="tw-2"><label>${T("Opponent", "Adversaire")}<span class="tw-in" data-t="adv"></span></label><label>${T("Date", "Date")}<span class="tw-in">29/11/2026</span></label></div>
        <label>${T("Game plan", "Plan de jeu")}<span class="tw-in sel">${T("vs FC Riverside · 4-3-3", "Contre FC Riverside · 4-3-3")}</span></label>
        <div class="tw-drop" data-t="drop"><span>${T("Drop the match video here", "Déposez la vidéo du match ici")}</span>
          <div class="tw-file" data-t="frow"><b>match_riverside.mp4</b><small>4,2 Go</small><span class="tw-bar2"><i data-t="fbar"></i></span></div></div>
        <span class="tw-btn" data-t="send">${T("Send the match →", "Envoyer le match →")}</span>`), "accueil", `
        <div class="tw-explo" data-t="explo"><div class="tw-bar"><i></i><i></i><i></i><span>${T("Videos", "Vidéos")}</span></div>
          <div class="tw-files"><span data-t="file"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="#0c100e"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg>match_riverside.mp4</span><span class="dim"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="#c9d0cc"/></svg>entrainement.mp4</span></div></div>`),
      script: [["wait", 600], ["move", "m-nouveau", 900], ["click"], ["page", "nouveau"], ["wait", 400], ["move", "adv", 600], ["click"], ["type", "adv", "FC Riverside"],
        ["add", "explo", "on"], ["wait", 500], ["move", "file", 800], ["add", "drop", "over"], ["drag", "file", "drop", 1300], ["rm", "drop", "over"], ["add", "frow", "on"],
        ["fill", "fbar", 100, 2000], ["rm", "explo", "on"], ["move", "send", 700], ["click"], ["toast", T("Match sent ✓ The analysis starts", "Match envoyé ✓ L'analyse démarre")], ["wait", 2200]],
    },
    {
      t: T("Write your game plan", "Écrivez votre plan de jeu"), qui: T("You · 5 min per match", "Vous · 5 min par match"),
      l: [T("Team instructions: pick a preset (pressing, block, build-up…) and rewrite the example your way.", "Consignes collectives : choisissez une présélection (pressing, bloc, relance…) et réécrivez l'exemple à votre façon."),
        T("Custom instructions: describe in your own words what you want, like a message to your players.", "Consignes personnalisées : décrivez avec vos mots ce que vous voulez, comme un message à vos joueurs."),
        T("Individual instructions: choose a player, then describe what you expect from him.", "Consignes individuelles : choisissez un joueur, puis décrivez ce que vous attendez de lui.")],
      a: ["#/plan/nouveau", T("Write a plan", "Écrire un plan")],
      html: () => fenetre(accueilVide + page("plan", tete(T("New game plan", "Nouveau plan de jeu"), T("vs FC Riverside", "Contre FC Riverside"), `<span class="tw-btn" data-t="savep">${T("Save", "Enregistrer")}</span>`) + `
        <div class="tw-sec"><b>${T("Team instructions", "Consignes collectives")}</b><small>${T("Presets", "Présélections")}</small>
          <span class="tw-chips"><i data-t="cPress">+ Pressing</i><i>+ ${T("Defensive block", "Bloc défensif")}</i><i>+ ${T("Build-up", "Relance")}</i><i>+ Transitions</i></span>
          <div class="tw-prow" data-t="row1"><em>Pressing</em><span class="tw-in area" data-t="t1"></span></div>
          <small>${T("Custom instructions", "Consignes personnalisées")}</small>
          <span class="tw-in area big" data-t="t2"></span></div>
        <div class="tw-sec"><b>${T("Individual instructions", "Consignes individuelles")}</b>
          <div class="tw-prow on"><em>#6 Ethan</em><span class="tw-in area" data-t="t3"></span></div></div>`), "plans"),
      script: [["wait", 600], ["move", "m-plans", 900], ["click"], ["page", "plan", "plans"], ["wait", 500], ["move", "cPress", 700], ["click"], ["add", "cPress", "on"], ["add", "row1", "on"],
        ["type", "t1", T("Press the ball carrier within 5 s of losing it, 3 players around him.", "Presser le porteur dans les 5 s après la perte, à 3 autour de lui."), 30],
        ["move", "t2", 700], ["click"], ["type", "t2", T("When their 6 receives facing his goal, our 10 cuts the pass to the centre back and the winger presses the full back.", "Quand leur 6 reçoit dos au jeu, notre 10 coupe la passe vers le central et l'ailier presse le latéral."), 28],
        ["move", "t3", 700], ["click"], ["type", "t3", T("Stay in front of the defence when we lose the ball.", "Rester devant la défense à la perte du ballon."), 32],
        ["move", "savep", 700], ["click"], ["toast", T("Plan saved ✓", "Plan enregistré ✓")], ["wait", 2200]],
    },
    {
      t: T("Set your line-up", "Faites votre composition"), qui: T("You · 2 min", "Vous · 2 min"),
      l: [T("Drag each player from your squad onto a pawn of the pitch.", "Glissez chaque joueur de votre effectif sur un pion du terrain."),
        T("Move the pawns to match your real shape: wingers lower, a deeper 6…", "Déplacez les pions pour coller à votre vraie animation : ailiers plus bas, 6 plus bas…"),
        T("Save: Ciprio compares this shape with what it sees on the match.", "Enregistrez : Ciprio compare cette animation avec ce qu'il voit sur le match.")],
      a: ["#/equipe", T("Your team", "Votre équipe")],
      html: () => fenetre(accueilVide + page("compo", tete(T("Your team", "Votre équipe"), T("Usual system · 4-3-3", "Système habituel · 4-3-3"), `<span class="tw-btn" data-t="savec">${T("Save", "Enregistrer")}</span>`) + `
        <div class="tw-tb">${boardSVG()}<div class="tw-squad"><small>${T("Squad", "Effectif")}</small><i data-t="j7">7 Lucas</i><i>12 Hugo</i><i>14 Tom</i><i>15 Adam</i></div></div>`), "equipe"),
      script: [["wait", 600], ["move", "m-equipe", 900], ["click"], ["page", "compo", "equipe"], ["wait", 500], ["move", "j7", 700], ["drag", "j7", "pw8", 1200], ["add", "pw8", "on"], ["text", "pw8", "7"], ["add", "j7", "used"], ["wait", 400],
        ["move", "pw10", 700], ["pion", "pw10", 66, 86, 1000], ["move", "pw8", 600], ["pion", "pw8", 66, 14, 1000], ["move", "pw5", 600], ["pion", "pw5", 38, 50, 900],
        ["move", "savec", 700], ["click"], ["toast", T("Line-up saved ✓", "Composition enregistrée ✓")], ["wait", 2200]],
    },
    {
      t: T("Ciprio prepares the match, you set up the pitch", "Ciprio prépare le match, vous réglez le terrain"), qui: T("Ciprio, then you · 5 min", "Ciprio, puis vous · 5 min"),
      l: [T("Ciprio watches the video and chooses a few images where the pitch markings are clear.", "Ciprio regarde la vidéo et choisit quelques images où les marquages du terrain sont nets."),
        T("A green banner appears: click “Set up the pitch”.", "Un bandeau vert apparaît : cliquez sur « Régler le terrain »."),
        T("Ciprio names each marking and shows where it is: click exactly on it. Can't see it? Say so: Ciprio calculates it (orange).", "Ciprio nomme chaque repère et montre où il est : cliquez exactement dessus. Vous ne le voyez pas ? Dites-le : Ciprio le calcule (orange)."),
        T("Your clicks are the reference of the whole analysis: Ciprio never moves them.", "Vos clics sont la référence de toute l'analyse : Ciprio ne les déplace jamais.")],
      html: () => fenetre(page("videos", tete(T("Videos", "Vidéos"), T("1 match", "1 match")) + `
        <div class="tw-row"><div class="d"><b>29</b><small>NOV</small></div><div><b>${T("vs FC Riverside", "Contre FC Riverside")}</b><span class="tw-bar2"><i data-t="vbar"></i></span></div><span class="tw-pill" data-t="st"></span></div>
        <small class="tw-lab">${T("Images chosen by Ciprio", "Images choisies par Ciprio")}</small>
        <div class="tw-thumbs">${["0 30 200 112", "100 50 200 112", "200 30 200 112", "60 70 240 135"].map((vb, i) => `<span data-t="th${i}">${terrainSVG("", vb)}</span>`).join("")}</div>
        <div class="tw-turn" data-t="turn"><b>${T("Your turn: set up the pitch", "À vous : réglez le terrain")}</b><span class="tw-btn light" data-t="go">${T("Set up the pitch →", "Régler le terrain →")}</span></div>`, true), "videos", `
        <div class="tw-layer" data-t="layer"><div class="tw-ask"><div class="tw-askt"><b data-t="ask"></b><small data-t="askd"></small></div><span data-t="sch"></span><b class="cnt" data-t="cnt">0 / 5</b><span class="tw-btn line" data-t="cant">${T("I can't see it", "Je ne le vois pas")}</span><span class="tw-btn" data-t="fin">${T("Finish", "Terminer")}</span></div>
          <div class="tw-img">${terrainSVG(R5.map(pt).join(""))}</div></div>`),
      script: [["text", "st", T("Video received", "Vidéo reçue")], ["fill", "vbar", 14, 600], ["wait", 700], ["text", "st", T("Preparing", "Préparation")], ["add", "st", "work"],
        ["fill", "vbar", 30, 1200], ["add", "th0", "on"], ["wait", 400], ["add", "th1", "on"], ["wait", 400], ["add", "th2", "on"], ["wait", 400], ["add", "th3", "on"], ["wait", 500],
        ["rm", "st", "work"], ["add", "st", "turn"], ["text", "st", T("Your turn", "À vous")], ["fill", "vbar", 38, 500], ["add", "turn", "on"], ["wait", 600],
        ["move", "go", 900], ["click"], ["add", "layer", "on"], ["wait", 500],
        ...R5.slice(0, 4).flatMap(pointer),
        ["text", "ask", R5[4].n], ["text", "askd", R5[4].d], ["html", "sch", schema(R5[4])], ["wait", 1100], ["move", "cant", 800], ["click"],
        ["add", "p5", "calc"], ["text", "p5n", T("calculated", "calculé")], ["text", "cnt", "5 / 5"], ["wait", 1200],
        ["move", "fin", 800], ["click"], ["toast", T("Pitch set up ✓", "Terrain réglé ✓")], ["wait", 2200]],
    },
    {
      t: T("Ciprio follows the whole match", "Ciprio suit tout le match"), qui: T("Ciprio · automatic", "Ciprio · automatique"), auto: true,
      l: [T("The pitch is followed image by image, then the 22 players, the ball and the team shape.", "Le terrain est suivi image par image, puis les 22 joueurs, le ballon et le bloc."),
        T("A quality check is run before anything reaches you.", "Un contrôle qualité est fait avant que quoi que ce soit vous parvienne.")],
      html: () => `<div class="tw dark" data-t="tw"><div class="tw-bar"><i></i><i></i><i></i><span>${T("Ciprio · tracking", "Ciprio · suivi")}</span></div>
        <div class="tw-cam"><canvas data-t="cv"></canvas>
          <div class="tw-hud"><span><i></i>${T("Tracking", "Suivi")}</span><span>22 ${T("players", "joueurs")}</span><span>${T("Ball", "Ballon")}</span><b data-t="min">0'</b></div>
          <div class="tw-hbar"><i data-t="tbar"></i></div></div></div>`,
      script: [["nocursor"], ["camera", "cv"], ["fill", "tbar", 100, 7000], ["count", "min", 0, 90, 7000, "'"], ["wait", 7200], ["text", "min", T("Check ✓", "Contrôle ✓")], ["wait", 1800]],
    },
    {
      t: T("Read the report", "Lisez le rapport"), qui: T("You", "Vous"),
      l: [T("The system: did it work? Possession, block height, compactness, balls won, shots.", "Le système : a-t-il fonctionné ? Possession, hauteur du bloc, compacité, ballons gagnés, tirs."),
        T("Team instructions: each one measured over the whole match.", "Consignes collectives : chacune mesurée sur tout le match."),
        T("Individual instructions: player by player, with the key video moments.", "Consignes individuelles : joueur par joueur, avec les moments vidéo clés.")],
      a: ["#/rapports", T("Reports", "Rapports")],
      html: () => fenetre(accueilVide + page("rapport", tete(T("vs FC Riverside · 2–1", "Contre FC Riverside · 2–1"), T("Report", "Rapport")) + `
        <div class="tw-tabs"><span data-t="tab1" class="on">${T("The system", "Le système")}</span><span data-t="tab2">${T("Team instructions", "Consignes collectives")}</span><span data-t="tab3">${T("Individual instructions", "Consignes individuelles")}</span></div>
        <div class="tw-pane on" data-t="pane1"><div class="tw-stats">${[[T("Possession", "Possession"), "54 %"], [T("Block height", "Hauteur du bloc"), "41 m"], [T("Compactness", "Compacité"), "33 m"], ["PPDA", "9,8"], [T("Balls won high", "Ballons gagnés haut"), "14"], [T("Shots", "Tirs"), "12 – 7"]].map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join("")}</div>
          <div class="tw-rep"><div class="r"><span>${T("Time in planned 4-3-3", "Temps dans le 4-3-3 prévu")}</span><span class="tw-bar2"><i data-t="s0"></i></span><b>78 %</b></div></div></div>
        <div class="tw-pane" data-t="pane2"><div class="tw-rep">${[[T("Press within 5 s of losing the ball", "Presser dans les 5 s après la perte"), 72], [T("Block under 35 m", "Bloc à moins de 35 m"), 64], [T("Short build-up", "Relance courte"), 81], [T("Zonal marking on corners", "Zone sur corners"), 55]]
          .map(([t, v], i) => `<div class="r"><span>${t}</span><span class="tw-bar2"><i data-t="b${i}"></i></span><b>${v} %</b></div>`).join("")}</div></div>
        <div class="tw-pane" data-t="pane3"><div class="tw-rep">${[["#6 Ethan · " + T("in front of the defence", "devant la défense"), 78], ["#7 Lucas · " + T("runs in behind", "appels dans le dos"), 61], ["#9 Jack · " + T("press the centre back", "presser le central"), 84], ["#3 Moussa · " + T("hold the width", "tenir la largeur"), 59]]
          .map(([t, v], i) => `<div class="r"><span>${t}</span><span class="tw-bar2"><i data-t="i${i}"></i></span><b>${v} %</b></div>`).join("")}</div></div>`), "rapports"),
      script: [["wait", 500], ["move", "m-rapports", 900], ["click"], ["page", "rapport"], ["fill", "s0", 78, 900], ["wait", 1800],
        ["move", "tab2", 800], ["click"], ["tab", "2"], ["fill", "b0", 72, 800], ["fill", "b1", 64, 800], ["fill", "b2", 81, 800], ["fill", "b3", 55, 800], ["wait", 1800],
        ["move", "tab3", 800], ["click"], ["tab", "3"], ["fill", "i0", 78, 800], ["fill", "i1", 61, 800], ["fill", "i2", 84, 800], ["fill", "i3", 59, 800], ["wait", 2400]],
    },
  ];
  return ETAPES;
  }

  // ---------------------------------------------------------------- lecteur d'une démonstration
  function jouer(scene, etape) {
    let fini = false, arretCam = null;
    const q = (k) => scene.querySelector(`[data-t="${k}"]`);
    const tw = q("tw"), cur = q("cursor"), rip = q("ripple");
    const att = (ms) => new Promise((r) => setTimeout(r, ms));
    const pos = { x: 0, y: 0 };
    const centre = (el) => { if (!el || !tw.isConnected) return { x: pos.x, y: pos.y }; const a = el.getBoundingClientRect(), b = tw.getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 }; };
    const placer = (x, y, ms) => { pos.x = x; pos.y = y; if (!cur) return; cur.style.transitionDuration = ms + "ms"; cur.style.transform = `translate(${x}px,${y}px)`; };
    if (cur) { const b = tw.getBoundingClientRect(); placer(b.width * 0.62, b.height * 0.7, 0); }
    const onde = () => { if (!rip) return; rip.style.left = pos.x + "px"; rip.style.top = pos.y + "px"; rip.classList.remove("go"); void rip.offsetWidth; rip.classList.add("go"); };
    async function op(o) {
      const [k, a, b, c, d, e] = o;
      if (!tw.isConnected) { fini = true; return; }
      if (k === "wait") return att(a);
      if (k === "nocursor") { if (cur) cur.style.display = "none"; return; }
      if (k === "move") { const p = centre(q(a)); placer(p.x, p.y, b); return att(b + 80); }
      if (k === "click") { onde(); return att(320); }                       // un clic = une onde verte, la souris ne bouge pas
      if (k === "page") {
        scene.querySelectorAll(".tw-page").forEach((p) => p.classList.toggle("on", p.dataset.p === a));
        scene.querySelectorAll(".tw-side span").forEach((s) => s.classList.toggle("cur", s.dataset.t === "m-" + (b || a)));
        return att(60);
      }
      if (k === "tab") { ["1", "2", "3"].forEach((n) => { q("tab" + n).classList.toggle("on", n === a); q("pane" + n).classList.toggle("on", n === a); }); return att(60); }
      if (k === "add") { q(a).classList.add(b); return; }
      if (k === "rm") { q(a).classList.remove(b); return; }
      if (k === "text") { q(a).textContent = b; return; }
      if (k === "html") { q(a).innerHTML = b; return; }
      if (k === "type") { const el = q(a); el.classList.add("typing"); for (const ch of b) { if (fini) return; el.textContent += ch; await att(c || 70); } el.classList.remove("typing"); return att(200); }
      if (k === "fill") { const el = q(a); el.style.transition = `width ${c}ms cubic-bezier(.3,.7,.3,1)`; el.style.width = b + "%"; return att(Math.min(c, 260)); }
      if (k === "count") { const el = q(a), t0 = performance.now(); (function f() { if (fini) return; const k2 = Math.min(1, (performance.now() - t0) / d); el.textContent = Math.round(b + (c - b) * k2) + (e || ""); if (k2 < 1) requestAnimationFrame(f); })(); return; }
      if (k === "toast") { const el = q("toast"); el.textContent = a; el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 1800); return att(300); }
      if (k === "camera") { if (window.CIPRIO_CAMERA) arretCam = CIPRIO_CAMERA.monter(q(a), { mode: "vert", haut: 0.5 }); return; }
      if (k === "pion") {                                                      // déplacer un pion sur le tableau
        const el = q(a); el.style.transition = `left ${d}ms cubic-bezier(.45,.05,.25,1), top ${d}ms cubic-bezier(.45,.05,.25,1)`;
        el.style.left = b + "%"; el.style.top = c + "%";
        const t0 = performance.now();
        await new Promise((res) => { (function f() { const p = centre(el); placer(p.x, p.y, 0); if (performance.now() - t0 < d + 40 && !fini) requestAnimationFrame(f); else res(); })(); });
        return att(150);
      }
      if (k === "drag") {
        const src = q(a), p1 = centre(src), p2 = centre(q(b));
        const g = src.cloneNode(true); g.removeAttribute("data-t"); g.className = (g.getAttribute("class") || "") + " tw-ghost-drag";
        const r = src.getBoundingClientRect(), tr = tw.getBoundingClientRect();
        Object.assign(g.style, { left: r.left - tr.left + "px", top: r.top - tr.top + "px", width: r.width + "px", transitionDuration: c + "ms" });
        tw.appendChild(g); void g.offsetWidth;
        g.style.transform = `translate(${p2.x - p1.x}px,${p2.y - p1.y}px) scale(.9)`;
        placer(p2.x, p2.y, c);
        await att(c + 60);
        g.remove(); return;
      }
    }
    (async () => {
      for (const o of etape.script) { if (fini) return; try { await op(o); } catch (e) { /* élément absent (démonstration remplacée) : on passe */ } }
      if (fini) return;
      await att(400);
      if (fini) return;
      if (arretCam) { arretCam(); arretCam = null; }
      scene.innerHTML = etape.html(); jouer(scene, etape);   // on recommence à zéro
    })();
    scene._stop = () => { fini = true; if (arretCam) arretCam(); };
  }

  // ---------------------------------------------------------------- l'écran complet
  function monter(racine, opts = {}) {
    const ETAPES = construire();
    let i = Math.max(0, Math.min(ETAPES.length - 1, opts.depart || 0));
    racine.innerHTML = `
      <nav class="tu-steps" role="tablist" style="grid-template-columns:repeat(${ETAPES.length},minmax(0,1fr))">${ETAPES.map((e, k) => `<button type="button" role="tab" data-i="${k}" class="${e.auto ? "auto" : ""}"><b>${String(k + 1).padStart(2, "0")}</b><span>${esc(e.t)}</span></button>`).join("")}</nav>
      <div class="tu-stage">
        <div class="tu-txt">
          <span class="tu-n" id="tu-n"></span><h2 id="tu-t"></h2><span class="tu-who" id="tu-who"></span>
          <ol id="tu-l"></ol><div id="tu-a"></div>
          <div class="tu-nav"><button type="button" class="tu-arrow" id="tu-prev" aria-label="${T("Previous step", "Étape précédente")}">←</button>
            <span id="tu-pos" class="tu-pos"></span>
            <button type="button" class="tu-arrow next" id="tu-next" aria-label="${T("Next step", "Étape suivante")}">→</button></div>
        </div>
        <div class="tu-demo"><div class="tu-scene" id="tu-scene"></div><span class="tu-play">${T("Live demo · loops", "Démonstration · en boucle")}</span></div>
      </div>`;
    const $ = (id) => racine.querySelector("#" + id), scene = $("tu-scene");
    function afficher(k) {
      i = (k + ETAPES.length) % ETAPES.length;
      const e = ETAPES[i];
      if (scene._stop) scene._stop();
      $("tu-n").textContent = `${T("Step", "Étape")} ${String(i + 1).padStart(2, "0")} / ${String(ETAPES.length).padStart(2, "0")}`;
      $("tu-t").textContent = e.t;
      $("tu-who").textContent = e.qui; $("tu-who").className = "tu-who" + (e.auto ? " auto" : "");
      $("tu-l").innerHTML = e.l.map((x) => `<li>${esc(x)}</li>`).join("");
      $("tu-a").innerHTML = e.a ? `<a class="btn btn-ink btn-sm" href="${e.a[0]}">${esc(e.a[1])} →</a>` : "";
      $("tu-pos").innerHTML = ETAPES.map((_, k2) => `<i class="${k2 === i ? "on" : k2 < i ? "done" : ""}"></i>`).join("");
      racine.querySelectorAll(".tu-steps button").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.i === i)));
      scene.innerHTML = e.html();
      requestAnimationFrame(() => jouer(scene, e));
    }
    racine.querySelectorAll(".tu-steps button").forEach((b) => b.addEventListener("click", () => afficher(+b.dataset.i)));
    $("tu-prev").addEventListener("click", () => afficher(i - 1));
    $("tu-next").addEventListener("click", () => afficher(i + 1));
    const clavier = (ev) => { if (!racine.isConnected) return document.removeEventListener("keydown", clavier); if (ev.target.closest("input,textarea,select")) return; if (ev.key === "ArrowRight") afficher(i + 1); if (ev.key === "ArrowLeft") afficher(i - 1); };
    document.addEventListener("keydown", clavier);
    afficher(i);
    return () => { if (scene._stop) scene._stop(); document.removeEventListener("keydown", clavier); };
  }
  window.CIPRIO_TUTO = { monter, nombre: () => construire().length };
})();
