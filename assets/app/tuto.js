/* « Comment ça marche » : chaque étape est une petite démonstration animée dans une fausse fenêtre Ciprio — une souris
   se déplace, clique, tape, fait glisser un fichier — comme un entraîneur qui le fait pour de vrai. Flèches ← → (et
   clavier) pour passer d'une étape à l'autre ; chaque démonstration tourne en boucle.
   CIPRIO_TUTO.monter(racine, { depart }) -> fonction d'arrêt. Textes : CIPRIO.T(en, fr). */
(() => {
  const T = (...a) => CIPRIO.T(...a);
  const esc = (s) => CIPRIO.esc(s);

  // ---------------------------------------------------------------- petit terrain vu par une caméra Veo (SVG)
  function P(x, y, F = 260, tilt = 0.32) {
    const dx = x - 52.5, dy = 88 - y, H = 12;
    const zc = dy * Math.cos(tilt) + H * Math.sin(tilt), yu = dy * Math.sin(tilt) - H * Math.cos(tilt);
    return [200 + (F * dx) / zc, 112 - (F * yu) / zc];
  }
  const ligne = (pts) => "M" + pts.map((p) => P(p[0], p[1]).map((v) => v.toFixed(1)).join(" ")).join("L");
  const cercle = (cx, cy, r, a0 = 0, a1 = Math.PI * 2) => ligne(Array.from({ length: 41 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 40; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }));
  function terrainSVG(extra = "", vb = "0 0 400 225") {
    const d = [
      ligne([[0, 0], [105, 0], [105, 68], [0, 68], [0, 0]]), ligne([[52.5, 0], [52.5, 68]]), cercle(52.5, 34, 9.15),
      ligne([[0, 13.84], [16.5, 13.84], [16.5, 54.16], [0, 54.16]]), ligne([[105, 13.84], [88.5, 13.84], [88.5, 54.16], [105, 54.16]]),
      ligne([[0, 24.84], [5.5, 24.84], [5.5, 43.16], [0, 43.16]]), ligne([[105, 24.84], [99.5, 24.84], [99.5, 43.16], [105, 43.16]]),
    ];
    const herbe = ligne([[-6, -4], [111, -4], [111, 80], [-6, 80]]);
    return `<svg class="tw-pitch" viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><rect width="400" height="225" fill="#13261b"/><path d="${herbe}Z" fill="#1d5f34"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="${ligne([[i * 13.1, -4], [i * 13.1 + 6.5, -4], [i * 13.1 + 6.5, 80], [i * 13.1, 80]])}Z" fill="#1b5830"/>`).join("")}
      <g fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.1">${d.map((x) => `<path d="${x}"/>`).join("")}</g>${extra}</svg>`;
  }
  const pt = (k, x, y) => { const [u, v] = P(x, y); return `<circle data-t="${k}" class="tw-pt" cx="${u.toFixed(1)}" cy="${v.toFixed(1)}" r="5"/><text class="tw-ptn" data-t="${k}n" x="${(u + 7).toFixed(1)}" y="${(v - 6).toFixed(1)}"></text>`; };

  // petit schéma de composition vu de dessus (4-3-3)
  const COMPO = [[50, 92], [15, 72], [38, 76], [62, 76], [85, 72], [30, 52], [50, 58], [70, 52], [18, 26], [50, 20], [82, 26]];
  const compoSVG = () => `<svg class="tw-compo" viewBox="0 0 100 100"><rect x="1" y="1" width="98" height="98" rx="3" fill="#1d5f34"/><g fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".6"><rect x="1" y="1" width="98" height="98" rx="3"/><line x1="1" y1="50" x2="99" y2="50"/><circle cx="50" cy="50" r="9"/><rect x="28" y="84" width="44" height="15"/><rect x="28" y="1" width="44" height="15"/></g>
    ${COMPO.map(([x, y], i) => `<g data-t="${i === 8 ? "slot" : "s" + i}" class="tw-slot${[0, 2, 3, 6, 9].includes(i) ? " on" : ""}"><circle cx="${x}" cy="${y}" r="5.2"/><text x="${x}" y="${y + 0.4}">${({ 0: 1, 2: 4, 3: 5, 6: 6, 9: 9 })[i] || ""}</text></g>`).join("")}</svg>`;

  // ---------------------------------------------------------------- fausse fenêtre Ciprio (construite à l'ouverture, dans la langue du moment)
  function construire() {
  const MENU = [["nouveau", T("+ New video", "+ Nouvelle vidéo")], ["accueil", T("Home", "Accueil")], ["videos", T("Videos", "Vidéos")], ["rapports", T("Reports", "Rapports")], ["plans", T("Game plans", "Plans de jeu")], ["equipe", T("Your team", "Votre équipe")]];
  const fenetre = (pages, cur = "accueil") => `<div class="tw" data-t="tw">
      <div class="tw-bar"><i></i><i></i><i></i><span>ciprio.ai/app</span></div>
      <div class="tw-body"><aside class="tw-side">${MENU.map(([k, t]) => `<span data-t="m-${k}" class="${k === "nouveau" ? "pri" : ""}${k === cur ? " cur" : ""}">${esc(t)}</span>`).join("")}</aside>
        <div class="tw-main">${pages}</div></div>
      <svg class="tw-cursor" data-t="cursor" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9.5 19z" fill="#0c100e" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <span class="tw-ripple" data-t="ripple"></span><span class="tw-toast" data-t="toast"></span></div>`;
  const page = (k, html, on) => `<section class="tw-page${on ? " on" : ""}" data-p="${k}">${html}</section>`;
  const tete = (t, s, btn) => `<div class="tw-h"><div><b>${t}</b>${s ? `<small>${s}</small>` : ""}</div>${btn || ""}</div>`;
  const accueilVide = page("accueil", tete(T("Home", "Accueil"), T("Hello, coach", "Bonjour, coach")) + `<div class="tw-ghost"><i></i><i></i><i style="width:60%"></i></div>`, true);

  // ---------------------------------------------------------------- les étapes
  const ETAPES = [
    {
      t: T("Create your team and register your players", "Créez votre équipe et inscrivez vos joueurs"), qui: T("You · 10 min, once", "Vous · 10 min, une seule fois"),
      l: [T("Open “Your team”: name, category, shirt colours.", "Ouvrez « Votre équipe » : nom, catégorie, couleurs de maillot."),
        T("“+ Register a player”: name, shirt number, positions, strong foot.", "« + Inscrire un joueur » : nom, numéro de maillot, postes, pied fort."),
        T("The numbers let Ciprio recognise your players on the video.", "Les numéros permettent à Ciprio de reconnaître vos joueurs sur la vidéo.")],
      a: ["#/equipe", T("Your team", "Votre équipe")],
      html: () => fenetre(accueilVide + page("equipe", tete(T("Your team", "Votre équipe"), "FC Exemple · U17 · 4-3-3", `<span class="tw-btn" data-t="add">${T("+ Register a player", "+ Inscrire un joueur")}</span>`) + `
        <div class="tw-tab"><div class="th"><span>N°</span><span>${T("Player", "Joueur")}</span><span>${T("Position", "Poste")}</span><span>${T("Foot", "Pied")}</span></div>
          <div><span>1</span><span>Nathan Roux</span><span>${T("Goalkeeper", "Gardien")}</span><span>${T("Right", "Droit")}</span></div>
          <div><span>4</span><span>Samir Benali</span><span>${T("Centre back", "Défenseur central")}</span><span>${T("Right", "Droit")}</span></div>
          <div><span>10</span><span>Yassine Haddad</span><span>${T("Attacking mid", "Milieu offensif")}</span><span>${T("Left", "Gauche")}</span></div>
          <div class="tw-new" data-t="new"><span>7</span><span>Lucas Martin</span><span>${T("Left winger", "Ailier gauche")}</span><span>${T("Left", "Gauche")}</span></div></div>
        <div class="tw-dlg" data-t="dlg"><b>${T("Register a player", "Inscrire un joueur")}</b>
          <label>${T("Name", "Prénom et nom")}<span class="tw-in" data-t="in1"></span></label>
          <div class="tw-2"><label>${T("Number", "Numéro")}<span class="tw-in" data-t="in2"></span></label><label>${T("Position", "Poste")}<span class="tw-in sel" data-t="in3"></span></label></div>
          <label>${T("Strong foot", "Pied fort")}<span class="tw-chips"><i>${T("Right", "Droit")}</i><i data-t="pg">${T("Left", "Gauche")}</i><i>${T("Both", "Les deux")}</i></span></label>
          <span class="tw-btn" data-t="save">${T("Save", "Enregistrer")}</span></div>`)),
      script: [["wait", 700], ["move", "m-equipe", 900], ["click"], ["page", "equipe"], ["wait", 500], ["move", "add", 800], ["click"], ["add", "dlg", "on"], ["wait", 350],
        ["move", "in1", 600], ["click"], ["type", "in1", "Lucas Martin"], ["move", "in2", 500], ["click"], ["type", "in2", "7"],
        ["move", "in3", 500], ["click"], ["text", "in3", T("Left winger", "Ailier gauche")], ["move", "pg", 500], ["click"], ["add", "pg", "on"],
        ["move", "save", 600], ["click"], ["rm", "dlg", "on"], ["add", "new", "on"], ["toast", T("Player registered ✓", "Joueur inscrit ✓")], ["wait", 2200]],
    },
    {
      t: T("Write your game plan", "Écrivez votre plan de jeu"), qui: T("You · 5 min per match", "Vous · 5 min par match"),
      l: [T("In “Game plans”: name the plan and choose your system.", "Dans « Plans de jeu » : nommez le plan et choisissez votre système."),
        T("Write your instructions, one action per line, with a target Ciprio can measure.", "Écrivez vos consignes, une action par ligne, avec un objectif que Ciprio peut mesurer."),
        T("Drag your registered players into the line-up.", "Faites glisser vos joueurs inscrits dans la composition.")],
      a: ["#/plan/nouveau", T("Write a plan", "Écrire un plan")],
      html: () => fenetre(accueilVide + page("plans", tete(T("Game plans", "Plans de jeu"), T("1 plan", "1 plan"), `<span class="tw-btn" data-t="newplan">${T("+ New plan", "+ Nouveau plan")}</span>`) + `
        <div class="tw-cards"><div class="tw-cardp"><b>4-4-2</b><span>${T("Mid block", "Bloc médian")}</span><small>${T("4 instructions", "4 consignes")}</small></div><div class="tw-cardp empty"></div></div>`) +
        page("edit", tete(T("New game plan", "Nouveau plan de jeu"), "", `<span class="tw-btn" data-t="savep">${T("Save", "Enregistrer")}</span>`) + `
        <div class="tw-plan"><div class="tw-col">
          <label>${T("Plan name", "Nom du plan")}<span class="tw-in" data-t="pname"></span></label>
          <label>${T("System", "Système")}<span class="tw-chips"><i data-t="s433">4-3-3</i><i>4-4-2</i><i>3-5-2</i><i>4-2-3-1</i></span></label>
          <label>${T("Team instruction", "Consigne collective")}<span class="tw-cons"><em>Pressing</em><span class="tw-in area" data-t="cons"></span></span></label>
          <label>${T("Your players", "Vos joueurs")}<span class="tw-pool"><i data-t="pl7">7 Lucas</i><i>10 Yassine</i><i>8 Ethan</i><i>11 Diego</i></span></label>
        </div><div class="tw-col c">${compoSVG()}</div></div>`)),
      script: [["wait", 600], ["move", "m-plans", 900], ["click"], ["page", "plans"], ["wait", 400], ["move", "newplan", 800], ["click"], ["page", "edit", "plans"], ["wait", 400],
        ["move", "pname", 600], ["click"], ["type", "pname", T("vs FC Riverside", "Contre FC Riverside")], ["move", "s433", 500], ["click"], ["add", "s433", "on"],
        ["move", "cons", 600], ["click"], ["type", "cons", T("Press within 5 s of losing the ball", "Presser dans les 5 s après la perte du ballon"), 38],
        ["move", "pl7", 600], ["drag", "pl7", "slot", 1100], ["add", "slot", "on"], ["text", "slot", "7"], ["add", "pl7", "used"],
        ["move", "savep", 700], ["click"], ["toast", T("Plan saved ✓", "Plan enregistré ✓")], ["wait", 2200]],
    },
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
        <span class="tw-btn" data-t="send">${T("Send the match →", "Envoyer le match →")}</span>`) + `
        <div class="tw-explo" data-t="explo"><div class="tw-bar"><i></i><i></i><i></i><span>${T("Videos", "Vidéos")}</span></div>
          <div class="tw-files"><span data-t="file"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="#0c100e"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg>match_riverside.mp4</span><span class="dim"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="#c9d0cc"/></svg>entrainement.mp4</span></div></div>`),
      script: [["wait", 600], ["move", "m-nouveau", 900], ["click"], ["page", "nouveau"], ["wait", 400], ["move", "adv", 600], ["click"], ["type", "adv", "FC Riverside"],
        ["add", "explo", "on"], ["wait", 500], ["move", "file", 800], ["add", "drop", "over"], ["drag", "file", "drop", 1300], ["rm", "drop", "over"], ["add", "frow", "on"],
        ["fill", "fbar", 100, 2000], ["rm", "explo", "on"], ["move", "send", 700], ["click"], ["toast", T("Match sent ✓ The analysis starts", "Match envoyé ✓ L'analyse démarre")], ["wait", 2200]],
    },
    {
      t: T("Ciprio prepares the match", "Ciprio prépare le match"), qui: T("Ciprio · automatic", "Ciprio · automatique"), auto: true,
      l: [T("Ciprio watches the video and chooses a few images where the pitch markings are clear.", "Ciprio regarde la vidéo et choisit quelques images où les marquages du terrain sont nets."),
        T("The bar at the top of the screen shows where it stands. Nothing to do.", "La barre en haut de l'écran montre où il en est. Rien à faire."),
        T("When it's your turn, a green banner appears.", "Quand c'est votre tour, un bandeau vert apparaît.")],
      html: () => fenetre(page("videos", tete(T("Videos", "Vidéos"), T("1 match", "1 match")) + `
        <div class="tw-row"><div class="d"><b>29</b><small>NOV</small></div><div><b>${T("vs FC Riverside", "Contre FC Riverside")}</b><span class="tw-bar2"><i data-t="vbar"></i></span></div><span class="tw-pill" data-t="st"></span></div>
        <small class="tw-lab">${T("Images chosen by Ciprio", "Images choisies par Ciprio")}</small>
        <div class="tw-thumbs">${["0 0 200 112", "100 30 200 112", "200 0 200 112", "40 60 240 135"].map((vb, i) => `<span data-t="th${i}">${terrainSVG("", vb)}</span>`).join("")}</div>
        <div class="tw-turn" data-t="turn"><b>${T("Your turn: set up the pitch", "À vous : réglez le terrain")}</b><span>${T("About 5 min →", "Environ 5 min →")}</span></div>`, true), "videos"),
      script: [["nocursor"], ["text", "st", T("Video received", "Vidéo reçue")], ["fill", "vbar", 14, 600], ["wait", 700], ["text", "st", T("Preparing", "Préparation")], ["add", "st", "work"],
        ["fill", "vbar", 30, 1400], ["add", "th0", "on"], ["wait", 450], ["add", "th1", "on"], ["wait", 450], ["add", "th2", "on"], ["wait", 450], ["add", "th3", "on"], ["wait", 600],
        ["rm", "st", "work"], ["add", "st", "turn"], ["text", "st", T("Your turn", "À vous")], ["fill", "vbar", 38, 500], ["add", "turn", "on"], ["wait", 2600]],
    },
    {
      t: T("Set up the pitch", "Réglez le terrain"), qui: T("You · about 5 min", "Vous · environ 5 min"),
      l: [T("On each image, click exactly on the marking asked (corner, box, centre circle…).", "Sur chaque image, cliquez exactement sur le repère demandé (coin, surface, rond central…)."),
        T("Can't see one? Say so: Ciprio calculates it and shows it in orange.", "Vous n'en voyez pas un ? Dites-le : Ciprio le calcule et le montre en orange."),
        T("Your clicks are the reference of the whole analysis: Ciprio never moves them.", "Vos clics sont la référence de toute l'analyse : Ciprio ne les déplace jamais.")],
      html: () => `<div class="tw dark" data-t="tw"><div class="tw-bar"><i></i><i></i><i></i><span>ciprio.ai/app/pointage</span></div>
        <div class="tw-ask"><span data-t="ask"></span><b data-t="cnt">0 / 5</b><span class="tw-btn line" data-t="cant">${T("I can't see it", "Je ne le vois pas")}</span><span class="tw-btn" data-t="fin">${T("Finish", "Terminer")}</span></div>
        <div class="tw-img">${terrainSVG(pt("p1", 0, 0) + pt("p2", 16.5, 13.84) + pt("p3", 52.5, 0) + pt("p4", 52.5, 34) + pt("p5", 88.5, 13.84))}</div>
        <svg class="tw-cursor" data-t="cursor" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9.5 19z" fill="#fff" stroke="#0c100e" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <span class="tw-ripple" data-t="ripple"></span><span class="tw-toast" data-t="toast"></span></div>`,
      script: [["wait", 500],
        ["text", "ask", T("Click: far left corner", "Cliquez : coin éloigné à gauche")], ["move", "p1", 900], ["click"], ["add", "p1", "on"], ["text", "p1n", "1"], ["text", "cnt", "1 / 5"],
        ["text", "ask", T("Click: corner of the left box", "Cliquez : coin de la surface gauche")], ["move", "p2", 700], ["click"], ["add", "p2", "on"], ["text", "p2n", "2"], ["text", "cnt", "2 / 5"],
        ["text", "ask", T("Click: halfway line, far touchline", "Cliquez : médiane, touche éloignée")], ["move", "p3", 700], ["click"], ["add", "p3", "on"], ["text", "p3n", "3"], ["text", "cnt", "3 / 5"],
        ["text", "ask", T("Click: centre spot", "Cliquez : point central")], ["move", "p4", 700], ["click"], ["add", "p4", "on"], ["text", "p4n", "4"], ["text", "cnt", "4 / 5"],
        ["text", "ask", T("Click: corner of the right box", "Cliquez : coin de la surface droite")], ["wait", 500], ["move", "cant", 800], ["click"],
        ["add", "p5", "calc"], ["text", "p5n", T("calculated", "calculé")], ["text", "cnt", "5 / 5"], ["text", "ask", T("Ciprio calculated it (orange). Drag it if it's off.", "Ciprio l'a calculé (orange). Faites-le glisser s'il est à côté.")], ["wait", 1200],
        ["move", "fin", 800], ["click"], ["toast", T("Pitch set up ✓", "Terrain réglé ✓")], ["wait", 2200]],
    },
    {
      t: T("Ciprio follows the whole match", "Ciprio suit tout le match"), qui: T("Ciprio · automatic", "Ciprio · automatique"), auto: true,
      l: [T("The pitch is followed image by image, then the 22 players, the ball and the team shape.", "Le terrain est suivi image par image, puis les 22 joueurs, le ballon et le bloc."),
        T("A quality check is run before anything reaches you.", "Un contrôle qualité est fait avant que quoi que ce soit vous parvienne.")],
      html: () => `<div class="tw dark" data-t="tw"><div class="tw-bar"><i></i><i></i><i></i><span>${T("Ciprio · tracking", "Ciprio · suivi")}</span></div>
        <div class="tw-cam"><canvas data-t="cv"></canvas>
          <div class="tw-hud"><span><i></i>${T("Tracking", "Suivi")}</span><span>22 ${T("players", "joueurs")}</span><span>${T("Ball", "Ballon")}</span><span>${T("Block", "Bloc")}</span><b data-t="min">0'</b></div>
          <div class="tw-hbar"><i data-t="tbar"></i></div></div></div>`,
      script: [["nocursor"], ["camera", "cv"], ["fill", "tbar", 100, 7000], ["count", "min", 0, 90, 7000, "'"], ["wait", 7200], ["text", "min", T("Check ✓", "Contrôle ✓")], ["wait", 1800]],
    },
    {
      t: T("Read the report", "Lisez le rapport"), qui: T("You", "Vous"),
      l: [T("Each instruction of your game plan, measured over the whole match.", "Chaque consigne de votre plan de jeu, mesurée sur tout le match."),
        T("Click an instruction: the key video moments to show in the debrief.", "Cliquez sur une consigne : les moments vidéo clés à montrer au débrief."),
        T("Then player by player.", "Puis joueur par joueur.")],
      a: ["#/rapports", T("Reports", "Rapports")],
      html: () => fenetre(accueilVide + page("rapport", tete(T("vs FC Riverside · 2–1", "Contre FC Riverside · 2–1"), T("Report · game plan 4-3-3", "Rapport · plan de jeu 4-3-3")) + `
        <div class="tw-rep">${[[T("Press within 5 s of losing the ball", "Presser dans les 5 s après la perte"), 72], [T("Block under 30 m", "Bloc à moins de 30 m"), 64], [T("Short build-up", "Relance courte"), 81], [T("Width in attack", "Largeur en attaque"), 55]]
          .map(([t, v], i) => `<div class="r" data-t="r${i}"><span>${t}</span><span class="tw-bar2"><i data-t="b${i}" data-v="${v}"></i></span><b>${v} %</b></div>`).join("")}</div>
        <div class="tw-moments" data-t="mom"><small class="tw-lab">${T("Key moments · pressing", "Moments clés · pressing")}</small>
          ${[["12'", T("won back in 3.1 s", "récupéré en 3,1 s")], ["34'", T("press too late (7 s)", "pressing trop tard (7 s)")], ["71'", T("won back in 2.4 s", "récupéré en 2,4 s")]].map(([m, t], i) => `<span>${terrainSVG("", ["60 20 200 112", "150 40 200 112", "20 30 200 112"][i])}<b>${m}</b><small>${t}</small></span>`).join("")}</div>`), "rapports"),
      script: [["wait", 500], ["move", "m-rapports", 900], ["click"], ["page", "rapport"], ["fill", "b0", 72, 900], ["fill", "b1", 64, 900], ["fill", "b2", 81, 900], ["fill", "b3", 55, 900], ["wait", 500],
        ["move", "r0", 800], ["click"], ["add", "r0", "sel"], ["add", "mom", "on"], ["wait", 2800]],
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
    const centre = (el) => { const a = el.getBoundingClientRect(), b = tw.getBoundingClientRect(); return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 }; };
    const placer = (x, y, ms) => { pos.x = x; pos.y = y; if (!cur) return; cur.style.transitionDuration = ms + "ms"; cur.style.transform = `translate(${x}px,${y}px)`; };
    if (cur) { const b = tw.getBoundingClientRect(); placer(b.width * 0.62, b.height * 0.7, 0); }
    async function op(o) {
      const [k, a, b, c, d, e] = o;
      if (k === "wait") return att(a);
      if (k === "nocursor") { if (cur) cur.style.display = "none"; return; }
      if (k === "move") { const p = centre(q(a)); placer(p.x, p.y, b); return att(b + 80); }
      if (k === "click") { if (cur) cur.classList.add("down"); if (rip) { rip.style.left = pos.x + "px"; rip.style.top = pos.y + "px"; rip.classList.remove("go"); void rip.offsetWidth; rip.classList.add("go"); } await att(180); if (cur) cur.classList.remove("down"); return att(120); }
      if (k === "page") {
        scene.querySelectorAll(".tw-page").forEach((p) => p.classList.toggle("on", p.dataset.p === a));
        scene.querySelectorAll(".tw-side span").forEach((s) => s.classList.toggle("cur", s.dataset.t === "m-" + (b || a)));
        return att(60);
      }
      if (k === "add") { q(a).classList.add(b); return; }
      if (k === "rm") { q(a).classList.remove(b); return; }
      if (k === "text") { q(a).textContent = b; return; }
      if (k === "type") { const el = q(a); el.classList.add("typing"); for (const ch of b) { if (fini) return; el.textContent += ch; await att(c || 70); } el.classList.remove("typing"); return att(200); }
      if (k === "fill") { const el = q(a); el.style.transition = `width ${c}ms cubic-bezier(.3,.7,.3,1)`; el.style.width = b + "%"; return att(Math.min(c, 260)); }
      if (k === "count") { const el = q(a), t0 = performance.now(); (function f() { if (fini) return; const k2 = Math.min(1, (performance.now() - t0) / d); el.textContent = Math.round(b + (c - b) * k2) + (e || ""); if (k2 < 1) requestAnimationFrame(f); })(); return; }
      if (k === "toast") { const el = q("toast"); el.textContent = a; el.classList.add("on"); setTimeout(() => el.classList.remove("on"), 1800); return att(300); }
      if (k === "camera") { if (window.CIPRIO_CAMERA) arretCam = CIPRIO_CAMERA.monter(q(a), { mode: "vert", haut: 0.42 }); return; }
      if (k === "drag") {
        const src = q(a), p1 = centre(src), p2 = centre(q(b));
        const g = src.cloneNode(true); g.removeAttribute("data-t"); g.className = (g.getAttribute("class") || "") + " tw-ghost-drag";
        const r = src.getBoundingClientRect(), tr = tw.getBoundingClientRect();
        Object.assign(g.style, { left: r.left - tr.left + "px", top: r.top - tr.top + "px", width: r.width + "px", transitionDuration: c + "ms" });
        tw.appendChild(g); void g.offsetWidth;
        if (cur) cur.classList.add("down");
        g.style.transform = `translate(${p2.x - p1.x}px,${p2.y - p1.y}px) scale(.9)`;
        placer(p2.x, p2.y, c);
        await att(c + 60);
        if (cur) cur.classList.remove("down");
        g.remove(); return;
      }
    }
    (async () => {
      while (!fini) {
        for (const o of etape.script) { if (fini) return; await op(o); }
        if (fini) return;
        await att(400);
        if (fini) return;
        if (arretCam) { arretCam(); arretCam = null; }
        scene.innerHTML = etape.html(); return jouer(scene, etape);   // on recommence à zéro
      }
    })();
    scene._stop = () => { fini = true; if (arretCam) arretCam(); };
  }

  // ---------------------------------------------------------------- l'écran complet
  function monter(racine, opts = {}) {
    const ETAPES = construire();
    let i = Math.max(0, Math.min(ETAPES.length - 1, opts.depart || 0));
    racine.innerHTML = `
      <nav class="tu-steps" role="tablist">${ETAPES.map((e, k) => `<button type="button" role="tab" data-i="${k}" class="${e.auto ? "auto" : ""}"><b>${String(k + 1).padStart(2, "0")}</b><span>${esc(e.t)}</span></button>`).join("")}</nav>
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
      $("tu-pos").innerHTML = ETAPES.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("");
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
