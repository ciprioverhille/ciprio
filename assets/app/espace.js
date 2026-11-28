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
    tuto: I('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),
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
  // terrain vu de dessus, but de l'équipe en bas ; compo = [joueur_id | null] par place (0 = gardien)
  function pitchSVG(sys, compo, sombre) {
    const W = 68, H = 105, m = 3, X = (x) => m + (x / 100) * W, Y = (y) => m + (y / 100) * H;
    const stripes = Array.from({ length: 7 }, (_, k) => k % 2 ? `<rect class="stripe" x="${m}" y="${m + (k * H) / 7}" width="${W}" height="${H / 7}"/>` : "").join("");
    const box = (top) => { const y0 = top ? m : m + H - 16.5, y1 = top ? m : m + H - 5.5;
      return `<rect class="ln" x="${m + W / 2 - 20.16}" y="${y0}" width="40.32" height="16.5"/><rect class="ln" x="${m + W / 2 - 9.16}" y="${y1}" width="18.32" height="5.5"/>
        <path class="ln" d="M${m + W / 2 - 7.3} ${top ? m + 16.5 : m + H - 16.5} A9.15 9.15 0 0 ${top ? 0 : 1} ${m + W / 2 + 7.3} ${top ? m + 16.5 : m + H - 16.5}"/>`; };
    const pl = placement(sys).map(([x, y], k) => {
      const j = compo && compo[k] ? D.joueurs.find((q) => q.id === compo[k]) : null;
      return `<g class="pl${k === 0 ? " gk" : ""}"><circle cx="${X(x)}" cy="${Y(y)}" r="2.9"/>${j && j.numero != null ? `<text x="${X(x)}" y="${Y(y)}">${j.numero}</text>` : ""}${j ? `<text class="nm" x="${X(x)}" y="${Y(y) + 5.2}">${esc(j.nom).slice(0, 12)}</text>` : ""}</g>`;
    }).join("");
    return `<svg class="pitch-svg${compo ? " big" : ""}" viewBox="0 0 ${W + 2 * m} ${H + 2 * m}" role="img" aria-label="${esc(sys || "")}">
      <rect class="turf" x="0" y="0" width="${W + 2 * m}" height="${H + 2 * m}" rx="3"/>${stripes}
      <rect class="ln" x="${m}" y="${m}" width="${W}" height="${H}"/><line class="ln" x1="${m}" y1="${m + H / 2}" x2="${m + W}" y2="${m + H / 2}"/>
      <circle class="ln" cx="${m + W / 2}" cy="${m + H / 2}" r="9.15"/><circle cx="${m + W / 2}" cy="${m + H / 2}" r=".5" fill="rgba(255,255,255,.7)"/>
      ${box(true)}${box(false)}${pl}</svg>`;
  }
  // nom de chaque place d'un système : Gardien, Défenseur 1…, Milieu 1…, Attaquant 1…
  function places(sys) {
    const rows = String(sys || "4-3-3").split("-").map(Number).filter(Boolean);
    const noms = rows.length === 3 ? [["Défenseur", "Defender"], ["Milieu", "Midfielder"], ["Attaquant", "Forward"]]
      : rows.length === 4 ? [["Défenseur", "Defender"], ["Milieu déf.", "Def. mid"], ["Milieu off.", "Att. mid"], ["Attaquant", "Forward"]]
      : rows.map((_, r) => [`Ligne ${r + 1}`, `Line ${r + 1}`]);
    const out = [T("Goalkeeper", "Gardien")];
    rows.forEach((n, r) => { for (let i = 0; i < n; i++) out.push(`${L() === "fr" ? noms[r][0] : noms[r][1]}${n > 1 ? " " + (i + 1) : ""}`); });
    return out;
  }
  const nomJoueur = (j) => `${j.numero != null ? "#" + j.numero + " " : ""}${[j.prenom, j.nom].filter(Boolean).join(" ")}`;
  const age = (d) => { if (!d) return null; const b = new Date(d + "T12:00:00"), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  const STATUTS = [["disponible", "Disponible", "Available"], ["blesse", "Blessé", "Injured"], ["suspendu", "Suspendu", "Suspended"], ["absent", "Absent", "Unavailable"]];
  const statut = (k) => { const x = STATUTS.find((s) => s[0] === k); return x ? (L() === "fr" ? x[1] : x[2]) : ""; };

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
  const authSide = () => `<aside class="auth-side"><span class="label">Ciprio · ${T("Coach space", "Espace coach")}</span>
      <h2>${T("Your game plan,", "Votre plan de jeu,")} <span>${T("measured on the pitch.", "mesuré sur le terrain.")}</span></h2>
      <ul><li><b>01</b><span>${T("Send the video of your match.", "Envoyez la vidéo de votre match.")}</span></li>
        <li><b>02</b><span>${T("Set up the pitch in five minutes.", "Réglez le terrain en cinq minutes.")}</span></li>
        <li><b>03</b><span>${T("Read how each instruction was followed.", "Lisez comment chaque consigne a été suivie.")}</span></li></ul>
      <div class="mini-pitch">${pitchSVG("4-3-3", null, true)}</div></aside>`;
  function authView(tab = "login") {
    view.innerHTML = `
      <div class="auth-wrap">${authSide()}<div class="co-auth">
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
      </div></div>`;
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
      <div class="auth-wrap">${authSide()}<div class="co-auth">
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
      </div></div>`;
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
      <div class="auth-wrap">${authSide()}<div class="co-auth">
        <h1>${T("Forgot your password?", "Mot de passe oublié ?")}</h1>
        <p class="muted">${T("Type your e-mail: you'll receive a security code to choose a new password.", "Indiquez votre e-mail : vous recevrez un code de sécurité pour choisir un nouveau mot de passe.")}</p>
        <form id="f" novalidate>
          <div class="field"><label for="email">${T("E-mail", "E-mail")}</label><input id="email" type="email" autocomplete="email" required value="${esc(email0)}"></div>
          <div class="co-actions"><button class="btn btn-ink" type="submit">${T("Receive a code →", "Recevoir un code →")}</button><button class="linkbtn" type="button" id="retour">${T("Back", "Retour")}</button></div>
          <p class="form-msg" id="m" role="status"></p>
        </form>
      </div></div>`;
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
    if (!m) { el.className = "co-prog idle"; el.href = "#/videos"; el.innerHTML = `<span class="live"><i></i>${T("Idle", "Au calme")}</span><span>${T("No analysis in progress", "Aucune analyse en cours")}</span>`; return; }
    el.className = "co-prog"; el.href = "#/match/" + m.id;
    el.innerHTML = `<span class="live"><i></i>${m.etat === "a_pointer" ? T("Your turn", "À vous") : T("Live", "En cours")}</span>
      <span class="mid"><b>${esc(m.titre)} · <span class="muted" style="font-weight:500">${esc(etatNom(m.etat))}</span></b><span class="bar"><i style="width:${pct(m.etat)}%"></i></span></span><span class="pct">${pct(m.etat)} %</span>`;
  }
  setInterval(async () => { if (session && D && D.matchs.some((x) => EN_COURS.includes(x.etat))) { await charger(); majProgression(); } }, 30000);

  function menu(h) {
    const aPointer = D.matchs.filter((x) => x.etat === "a_pointer").length;
    const cur = (k) => (k === h || (k === "/videos" && (h.startsWith("/match/") || h.startsWith("/videos"))) || (k === "/plans" && h.startsWith("/plan/")) || (k === "/parametres" && h.startsWith("/parametres")) ? ' aria-current="page"' : "");
    $("side").innerHTML = `
      <a class="primary" href="#/nouveau"${cur("/nouveau")}>${T("+ New video", "+ Nouvelle vidéo")}</a>
      <a class="tuto" href="#/tuto"${cur("/tuto")}>${ICON.tuto}${T("How it works", "Comment ça marche")}</a>
      <a href="#/"${cur("/")}>${ICON.home}${T("Home", "Accueil")}</a>
      <a href="#/videos"${cur("/videos")}>${ICON.video}${T("Videos", "Vidéos")}${aPointer ? `<span class="badge">${aPointer}</span>` : ""}</a>
      <a href="#/rapports"${cur("/rapports")}>${ICON.report}${T("Reports", "Rapports")}</a>
      <span class="grp">${T("Preparation", "Préparation")}</span>
      <a href="#/plans"${cur("/plans")}>${ICON.plan}${T("Game plans", "Plans de jeu")}</a>
      <a href="#/equipe"${cur("/equipe")}>${ICON.team}${T("Your team", "Votre équipe")}</a>
      <span class="spacer"></span>
      <a href="#/aide"${cur("/aide")}>${ICON.help}${T("Help", "Aide")}</a>
      <a href="#/parametres"${cur("/parametres")}>${ICON.gear}${T("Settings", "Paramètres")}</a>
      <a class="me" href="#/parametres"><span class="avatar">${esc(initiales())}</span><div><b>${esc(D.profil.nom || T("My account", "Mon compte"))}</b><span>${esc(session.user.email)}</span></div></a>
      <span class="ver">${T("Test access · free", "Accès test · gratuit")}</span>`;
    $("avatar").textContent = initiales();
    $("avatar").hidden = false;
  }

  // ================================================================ ACCUEIL
  let arreterCamera = null;
  function accueilView() {
    const M = D.matchs, nom = D.profil.nom, prenom = nom ? nom.split(" ")[0] : "";
    const aPointer = M.filter((x) => x.etat === "a_pointer");
    const enCours = M.filter((x) => ["video_recue", "preparation", "pointage_fini", "calcul", "controle"].includes(x.etat));
    const finis = M.filter((x) => x.etat === "termine");
    const salut = new Date().getHours() < 18 ? T("Hello", "Bonjour") : T("Good evening", "Bonsoir");
    const cur = aPointer[0] || M.filter((x) => EN_COURS.includes(x.etat)).sort((a, b) => new Date(b.maj_le) - new Date(a.maj_le))[0];
    const iCur = cur ? ETATS.findIndex((x) => x.k === cur.etat) : -1;
    const actifs = D.joueurs.filter((x) => x.actif), indispo = actifs.filter((x) => x.statut && x.statut !== "disponible"), capitaine = actifs.find((x) => x.capitaine);
    const etapes = [
      [!!(D.profil.nom && D.profil.club), T("Complete your profile", "Complétez votre profil"), "#/parametres"],
      [!!D.equipe, T("Create your team", "Créez votre équipe"), "#/equipe"],
      [actifs.length >= 11, T("Register at least 11 players", "Inscrivez au moins 11 joueurs"), "#/equipe"],
      [D.plans.length > 0, T("Write your first game plan", "Écrivez votre premier plan de jeu"), "#/plan/nouveau"],
      [M.length > 0, T("Send your first video", "Envoyez votre première vidéo"), "#/nouveau"],
      [M.some((x) => ["pointage_fini", "calcul", "controle", "termine"].includes(x.etat)), T("Set up the pitch of a match", "Réglez le terrain d'un match"), "#/videos"],
    ];
    const faits = etapes.filter((e) => e[0]).length;

    // ---- vue caméra, toute la largeur : vert = une analyse avance, blanc = rien en cours
    const dateTxt = fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long" });
    const stage = cur ? `
      <section class="stage vert" aria-label="${T("Analysis in progress", "Analyse en cours")}">
        <canvas id="cam" aria-hidden="true"></canvas>
        <div class="stage-top">
          <div class="st-l"><span class="label"><i class="dot"></i>${esc(prenom ? `${salut}, ${prenom}` : salut)} · ${esc(dateTxt)}</span>
            <h1>${cur.etat === "a_pointer" ? T("Your turn: set up the pitch", "À vous : réglez le terrain") : T("Analysis in progress…", "Analyse en cours…")}</h1>
            <p><b>${esc(cur.titre)}</b>${score(cur) ? " · " + esc(score(cur)) : ""} — ${T("step", "étape")} ${iCur + 1}/${ETATS.length} : ${esc(etatNom(cur.etat))}</p></div>
          <div class="st-r"><b class="st-pct">${pct(cur.etat)}<small>%</small></b>
            ${cur.etat === "a_pointer" ? `<a class="btn btn-ink btn-sm" href="/app/pointage?match=${cur.id}">${T("Set up the pitch →", "Régler le terrain →")}</a>` : `<a class="btn btn-ink btn-sm" href="#/match/${cur.id}">${T("Open the match →", "Ouvrir le match →")}</a>`}</div>
          <div class="st-bar"><i style="width:${pct(cur.etat)}%"></i></div>
          <ol class="st-steps">${ETATS.map((e, j) => `<li class="${j < iCur ? "on" : j === iCur ? "now" : ""}">${esc(T(e.en, e.fr))}</li>`).join("")}</ol>
        </div>
      </section>`
      : `
      <section class="stage blanc" aria-label="${T("No video yet", "Aucune vidéo en cours")}">
        <canvas id="cam" aria-hidden="true"></canvas>
        <div class="stage-top">
          <div class="st-l"><span class="label">${esc(prenom ? `${salut}, ${prenom}` : salut)} · ${esc(dateTxt)}</span>
            <h1>${M.length ? T("No analysis in progress.", "Aucune analyse en cours.") : T("You haven't sent a video yet.", "Vous n'avez pas encore chargé de vidéo.")}</h1>
            <p>${T("Start with the “New video” button: Ciprio takes care of the rest.", "Commencez avec le bouton « Nouvelle vidéo » : Ciprio s'occupe du reste.")}</p></div>
          <div class="st-r"><a class="btn btn-ink" href="#/nouveau">${T("New video", "Nouvelle vidéo")}</a></div>
        </div>
      </section>`;

    // ---- vos derniers rapports : détaillés, match par match
    const carteRapport = (m) => {
      const p = m.plan || {}, nc = (p.consignes || []).length, ni = (p.individuelles || []).length, compo = (p.composition || []).filter(Boolean).length;
      const pret = m.etat === "termine";
      const vic = m.score_nous != null && m.score_eux != null ? (m.score_nous > m.score_eux ? ["V", T("Win", "Victoire")] : m.score_nous < m.score_eux ? ["D", T("Loss", "Défaite")] : ["N", T("Draw", "Nul")]) : null;
      return `<a class="rcard" href="#/match/${m.id}/${pret ? "rapport" : "suivi"}">
        <div class="rc-top"><span class="label">${esc([fmtDate(m.date_match, { day: "numeric", month: "short", year: "numeric" }), m.competition].filter(Boolean).join(" · ") || T("Match", "Match"))}</span>${pret ? `<span class="pill done">${T("Report", "Rapport")}</span>` : pill(m.etat)}</div>
        <div class="rc-mid"><h3>${esc(m.titre)}</h3>${score(m) ? `<span class="rc-score">${esc(score(m))}${vic ? `<i class="res res-${vic[0]}" title="${vic[1]}">${vic[0]}</i>` : ""}</span>` : ""}</div>
        <dl class="rc-dl">
          <div><dt>${T("Game plan", "Plan de jeu")}</dt><dd>${p.nom ? esc(p.nom) : "—"}</dd></div>
          <div><dt>${T("System", "Système")}</dt><dd>${esc(p.systeme || "—")}</dd></div>
          <div><dt>${T("Instructions", "Consignes")}</dt><dd>${nc + ni ? `${nc} ${T("team", "coll.")} · ${ni} ${T("indiv.", "indiv.")}` : "—"}</dd></div>
          <div><dt>${T("Line-up", "Composition")}</dt><dd>${compo ? `${compo}/11` : "—"}</dd></div>
          <div><dt>${T("Venue", "Lieu")}</dt><dd>${m.domicile == null ? "—" : m.domicile ? T("Home", "Domicile") : T("Away", "Extérieur")}</dd></div>
        </dl>
        ${pret ? "" : `<div class="rc-prog"><span class="frise-txt">${esc(etatNom(m.etat))}</span><span class="bar"><i style="width:${pct(m.etat)}%"></i></span></div>`}
        <span class="rc-go">${pret ? T("Open the report", "Ouvrir le rapport") : T("Follow the analysis", "Suivre l'analyse")} →</span></a>`;
    };
    const rapports = finis.length ? finis.slice(0, 3) : M.slice(0, 3);
    const blocRapports = `<section class="home-sec">
        <div class="sec-h"><div><span class="label">${T("Analysis", "Analyse")}</span><h2>${finis.length ? T("Your latest reports", "Vos derniers rapports") : T("Your reports to come", "Vos prochains rapports")}</h2></div><a class="btn btn-line btn-sm" href="#/rapports">${T("All reports", "Tous les rapports")}</a></div>
        ${rapports.length ? `<div class="rgrid">${rapports.map(carteRapport).join("")}</div>`
          : `<div class="co-card empty">${ICON.report}<p><b style="color:var(--ink)">${T("No report yet", "Pas encore de rapport")}</b></p><p class="small">${T("Each analysed match gives a report: your game plan measured, team and player by player.", "Chaque match analysé donne un rapport : votre plan de jeu mesuré, pour l'équipe et joueur par joueur.")}</p><a class="btn btn-ink btn-sm" href="#/nouveau">${T("Send a video", "Envoyer une vidéo")}</a></div>`}
      </section>`;

    view.innerHTML = `${stage}
      <div class="facts" style="margin-bottom:30px">
        <a href="#/videos/tous"><span class="k">${T("Videos", "Vidéos")}</span><b>${M.length}</b><small>${T("sent to Ciprio", "envoyées à Ciprio")}</small><span class="go">→</span></a>
        <a href="#/videos/${aPointer.length ? "pour_vous" : "en_cours"}"><span class="k">${T("In progress", "En cours")}</span><b>${enCours.length + aPointer.length}</b><small>${aPointer.length ? T(`${aPointer.length} waiting for you`, `dont ${aPointer.length} pour vous`) : T("being analysed", "en analyse")}</small><span class="go">→</span></a>
        <a href="#/rapports"><span class="k">${T("Reports", "Rapports")}</span><b>${finis.length}</b><small>${T("analyses completed", "analyses terminées")}</small><span class="go">→</span></a>
        <a href="#/equipe"><span class="k">${T("Squad", "Effectif")}</span><b>${actifs.length}</b><small>${indispo.length ? T(`${indispo.length} unavailable`, `dont ${indispo.length} indisponible(s)`) : T("active players", "joueurs actifs")}</small><span class="go">→</span></a>
      </div>
      ${blocRapports}
      <div class="grid g-main">
        <div class="stack">
          <div class="co-card">
            <div class="card-h"><div><span class="label">${T("Activity", "Activité")}</span><h2>${T("Latest videos", "Dernières vidéos")}</h2></div><a class="btn btn-line btn-sm" href="#/videos">${T("See all", "Tout voir")}</a></div>
            ${M.length ? `<div class="mlist">${M.slice(0, 5).map(mrow).join("")}</div>` : `<div class="empty">${ICON.video}<p>${T("No video yet.", "Aucune vidéo pour l'instant.")}</p></div>`}
          </div>
          <div class="co-card">
            <div class="card-h"><div><span class="label">${T("Preparation", "Préparation")}</span><h2>${T("Your game plans", "Vos plans de jeu")}</h2></div><a class="btn btn-line btn-sm" href="#/plan/nouveau">${T("New plan", "Nouveau plan")}</a></div>
            ${D.plans.length ? `<div class="plist">${D.plans.slice(0, 4).map((p) => `<a href="#/plan/${p.id}"><span class="sys">${esc(p.systeme || "—")}</span><b>${esc(p.nom)}</b><span class="muted small">${(p.consignes || []).length} ${T("team instr.", "consignes coll.")} · ${(p.individuelles || []).length} ${T("indiv.", "indiv.")} · ${(p.composition || []).filter(Boolean).length}/11</span><span class="go">→</span></a>`).join("")}</div>`
              : `<p class="muted small">${T("No game plan yet: write your instructions once, reuse them match after match.", "Pas encore de plan : écrivez vos consignes une fois, réutilisez-les match après match.")}</p>`}
          </div>
        </div>
        <div class="stack">
          <div class="co-card">
            <div class="card-h"><div><span class="label">${T("Squad", "Effectif")}</span><h2>${D.equipe ? esc(D.equipe.nom) : T("Your team", "Votre équipe")}</h2></div><a class="btn btn-line btn-sm" href="#/equipe">${T("Manage", "Gérer")}</a></div>
            ${D.equipe ? `<dl class="dl">
                <dt>${T("Available", "Disponibles")}</dt><dd><b>${actifs.length - indispo.length}</b> / ${actifs.length}</dd>
                <dt>${T("Usual system", "Système habituel")}</dt><dd>${esc(D.equipe.systeme || "—")}</dd>
                <dt>${T("Captain", "Capitaine")}</dt><dd>${capitaine ? esc(nomJoueur(capitaine)) : "—"}</dd>
                <dt>${T("Category", "Catégorie")}</dt><dd>${esc([D.equipe.categorie, D.equipe.niveau].filter(Boolean).join(" · ") || "—")}</dd></dl>
              ${indispo.length ? `<div class="indispo"><span class="label">${T("Unavailable", "Indisponibles")}</span>${indispo.map((j) => `<span class="ij"><b>${esc(nomJoueur(j))}</b><span class="tag st-${j.statut}">${esc(statut(j.statut))}</span></span>`).join("")}</div>` : ""}`
              : `<p class="muted small">${T("Create your team and register your players: Ciprio uses their numbers to recognise them.", "Créez votre équipe et inscrivez vos joueurs : Ciprio se sert de leurs numéros pour les reconnaître.")}</p><div class="co-actions" style="margin-top:14px"><a class="btn btn-ink btn-sm" href="#/equipe">${T("Create my team", "Créer mon équipe")}</a></div>`}
          </div>
          ${faits < etapes.length ? `<div class="co-card">
            <div class="card-h"><div><span class="label">${T("Set-up", "Mise en route")}</span><h2>${T("Getting started", "Pour bien démarrer")}</h2></div><span class="pill">${faits} / ${etapes.length}</span></div>
            <div class="meter" style="margin-top:0"><i style="width:${Math.round((faits / etapes.length) * 100)}%"></i></div>
            <ul class="check">${etapes.map(([ok, t, h]) => `<li class="${ok ? "ok" : ""}"><a href="${h}"><i>${ok ? "✓" : ""}</i>${esc(t)}</a></li>`).join("")}</ul>
          </div>` : ""}
          <a class="co-card tuto-card" href="#/tuto"><div><span class="k">${T("Guide", "Guide")}</span><h2>${T("How it works, step by step", "Comment ça marche, étape par étape")}</h2>
            <p>${T("From your squad to the report: what you do, what Ciprio does.", "De votre effectif au rapport : ce que vous faites, ce que fait Ciprio.")}</p></div><span class="btn btn-sm">${T("Open →", "Ouvrir →")}</span></a>
        </div>
      </div>`;
    if (arreterCamera) arreterCamera();
    if (window.CIPRIO_CAMERA) arreterCamera = CIPRIO_CAMERA.monter($("cam"), { mode: cur ? "vert" : "blanc" });
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
        plan: plan ? { plan_id: plan.id, nom: plan.nom, systeme: plan.systeme, consignes: plan.consignes, individuelles: plan.individuelles, composition: plan.composition || [] } : {}, video, etat: "cree" };
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
  function videosView(f) {
    if (f) filtre = f;
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
        <div class="co-card"><h2>${T("Line-up", "Composition")}</h2><p class="sub">${esc(p.systeme || T("not set", "non précisé"))}</p>${pitchSVG(p.systeme || (D.equipe && D.equipe.systeme) || "4-3-3", p.composition || null)}</div></div>`;
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
      const plan = p ? { plan_id: p.id, nom: p.nom, systeme: p.systeme, consignes: p.consignes, individuelles: p.individuelles, composition: p.composition || [] } : {};
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

  // ================================================================ COMMENT ÇA MARCHE (tutoriel)
  function tutoView() {
    try { localStorage.setItem("ciprio-tuto-vu", "1"); } catch {}
    const E = [
      { t: T("Create your team and register your players", "Créez votre équipe et inscrivez vos joueurs"), qui: T("You · 10 min, once", "Vous · 10 min, une seule fois"),
        l: [T("Go to “Your team”, give it a name, its category and its shirt colours.", "Allez dans « Votre équipe », donnez-lui un nom, sa catégorie et ses couleurs de maillot."),
          T("Register each player with his shirt number and his positions.", "Inscrivez chaque joueur avec son numéro de maillot et ses postes."),
          T("The numbers let Ciprio recognise your players on the video.", "Les numéros permettent à Ciprio de reconnaître vos joueurs sur la vidéo.")], a: ["#/equipe", T("Your team", "Votre équipe")] },
      { t: T("Write your game plan", "Écrivez votre plan de jeu"), qui: T("You · 5 min per match", "Vous · 5 min par match"),
        l: [T("In “Game plans”, choose your system and place your registered players in the line-up.", "Dans « Plans de jeu », choisissez votre système et placez vos joueurs inscrits dans la composition."),
          T("Write your team instructions: pressing, block, build-up… one action per line.", "Écrivez vos consignes collectives : pressing, bloc, relance… une action par ligne."),
          T("Give each instruction a target Ciprio can measure (time, distance, zone).", "Donnez à chaque consigne un objectif que Ciprio peut mesurer (temps, distance, zone)."),
          T("Add individual instructions for the players who need them.", "Ajoutez des consignes individuelles aux joueurs qui en ont besoin.")], a: ["#/plan/nouveau", T("Write a plan", "Écrire un plan")] },
      { t: T("Film the whole match", "Filmez le match entier"), qui: T("You · on match day", "Vous · le jour du match"),
        l: [T("A fixed camera, high up, at the halfway line, seeing both goals (Veo or similar).", "Une caméra fixe, en hauteur, au niveau de la médiane, qui voit les deux buts (Veo ou équivalent)."),
          T("From the kick-off to the final whistle, without moving the camera.", "Du coup d'envoi au coup de sifflet final, sans déplacer la caméra.")], a: ["#/aide", T("Filming tips", "Conseils de tournage")] },
      { t: T("Send the video", "Envoyez la vidéo"), qui: T("You · 2 min", "Vous · 2 min"),
        l: [T("Click “New video”: opponent, date, shirt colours, game plan of the match.", "Cliquez sur « Nouvelle vidéo » : adversaire, date, couleurs des maillots, plan de jeu du match."),
          T("Paste the Veo share link (file upload is coming).", "Collez le lien de partage Veo (l'envoi du fichier arrive bientôt)."),
          T("The match appears in “Videos” with its progress bar.", "Le match apparaît dans « Vidéos » avec sa barre d'avancement.")], a: ["#/nouveau", T("New video", "Nouvelle vidéo")] },
      { t: T("Ciprio prepares the match", "Ciprio prépare le match"), qui: T("Ciprio · automatic", "Ciprio · automatique"),
        l: [T("Ciprio watches the video and chooses a few images where the pitch markings are clear.", "Ciprio regarde la vidéo et choisit quelques images où les marquages du terrain sont nets."),
          T("The bar at the top of the screen shows where it stands. Nothing to do.", "La barre en haut de l'écran montre où il en est. Rien à faire.")] },
      { t: T("Set up the pitch", "Réglez le terrain"), qui: T("You · about 5 min", "Vous · environ 5 min"),
        l: [T("When it's your turn, a green banner appears: click “Set up the pitch”.", "Quand c'est votre tour, un bandeau vert apparaît : cliquez sur « Régler le terrain »."),
          T("On each image, click exactly on the markings asked (corners, boxes, centre circle…).", "Sur chaque image, cliquez exactement sur les repères demandés (coins, surfaces, rond central…)."),
          T("Can't see a marking? Say so: Ciprio calculates it and shows it in orange. Drag it if it's off.", "Vous ne voyez pas un repère ? Dites-le : Ciprio le calcule et le montre en orange. Faites-le glisser s'il est à côté."),
          T("Your clicks are the reference of the whole analysis: Ciprio never moves them.", "Vos clics sont la référence de toute l'analyse : Ciprio ne les déplace jamais.")] },
      { t: T("Ciprio follows the whole match", "Ciprio suit tout le match"), qui: T("Ciprio · automatic", "Ciprio · automatique"),
        l: [T("The pitch is followed image by image, then players, ball and team shape.", "Le terrain est suivi image par image, puis les joueurs, le ballon et le bloc."),
          T("A quality check is run before anything reaches you.", "Un contrôle qualité est fait avant que quoi que ce soit vous parvienne.")] },
      { t: T("Read the report", "Lisez le rapport"), qui: T("You", "Vous"),
        l: [T("Each instruction of your game plan, measured over the whole match.", "Chaque consigne de votre plan de jeu, mesurée sur tout le match."),
          T("Team and player by player, with the key video moments to show in the debrief.", "Pour l'équipe et joueur par joueur, avec les moments vidéo clés à montrer au débrief.")], a: ["#/rapports", T("Reports", "Rapports")] },
    ];
    view.innerHTML = `<div class="tuto-hero"><span class="k">${T("Tutorial", "Tutoriel")}</span><h1>${T("How Ciprio works", "Comment fonctionne Ciprio")}</h1>
        <p>${T("Eight steps, from your squad to the report. You do four of them; Ciprio does the rest.", "Huit étapes, de votre effectif au rapport. Vous en faites quatre ; Ciprio fait le reste.")}</p>
        <div class="tally"><div><b>8</b><span>${T("steps", "étapes")}</span></div><div><b>~20 min</b><span>${T("of your time", "de votre temps")}</span></div><div><b>5 min</b><span>${T("per match", "par match")}</span></div></div></div>
      <ol class="tl">${E.map((e, k) => `<li class="${/Ciprio ·/.test(e.qui) ? "auto" : ""}"><span class="n">${String(k + 1).padStart(2, "0")}</span><div class="co-card"><div class="tl-h"><h2>${e.t}</h2><span class="who">${e.qui}</span></div>
        <ul>${e.l.map((x) => `<li>${x}</li>`).join("")}</ul>${e.a ? `<a class="btn btn-line btn-sm" href="${e.a[0]}">${e.a[1]} →</a>` : ""}</div></li>`).join("")}</ol>
      <div class="co-card" style="margin-top:22px"><h2>${T("The stages of an analysis", "Les étapes d'une analyse")}</h2><p class="sub">${T("What you see on each match, in the top bar and in “Videos”.", "Ce que vous voyez sur chaque match, dans la barre du haut et dans « Vidéos ».")}</p>
        <div class="legend">${ETATS.map((e) => `<span class="pill ${pillClass(e.k)}">${esc(T(e.en, e.fr))}</span>`).join("")}</div></div>
      <div class="callout tuto-end" style="margin-top:18px"><p><b>${T("Ready?", "Prêt ?")}</b> ${T("Start with your team: it takes ten minutes, once.", "Commencez par votre équipe : dix minutes, une seule fois.")}</p><a class="btn btn-ink btn-sm" href="${D.equipe ? "#/nouveau" : "#/equipe"}">${D.equipe ? T("Send a video →", "Envoyer une vidéo →") : T("Create my team →", "Créer mon équipe →")}</a></div>`;
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
      ${D.plans.length ? `<div class="grid g3">${D.plans.map((p) => `<a class="co-card plan-card" href="#/plan/${p.id}"><span class="top"><span class="sys">${esc(p.systeme || "—")}</span><span class="label">${(p.composition || []).filter(Boolean).length}/11</span></span>${pitchSVG(p.systeme, p.composition && p.composition.some(Boolean) ? p.composition : null)}<h3>${esc(p.nom)}</h3>
          <p class="muted small">${(p.consignes || []).length} ${T("team instructions", "consignes collectives")} · ${(p.individuelles || []).length} ${T("individual", "individuelles")}</p>
          <p class="muted small" style="margin-top:8px">${T("Updated ", "Modifié le ")}${esc(fmtDate(p.maj_le, { day: "numeric", month: "short" }))} · ${D.matchs.filter((m) => m.plan && m.plan.plan_id === p.id).length} ${T("match(es)", "match(s)")}</p></a>`).join("")}</div>`
        : vide(ICON.plan, T("No game plan yet", "Aucun plan de jeu pour l'instant"), T("Write your instructions once (pressing, block, build-up…), then reuse them match after match.", "Écrivez vos consignes une fois (pressing, bloc, relance…), puis réutilisez-les match après match."), `<a class="btn btn-ink btn-sm" href="#/plan/nouveau">${T("Write a plan", "Écrire un plan")}</a>`)}`;
  }

  function planView(id) {
    const p0 = id === "nouveau" ? { nom: "", systeme: (D.equipe && D.equipe.systeme) || "4-3-3", consignes: [{ theme: "pressing", texte: "", mesure: "" }], individuelles: [], composition: [], notes: "" } : D.plans.find((x) => x.id === id);
    const p = planView.brouillon && planView.brouillon.id === id ? planView.brouillon.p : p0;
    planView.brouillon = null;
    if (!p) { view.innerHTML = `<a class="back" href="#/plans">← ${T("Game plans", "Plans de jeu")}</a>${vide("", T("Plan not found", "Plan introuvable"), "")}`; return; }
    let C = JSON.parse(JSON.stringify(p.consignes || [])), IND = JSON.parse(JSON.stringify(p.individuelles || [])), COMPO = JSON.parse(JSON.stringify(p.composition || []));
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
        <div class="stack"><div class="co-card"><div class="toolbar" style="margin-bottom:4px"><h2>${T("Line-up", "Composition")}</h2><button class="btn btn-line btn-sm" type="button" id="newJ">${T("+ Register a player", "+ Inscrire un joueur")}</button></div>
            <p class="sub" id="sysLabel">${esc(p.systeme)}</p><div id="pitch"></div><div id="compo" class="compo"></div></div>
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
    const drawCompo = () => {
      const sys = $("sys").value, P = places(sys);
      COMPO = P.map((_, k) => COMPO[k] || null);
      $("pitch").innerHTML = pitchSVG(sys, COMPO);
      const opts = (k) => `<option value="">–</option>${D.joueurs.filter((j) => j.actif).map((j) => `<option value="${j.id}" ${COMPO[k] === j.id ? "selected" : ""} ${COMPO.includes(j.id) && COMPO[k] !== j.id ? "disabled" : ""}>${esc(nomJoueur(j))}${j.poste ? " · " + esc(poste(j.poste)) : ""}</option>`).join("")}`;
      $("compo").innerHTML = D.joueurs.length ? P.map((n, k) => `<label><span>${esc(n)}</span><select data-k="${k}">${opts(k)}</select></label>`).join("")
        : `<p class="muted small">${T("Register your players to build the line-up.", "Inscrivez vos joueurs pour faire la composition.")}</p>`;
      $("compo").querySelectorAll("select").forEach((el) => el.addEventListener("change", () => { COMPO[Number(el.dataset.k)] = el.value || null; drawCompo(); }));
    };
    drawC(); drawI(); drawCompo();
    // inscrire un joueur sans quitter le plan : le brouillon est gardé, puis la page revient avec le joueur dans les listes
    $("newJ").addEventListener("click", () => joueurDlg(null, () => {
      planView.brouillon = { id, p: { ...p, nom: $("nom").value, systeme: $("sys").value, consignes: C, individuelles: IND, composition: COMPO, notes: $("notes").value } };
      planView(id);
    }));
    $("addC").addEventListener("click", () => { C.push({ theme: "pressing", texte: "", mesure: "" }); drawC(); });
    $("addI").addEventListener("click", () => { IND.push({ joueur_id: "", texte: "" }); drawI(); });
    $("sys").addEventListener("change", () => { $("sysLabel").textContent = $("sys").value; drawCompo(); });
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
      const rec = { nom, systeme: $("sys").value, consignes: C.filter((c) => c.texte.trim()), individuelles: IND.filter((c) => c.texte.trim() && c.joueur_id), composition: COMPO, notes: $("notes").value.trim() || null, equipe_id: (D.equipe && D.equipe.id) || null };
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
        <div class="actions"><button class="btn btn-line" id="edit" type="button">${T("Edit the team", "Modifier l'équipe")}</button><button class="btn btn-ink" id="add" type="button">${T("+ Register a player", "+ Inscrire un joueur")}</button></div></div>
      <div class="grid g-main">
        <div class="co-card" style="padding:8px 8px 4px">
          <div class="toolbar" style="padding:14px 14px 0;margin-bottom:8px"><h2>${T("Squad", "Effectif")} <span class="muted" style="font-weight:400">· ${J.filter((j) => j.actif).length}</span></h2></div>
          ${J.length ? `<div style="overflow-x:auto"><table class="table"><thead><tr><th>${T("No.", "N°")}</th><th>${T("Player", "Joueur")}</th><th>${T("Positions", "Postes")}</th><th>${T("Foot", "Pied")}</th><th>${T("Age", "Âge")}</th><th>${T("Status", "Statut")}</th></tr></thead><tbody>
            ${J.map((j) => `<tr data-id="${j.id}" style="${j.actif ? "" : "opacity:.5"}"><td><span class="num">${j.numero ?? "–"}</span></td><td><b>${esc([j.prenom, j.nom].filter(Boolean).join(" "))}</b>${j.capitaine ? ' <span class="tag cap">C</span>' : ""}${j.club_precedent ? `<br><span class="muted small">${T("from ", "vient de ")}${esc(j.club_precedent)}</span>` : ""}</td>
              <td>${j.poste ? `<span class="tag strong" title="${esc(posteNom(j.poste))}">${esc(poste(j.poste))}</span>` : ""} ${(j.postes_secondaires || []).map((x) => `<span class="tag" title="${esc(posteNom(x))}">${esc(poste(x))}</span>`).join(" ")}</td>
              <td class="muted">${esc(({ droit: T("Right", "Droit"), gauche: T("Left", "Gauche"), deux: T("Both", "Les deux") })[j.pied] || "")}</td>
              <td class="muted">${age(j.date_naissance) ?? ""}</td>
              <td>${!j.actif ? `<span class="muted small">${T("left the squad", "hors effectif")}</span>` : j.statut && j.statut !== "disponible" ? `<span class="tag st-${j.statut}">${esc(statut(j.statut))}</span>` : `<span class="muted small">${esc(statut("disponible"))}</span>`}</td></tr>`).join("")}</tbody></table></div>`
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

  function joueurDlg(j, apres) {
    const dlg = $("dlg");
    if (!D.equipe) { location.hash = "#/equipe"; return; }
    const v = j || { prenom: "", nom: "", numero: null, poste: "", postes_secondaires: [], pied: "", actif: true, statut: "disponible", capitaine: false };
    const sec = new Set(v.postes_secondaires || []);
    dlg.classList.add("wide");
    dlg.innerHTML = `<form id="fj" novalidate><h2>${j ? T("Player profile", "Fiche du joueur") : T("Register a player", "Inscrire un joueur")}</h2>
      <h3 class="dsec">${T("Identity", "Identité")}</h3>
      <div class="frow"><div class="field"><label for="jp">${T("First name", "Prénom")}</label><input id="jp" value="${esc(v.prenom || "")}"></div>
        <div class="field"><label for="jn">${T("Last name", "Nom")}</label><input id="jn" value="${esc(v.nom || "")}"></div></div>
      <div class="frow"><div class="field"><label for="jdn">${T("Date of birth", "Date de naissance")}</label><input id="jdn" type="date" value="${esc(v.date_naissance || "")}"></div>
        <div class="field"><label for="jnat">${T("Nationality", "Nationalité")}</label><input id="jnat" value="${esc(v.nationalite || "")}"></div></div>
      <h3 class="dsec">${T("On the pitch", "Sur le terrain")}</h3>
      <div class="frow3"><div class="field"><label for="jnum">${T("Shirt number", "Numéro")}</label><input id="jnum" type="number" min="0" max="99" value="${v.numero ?? ""}"></div>
        <div class="field"><label for="jpo">${T("Main position", "Poste principal")}</label><select id="jpo"><option value="">–</option>${POSTES.map((p) => `<option value="${p[0]}" ${v.poste === p[0] ? "selected" : ""}>${L() === "fr" ? p[2] : p[3]}</option>`).join("")}</select></div>
        <div class="field"><label for="jpi">${T("Strong foot", "Bon pied")}</label><select id="jpi"><option value="">–</option>${[["droit", T("Right", "Droit")], ["gauche", T("Left", "Gauche")], ["deux", T("Both", "Les deux")]].map(([k, t]) => `<option value="${k}" ${v.pied === k ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <div class="field"><span class="flabel">${T("Other positions", "Autres postes")}</span><div class="chips" id="jsec">${POSTES.map((p) => `<button type="button" data-p="${p[0]}" aria-pressed="${sec.has(p[0])}" title="${esc(L() === "fr" ? p[2] : p[3])}">${esc(L() === "fr" ? p[0] : p[1])}</button>`).join("")}</div></div>
      <div class="frow"><div class="field"><label for="jst">${T("Status", "Statut")}</label><select id="jst">${STATUTS.map((x) => `<option value="${x[0]}" ${v.statut === x[0] ? "selected" : ""}>${L() === "fr" ? x[1] : x[2]}</option>`).join("")}</select></div>
        <div class="field"><span class="flabel">&nbsp;</span><label class="check-inline"><input id="jcap" type="checkbox" ${v.capitaine ? "checked" : ""}>${T("Captain", "Capitaine")}</label></div></div>
      <h3 class="dsec">${T("Physical", "Physique")}</h3>
      <div class="frow"><div class="field"><label for="jt">${T("Height (cm)", "Taille (cm)")}</label><input id="jt" type="number" min="100" max="230" value="${v.taille_cm ?? ""}"></div>
        <div class="field"><label for="jw">${T("Weight (kg)", "Poids (kg)")}</label><input id="jw" type="number" min="30" max="150" value="${v.poids_kg ?? ""}"></div></div>
      <h3 class="dsec">${T("Career", "Parcours")}</h3>
      <div class="frow3"><div class="field"><label for="jcp">${T("Previous club", "Club précédent")}</label><input id="jcp" value="${esc(v.club_precedent || "")}"></div>
        <div class="field"><label for="jar">${T("Joined on", "Arrivé le")}</label><input id="jar" type="date" value="${esc(v.arrive_le || "")}"></div>
        <div class="field"><label for="jli">${T("Licence no.", "N° de licence")}</label><input id="jli" value="${esc(v.licence || "")}"></div></div>
      <div class="field"><label for="jno">${T("Notes", "Notes")} <small>${T("(strengths, areas to work on…)", "(points forts, axes de travail…)")}</small></label><textarea id="jno">${esc(v.notes || "")}</textarea></div>
      <label class="switch" style="border:0;padding-top:0"><span>${T("In the current squad", "Dans l'effectif actuel")}</span><input id="ja" type="checkbox" ${v.actif ? "checked" : ""}></label>
      <p class="form-msg" id="jm"></p>
      <div class="co-actions"><span>${j ? `<button class="btn btn-danger btn-sm" type="button" id="jdel">${T("Delete", "Supprimer")}</button>` : ""}</span>
        <span style="display:flex;gap:10px"><button class="btn btn-line btn-sm" type="button" id="jx">${T("Cancel", "Annuler")}</button><button class="btn btn-ink btn-sm" type="submit">${j ? T("Save", "Enregistrer") : T("Register", "Inscrire")}</button></span></div></form>`;
    dlg.showModal();
    const fini = async () => { dlg.close(); await charger(); if (apres) apres(); else equipeView(); };
    $("jsec").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"))));
    $("jx").addEventListener("click", () => dlg.close());
    if ($("jdel")) $("jdel").addEventListener("click", async () => {
      if (!confirm(T("Delete this player?", "Supprimer ce joueur ?"))) return;
      const { error } = await sb.from("joueurs").delete().eq("id", j.id);
      if (error) return msg($("jm"), error.message, "err");
      fini();
    });
    $("fj").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nom = $("jn").value.trim();
      if (!nom) return msg($("jm"), T("Fill in the last name.", "Indiquez le nom."), "err");
      const n = (x) => ($(x).value === "" ? null : Number($(x).value));
      const num = n("jnum");
      if (num != null && D.joueurs.some((x) => x.actif && x.numero === num && (!j || x.id !== j.id))) return msg($("jm"), T("This number is already taken.", "Ce numéro est déjà pris."), "err");
      const princ = $("jpo").value || null;
      const rec = { prenom: $("jp").value.trim() || null, nom, numero: num, poste: princ, pied: $("jpi").value || null, actif: $("ja").checked,
        postes_secondaires: [...$("jsec").querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.p).filter((x) => x !== princ),
        date_naissance: $("jdn").value || null, nationalite: $("jnat").value.trim() || null, statut: $("jst").value, capitaine: $("jcap").checked,
        taille_cm: n("jt"), poids_kg: n("jw"), club_precedent: $("jcp").value.trim() || null, arrive_le: $("jar").value || null, licence: $("jli").value.trim() || null, notes: $("jno").value.trim() || null };
      const r = j ? await sb.from("joueurs").update(rec).eq("id", j.id) : await sb.from("joueurs").insert({ ...rec, coach_id: session.user.id, equipe_id: D.equipe.id });
      if (r.error) return msg($("jm"), r.error.message, "err");
      fini();
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

  // ================================================================ PARAMÈTRES (à onglets)
  function parametresView(onglet = "profil") {
    const p = D.profil, pref = p.preferences || {};
    const O = [["profil", T("Profile", "Profil")], ["compte", T("Account & security", "Compte et sécurité")], ["club", T("Club & team", "Club et équipe")],
      ["notifications", T("Notifications", "Notifications")], ["preferences", T("Preferences", "Préférences")], ["abonnement", T("Plan", "Abonnement")], ["donnees", T("Privacy & data", "Confidentialité et données")]];
    if (!O.some((o) => o[0] === onglet)) onglet = "profil";
    const savePref = async (k, val) => { const np = { ...(D.profil.preferences || {}), [k]: val }; const { error } = await sb.from("profils").update({ preferences: np }).eq("id", session.user.id); if (!error) D.profil.preferences = np; return error; };
    let corps = "";
    if (onglet === "profil") corps = `<form id="f" class="co-card" novalidate><h2>${T("Profile", "Profil")}</h2><p class="sub">${T("How you appear in Ciprio.", "Comment vous apparaissez dans Ciprio.")}</p>
        <div class="team-head" style="margin:18px 0"><span class="avatar xl">${esc(initiales())}</span><div><b>${esc(p.nom || session.user.email)}</b><p class="muted small">${esc(session.user.email)}</p></div></div>
        <div class="frow"><div class="field"><label for="nom">${T("Full name", "Nom complet")}</label><input id="nom" autocomplete="name" value="${esc(p.nom || "")}"></div>
          <div class="field"><label for="fct">${T("Role", "Fonction")}</label><select id="fct"><option value="">–</option>${FONCTIONS.map((f) => `<option value="${f[0]}" ${p.fonction === f[0] ? "selected" : ""}>${L() === "fr" ? f[1] : f[2]}</option>`).join("")}</select></div></div>
        <div class="frow"><div class="field"><label for="dip">${T("Coaching licence", "Diplôme d'entraîneur")}</label><input id="dip" value="${esc(p.diplome || "")}" placeholder="${T("e.g. UEFA B", "ex. BEF, DES, UEFA B")}"></div>
          <div class="field"><label for="tel">${T("Phone", "Téléphone")}</label><input id="tel" type="tel" autocomplete="tel" value="${esc(p.telephone || "")}"></div></div>
        <div class="field"><label for="bio">${T("About you", "À propos")} <small>${T("(optional)", "(facultatif)")}</small></label><textarea id="bio" placeholder="${T("Your career, your philosophy of play…", "Votre parcours, votre philosophie de jeu…")}">${esc(p.bio || "")}</textarea></div>
        <div class="co-actions"><button class="btn btn-ink btn-sm" type="submit">${T("Save", "Enregistrer")}</button></div><p class="form-msg" id="m"></p></form>`;
    else if (onglet === "compte") corps = `<div class="stack">
        <div class="co-card"><h2>${T("E-mail address", "Adresse e-mail")}</h2><p class="sub">${T("Used to log in and to receive your codes.", "Sert à vous connecter et à recevoir vos codes.")}</p>
          <div class="field" style="margin-top:14px"><input value="${esc(session.user.email)}" disabled></div>
          <p class="muted small">${T("To change it, write to contact@ciprio.ai.", "Pour la changer, écrivez à contact@ciprio.ai.")}</p></div>
        <form id="fs" class="co-card" novalidate><h2>${T("Password", "Mot de passe")}</h2><p class="sub">${T("At least 8 characters.", "Au moins 8 caractères.")}</p>
          <div class="frow" style="margin-top:14px"><div class="field"><label for="mdp">${T("New password", "Nouveau mot de passe")}</label><input id="mdp" type="password" autocomplete="new-password" minlength="8"></div>
            <div class="field"><label for="mdp2">${T("Confirm", "Confirmer")}</label><input id="mdp2" type="password" autocomplete="new-password" minlength="8"></div></div>
          <div class="co-actions"><button class="btn btn-ink btn-sm" type="submit">${T("Change my password", "Changer mon mot de passe")}</button></div><p class="form-msg" id="ms"></p></form>
        <div class="co-card"><h2>${T("Sessions", "Sessions")}</h2><p class="sub">${T("Log out here, or from every device where you are logged in.", "Déconnectez-vous ici, ou de tous les appareils où vous êtes connecté.")}</p>
          <dl class="dl" style="margin-top:14px"><dt>${T("Account created", "Compte créé le")}</dt><dd>${esc(fmtDate(session.user.created_at) || "–")}</dd><dt>${T("Last login", "Dernière connexion")}</dt><dd>${esc(fmtDate(session.user.last_sign_in_at, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) || "–")}</dd></dl>
          <div class="co-actions" style="margin-top:16px"><button class="btn btn-ink btn-sm" id="logout" type="button">${T("Log out", "Se déconnecter")}</button><button class="btn btn-line btn-sm" id="logoutAll" type="button">${T("Log out everywhere", "Se déconnecter partout")}</button></div></div></div>`;
    else if (onglet === "club") { const e = D.equipe; corps = `<div class="co-card"><h2>${T("Club & team", "Club et équipe")}</h2><p class="sub">${T("Your club and the team you analyse.", "Votre club et l'équipe que vous analysez.")}</p>
        ${e ? `<div class="team-head" style="margin:18px 0"><span class="crest" style="background:${esc(e.couleur_domicile || "#12a150")}">${esc((e.club || e.nom).slice(0, 2).toUpperCase())}</span><div><b>${esc(e.nom)}</b><p class="muted small">${esc([e.club, e.categorie, e.niveau].filter(Boolean).join(" · "))}</p></div></div>
          <dl class="dl"><dt>${T("Usual system", "Système habituel")}</dt><dd>${esc(e.systeme || "–")}</dd><dt>${T("Players", "Joueurs")}</dt><dd>${D.joueurs.filter((x) => x.actif).length}</dd><dt>${T("Ground", "Stade")}</dt><dd>${esc(e.stade || "–")}</dd></dl>
          <div class="co-actions" style="margin-top:16px"><a class="btn btn-ink btn-sm" href="#/equipe">${T("Manage the team", "Gérer l'équipe")}</a></div>`
          : `<div class="callout info" style="margin-top:16px"><p>${T("No team yet.", "Pas encore d'équipe.")}</p><a class="btn btn-ink btn-sm" href="#/equipe">${T("Create my team", "Créer mon équipe")}</a></div>`}</div>`; }
    else if (onglet === "notifications") {
      const N = [["analyse", T("An analysis is ready", "Une analyse est prête"), T("The report of a match is available.", "Le rapport d'un match est disponible.")],
        ["pointage", T("It's your turn to set up the pitch", "C'est à vous de régler le terrain"), T("A match is waiting for your 5 minutes of pointing.", "Un match attend vos 5 minutes de pointage.")],
        ["probleme", T("A problem on a match", "Un problème sur un match"), T("Ciprio needs something from you.", "Ciprio a besoin de quelque chose de votre part.")],
        ["nouveautes", T("Ciprio news", "Nouveautés de Ciprio"), T("New features, at most once a month.", "Nouvelles fonctions, au plus une fois par mois.")]];
      const on = (k) => (k === "analyse" ? p.notif_email !== false : (pref.notif || {})[k] !== false && !(k === "nouveautes" && (pref.notif || {})[k] === undefined));
      corps = `<div class="co-card"><h2>${T("E-mail notifications", "Notifications par e-mail")}</h2><p class="sub">${T("Sent to ", "Envoyées à ")}${esc(session.user.email)}</p>
        <div style="margin-top:10px">${N.map(([k, t, d]) => `<label class="switch"><span><b style="font-weight:500">${t}</b><br><span class="muted small">${d}</span></span><input type="checkbox" data-n="${k}" ${on(k) ? "checked" : ""}></label>`).join("")}</div>
        <p class="form-msg" id="m"></p></div>`;
    } else if (onglet === "preferences") corps = `<div class="co-card"><h2>${T("Preferences", "Préférences")}</h2><p class="sub">${T("How Ciprio looks and opens.", "Comment Ciprio s'affiche et s'ouvre.")}</p>
        <div style="margin-top:10px">
          <div class="switch"><span>${T("Language", "Langue")}</span><span class="chips"><button type="button" data-l="fr" aria-pressed="${L() === "fr"}">Français</button><button type="button" data-l="en" aria-pressed="${L() === "en"}">English</button></span></div>
          <div class="switch"><span>${T("Page when I log in", "Page à l'ouverture")}</span><select class="sel" id="acc">${[["/", T("Home", "Accueil")], ["/videos", T("Videos", "Vidéos")], ["/plans", T("Game plans", "Plans de jeu")]].map(([k, t]) => `<option value="${k}" ${(pref.accueil || "/") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="switch"><span>${T("Distances", "Distances")}</span><select class="sel" id="uni">${[["m", T("Metres", "Mètres")], ["yd", T("Yards", "Yards")]].map(([k, t]) => `<option value="${k}" ${(pref.unites || "m") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="switch"><span>${T("Show the tutorial again", "Revoir le tutoriel")}</span><a class="btn btn-line btn-sm" href="#/tuto">${T("Open", "Ouvrir")}</a></div>
        </div><p class="form-msg" id="m"></p></div>`;
    else if (onglet === "abonnement") corps = `<div class="stack"><div class="co-card plan-now"><span class="k">${T("Current plan", "Formule actuelle")}</span><h2>${T("Test access", "Accès test")}</h2>
          <p class="sub">${T("Free during the test phase: every feature, no commitment, no payment method.", "Gratuit pendant la phase de test : toutes les fonctions, sans engagement, sans moyen de paiement.")}</p>
          <ul class="tips" style="margin-top:14px"><li><b>✓</b><span>${T("Unlimited matches during the tests", "Matchs illimités pendant les tests")}</span></li><li><b>✓</b><span>${T("Game plans, squad, reports", "Plans de jeu, effectif, rapports")}</span></li><li><b>✓</b><span>${T("Direct support from the Ciprio team", "Accompagnement direct par l'équipe Ciprio")}</span></li></ul></div>
        <div class="co-card"><h2>${T("Invoices", "Factures")}</h2><p class="sub">${T("No invoice: nothing to pay during the tests.", "Aucune facture : rien à payer pendant les tests.")}</p></div></div>`;
    else corps = `<div class="stack">
        <div class="co-card"><h2>${T("Your data", "Vos données")}</h2><p class="sub">${T("Your videos, clicks and plans belong to you. Only you and the Ciprio team (for the analysis) can see them.", "Vos vidéos, vos clics et vos plans vous appartiennent. Seuls vous et l'équipe Ciprio (pour l'analyse) les voient.")}</p>
          <div class="co-actions" style="margin-top:14px"><button class="btn btn-line btn-sm" id="export" type="button">${T("Download my data (JSON)", "Télécharger mes données (JSON)")}</button></div></div>
        <div class="co-card"><h2>${T("Legal", "Documents")}</h2><div class="links"><a href="${L() === "fr" ? "/fr" : ""}/privacy" target="_blank" rel="noopener">${T("Privacy policy", "Politique de confidentialité")}<span>→</span></a><a href="${L() === "fr" ? "/fr" : ""}/terms" target="_blank" rel="noopener">${T("Terms of use", "Conditions d'utilisation")}<span>→</span></a></div></div>
        <div class="co-card danger-zone"><h2>${T("Delete my account", "Supprimer mon compte")}</h2><p class="sub">${T("Your account, your matches and all your data are deleted within 7 days. This cannot be undone.", "Votre compte, vos matchs et toutes vos données sont supprimés sous 7 jours. C'est définitif.")}</p>
          <div class="co-actions" style="margin-top:14px"><a class="btn btn-danger btn-sm" href="mailto:contact@ciprio.ai?subject=${encodeURIComponent(T("Delete my Ciprio account", "Supprimer mon compte Ciprio"))}&body=${encodeURIComponent(session.user.email)}">${T("Ask for deletion", "Demander la suppression")}</a></div></div></div>`;
    view.innerHTML = `<div class="co-head"><div><h1>${T("Settings", "Paramètres")}</h1><p>${T("Your profile, your account and your preferences.", "Votre profil, votre compte et vos préférences.")}</p></div></div>
      <div class="set"><nav class="set-nav">${O.map(([k, t]) => `<a href="#/parametres/${k}"${k === onglet ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav><div class="set-body">${corps}</div></div>`;
    oeils();
    if ($("f") && onglet === "profil") $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const rec = { nom: $("nom").value.trim() || null, fonction: $("fct").value || null, diplome: $("dip").value.trim() || null, telephone: $("tel").value.trim() || null, bio: $("bio").value.trim() || null };
      const { error } = await sb.from("profils").update(rec).eq("id", session.user.id);
      if (error) return msg($("m"), error.message, "err");
      Object.assign(D.profil, rec); menu("/parametres"); msg($("m"), T("Saved.", "Enregistré."), "ok");
    });
    if ($("logout")) $("logout").addEventListener("click", async () => { await sb.auth.signOut(); D = null; location.hash = "#/"; route(); });
    if ($("logoutAll")) $("logoutAll").addEventListener("click", async () => { await sb.auth.signOut({ scope: "global" }); D = null; location.hash = "#/"; route(); });
    if ($("fs")) $("fs").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const pw = $("mdp").value;
      if (pw.length < 8) return msg($("ms"), T("Password too short: at least 8 characters.", "Mot de passe trop court : au moins 8 caractères."), "err");
      if (pw !== $("mdp2").value) return msg($("ms"), T("The two passwords differ.", "Les deux mots de passe sont différents."), "err");
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) return msg($("ms"), authErr(error), "err");
      $("mdp").value = $("mdp2").value = ""; msg($("ms"), T("Password changed.", "Mot de passe changé."), "ok");
    });
    view.querySelectorAll("[data-n]").forEach((el) => el.addEventListener("change", async () => {
      let error;
      if (el.dataset.n === "analyse") { ({ error } = await sb.from("profils").update({ notif_email: el.checked }).eq("id", session.user.id)); if (!error) D.profil.notif_email = el.checked; }
      else error = await savePref("notif", { ...((D.profil.preferences || {}).notif || {}), [el.dataset.n]: el.checked });
      msg($("m"), error ? error.message : T("Saved.", "Enregistré."), error ? "err" : "ok");
    }));
    view.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => { CIPRIO.setLang(b.dataset.l); langUI(); route(); }));
    if ($("acc")) $("acc").addEventListener("change", async (e) => { const er = await savePref("accueil", e.target.value); msg($("m"), er ? er.message : T("Saved.", "Enregistré."), er ? "err" : "ok"); });
    if ($("uni")) $("uni").addEventListener("change", async (e) => { const er = await savePref("unites", e.target.value); msg($("m"), er ? er.message : T("Saved.", "Enregistré."), er ? "err" : "ok"); });
    if ($("export")) $("export").addEventListener("click", () => {
      const data = { exporte_le: new Date().toISOString(), compte: { email: session.user.email }, profil: D.profil, equipes: D.equipes, joueurs: D.joueurs, plans_de_jeu: D.plans, matchs: D.matchs };
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "ciprio-mes-donnees.json"; a.click();
    });
  }

  // ================================================================ NAVIGATION
  function section(h) {
    if (h.startsWith("/match/") || h.startsWith("/videos") || h === "/nouveau") return [T("Analysis", "Analyse"), T("Videos", "Vidéos")];
    if (h === "/rapports") return [T("Analysis", "Analyse"), T("Reports", "Rapports")];
    if (h.startsWith("/plan")) return [T("Preparation", "Préparation"), T("Game plans", "Plans de jeu")];
    if (h === "/equipe") return [T("Preparation", "Préparation"), T("Your team", "Votre équipe")];
    if (h === "/tuto") return [T("Guide", "Guide"), T("How it works", "Comment ça marche")];
    if (h === "/aide") return [T("Guide", "Guide"), T("Help", "Aide")];
    if (h.startsWith("/parametres")) return [T("Account", "Compte"), T("Settings", "Paramètres")];
    return [T("Coach space", "Espace coach"), T("Home", "Accueil")];
  }
  // après chaque écran : fil d'Ariane en haut, petite étiquette au-dessus du titre de la page
  function poserEtiquette(h) {
    const [a, b] = section(h);
    $("crumb").innerHTML = `${esc(a)} / <b>${esc(b)}</b>`;
    setTimeout(() => { const t = view.querySelector(".co-head > div:first-child"); if (t && !t.querySelector(".label") && !t.classList.contains("team-head")) t.insertAdjacentHTML("afterbegin", `<span class="label">${esc(a)}</span>`); });
  }

  async function route() {
    ({ data: { session } } = await sb.auth.getSession());
    $("side").hidden = !session;
    $("shell").classList.toggle("out", !session);
    if (!session) { D = null; $("prog").hidden = true; $("avatar").hidden = true; if (codeCtx) return codeView(); return authView(location.hash === "#/inscription" ? "signup" : "login"); }
    let premier = false;
    if (!D) { view.innerHTML = `<p class="muted">${T("Loading…", "Chargement…")}</p>`; await charger(); premier = true; }
    if (premier && (!location.hash || location.hash === "#/" || location.hash === "#/inscription")) {
      const vu = (() => { try { return localStorage.getItem("ciprio-tuto-vu"); } catch { return "1"; } })();
      const acc = (D.profil.preferences || {}).accueil;
      if (!vu && !D.matchs.length) history.replaceState(null, "", "#/tuto");
      else if (acc && acc !== "/") history.replaceState(null, "", "#" + acc);
    }
    const h = location.hash.replace(/^#/, "") || "/";
    menu(h);
    majProgression();
    window.scrollTo(0, 0);
    poserEtiquette(h);
    if (h === "/nouveau") return nouveauView();
    const mv = h.match(/^\/videos(?:\/(tous|pour_vous|en_cours|termines|erreur))?$/);
    if (mv) return videosView(mv[1]);
    if (h === "/tuto") return tutoView();
    if (h === "/rapports") return rapportsView();
    if (h === "/plans") return plansView();
    if (h === "/equipe") return equipeView();
    if (h === "/aide") return aideView();
    const ms = h.match(/^\/parametres(?:\/(\w+))?$/);
    if (ms) return parametresView(ms[1]);
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
