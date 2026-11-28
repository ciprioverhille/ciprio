/* Espace coach de Ciprio : éléments communs (connexion Supabase, langue, petits outils).
   La clé ci-dessous est la clé PUBLIQUE de Supabase : les données sont protégées côté base (règles RLS). */
(() => {
  const SUPABASE_URL = "https://pazzrgvkgmdgqmtscspl.supabase.co";
  const SUPABASE_KEY = "sb_publishable_dkQEIR4jjdhUVmG1pU7eIw_qhpf2NoG";
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  // langue : même choix que la page de pointage (gardé dans le navigateur)
  let LANG = (() => { try { return localStorage.getItem("ciprio-lang"); } catch { return null; } })() || ((navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en");
  const T = (en, fr) => (LANG === "fr" ? fr : en);
  const setLang = (l) => { LANG = l; document.documentElement.lang = l; try { localStorage.setItem("ciprio-lang", l); } catch {} };
  setLang(LANG);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // étapes d'une analyse, dans l'ordre (matchs.etat)
  const ETATS = [
    { k: "cree", en: "Match created", fr: "Match créé" },
    { k: "video_recue", en: "Video received", fr: "Vidéo reçue" },
    { k: "preparation", en: "Preparing", fr: "Préparation" },
    { k: "a_pointer", en: "Your turn: set up the pitch", fr: "À vous : régler le terrain" },
    { k: "pointage_fini", en: "Pitch set up", fr: "Terrain réglé" },
    { k: "calcul", en: "Tracking the match", fr: "Suivi du match" },
    { k: "controle", en: "Quality check", fr: "Contrôle qualité" },
    { k: "termine", en: "Done", fr: "Terminé" },
  ];
  const etatNom = (k) => { if (k === "erreur") return T("Problem", "Problème"); const e = ETATS.find((x) => x.k === k); return e ? T(e.en, e.fr) : k; };

  window.CIPRIO = { sb, T, setLang, lang: () => LANG, esc, ETATS, etatNom };
})();
