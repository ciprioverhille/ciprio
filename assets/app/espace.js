/* Espace coach de Ciprio (ciprio.ai/app) : une page, navigation par #/…
   Écrans : connexion / inscription (code par e-mail), Accueil, Nouvelle vidéo, Vidéos, fiche d'un match (suivi, plan de
   jeu, rapport, infos), Rapports, Plans de jeu, Votre équipe (effectif), Aide, Paramètres.
   Données : Supabase (profils, equipes, joueurs, plans_de_jeu, matchs, images_pointage, pointages) ; règles RLS côté base. */
(() => {
  const { sb, T, esc, ETATS, etatNom } = CIPRIO;
  const $ = (id) => document.getElementById(id);
  const view = $("view");
  const L = () => CIPRIO.lang();
  const fmtDate = (d, o = { day: "numeric", month: "long", year: "numeric" }) => (d ? new Intl.DateTimeFormat(L() === "fr" ? "fr-FR" : "en-GB", o).format(new Date(String(d).length === 10 ? d + "T12:00:00" : d)) : "");
  const msg = (el, text, kind = "") => { if (el) { el.textContent = text; el.className = "form-msg " + kind; } };
  let session = null, codeCtx = null;
  let D = null;                 // données du coach : profil, equipe, joueurs, plans, matchs, nb images / clics

  // ---------------------------------------------------------------- icônes
  const I = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    plus: I('<path d="M12 5v14M5 12h14"/>', 2),
    home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    video: I('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'),
    report: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    plan: I('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="3"/>'),
    team: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.3.2 3.9 1.8 4.5 4.5"/>'),
    help: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.3-2.4 3.8"/><path d="M12 17h.01"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: I('<path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 5.4-1.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/>'),
    lock: I('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  };

  // ---------------------------------------------------------------- référentiels
  const SYSTEMES = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "4-4-1-1", "3-5-2", "3-4-3", "5-3-2", "5-4-1"];
  const POSTES = [
    ["G", "GK", "Gardien", "Goalkeeper", "G"], ["DD", "RB", "Latéral droit", "Right back", "D"], ["DC", "CB", "Défenseur central", "Centre back", "D"],
    ["DG", "LB", "Latéral gauche", "Left back", "D"], ["MDC", "DM", "Milieu défensif", "Defensive mid", "M"], ["MC", "CM", "Milieu central", "Central mid", "M"],
    ["MOC", "AM", "Milieu offensif", "Attacking mid", "M"], ["AD", "RW", "Ailier droit", "Right winger", "A"], ["AG", "LW", "Ailier gauche", "Left winger", "A"],
    ["BU", "ST", "Avant-centre", "Striker", "A"],
  ];
  const poste = (k) => { const p = POSTES.find((x) => x[0] === k); return p ? (L() === "fr" ? p[0] : p[1]) : ""; };
  const posteNom = (k) => { const p = POSTES.find((x) => x[0] === k); return p ? (L() === "fr" ? p[2] : p[3]) : ""; };
  const ligne = (k) => { const p = POSTES.find((x) => x[0] === k); return p ? p[4] : ""; };
  const THEMES = [["pressing", "Pressing", "Pressing"], ["bloc", "Bloc défensif", "Defensive block"], ["relance", "Relance", "Build-up"],
    ["transition", "Transitions", "Transitions"], ["offensif", "Animation offensive", "Attacking play"], ["cpa", "Coups de pied arrêtés", "Set pieces"], ["autre", "Autre", "Other"]];
  const theme = (k) => { const t = THEMES.find((x) => x[0] === k); return t ? (L() === "fr" ? t[1] : t[2]) : k; };
  const CATEGORIES = ["Seniors", "U19", "U18", "U17", "U16", "U15", "U14", "U13", "Féminines / Women"];
  const FONCTIONS = [["entraineur", "Entraîneur principal", "Head coach"], ["adjoint", "Entraîneur adjoint", "Assistant coach"], ["analyste", "Analyste vidéo", "Video analyst"],
    ["preparateur", "Préparateur physique", "Fitness coach"], ["dirigeant", "Dirigeant", "Club official"], ["autre", "Autre", "Other"]];
  // positions (x, y en % du terrain, y = 100 au but de l'équipe) de chaque système, pour le petit schéma
  function placement(sys) {
    const rows = String(sys || "4-3-3").split("-").map(Number).filter(Boolean);
    const out = [[50, 92]];
    rows.forEach((n, r) => {
      const y = rows.length > 1 ? 78 - (r * 58) / (rows.length - 1) : 50;
      for (let i = 0; i < n; i++) out.push([((i + 1) * 100) / (n + 1), y]);
    });
    return out;
  }
  const pitchSVG = (sys) => `<div class="pitch" aria-label="${esc(sys || "")}"><span class="ring"></span>${placement(sys).map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join("")}</div>`;

  // ---------------------------------------------------------------- langue
  const langUI = () => document.querySelectorAll(".co-lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === L())));
  document.querySelectorAll(".co-lang button").forEach((b) => b.addEventListener("click", () => { CIPRIO.setLang(b.dataset.lang); langUI(); route(); }));
  langUI();

  // ---------------------------------------------------------------- œil des mots de passe
  function oeils(root = view) {
    root.querySelectorAll('input[type="password"]').forEach((inp) => {
      if (inp.parentNode.classList.contains("pw")) return;
      const box = document.createElement("div"); box.className = "pw";
      inp.parentNode.insertBefore(box, inp); box.appendChild(inp);
      const b = document.createElement("button"); b.type = "button"; b.innerHTML = ICON.eye;
      const lab = () => b.setAttribute("aria-label", inp.type === "password" ? T("Show password", "Afficher le mot de passe") : T("Hide password", "Masquer le mot de passe"));
      lab();
      b.addEventListener("click", () => { inp.type = inp.type === "password" ? "text" : "password"; b.innerHTML = inp.type === "password" ? ICON.eye : ICON.eyeOff; lab(); inp.focus(); });
      box.appendChild(b);
    });
  }

  const authErr = (e) => {
    const m = (e && e.message) || "";
    if (/invalid login/i.test(m)) return T("Wrong e-mail or password.", "E-mail ou mot de passe incorrect.");
    if (/not confirmed/i.test(m)) return T("Your e-mail is not confirmed yet.", "Votre e-mail n'est pas encore confirmé.");
    if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m)) return T("This code is wrong or has expired. Ask for a new one.", "Ce code est faux ou a expiré. Demandez-en un nouveau.");
    if (/rate limit|too many|security purposes/i.test(m)) return T("Too many e-mails sent. Please wait a few minutes and try again.", "Trop d'e-mails envoyés. Attendez quelques minutes puis réessayez.");
    if (/password.*(at least|short|weak)/i.test(m)) return T("Password too short: at least 8 characters.", "Mot de passe trop court : au moins 8 caractères.");
    if (/same.*password|different from the old/i.test(m)) return T("Choose a password different from the current one.", "Choisissez un mot de passe différent de l'actuel.");
    return m || T("Something went wrong. Try again.", "Un problème est survenu. Réessayez.");
  };

  // ================================================================ CONNEXION
  function authView(tab = "login") {
    view.innerHTML = `
      <div class="co-auth co-card">
        <h1>${T("Your Ciprio space", "Votre espace Ciprio")}</h1>
        <p class="muted">${T("Send your matches, set up the pitch, follow each analysis.", "Envoyez vos matchs, réglez le terrain, suivez chaque analyse.")}</p>
        <div class="co-tabs" role="tablist">
          <button role="tab" data-t="login" aria-selected="${tab === "login"}">${T("Log in", "Se connecter")}</button>
          <button role="tab" data-t="signup" aria-selected="${tab === "signup"}">${T("Create an account", "Créer un compte")}</button>
        </div>
        <form id="f" novalidate>
          ${tab === "signup" ? `
          <div class="field"><label for="nom">${T("Your name", "Votre nom")}</label><input id="nom" autocomplete="name" required></div>
          <div class="field"><label for="club">${T("Club", "Club")}</label><input id="club" autocomplete="organization"></div>` : ""}
          <div class="field"><label for="email">${T("E-mail", "E-mail")}</label><input id="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="mdp">${T("Password", "Mot de passe")}${tab === "signup" ? ` <small>${T("(8 characters min.)", "(8 caractères min.)")}</small>` : ""}</label>
            <input id="mdp" type="password" autocomplete="${tab === "signup" ? "new-password" : "current-password"}" minlength="8" required></div>
          <div class="co-actions">
            <button class="btn btn-ink" type="submit">${tab === "signup" ? T("Create my account →", "Créer mon compte →") : T("Log in →", "Se connecter →")}</button>
            ${tab === "login" ? `<button class="linkbtn" type="button" id="oubli">${T("Forgot your password?", "Mot de passe oublié ?")}</button>` : ""}
          </div>
          <p class="form-msg" id="m" role="status"></p>
        </form>
      </div>`;
    view.querySelectorAll(".co-tabs button").forEach((b) => b.addEventListener("click", () => authView(b.dataset.t)));
    oeils();
    const m = $("m");
    if ($("oubli")) $("oubli").addEventListener("click", () => forgotView($("email").value));
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = $("email").value.trim().toLowerCase(), password = $("mdp").value;
      if (!email || !password) return msg(m, T("Fill in your e-mail and password.", "Indiquez votre e-mail et votre mot de passe."), "err");
      msg(m, T("One moment…", "Un instant…"));
      if (tab === "signup") {
        if (password.length < 8) return msg(m, T("Password too short: at least 8 characters.", "Mot de passe trop court : au moins 8 caractères."), "err");
        const nom = $("nom").value.trim(), club = $("club").value.trim();
        if (!nom) return msg(m, T("Fill in your name.", "Indiquez votre nom."), "err");
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nom, club } } });
        if (error) return msg(m, authErr(error), "err");
        if (data.session) return route();
        if (data.user && (!data.user.identities || data.user.identities.length === 0))
          return msg(m, T("An account already exists with this e-mail: log in (or reset your password).", "Un compte existe déjà avec cet e-mail : connectez-vous (ou « mot de passe oublié »)."), "err");
        codeCtx = { email, type: "email" };
        return codeView();
      }
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error && /not confirmed/i.test(error.message)) {
        await sb.auth.resend({ type: "signup", email });
        codeCtx = { email, type: "email" };
        return codeView(T("Your e-mail isn't confirmed yet: we've just sent you a new code.", "Votre e-mail n'est pas encore confirmé : nous venons de vous envoyer un nouveau code."));
      }
      if (error) return msg(m, authErr(error), "err");
      location.hash = "#/";
      route();
    });
  }

  function codeView(note) {
    const rec = codeCtx.type === "recovery";
    view.innerHTML = `
      <div class="co-auth co-card">
        <h1>${T("Check your e-mails", "Regardez vos e-mails")}</h1>
        <p class="muted">${note ? esc(note) + " " : ""}${T("We sent a security code to", "Nous avons envoyé un code de sécurité à")} <b>${esc(codeCtx.email)}</b>. ${T("Type it below.", "Tapez-le ci-dessous.")}</p>
        <form id="f" novalidate>
          <div class="field"><label for="code">${T("Security code", "Code de sécurité")}</label>
            <input id="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></div>
          ${rec ? `<div class="field"><label for="mdp">${T("New password", "Nouveau mot de passe")} <small>${T("(8 characters min.)", "(8 caractères min.)")}</small></label><input id="mdp" type="password" autocomplete="new-password" minlength="8" required></div>` : ""}
          <div class="co-actions">
            <button class="btn btn-ink" type="submit">${rec ? T("Save my password →", "Enregistrer mon mot de passe →") : T("Confirm →", "Valider →")}</button>
            <button class="linkbtn" type="button" id="renvoi">${T("Send a new code", "Renvoyer un code")}</button>
            <button class="linkbtn" type="button" id="retour">${T("Back", "Retour")}</button>
          </div>
          <p class="form-msg" id="m" role="status"></p>
        </form>
      </div>`;
    const m = $("m");
    oeils();
    $("code").focus();
    $("retour").addEventListener("click", () => { codeCtx = null; authView("login"); });
    $("renvoi").addEventListener("click", async () => {
      msg(m, T("Sending…", "Envoi…"));
      const { error } = rec ? await sb.auth.resetPasswordForEmail(codeCtx.email) : await sb.auth.resend({ type: "signup", email: codeCtx.email });
      msg(m, error ? authErr(error) : T("New code sent.", "Nouveau code envoyé."), error ? "err" : "ok");
    });
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const token = $("code").value.replace(/\D/g, "");
      if (token.length < 6) return msg(m, T("The code has at least 6 digits.", "Le code a au moins 6 chiffres."), "err");
      if (rec && $("mdp").value.length < 8) return msg(m, T("Password too short: at least 8 characters.", "Mot de passe trop court : au moins 8 caractères."), "err");
      msg(m, T("Checking…", "Vérification…"));
      const { error } = await sb.auth.verifyOtp({ email: codeCtx.email, token, type: codeCtx.type });
      if (error) return msg(m, authErr(error), "err");
      if (rec) {
        const { error: e2 } = await sb.auth.updateUser({ password: $("mdp").value });
        if (e2) return msg(m, authErr(e2), "err");
      }
      codeCtx = null;
      location.hash = "#/";
      route();
    });
  }

  function forgotView(email0 = "") {
    view.innerHTML = `
      <div class="co-auth co-card">
        <h1>${T("Forgot your password?", "Mot de passe oublié ?")}</h1>
        <p class="muted">${T("Type your e-mail: you'll receive a security code to choose a new password.", "Indiquez votre e-mail : vous recevrez un code de sécurité pour choisir un nouveau mot de passe.")}</p>
        <form id="f" novalidate>
          <div class="field"><label for="email">${T("E-mail", "E-mail")}</label><input id="email" type="email" autocomplete="email" required value="${esc(email0)}"></div>
          <div class="co-actions"><button class="btn btn-ink" type="submit">${T("Receive a code →", "Recevoir un code →")}</button><button class="linkbtn" type="button" id="retour">${T("Back", "Retour")}</button></div>
          <p class="form-msg" id="m" role="status"></p>
        </form>
      </div>`;
    $("retour").addEventListener("click", () => authView("login"));
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = $("email").value.trim().toLowerCase();
      if (!email) return msg($("m"), T("Fill in your e-mail.", "Indiquez votre e-mail."), "err");
      msg($("m"), T("Sending…", "Envoi…"));
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) return msg($("m"), authErr(error), "err");
      codeCtx = { email, type: "recovery" };
      codeView();
    });
  }

  // ================================================================ DONNÉES
  async function charger() {
    const uid = session.user.id;
    const [p, e, j, pl, m, im, pt] = await Promise.all([
      sb.from("profils").select("*").eq("id", uid).maybeSingle(),
      sb.from("equipes").select("*").eq("coach_id", uid).order("cree_le"),
      sb.from("joueurs").select("*").eq("coach_id", uid).order("numero", { nullsFirst: false }).order("nom"),
      sb.from("plans_de_jeu").select("*").eq("coach_id", uid).order("maj_le", { ascending: false }),
      sb.from("matchs").select("*").eq("coach_id", uid).order("date_match", { ascending: false, nullsFirst: false }).order("cree_le", { ascending: false }),
      sb.from("images_pointage").select("match_id"),
      sb.from("pointages").select("match_id").eq("coach_id", uid),
    ]);
    const compte = (r) => (r.data || []).reduce((o, x) => ((o[x.match_id] = (o[x.match_id] || 0) + 1), o), {});
    D = { profil: p.data || { email: session.user.email }, equipes: e.data || [], joueurs: j.data || [], plans: pl.data || [], matchs: m.data || [], nImg: compte(im), nPt: compte(pt) };
    D.equipe = D.equipes[0] || null;
    return D;
  }
  const initiales = () => { const n = (D && D.profil.nom) || session.user.email; return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join(""); };

  // ---------------------------------------------------------------- états
  const EN_COURS = ["video_recue", "preparation", "a_pointer", "pointage_fini", "calcul", "controle"];
  const pillClass = (e) => (e === "a_pointer" ? "turn" : e === "termine" ? "done" : e === "erreur" ? "err" : ["preparation", "calcul", "controle"].includes(e) ? "work" : "");
  const pill = (e) => `<span class="pill ${pillClass(e)}">${esc(etatNom(e))}</span>`;
  const frise = (e) => { const i = ETATS.findIndex((x) => x.k === e); return `<div class="frise" aria-hidden="true">${ETATS.map((_, j) => `<span class="${j < i ? "on" : j === i ? "now" : ""}"></span>`).join("")}</div>`; };
  const pct = (e) => Math.round(((ETATS.findIndex((x) => x.k === e) + 1) / ETATS.length) * 100);
  const score = (m) => (m.score_nous != null && m.score_eux != null ? `${m.score_nous} – ${m.score_eux}` : "");
  function mrow(m) {
    const d = m.date_match ? new Date(m.date_match + "T12:00:00") : new Date(m.cree_le);
    return `<a class="mrow" href="#/match/${m.id}">
      <div class="date"><b>${d.getDate()}</b><span>${esc(fmtDate(d, { month: "short" }).replace(".", ""))}</span></div>
      <div><h3>${esc(m.titre)}</h3><p class="mmeta">${esc([m.competition, m.domicile === true ? T("Home", "Domicile") : m.domicile === false ? T("Away", "Extérieur") : ""].filter(Boolean).join(" · ") || fmtDate(d))}</p>
        ${m.etat !== "erreur" ? frise(m.etat) : ""}</div>
      <div class="r">${score(m) ? `<span class="score">${esc(score(m))}</span>` : ""}${pill(m.etat)}</div></a>`;
  }
  const vide = (icone, t1, t2, bouton) => `<div class="co-card empty">${icone}<p><b style="color:var(--ink)">${t1}</b></p>${t2 ? `<p class="small">${t2}</p>` : ""}${bouton || ""}</div>`;

  // ---------------------------------------------------------------- barre du haut + menu
  function majProgression() {
    const el = $("prog");
    if (!session || !D) { el.hidden = true; return; }
    el.hidden = false;
    const m = D.matchs.filter((x) => EN_COURS.includes(x.etat)).sort((a, b) => new Date(b.maj_le) - new Date(a.maj_le))[0];
    if (!m) { el.className = "co-prog idle"; el.href = "#/videos"; el.innerHTML = `<div class="t">${T("No task in progress", "Aucune tâche en cours")}</div>`; return; }
    el.className = "co-prog"; el.href = "#/match/" + m.id;
    el.innerHTML = `<div class="t"><b><span class="k">${T("In progress", "En cours")}</span>${esc(m.titre)}</b><span>${esc(etatNom(m.etat))} · ${pct(m.etat)} %</span></div><div class="bar"><i style="width:${pct(m.etat)}%"></i></div>`;
  }
  setInterval(async () => { if (session && D && D.matchs.some((x) => EN_COURS.includes(x.etat))) { await charger(); majProgression(); } }, 30000);

  function menu(h) {
    const aPointer = D.matchs.filter((x) => x.etat === "a_pointer").length;
    const cur = (k) => (k === h || (k === "/videos" && h.startsWith("/match/")) || (k === "/plans" && h.startsWith("/plan/")) ? ' aria-current="page"' : "");
    $("side").innerHTML = `
      <a class="primary" href="#/nouveau"${cur("/nouveau")}>${ICON.plus}${T("New video", "Nouvelle vidéo")}</a>
      <a href="#/"${cur("/")}>${ICON.home}${T("Home", "Accueil")}</a>
      <a href="#/videos"${cur("/videos")}>${ICON.video}${T("Videos", "Vidéos")}${aPointer ? `<span class="badge">${aPointer}</span>` : ""}</a>
      <a href="#/rapports"${cur("/rapports")}>${ICON.report}${T("Reports", "Rapports")}</a>
      <span class="grp">${T("Preparation", "Préparation")}</span>
      <a href="#/plans"${cur("/plans")}>${ICON.plan}${T("Game plans", "Plans de jeu")}</a>
      <a href="#/equipe"${cur("/equipe")}>${ICON.team}${T("Your team", "Votre équipe")}</a>
      <span class="spacer"></span>
      <a href="#/aide"${cur("/aide")}>${ICON.help}${T("Help", "Aide")}</a>
      <a href="#/parametres"${cur("/parametres")}>${ICON.gear}${T("Settings", "Paramètres")}</a>
      <div class="me"><span class="avatar">${esc(initiales())}</span><div><b>${esc(D.profil.nom || T("My account", "Mon compte"))}</b><span>${esc(session.user.email)}</span></div></div>`;
    $("avatar").textContent = initiales();
    $("avatar").hidden = false;
  }

  // ================================================================ ACCUEIL
  function accueilView() {
    const M = D.matchs, nom = D.profil.nom;
    const aPointer = M.filter((x) => x.etat === "a_pointer");
    const enCours = M.filter((x) => ["video_recue", "preparation", "pointage_fini", "calcul", "controle"].includes(x.etat));
    const finis = M.filter((x) => x.etat === "termine");
    const heure = new Date().getHours();
    const salut = heure < 18 ? T("Hello", "Bonjour") : T("Good evening", "Bonsoir");
    const etapes = [
      [!!(D.profil.nom && D.profil.club), T("Complete your profile", "Complétez votre profil"), "#/parametres"],
      [!!D.equipe, T("Create your team", "Créez votre équipe"), "#/equipe"],
      [D.joueurs.length >= 11, T("Add at least 11 players", "Ajoutez au moins 11 joueurs"), "#/equipe"],
      [D.plans.length > 0, T("Write your first game plan", "Écrivez votre premier plan de jeu"), "#/plan/nouveau"],
      [M.length > 0, T("Send your first video", "Envoyez votre première vidéo"), "#/nouveau"],
      [M.some((x) => ["pointage_fini", "calcul", "controle", "termine"].includes(x.etat)), T("Set up the pitch of a match", "Réglez le terrain d'un match"), "#/videos"],
    ];
    const faits = etapes.filter((e) => e[0]).length;
    view.innerHTML = `
      <div class="welcome">
        <div><span class="label">${esc(fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long" }))}</span>
          <h1>${nom ? `${salut}, ${esc(nom.split(" ")[0])}` : T("Welcome", "Bienvenue")}</h1>
          <p class="muted" style="margin-top:6px">${D.equipe ? esc([D.equipe.nom, D.equipe.club].filter(Boolean).join(" · ")) : T("Your match analysis space.", "Votre espace d'analyse de matchs.")}</p></div>
        <a class="btn btn-ink" href="#/nouveau">${T("+ New video", "+ Nouvelle vidéo")}</a>
      </div>
      ${aPointer.length ? `<div class="callout" style="margin-bottom:18px"><p><b>${T("Your turn:", "À vous :")}</b> ${aPointer.length > 1 ? T(`${aPointer.length} matches are waiting for you to set up the pitch.`, `${aPointer.length} matchs attendent que vous régliez le terrain.`) : T(`set up the pitch of “${esc(aPointer[0].titre)}”. About 5 minutes.`, `réglez le terrain de « ${esc(aPointer[0].titre)} ». Environ 5 minutes.`)}</p>
        <a class="btn btn-ink btn-sm" href="${aPointer.length > 1 ? "#/videos" : "/app/pointage?match=" + aPointer[0].id}">${T("Set up the pitch →", "Régler le terrain →")}</a></div>` : ""}
      <div class="grid g4" style="margin-bottom:18px">
        <div class="co-card kpi"><span class="k">${T("Videos", "Vidéos")}</span><b>${M.length}</b><small>${T("sent to Ciprio", "envoyées à Ciprio")}</small></div>
        <div class="co-card kpi"><span class="k">${T("In progress", "En cours")}</span><b>${enCours.length + aPointer.length}</b><small>${aPointer.length ? T(`${aPointer.length} waiting for you`, `dont ${aPointer.length} pour vous`) : T("being analysed", "en analyse")}</small></div>
        <div class="co-card kpi"><span class="k">${T("Reports", "Rapports")}</span><b>${finis.length}</b><small>${T("analyses completed", "analyses terminées")}</small></div>
        <div class="co-card kpi"><span class="k">${T("Squad", "Effectif")}</span><b>${D.joueurs.filter((x) => x.actif).length}</b><small>${T("active players", "joueurs actifs")}</small></div>
      </div>
      <div class="grid g-main">
        <div class="stack">
          <div class="co-card">
            <div class="toolbar" style="margin-bottom:12px"><h2>${T("Latest videos", "Dernières vidéos")}</h2><a class="linkbtn" href="#/videos">${T("See all", "Tout voir")}</a></div>
            ${M.length ? `<div class="mlist">${M.slice(0, 4).map(mrow).join("")}</div>` : `<div class="empty">${ICON.video}<p>${T("No video yet.", "Aucune vidéo pour l'instant.")}</p><a class="btn btn-ink btn-sm" href="#/nouveau">${T("Send a video", "Envoyer une vidéo")}</a></div>`}
          </div>
          <div class="co-card">
            <h2>${T("How it works", "Comment ça marche")}</h2>
            <div class="how">
              <div><b>${T("Film", "Filmez")}</b><p>${T("The whole match, camera fixed high up (Veo or similar).", "Le match entier, caméra fixe en hauteur (Veo ou équivalent).")}</p></div>
              <div><b>${T("Send", "Envoyez")}</b><p>${T("The video and your game plan for the match.", "La vidéo et votre plan de jeu du match.")}</p></div>
              <div><b>${T("Set up the pitch", "Réglez le terrain")}</b><p>${T("Point a few markings on images chosen by Ciprio.", "Pointez quelques repères sur des images choisies par Ciprio.")}</p></div>
              <div><b>${T("Read the report", "Lisez le rapport")}</b><p>${T("Your instructions measured, team and players.", "Vos consignes mesurées, équipe et joueurs.")}</p></div>
            </div>
          </div>
        </div>
        <div class="stack">
          <div class="co-card">
            <h2>${T("Getting started", "Pour bien démarrer")}</h2>
            <p class="sub">${faits} / ${etapes.length} ${T("done", "faites")}</p>
            <div class="meter"><i style="width:${Math.round((faits / etapes.length) * 100)}%"></i></div>
            <ul class="check">${etapes.map(([ok, t, h]) => `<li class="${ok ? "ok" : ""}"><a href="${h}"><i>${ok ? "✓" : ""}</i>${esc(t)}</a></li>`).join("")}</ul>
          </div>
          <div class="co-card">
            <h2>${T("Useful reading", "À lire")}</h2>
            <div class="links">
              <a href="${L() === "fr" ? "/fr" : ""}/blog/how-to-film-a-football-match" target="_blank" rel="noopener">${T("How to film a match", "Bien filmer un match")}<span>→</span></a>
              <a href="${L() === "fr" ? "/fr" : ""}/blog/measurable-individual-instructions-football" target="_blank" rel="noopener">${T("Instructions you can measure", "Des consignes mesurables")}<span>→</span></a>
              <a href="${L() === "fr" ? "/fr" : ""}/blog/how-to-run-a-football-video-debrief" target="_blank" rel="noopener">${T("Running a video debrief", "Mener un débrief vidéo")}<span>→</span></a>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ================================================================ NOUVELLE VIDÉO
  function nouveauView() {
    const fichierOk = CIPRIO_VIDEO.disponible();
    const eq = D.equipe;
    view.innerHTML = `
      <div class="co-head"><div><h1>${T("New video", "Nouvelle vidéo")}</h1><p>${T("Tell Ciprio about the match, then send the video. You can complete the details later.", "Décrivez le match à Ciprio, puis envoyez la vidéo. Vous pourrez compléter plus tard.")}</p></div></div>
      <form id="f" class="co-card" style="padding:0;max-width:820px" novalidate>
        <div class="fsec"><h3><span class="n">1</span>${T("The match", "Le match")}</h3>
          <div class="frow">
            <div class="field"><label for="adv">${T("Opponent", "Adversaire")}</label><input id="adv" required placeholder="${T("e.g. FC Riverside", "ex. FC Balma")}"></div>
            <div class="field"><label for="comp">${T("Competition", "Compétition")} <small>${T("(optional)", "(facultatif)")}</small></label><input id="comp" placeholder="${T("League, cup, friendly…", "Championnat, coupe, amical…")}"></div>
          </div>
          <div class="frow3">
            <div class="field"><label for="date">${T("Date", "Date")}</label><input id="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="field"><label for="dom">${T("Venue", "Lieu")}</label><select id="dom"><option value="1">${T("Home", "Domicile")}</option><option value="0">${T("Away", "Extérieur")}</option></select></div>
            <div class="field"><label>${T("Score", "Score")} <small>${T("(optional)", "(facultatif)")}</small></label><div style="display:flex;gap:8px;align-items:center"><input id="sn" type="number" min="0" max="99" placeholder="${T("Us", "Nous")}"><span class="muted">–</span><input id="se" type="number" min="0" max="99" placeholder="${T("Them", "Eux")}"></div></div>
          </div>
          ${D.equipes.length > 1 ? `<div class="field"><label for="eq">${T("Team", "Équipe")}</label><select id="eq">${D.equipes.map((x) => `<option value="${x.id}">${esc(x.nom)}</option>`).join("")}</select></div>` : ""}
        </div>
        <div class="fsec"><h3><span class="n">2</span>${T("Shirt colours", "Couleurs des maillots")}</h3>
          <p class="muted small" style="margin:-6px 0 14px">${T("Helps Ciprio tell the two teams apart.", "Aide Ciprio à distinguer les deux équipes.")}</p>
          <div class="frow">
            <div class="field"><label for="cn">${T("Your team", "Votre équipe")}</label><input id="cn" type="color" value="${esc((eq && eq.couleur_domicile) || "#12a150")}"></div>
            <div class="field"><label for="ce">${T("Opponent", "Adversaire")}</label><input id="ce" type="color" value="#e5484d"></div>
          </div>
        </div>
        <div class="fsec"><h3><span class="n">3</span>${T("Game plan", "Plan de jeu")}</h3>
          <p class="muted small" style="margin:-6px 0 14px">${T("Ciprio will measure the match against these instructions.", "Ciprio mesurera le match par rapport à ces consignes.")}</p>
          ${D.plans.length ? `<div class="field"><label for="plan">${T("Choose a plan", "Choisir un plan")}</label><select id="plan"><option value="">${T("No plan for this match", "Pas de plan pour ce match")}</option>${D.plans.map((p) => `<option value="${p.id}">${esc(p.nom)}${p.systeme ? " · " + esc(p.systeme) : ""}</option>`).join("")}</select></div>`
            : `<div class="callout info"><p class="small">${T("You don't have a game plan yet. You can add one to this match later.", "Vous n'avez pas encore de plan de jeu. Vous pourrez en ajouter un à ce match plus tard.")}</p><a class="btn btn-line btn-sm" href="#/plan/nouveau">${T("Write a plan", "Écrire un plan")}</a></div>`}
        </div>
        <div class="fsec"><h3><span class="n">4</span>${T("The video", "La vidéo")}</h3>
          <label class="radio ${fichierOk ? "" : "off"}"><input type="radio" name="src" value="fichier" ${fichierOk ? "" : "disabled"}><span>${T("Upload the file", "Envoyer le fichier")}<small>${fichierOk ? T("Veo export, 3 to 8 GB.", "Export Veo, 3 à 8 Go.") : T("Coming soon: video storage is being set up.", "Bientôt : le stockage des vidéos est en cours de mise en place.")}</small></span></label>
          <label class="radio"><input type="radio" name="src" value="lien" checked><span>${T("Veo share link", "Lien de partage Veo")}<small>${T("Ciprio fetches the video from Veo.", "Ciprio récupère la vidéo sur Veo.")}</small></span></label>
          <label class="radio"><input type="radio" name="src" value="local"><span>${T("Ciprio already has the video", "Ciprio a déjà la vidéo")}<small>${T("Sent another way (test matches).", "Envoyée autrement (matchs de test).")}</small></span></label>
          <div class="field" id="lienbox" style="margin-top:10px"><label for="lien">${T("Link", "Lien")}</label><input id="lien" type="url" placeholder="https://app.veo.co/matches/…"></div>
          <div class="field" id="fichbox" hidden><input id="fich" type="file" accept="video/*"></div>
          <div class="co-actions" style="margin-top:14px"><button class="btn btn-ink" type="submit">${T("Send the match →", "Envoyer le match →")}</button><a class="linkbtn" href="#/videos">${T("Cancel", "Annuler")}</a></div>
          <p class="form-msg" id="m" role="status"></p>
        </div>
      </form>`;
    const src = () => view.querySelector("input[name=src]:checked").value;
    view.querySelectorAll("input[name=src]").forEach((r) => r.addEventListener("change", () => { $("lienbox").hidden = src() !== "lien"; $("fichbox").hidden = src() !== "fichier"; }));
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const m = $("m"), adv = $("adv").value.trim();
      if (!adv) return msg(m, T("Fill in the opponent.", "Indiquez l'adversaire."), "err");
      const video = { type: src() };
      if (video.type === "lien") {
        const lien = $("lien").value.trim();
        if (!/^https?:\/\//.test(lien)) return msg(m, T("Paste the Veo share link.", "Collez le lien de partage Veo."), "err");
        video.lien = lien;
      }
      if (video.type === "fichier" && !$("fich").files[0]) return msg(m, T("Choose the video file.", "Choisissez le fichier vidéo."), "err");
      const plan = $("plan") && $("plan").value ? D.plans.find((p) => p.id === $("plan").value) : null;
      const n = (id) => ($(id).value === "" ? null : Number($(id).value));
      msg(m, T("Sending…", "Envoi…"));
      const rec = { coach_id: session.user.id, titre: (L() === "fr" ? "Contre " : "vs ") + adv, adversaire: adv, competition: $("comp").value.trim() || null,
        date_match: $("date").value || null, domicile: $("dom").value === "1", score_nous: n("sn"), score_eux: n("se"),
        couleur_nous: $("cn").value, couleur_eux: $("ce").value, equipe_id: ($("eq") && $("eq").value) || (D.equipe && D.equipe.id) || null,
        plan: plan ? { plan_id: plan.id, nom: plan.nom, systeme: plan.systeme, consignes: plan.consignes, individuelles: plan.individuelles } : {}, video, etat: "cree" };
      const { data, error } = await sb.from("matchs").insert(rec).select("id").single();
      if (error) return msg(m, error.message, "err");
      if (video.type === "fichier") {
        try { await CIPRIO_VIDEO.envoyer(data.id, $("fich").files[0], (p) => msg(m, T("Uploading… ", "Envoi… ") + Math.round(p * 100) + " %")); }
        catch (e) { return msg(m, String(e.message || e), "err"); }
      }
      await charger();
      location.hash = "#/match/" + data.id;
    });
  }

  // ================================================================ VIDÉOS
  let filtre = "tous", recherche = "";
  function videosView() {
    const F = { tous: () => true, pour_vous: (m) => m.etat === "a_pointer", en_cours: (m) => EN_COURS.includes(m.etat) && m.etat !== "a_pointer" || m.etat === "cree", termines: (m) => m.etat === "termine", erreur: (m) => m.etat === "erreur" };
    const noms = { tous: T("All", "Toutes"), pour_vous: T("Your turn", "À vous"), en_cours: T("In progress", "En cours"), termines: T("Done", "Terminées"), erreur: T("Problem", "Problème") };
    const draw = () => {
      const q = recherche.toLowerCase();
      const L2 = D.matchs.filter(F[filtre]).filter((m) => !q || [m.titre, m.adversaire, m.competition].join(" ").toLowerCase().includes(q));
      $("liste").innerHTML = L2.length ? L2.map(mrow).join("") : (D.matchs.length ? `<div class="co-card empty"><p>${T("No video matches this filter.", "Aucune vidéo pour ce filtre.")}</p></div>`
        : vide(ICON.video, T("No video yet", "Aucune vidéo pour l'instant"), T("Send your first match: Ciprio takes care of the rest.", "Envoyez votre premier match : Ciprio s'occupe du reste."), `<a class="btn btn-ink btn-sm" href="#/nouveau">${T("+ New video", "+ Nouvelle vidéo")}</a>`));
      view.querySelectorAll(".chips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === filtre)));
    };
    view.innerHTML = `
      <div class="co-head"><div><h1>${T("Videos", "Vidéos")}</h1><p>${T("All your matches and where each analysis stands.", "Tous vos matchs et où en est chaque analyse.")}</p></div>
        <div class="actions"><a class="btn btn-ink" href="#/nouveau">${T("+ New video", "+ Nouvelle vidéo")}</a></div></div>
      <div class="toolbar">
        <div class="chips" role="group">${Object.keys(F).map((k) => `<button type="button" data-f="${k}">${noms[k]}<span class="c">${D.matchs.filter(F[k]).length}</span></button>`).join("")}</div>
        <label class="search">${ICON.search}<input id="q" type="search" placeholder="${T("Search a match", "Chercher un match")}" value="${esc(recherche)}"></label>
      </div>
      <div class="mlist" id="liste"></div>`;
    view.querySelectorAll(".chips button").forEach((b) => b.addEventListener("click", () => { filtre = b.dataset.f; draw(); }));
    $("q").addEventListener("input", (e) => { recherche = e.target.value; draw(); });
    draw();
  }

  // ================================================================ FICHE D'UN MATCH
  async function matchView(id, onglet = "suivi") {
    const m = D.matchs.find((x) => x.id === id);
    if (!m) { view.innerHTML = `<a class="back" href="#/videos">← ${T("Videos", "Vidéos")}</a>${vide("", T("Match not found", "Match introuvable"), "")}`; return; }
    const i = ETATS.findIndex((x) => x.k === m.etat);
    const nImg = D.nImg[m.id] || 0, nPt = D.nPt[m.id] || 0;
    const tabs = [["suivi", T("Progress", "Suivi")], ["plan", T("Game plan", "Plan de jeu")], ["rapport", T("Report", "Rapport")], ["infos", T("Details", "Infos")]];
    let corps = "";
    if (onglet === "suivi") {
      let action = "";
      if (m.etat === "a_pointer") action = `<div class="callout" style="margin-top:18px"><p><b>${T("It's your turn.", "C'est à vous.")}</b> ${T("Point a few markings of the pitch on the images Ciprio chose. About 5 minutes.", "Pointez quelques repères du terrain sur les images choisies par Ciprio. Environ 5 minutes.")}${nImg ? ` <span class="muted">(${nPt}/${nImg} ${T("images done", "images faites")})</span>` : ""}</p><a class="btn btn-ink btn-sm" href="/app/pointage?match=${m.id}">${T("Set up the pitch →", "Régler le terrain →")}</a></div>`;
      else if (m.etat === "erreur") action = `<div class="callout err" style="margin-top:18px"><p><b>${T("A problem occurred.", "Un problème est survenu.")}</b> ${T("Ciprio has been notified and will get back to you.", "Ciprio est prévenu et revient vers vous.")}</p></div>`;
      else if (m.etat === "cree") action = `<div class="callout info" style="margin-top:18px"><p>${T("Ciprio will fetch the video and prepare the images to point. You'll be notified here.", "Ciprio va récupérer la vidéo et préparer les images à pointer. Vous le verrez ici.")}</p></div>`;
      else if (m.etat === "termine") action = `<div class="callout" style="margin-top:18px"><p><b>${T("Analysis complete.", "Analyse terminée.")}</b> ${T("Open the report.", "Ouvrez le rapport.")}</p><a class="btn btn-ink btn-sm" href="#/match/${m.id}/rapport">${T("See the report →", "Voir le rapport →")}</a></div>`;
      else if (["pointage_fini", "calcul", "controle"].includes(m.etat)) action = `<div class="callout info" style="margin-top:18px"><p>${T("Pitch set up ✓ Ciprio is now working on the whole match. Nothing to do on your side.", "Terrain réglé ✓ Ciprio travaille maintenant sur tout le match. Rien à faire de votre côté.")}</p>${nImg ? `<a class="btn btn-line btn-sm" href="/app/pointage?match=${m.id}">${T("See my markings", "Revoir mes repères")}</a>` : ""}</div>`;
      corps = `<div class="grid g-main"><div class="co-card"><h2>${T("Analysis progress", "Avancement de l'analyse")}</h2>
          <ol class="steps">${ETATS.map((e, j) => `<li class="${m.etat === "erreur" ? "" : j < i ? "on" : j === i ? "now" : ""}"><b>${j < i ? "✓" : j + 1}</b>${esc(T(e.en, e.fr))}</li>`).join("")}</ol>${action}</div>
        <div class="stack"><div class="co-card"><h2>${T("Match", "Match")}</h2><dl class="dl" style="margin-top:14px">
          <dt>${T("Opponent", "Adversaire")}</dt><dd>${esc(m.adversaire || "–")}</dd>
          <dt>${T("Competition", "Compétition")}</dt><dd>${esc(m.competition || "–")}</dd>
          <dt>${T("Date", "Date")}</dt><dd>${esc(fmtDate(m.date_match) || "–")}</dd>
          <dt>${T("Venue", "Lieu")}</dt><dd>${m.domicile == null ? "–" : m.domicile ? T("Home", "Domicile") : T("Away", "Extérieur")}</dd>
          <dt>${T("Score", "Score")}</dt><dd>${esc(score(m) || "–")}</dd>
          <dt>${T("Colours", "Couleurs")}</dt><dd>${m.couleur_nous ? `<span class="swatch" style="background:${esc(m.couleur_nous)}"></span>` : ""}${m.couleur_eux ? `<span class="swatch" style="background:${esc(m.couleur_eux)}"></span>` : ""}${!m.couleur_nous && !m.couleur_eux ? "–" : ""}</dd>
          <dt>${T("Video", "Vidéo")}</dt><dd>${esc(({ lien: T("Veo link", "Lien Veo"), local: T("At Ciprio", "Chez Ciprio"), fichier: (m.video && m.video.nom) || T("File", "Fichier") })[(m.video || {}).type] || "–")}</dd>
        </dl><div class="co-actions" style="margin-top:16px"><a class="btn btn-line btn-sm" href="#/match/${m.id}/infos">${T("Edit", "Modifier")}</a></div></div></div></div>`;
    } else if (onglet === "plan") {
      const p = m.plan || {};
      const joueur = (jid) => { const j = D.joueurs.find((x) => x.id === jid); return j ? `${j.numero != null ? "#" + j.numero + " " : ""}${[j.prenom, j.nom].filter(Boolean).join(" ")}` : T("Player", "Joueur"); };
      corps = `<div class="grid g-main"><div class="co-card">
          <div class="toolbar" style="margin-bottom:6px"><h2>${p.nom ? esc(p.nom) : T("No game plan for this match", "Pas de plan de jeu pour ce match")}</h2>${p.systeme ? `<span class="tag">${esc(p.systeme)}</span>` : ""}</div>
          ${(p.consignes || []).length ? `<h3 class="flabel" style="margin-top:14px">${T("Team instructions", "Consignes collectives")}</h3>${p.consignes.map((c) => `<div class="consigne"><span class="tag">${esc(theme(c.theme))}</span><div>${esc(c.texte)}${c.mesure ? `<small>${T("Target: ", "Objectif : ")}${esc(c.mesure)}</small>` : ""}</div></div>`).join("")}` : ""}
          ${(p.individuelles || []).length ? `<h3 class="flabel" style="margin-top:18px">${T("Individual instructions", "Consignes individuelles")}</h3>${p.individuelles.map((c) => `<div class="consigne"><span class="tag">${esc(joueur(c.joueur_id))}</span><div>${esc(c.texte)}</div></div>`).join("")}` : ""}
          ${!p.nom ? `<p class="muted small" style="margin-top:8px">${T("Choose one of your plans: Ciprio will measure the match against it.", "Choisissez un de vos plans : Ciprio mesurera le match par rapport à lui.")}</p>` : ""}
          <div class="field" style="margin-top:18px"><label for="plan">${T("Plan for this match", "Plan de ce match")}</label><select id="plan"><option value="">${T("No plan", "Aucun plan")}</option>${D.plans.map((x) => `<option value="${x.id}" ${p.plan_id === x.id ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}</select></div>
          <div class="co-actions"><button class="btn btn-ink btn-sm" id="savePlan" type="button">${T("Use this plan", "Utiliser ce plan")}</button><a class="linkbtn" href="#/plan/nouveau">${T("Write a new plan", "Écrire un nouveau plan")}</a></div>
          <p class="form-msg" id="m"></p></div>
        <div class="co-card"><h2>${T("System", "Système")}</h2><p class="sub">${esc(p.systeme || T("not set", "non précisé"))}</p>${pitchSVG(p.systeme || (D.equipe && D.equipe.systeme) || "4-3-3")}</div></div>`;
    } else if (onglet === "rapport") {
      const pret = m.etat === "termine";
      corps = rapportApercu(pret);
    } else {
      corps = `<form id="f" class="co-card" style="max-width:760px" novalidate>
        <div class="frow"><div class="field"><label for="adv">${T("Opponent", "Adversaire")}</label><input id="adv" value="${esc(m.adversaire || "")}"></div>
          <div class="field"><label for="comp">${T("Competition", "Compétition")}</label><input id="comp" value="${esc(m.competition || "")}"></div></div>
        <div class="frow3"><div class="field"><label for="date">${T("Date", "Date")}</label><input id="date" type="date" value="${esc(m.date_match || "")}"></div>
          <div class="field"><label for="dom">${T("Venue", "Lieu")}</label><select id="dom"><option value="1" ${m.domicile !== false ? "selected" : ""}>${T("Home", "Domicile")}</option><option value="0" ${m.domicile === false ? "selected" : ""}>${T("Away", "Extérieur")}</option></select></div>
          <div class="field"><label>${T("Score", "Score")}</label><div style="display:flex;gap:8px;align-items:center"><input id="sn" type="number" min="0" max="99" value="${m.score_nous ?? ""}"><span class="muted">–</span><input id="se" type="number" min="0" max="99" value="${m.score_eux ?? ""}"></div></div></div>
        <div class="frow"><div class="field"><label for="cn">${T("Your shirts", "Vos maillots")}</label><input id="cn" type="color" value="${esc(m.couleur_nous || "#12a150")}"></div>
          <div class="field"><label for="ce">${T("Opponent's shirts", "Maillots adverses")}</label><input id="ce" type="color" value="${esc(m.couleur_eux || "#e5484d")}"></div></div>
        <div class="field"><label for="notes">${T("Notes", "Notes")} <small>${T("(for you)", "(pour vous)")}</small></label><textarea id="notes">${esc(m.notes || "")}</textarea></div>
        <div class="co-actions"><button class="btn btn-ink" type="submit">${T("Save", "Enregistrer")}</button></div><p class="form-msg" id="m"></p></form>`;
    }
    view.innerHTML = `<a class="back" href="#/videos">← ${T("Videos", "Vidéos")}</a>
      <div class="co-head"><div><span class="label">${esc([fmtDate(m.date_match), m.competition].filter(Boolean).join(" · "))}</span><h1>${esc(m.titre)}${score(m) ? ` <span class="muted" style="font-weight:500">${esc(score(m))}</span>` : ""}</h1></div>${pill(m.etat)}</div>
      <nav class="tabs">${tabs.map(([k, t]) => `<a href="#/match/${m.id}/${k}"${k === onglet ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>${corps}`;
    if (onglet === "plan") $("savePlan").addEventListener("click", async () => {
      const p = D.plans.find((x) => x.id === $("plan").value);
      const plan = p ? { plan_id: p.id, nom: p.nom, systeme: p.systeme, consignes: p.consignes, individuelles: p.individuelles } : {};
      const { error } = await sb.from("matchs").update({ plan }).eq("id", m.id);
      if (error) return msg($("m"), error.message, "err");
      await charger(); matchView(id, "plan");
    });
    if (onglet === "infos") $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const n = (x) => ($(x).value === "" ? null : Number($(x).value));
      const adv = $("adv").value.trim();
      const rec = { adversaire: adv || null, titre: adv ? (L() === "fr" ? "Contre " : "vs ") + adv : m.titre, competition: $("comp").value.trim() || null, date_match: $("date").value || null,
        domicile: $("dom").value === "1", score_nous: n("sn"), score_eux: n("se"), couleur_nous: $("cn").value, couleur_eux: $("ce").value, notes: $("notes").value.trim() || null };
      const { error } = await sb.from("matchs").update(rec).eq("id", m.id);
      if (error) return msg($("m"), error.message, "err");
      await charger(); msg($("m"), T("Saved.", "Enregistré."), "ok");
    });
  }

  // aperçu du rapport (l'analyse tactique n'est pas encore produite : aperçu verrouillé, honnête)
  function rapportApercu(pret) {
    const ex = [[T("Pressing after loss", "Pressing après perte"), 72], [T("Block compactness", "Compacité du bloc"), 64], [T("Build-up from the back", "Relance courte"), 81], [T("Width in attack", "Largeur en attaque"), 55]];
    return `<div class="co-card lock"><div class="blur">
        <h2>${T("Game plan compliance", "Respect du plan de jeu")}</h2><p class="sub">${T("Each instruction measured over the whole match", "Chaque consigne mesurée sur tout le match")}</p>
        <div class="bars">${ex.map(([t, v]) => `<div><span>${esc(t)}</span><span class="b"><i style="width:${v}%"></i></span><b>${v} %</b></div>`).join("")}</div>
        <h2 style="margin-top:24px">${T("Players", "Joueurs")}</h2>
        <div class="bars">${["#4", "#8", "#10", "#9"].map((n, k) => `<div><span>${n}</span><span class="b"><i style="width:${[78, 66, 59, 84][k]}%"></i></span><b>${[78, 66, 59, 84][k]} %</b></div>`).join("")}</div>
      </div><div class="over"><div>${ICON.lock.replace("<svg", '<svg style="width:28px;height:28px;color:var(--muted);margin-bottom:8px"')}
        <b>${pret ? T("Your report is being finalised", "Votre rapport est en cours de finalisation") : T("The report will appear here", "Le rapport apparaîtra ici")}</b>
        <p class="muted small">${T("Once the analysis is complete: how well each instruction of your game plan was followed, for the team and for each player, with the key video moments.", "Quand l'analyse sera terminée : le respect de chaque consigne de votre plan de jeu, pour l'équipe et pour chaque joueur, avec les moments clés en vidéo.")}</p></div></div></div>`;
  }

  // ================================================================ RAPPORTS
  function rapportsView() {
    const finis = D.matchs.filter((m) => m.etat === "termine");
    view.innerHTML = `<div class="co-head"><div><h1>${T("Reports", "Rapports")}</h1><p>${T("The tactical report of each analysed match: your game plan, measured on the pitch.", "Le rapport tactique de chaque match analysé : votre plan de jeu, mesuré sur le terrain.")}</p></div></div>
      ${finis.length ? `<div class="mlist" style="margin-bottom:22px">${finis.map(mrow).join("")}</div>` : `<div class="callout info" style="margin-bottom:18px"><p>${T("No report yet. A report appears here as soon as the analysis of a match is complete.", "Pas encore de rapport. Un rapport apparaît ici dès que l'analyse d'un match est terminée.")}</p><a class="btn btn-line btn-sm" href="#/videos">${T("See my videos", "Voir mes vidéos")}</a></div>`}
      <h2 style="font-size:1.1rem;margin-bottom:12px">${T("What a report contains", "Ce que contient un rapport")}</h2>${rapportApercu(false)}`;
  }

  // ================================================================ PLANS DE JEU
  function plansView() {
    view.innerHTML = `<div class="co-head"><div><h1>${T("Game plans", "Plans de jeu")}</h1><p>${T("Your pre-match instructions. Attach one to a match: Ciprio measures whether it was followed.", "Vos consignes d'avant-match. Attachez-en un à un match : Ciprio mesure s'il a été respecté.")}</p></div>
        <div class="actions"><a class="btn btn-ink" href="#/plan/nouveau">${T("+ New plan", "+ Nouveau plan")}</a></div></div>
      ${D.plans.length ? `<div class="grid g3">${D.plans.map((p) => `<a class="co-card plan-card" href="#/plan/${p.id}"><span class="sys">${esc(p.systeme || "—")}</span><h3>${esc(p.nom)}</h3>
          <p class="muted small">${(p.consignes || []).length} ${T("team instructions", "consignes collectives")} · ${(p.individuelles || []).length} ${T("individual", "individuelles")}</p>
          <p class="muted small" style="margin-top:8px">${T("Updated ", "Modifié le ")}${esc(fmtDate(p.maj_le, { day: "numeric", month: "short" }))} · ${D.matchs.filter((m) => m.plan && m.plan.plan_id === p.id).length} ${T("match(es)", "match(s)")}</p></a>`).join("")}</div>`
        : vide(ICON.plan, T("No game plan yet", "Aucun plan de jeu pour l'instant"), T("Write your instructions once (pressing, block, build-up…), then reuse them match after match.", "Écrivez vos consignes une fois (pressing, bloc, relance…), puis réutilisez-les match après match."), `<a class="btn btn-ink btn-sm" href="#/plan/nouveau">${T("Write a plan", "Écrire un plan")}</a>`)}`;
  }

  function planView(id) {
    const p = id === "nouveau" ? { nom: "", systeme: (D.equipe && D.equipe.systeme) || "4-3-3", consignes: [{ theme: "pressing", texte: "", mesure: "" }], individuelles: [], notes: "" } : D.plans.find((x) => x.id === id);
    if (!p) { view.innerHTML = `<a class="back" href="#/plans">← ${T("Game plans", "Plans de jeu")}</a>${vide("", T("Plan not found", "Plan introuvable"), "")}`; return; }
    let C = JSON.parse(JSON.stringify(p.consignes || [])), IND = JSON.parse(JSON.stringify(p.individuelles || []));
    const joueursOpts = (sel) => `<option value="">${T("Choose a player", "Choisir un joueur")}</option>${D.joueurs.filter((j) => j.actif).map((j) => `<option value="${j.id}" ${sel === j.id ? "selected" : ""}>${j.numero != null ? "#" + j.numero + " " : ""}${esc([j.prenom, j.nom].filter(Boolean).join(" "))}</option>`).join("")}`;
    view.innerHTML = `<a class="back" href="#/plans">← ${T("Game plans", "Plans de jeu")}</a>
      <div class="co-head"><div><h1>${id === "nouveau" ? T("New game plan", "Nouveau plan de jeu") : esc(p.nom)}</h1><p>${T("Write instructions Ciprio can measure: who, where, when, how much.", "Écrivez des consignes que Ciprio peut mesurer : qui, où, quand, combien.")}</p></div></div>
      <form id="f" novalidate><div class="grid g-main">
        <div class="stack">
          <div class="co-card"><div class="frow"><div class="field"><label for="nom">${T("Plan name", "Nom du plan")}</label><input id="nom" value="${esc(p.nom)}" placeholder="${T("e.g. High press 4-3-3", "ex. Pressing haut 4-3-3")}"></div>
            <div class="field"><label for="sys">${T("System", "Système")}</label><select id="sys">${SYSTEMES.map((s) => `<option ${s === p.systeme ? "selected" : ""}>${s}</option>`).join("")}</select></div></div></div>
          <div class="co-card"><div class="toolbar" style="margin-bottom:12px"><h2>${T("Team instructions", "Consignes collectives")}</h2><button class="btn btn-line btn-sm" type="button" id="addC">${T("+ Add", "+ Ajouter")}</button></div>
            <div class="rowlist" id="lc"></div></div>
          <div class="co-card"><div class="toolbar" style="margin-bottom:12px"><h2>${T("Individual instructions", "Consignes individuelles")}</h2><button class="btn btn-line btn-sm" type="button" id="addI">${T("+ Add", "+ Ajouter")}</button></div>
            ${D.joueurs.length ? "" : `<p class="muted small" style="margin-bottom:10px">${T("Add your players in “Your team” to assign instructions to them.", "Ajoutez vos joueurs dans « Votre équipe » pour leur donner des consignes.")}</p>`}
            <div class="rowlist" id="li"></div></div>
          <div class="co-card"><div class="field" style="margin:0"><label for="notes">${T("Notes", "Notes")}</label><textarea id="notes" placeholder="${T("Context, opponent's strengths…", "Contexte, points forts de l'adversaire…")}">${esc(p.notes || "")}</textarea></div></div>
        </div>
        <div class="stack"><div class="co-card"><h2>${T("Shape", "Organisation")}</h2><p class="sub" id="sysLabel">${esc(p.systeme)}</p><div id="pitch">${pitchSVG(p.systeme)}</div></div>
          <div class="co-card"><h2>${T("Good instructions", "De bonnes consignes")}</h2><ul class="tips">
            <li><b>1</b><span>${T("One action per line: “Press the centre back within 3 s after losing the ball”.", "Une action par ligne : « Presser le défenseur central dans les 3 s après la perte ».")}</span></li>
            <li><b>2</b><span>${T("A measurable target: distance, time, zone, number.", "Un objectif mesurable : distance, temps, zone, nombre.")}</span></li>
            <li><b>3</b><span>${T("Few instructions, the ones that matter for this match.", "Peu de consignes : celles qui comptent pour ce match.")}</span></li></ul></div>
          <div class="co-card"><div class="co-actions" style="margin:0"><button class="btn btn-ink" type="submit">${T("Save the plan", "Enregistrer le plan")}</button>${id !== "nouveau" ? `<button class="btn btn-danger btn-sm" type="button" id="del">${T("Delete", "Supprimer")}</button>` : ""}</div><p class="form-msg" id="m"></p></div>
        </div></div></form>`;
    const drawC = () => {
      $("lc").innerHTML = C.length ? C.map((c, k) => `<div class="crow" data-k="${k}"><select data-f="theme">${THEMES.map((t) => `<option value="${t[0]}" ${c.theme === t[0] ? "selected" : ""}>${L() === "fr" ? t[1] : t[2]}</option>`).join("")}</select>
        <input class="txt" data-f="texte" value="${esc(c.texte)}" placeholder="${T("Instruction", "Consigne")}"><input data-f="mesure" value="${esc(c.mesure || "")}" placeholder="${T("Target (e.g. < 35 m)", "Objectif (ex. < 35 m)")}">
        <button class="iconbtn" type="button" data-del="${k}" aria-label="${T("Remove", "Retirer")}">${ICON.trash}</button></div>`).join("") : `<p class="muted small">${T("No team instruction.", "Aucune consigne collective.")}</p>`;
      $("lc").querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { C[el.closest(".crow").dataset.k][el.dataset.f] = el.value; }));
      $("lc").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { C.splice(Number(b.dataset.del), 1); drawC(); }));
    };
    const drawI = () => {
      $("li").innerHTML = IND.length ? IND.map((c, k) => `<div class="crow ind" data-k="${k}"><select data-f="joueur_id">${joueursOpts(c.joueur_id)}</select>
        <input class="txt" data-f="texte" value="${esc(c.texte)}" placeholder="${T("Instruction for this player", "Consigne pour ce joueur")}">
        <button class="iconbtn" type="button" data-del="${k}" aria-label="${T("Remove", "Retirer")}">${ICON.trash}</button></div>`).join("") : `<p class="muted small">${T("No individual instruction.", "Aucune consigne individuelle.")}</p>`;
      $("li").querySelectorAll("[data-f]").forEach((el) => el.addEventListener("input", () => { IND[el.closest(".crow").dataset.k][el.dataset.f] = el.value; }));
      $("li").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { IND.splice(Number(b.dataset.del), 1); drawI(); }));
    };
    drawC(); drawI();
    $("addC").addEventListener("click", () => { C.push({ theme: "pressing", texte: "", mesure: "" }); drawC(); });
    $("addI").addEventListener("click", () => { IND.push({ joueur_id: "", texte: "" }); drawI(); });
    $("sys").addEventListener("change", () => { $("pitch").innerHTML = pitchSVG($("sys").value); $("sysLabel").textContent = $("sys").value; });
    if ($("del")) $("del").addEventListener("click", async () => {
      if (!confirm(T("Delete this plan? Matches keep their own copy.", "Supprimer ce plan ? Les matchs gardent leur copie."))) return;
      const { error } = await sb.from("plans_de_jeu").delete().eq("id", p.id);
      if (error) return msg($("m"), error.message, "err");
      await charger(); location.hash = "#/plans";
    });
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nom = $("nom").value.trim();
      if (!nom) return msg($("m"), T("Give the plan a name.", "Donnez un nom au plan."), "err");
      const rec = { nom, systeme: $("sys").value, consignes: C.filter((c) => c.texte.trim()), individuelles: IND.filter((c) => c.texte.trim() && c.joueur_id), notes: $("notes").value.trim() || null, equipe_id: (D.equipe && D.equipe.id) || null };
      const r = id === "nouveau" ? await sb.from("plans_de_jeu").insert({ ...rec, coach_id: session.user.id }).select("id").single() : await sb.from("plans_de_jeu").update(rec).eq("id", p.id).select("id").single();
      if (r.error) return msg($("m"), r.error.message, "err");
      await charger();
      if (id === "nouveau") location.hash = "#/plan/" + r.data.id; else { msg($("m"), T("Saved.", "Enregistré."), "ok"); }
    });
  }

  // ================================================================ VOTRE ÉQUIPE
  function equipeView() {
    const e = D.equipe;
    if (!e) return equipeForm(null);
    const J = D.joueurs;
    const par = (l) => J.filter((j) => j.actif && ligne(j.poste) === l).length;
    view.innerHTML = `<div class="co-head"><div class="team-head"><span class="crest" style="background:${esc(e.couleur_domicile || "#12a150")}">${esc((e.club || e.nom).slice(0, 2).toUpperCase())}</span>
          <div><h1>${esc(e.nom)}</h1><p style="margin-top:2px">${esc([e.club, e.categorie, e.niveau].filter(Boolean).join(" · "))}</p></div></div>
        <div class="actions"><button class="btn btn-line" id="edit" type="button">${T("Edit the team", "Modifier l'équipe")}</button><button class="btn btn-ink" id="add" type="button">${T("+ Add a player", "+ Ajouter un joueur")}</button></div></div>
      <div class="grid g-main">
        <div class="co-card" style="padding:8px 8px 4px">
          <div class="toolbar" style="padding:14px 14px 0;margin-bottom:8px"><h2>${T("Squad", "Effectif")} <span class="muted" style="font-weight:400">· ${J.filter((j) => j.actif).length}</span></h2></div>
          ${J.length ? `<div style="overflow-x:auto"><table class="table"><thead><tr><th>${T("No.", "N°")}</th><th>${T("Player", "Joueur")}</th><th>${T("Position", "Poste")}</th><th>${T("Foot", "Pied")}</th><th></th></tr></thead><tbody>
            ${J.map((j) => `<tr data-id="${j.id}" style="${j.actif ? "" : "opacity:.5"}"><td><span class="num">${j.numero ?? "–"}</span></td><td><b>${esc([j.prenom, j.nom].filter(Boolean).join(" "))}</b></td>
              <td>${j.poste ? `<span class="tag" title="${esc(posteNom(j.poste))}">${esc(poste(j.poste))}</span>` : ""}</td><td class="muted">${esc(({ droit: T("Right", "Droit"), gauche: T("Left", "Gauche"), deux: T("Both", "Les deux") })[j.pied] || "")}</td>
              <td class="muted small">${j.actif ? "" : T("inactive", "inactif")}</td></tr>`).join("")}</tbody></table></div>`
            : `<div class="empty">${ICON.team}<p>${T("No player yet.", "Aucun joueur pour l'instant.")}</p><p class="small">${T("Numbers help Ciprio recognise your players on video.", "Les numéros aident Ciprio à reconnaître vos joueurs sur la vidéo.")}</p></div>`}
        </div>
        <div class="stack">
          <div class="co-card"><h2>${T("By line", "Par ligne")}</h2><div class="lines">
            <div><b>${par("G")}</b><span>${T("Goalkeepers", "Gardiens")}</span></div><div><b>${par("D")}</b><span>${T("Defenders", "Défenseurs")}</span></div>
            <div><b>${par("M")}</b><span>${T("Midfielders", "Milieux")}</span></div><div><b>${par("A")}</b><span>${T("Forwards", "Attaquants")}</span></div></div></div>
          <div class="co-card"><h2>${T("Usual system", "Système habituel")}</h2><p class="sub">${esc(e.systeme || "4-3-3")}</p>${pitchSVG(e.systeme || "4-3-3")}</div>
          <div class="co-card"><h2>${T("Team", "Équipe")}</h2><dl class="dl" style="margin-top:12px">
            <dt>${T("Home shirt", "Maillot domicile")}</dt><dd><span class="swatch" style="background:${esc(e.couleur_domicile || "#fff")}"></span></dd>
            <dt>${T("Away shirt", "Maillot extérieur")}</dt><dd><span class="swatch" style="background:${esc(e.couleur_exterieur || "#fff")}"></span></dd>
            <dt>${T("Ground", "Stade")}</dt><dd>${esc(e.stade || "–")}</dd></dl></div>
        </div></div>`;
    $("edit").addEventListener("click", () => equipeForm(e));
    $("add").addEventListener("click", () => joueurDlg(null));
    view.querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", () => joueurDlg(D.joueurs.find((j) => j.id === tr.dataset.id))));
  }

  function equipeForm(e) {
    const v = e || { nom: "", club: D.profil.club || "", categorie: "Seniors", niveau: "", systeme: "4-3-3", stade: "", couleur_domicile: "#12a150", couleur_exterieur: "#ffffff" };
    view.innerHTML = `${e ? `<a class="back" href="#/equipe">← ${T("Your team", "Votre équipe")}</a>` : ""}
      <div class="co-head"><div><h1>${e ? T("Edit the team", "Modifier l'équipe") : T("Create your team", "Créez votre équipe")}</h1><p>${T("Ciprio uses it to recognise your players and set up your matches faster.", "Ciprio s'en sert pour reconnaître vos joueurs et préparer vos matchs plus vite.")}</p></div></div>
      <form id="f" class="co-card" style="max-width:760px" novalidate>
        <div class="frow"><div class="field"><label for="nom">${T("Team name", "Nom de l'équipe")}</label><input id="nom" value="${esc(v.nom)}" placeholder="${T("e.g. U17 National", "ex. U17 Nationaux")}"></div>
          <div class="field"><label for="club">${T("Club", "Club")}</label><input id="club" value="${esc(v.club || "")}"></div></div>
        <div class="frow3"><div class="field"><label for="cat">${T("Category", "Catégorie")}</label><select id="cat">${CATEGORIES.map((c) => `<option ${c === v.categorie ? "selected" : ""}>${c}</option>`).join("")}</select></div>
          <div class="field"><label for="niv">${T("Level", "Niveau")}</label><input id="niv" value="${esc(v.niveau || "")}" placeholder="${T("National, regional…", "National, régional…")}"></div>
          <div class="field"><label for="sys">${T("Usual system", "Système habituel")}</label><select id="sys">${SYSTEMES.map((s) => `<option ${s === v.systeme ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>
        <div class="frow3"><div class="field"><label for="cd">${T("Home shirt", "Maillot domicile")}</label><input id="cd" type="color" value="${esc(v.couleur_domicile || "#12a150")}"></div>
          <div class="field"><label for="cx">${T("Away shirt", "Maillot extérieur")}</label><input id="cx" type="color" value="${esc(v.couleur_exterieur || "#ffffff")}"></div>
          <div class="field"><label for="stade">${T("Home ground", "Stade")}</label><input id="stade" value="${esc(v.stade || "")}"></div></div>
        <div class="co-actions"><button class="btn btn-ink" type="submit">${e ? T("Save", "Enregistrer") : T("Create the team →", "Créer l'équipe →")}</button>${e ? `<a class="linkbtn" href="#/equipe">${T("Cancel", "Annuler")}</a>` : ""}</div>
        <p class="form-msg" id="m"></p></form>`;
    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nom = $("nom").value.trim();
      if (!nom) return msg($("m"), T("Give the team a name.", "Donnez un nom à l'équipe."), "err");
      const rec = { nom, club: $("club").value.trim() || null, categorie: $("cat").value, niveau: $("niv").value.trim() || null, systeme: $("sys").value, couleur_domicile: $("cd").value, couleur_exterieur: $("cx").value, stade: $("stade").value.trim() || null };
      const r = e ? await sb.from("equipes").update(rec).eq("id", e.id) : await sb.from("equipes").insert({ ...rec, coach_id: session.user.id });
      if (r.error) return msg($("m"), r.error.message, "err");
      await charger(); location.hash = "#/equipe"; route();
    });
  }

  function joueurDlg(j) {
    const dlg = $("dlg");
    const v = j || { prenom: "", nom: "", numero: null, poste: "", pied: "", actif: true };
    dlg.innerHTML = `<form id="fj" novalidate><h2>${j ? T("Edit player", "Modifier le joueur") : T("New player", "Nouveau joueur")}</h2>
      <div class="frow"><div class="field"><label for="jp">${T("First name", "Prénom")}</label><input id="jp" value="${esc(v.prenom || "")}"></div>
        <div class="field"><label for="jn">${T("Last name", "Nom")}</label><input id="jn" value="${esc(v.nom || "")}"></div></div>
      <div class="frow3"><div class="field"><label for="jnum">${T("Number", "Numéro")}</label><input id="jnum" type="number" min="0" max="99" value="${v.numero ?? ""}"></div>
        <div class="field"><label for="jpo">${T("Position", "Poste")}</label><select id="jpo"><option value="">–</option>${POSTES.map((p) => `<option value="${p[0]}" ${v.poste === p[0] ? "selected" : ""}>${L() === "fr" ? p[2] : p[3]}</option>`).join("")}</select></div>
        <div class="field"><label for="jpi">${T("Foot", "Pied")}</label><select id="jpi"><option value="">–</option>${[["droit", T("Right", "Droit")], ["gauche", T("Left", "Gauche")], ["deux", T("Both", "Les deux")]].map(([k, t]) => `<option value="${k}" ${v.pied === k ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <label class="switch" style="border:0"><span>${T("Active in the squad", "Actif dans l'effectif")}</span><input id="ja" type="checkbox" ${v.actif ? "checked" : ""}></label>
      <p class="form-msg" id="jm"></p>
      <div class="co-actions"><span>${j ? `<button class="btn btn-danger btn-sm" type="button" id="jdel">${T("Delete", "Supprimer")}</button>` : ""}</span>
        <span style="display:flex;gap:10px"><button class="btn btn-line btn-sm" type="button" id="jx">${T("Cancel", "Annuler")}</button><button class="btn btn-ink btn-sm" type="submit">${T("Save", "Enregistrer")}</button></span></div></form>`;
    dlg.showModal();
    $("jx").addEventListener("click", () => dlg.close());
    if ($("jdel")) $("jdel").addEventListener("click", async () => {
      if (!confirm(T("Delete this player?", "Supprimer ce joueur ?"))) return;
      const { error } = await sb.from("joueurs").delete().eq("id", j.id);
      if (error) return msg($("jm"), error.message, "err");
      dlg.close(); await charger(); equipeView();
    });
    $("fj").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nom = $("jn").value.trim();
      if (!nom) return msg($("jm"), T("Fill in the last name.", "Indiquez le nom."), "err");
      const num = $("jnum").value === "" ? null : Number($("jnum").value);
      if (num != null && D.joueurs.some((x) => x.actif && x.numero === num && (!j || x.id !== j.id))) return msg($("jm"), T("This number is already taken.", "Ce numéro est déjà pris."), "err");
      const rec = { prenom: $("jp").value.trim() || null, nom, numero: num, poste: $("jpo").value || null, pied: $("jpi").value || null, actif: $("ja").checked };
      const r = j ? await sb.from("joueurs").update(rec).eq("id", j.id) : await sb.from("joueurs").insert({ ...rec, coach_id: session.user.id, equipe_id: D.equipe.id });
      if (r.error) return msg($("jm"), r.error.message, "err");
      dlg.close(); await charger(); equipeView();
    });
  }

  // ================================================================ AIDE
  function aideView() {
    const q = [
      [T("Which camera can I use?", "Quelle caméra utiliser ?"), T("A fixed camera filming the whole pitch from high up: Veo, or any similar camera. The whole match, without cuts or zooms by hand.", "Une caméra fixe qui filme tout le terrain en hauteur : Veo, ou toute caméra équivalente. Le match entier, sans coupure ni zoom à la main.")],
      [T("Why do I have to point markings?", "Pourquoi dois-je pointer des repères ?"), T("Your clicks tell Ciprio exactly where the pitch is on the video. They are never moved: they are the reference for the whole analysis. It takes about 5 minutes.", "Vos clics indiquent à Ciprio exactement où est le terrain sur la vidéo. Ils ne sont jamais déplacés : ils servent de référence à toute l'analyse. Cela prend environ 5 minutes.")],
      [T("What if I can't see a marking?", "Et si je ne vois pas un repère ?"), T("Say so on the page: Ciprio calculates it from your other markings and shows it to you in orange. You can drag it if it's off.", "Dites-le sur la page : Ciprio le calcule à partir de vos autres repères et vous le montre en orange. Vous pouvez le déplacer s'il est à côté.")],
      [T("How long does an analysis take?", "Combien de temps dure une analyse ?"), T("The progress bar at the top shows where your current match stands. You don't need to keep the page open.", "La barre en haut montre où en est votre match en cours. Inutile de garder la page ouverte.")],
      [T("Who can see my videos?", "Qui voit mes vidéos ?"), T("Only you and the Ciprio team, to run the analysis. Your data is never shared.", "Vous seul et l'équipe Ciprio, pour faire l'analyse. Vos données ne sont jamais partagées.")],
    ];
    view.innerHTML = `<div class="co-head"><div><h1>${T("Help", "Aide")}</h1><p>${T("Everything you need to get a good analysis.", "Tout ce qu'il faut pour obtenir une bonne analyse.")}</p></div></div>
      <div class="grid g-main"><div class="stack">
        <div class="co-card"><h2>${T("Filming a match", "Filmer un match")}</h2><ul class="tips">
          <li><b>1</b><span>${T("Camera high up, at the halfway line, seeing both goals.", "Caméra en hauteur, au niveau de la ligne médiane, qui voit les deux buts.")}</span></li>
          <li><b>2</b><span>${T("The whole match: from the kick-off to the final whistle, both halves.", "Le match entier : du coup d'envoi au coup de sifflet final, les deux mi-temps.")}</span></li>
          <li><b>3</b><span>${T("Don't move the camera during the match.", "Ne déplacez pas la caméra pendant le match.")}</span></li>
          <li><b>4</b><span>${T("Night matches are fine if the lighting covers the whole pitch.", "Les matchs de nuit vont bien si l'éclairage couvre tout le terrain.")}</span></li></ul></div>
        <div class="co-card"><h2>${T("Frequently asked questions", "Questions fréquentes")}</h2>${q.map(([a, b]) => `<details class="faq"><summary>${a}</summary><p>${b}</p></details>`).join("")}</div>
      </div><div class="stack">
        <div class="co-card"><h2>${T("Contact us", "Nous contacter")}</h2><p class="sub">${T("A question, a problem with a match? We answer quickly.", "Une question, un souci sur un match ? Nous répondons vite.")}</p>
          <div class="links"><a href="mailto:contact@ciprio.ai">contact@ciprio.ai<span>→</span></a><a href="${L() === "fr" ? "/fr" : ""}/contact" target="_blank" rel="noopener">${T("Contact form", "Formulaire de contact")}<span>→</span></a></div></div>
        <div class="co-card"><h2>${T("Guides", "Guides")}</h2><div class="links">
          <a href="${L() === "fr" ? "/fr" : ""}/blog/how-to-film-a-football-match" target="_blank" rel="noopener">${T("How to film a match", "Bien filmer un match")}<span>→</span></a>
          <a href="${L() === "fr" ? "/fr" : ""}/blog/how-to-analyse-a-football-match-video" target="_blank" rel="noopener">${T("Analysing a match video", "Analyser une vidéo de match")}<span>→</span></a>
          <a href="${L() === "fr" ? "/fr" : ""}/blog/game-plan-vs-reality" target="_blank" rel="noopener">${T("Game plan vs reality", "Plan de jeu et réalité")}<span>→</span></a></div></div>
      </div></div>`;
  }

  // ================================================================ PARAMÈTRES
  function parametresView() {
    const p = D.profil;
    view.innerHTML = `<div class="co-head"><div><h1>${T("Settings", "Paramètres")}</h1><p>${T("Your profile, your preferences and your account.", "Votre profil, vos préférences et votre compte.")}</p></div></div>
      <div class="grid g2" style="align-items:start">
        <form id="fp" class="co-card" novalidate><h2 style="margin-bottom:16px">${T("Profile", "Profil")}</h2>
          <div class="field"><label for="nom">${T("Your name", "Votre nom")}</label><input id="nom" autocomplete="name" value="${esc(p.nom || "")}"></div>
          <div class="frow"><div class="field"><label for="fct">${T("Role", "Fonction")}</label><select id="fct"><option value="">–</option>${FONCTIONS.map((f) => `<option value="${f[0]}" ${p.fonction === f[0] ? "selected" : ""}>${L() === "fr" ? f[1] : f[2]}</option>`).join("")}</select></div>
            <div class="field"><label for="club">${T("Club", "Club")}</label><input id="club" autocomplete="organization" value="${esc(p.club || "")}"></div></div>
          <div class="field"><label for="tel">${T("Phone", "Téléphone")} <small>${T("(optional)", "(facultatif)")}</small></label><input id="tel" type="tel" autocomplete="tel" value="${esc(p.telephone || "")}"></div>
          <div class="field"><label>${T("E-mail", "E-mail")}</label><input value="${esc(session.user.email)}" disabled></div>
          <div class="co-actions"><button class="btn btn-ink btn-sm" type="submit">${T("Save", "Enregistrer")}</button></div><p class="form-msg" id="mp"></p></form>
        <div class="stack">
          <div class="co-card"><h2 style="margin-bottom:6px">${T("Preferences", "Préférences")}</h2>
            <label class="switch"><span>${T("E-mail me when an analysis is ready", "M'écrire quand une analyse est prête")}</span><input id="notif" type="checkbox" ${p.notif_email !== false ? "checked" : ""}></label>
            <div class="switch"><span>${T("Language", "Langue")}</span><span class="chips"><button type="button" data-l="fr" aria-pressed="${L() === "fr"}">Français</button><button type="button" data-l="en" aria-pressed="${L() === "en"}">English</button></span></div></div>
          <form id="fs" class="co-card" novalidate><h2 style="margin-bottom:16px">${T("Security", "Sécurité")}</h2>
            <div class="field"><label for="mdp">${T("New password", "Nouveau mot de passe")} <small>${T("(8 characters min.)", "(8 caractères min.)")}</small></label><input id="mdp" type="password" autocomplete="new-password" minlength="8"></div>
            <div class="co-actions"><button class="btn btn-line btn-sm" type="submit">${T("Change my password", "Changer mon mot de passe")}</button></div><p class="form-msg" id="ms"></p></form>
          <div class="co-card"><h2 style="margin-bottom:8px">${T("Account", "Compte")}</h2><p class="sub">${T("To delete your account and your data, write to us: it's done within 7 days.", "Pour supprimer votre compte et vos données, écrivez-nous : c'est fait sous 7 jours.")}</p>
            <div class="co-actions" style="margin-top:14px"><button class="btn btn-ink btn-sm" id="logout" type="button">${T("Log out", "Se déconnecter")}</button><a class="btn btn-danger btn-sm" href="mailto:contact@ciprio.ai?subject=${encodeURIComponent(T("Delete my Ciprio account", "Supprimer mon compte Ciprio"))}">${T("Delete my account", "Supprimer mon compte")}</a></div></div>
        </div></div>`;
    oeils();
    $("logout").addEventListener("click", async () => { await sb.auth.signOut(); D = null; location.hash = "#/"; route(); });
    view.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { CIPRIO.setLang(b.dataset.l); langUI(); route(); }));
    $("notif").addEventListener("change", async (e) => { await sb.from("profils").update({ notif_email: e.target.checked }).eq("id", session.user.id); D.profil.notif_email = e.target.checked; });
    $("fp").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const rec = { nom: $("nom").value.trim() || null, fonction: $("fct").value || null, club: $("club").value.trim() || null, telephone: $("tel").value.trim() || null };
      const { error } = await sb.from("profils").update(rec).eq("id", session.user.id);
      if (error) return msg($("mp"), error.message, "err");
      Object.assign(D.profil, rec); menu("/parametres"); msg($("mp"), T("Saved.", "Enregistré."), "ok");
    });
    $("fs").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const pw = $("mdp").value;
      if (pw.length < 8) return msg($("ms"), T("Password too short: at least 8 characters.", "Mot de passe trop court : au moins 8 caractères."), "err");
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) return msg($("ms"), authErr(error), "err");
      $("mdp").value = ""; msg($("ms"), T("Password changed.", "Mot de passe changé."), "ok");
    });
  }

  // ================================================================ NAVIGATION
  async function route() {
    ({ data: { session } } = await sb.auth.getSession());
    $("side").hidden = !session;
    $("shell").classList.toggle("out", !session);
    if (!session) { D = null; $("prog").hidden = true; $("avatar").hidden = true; if (codeCtx) return codeView(); return authView(location.hash === "#/inscription" ? "signup" : "login"); }
    if (!D) { view.innerHTML = `<p class="muted">${T("Loading…", "Chargement…")}</p>`; await charger(); }
    const h = location.hash.replace(/^#/, "") || "/";
    menu(h);
    majProgression();
    window.scrollTo(0, 0);
    if (h === "/nouveau") return nouveauView();
    if (h === "/videos") return videosView();
    if (h === "/rapports") return rapportsView();
    if (h === "/plans") return plansView();
    if (h === "/equipe") return equipeView();
    if (h === "/aide") return aideView();
    if (h === "/parametres") return parametresView();
    const mp = h.match(/^\/plan\/(nouveau|[0-9a-f-]{36})$/);
    if (mp) return planView(mp[1]);
    const mm = h.match(/^\/match\/([0-9a-f-]{36})(?:\/(suivi|plan|rapport|infos))?$/);
    if (mm) return matchView(mm[1], mm[2] || "suivi");
    return accueilView();
  }
  window.addEventListener("hashchange", route);
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { D = null; route(); } });
  route();
})();
