/* Page de pointage sur ciprio.ai : la page du labo (ciprio-lab/annot_modeles/index.html) est reprise TELLE QUELLE ;
   seuls ses appels au petit serveur local (lab_server.py) sont redirigés ici :
     - images, liste des images, clics       -> Supabase (tables images_pointage, pointages ; dépôt « pointage ») ;
     - calculs du moteur (recalage sur les lignes, repères calculés, fin du pointage) -> table « taches », exécutés
       par le pont du moteur (ciprio-lab/pont_site.py) qui dépose la réponse.
   Les clics sont enregistrés tels que la page les envoie : rien n'est déplacé ni recalculé ici. */
(() => {
  const { sb, T } = CIPRIO;
  const MATCH = new URLSearchParams(location.search).get("match");
  const vraiFetch = window.fetch.bind(window);
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  let IMAGES = null;          // nom -> { id, demandes, mini, url }
  let PAGE = {};              // matchs.page : hints, annonce, stade_mesure
  let USER = null;

  // ---------- bandeau : retour à « Mes matchs » + état du calcul ----------
  const bandeau = document.createElement("div");
  bandeau.id = "co-bandeau";
  bandeau.innerHTML = `<a href="/app${MATCH ? "#/match/" + MATCH : ""}">← ${T("My matches", "Mes matchs")}</a><span id="co-etat"></span>`;
  const style = document.createElement("style");
  style.textContent = `#co-bandeau{position:fixed;left:12px;bottom:12px;z-index:60;display:flex;gap:10px;align-items:center;font:500 13px/1.2 Geist,Arial,sans-serif}
    #co-bandeau a{background:#fff;border:1px solid #e5e7e5;border-radius:999px;padding:7px 12px;color:#0b0d0c;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    #co-etat:not(:empty){background:#fdecec;border:1px solid #f5c2c3;color:#a1262a;border-radius:999px;padding:7px 12px}
    #co-bloque{position:fixed;inset:0;z-index:100;background:#fafaf9;display:grid;place-items:center;font:16px/1.5 Geist,Arial,sans-serif;padding:24px;text-align:center}`;
  document.addEventListener("DOMContentLoaded", () => { document.head.appendChild(style); document.body.appendChild(bandeau); });
  const etat = (txt) => { const el = document.getElementById("co-etat"); if (el) el.textContent = txt || ""; };
  const bloquer = (html) => {
    const go = () => { const d = document.createElement("div"); d.id = "co-bloque"; d.innerHTML = `<div>${html}</div>`; document.body.appendChild(d); };
    document.body ? go() : document.addEventListener("DOMContentLoaded", go);
  };

  // ---------- chargement : session, match, images ----------
  const pret = (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { location.href = "/app"; throw new Error("non connecté"); }
    USER = session.user;
    if (!MATCH) { bloquer(T("No match given.", "Aucun match indiqué.") + ` <a href="/app">${T("My matches", "Mes matchs")}</a>`); throw new Error("pas de match"); }
    const [{ data: m, error: e1 }, { data: imgs, error: e2 }] = await Promise.all([
      sb.from("matchs").select("id,page,coach_id").eq("id", MATCH).maybeSingle(),
      sb.from("images_pointage").select("id,nom,ordre,demandes,mini,chemin").eq("match_id", MATCH).order("ordre").order("nom"),
    ]);
    if (e1 || e2 || !m) { bloquer(T("Match not found.", "Match introuvable.") + ` <a href="/app">${T("My matches", "Mes matchs")}</a>`); throw new Error("match introuvable"); }
    if (!imgs.length) { bloquer(T("The images of this match aren't ready yet.", "Les images de ce match ne sont pas encore prêtes.") + ` <a href="/app#/match/${MATCH}">${T("Back", "Retour")}</a>`); throw new Error("pas d'images"); }
    PAGE = m.page || {};
    const { data: urls, error: e3 } = await sb.storage.from("pointage").createSignedUrls(imgs.map((x) => x.chemin), 6 * 3600);
    if (e3) throw e3;
    const parChemin = Object.fromEntries((urls || []).map((u) => [u.path, u.signedUrl]));
    IMAGES = {};
    for (const x of imgs) IMAGES[x.nom] = { ...x, url: parChemin[x.chemin] };
  })();

  // image affichée (la page fait : img.src = await CIPRIO_IMAGE(nom))
  window.CIPRIO_IMAGE = async (nom) => { await pret; return (IMAGES[nom] || {}).url || ""; };

  // ---------- clics : lecture et enregistrement (dans l'ordre d'envoi) ----------
  let fileEcriture = Promise.resolve();
  async function lireLabel(nom) {
    const im = IMAGES[nom];
    if (!im) return json({ error: "nom invalide" }, 400);
    const { data, error } = await sb.from("pointages").select("donnees").eq("image_id", im.id).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json(data ? data.donnees : { points: {} });
  }
  function ecrireLabel(nom, corps) {
    const im = IMAGES[nom];
    if (!im) return Promise.resolve(json({ error: "nom invalide" }, 400));
    const donnees = JSON.parse(corps || "{}");
    // même règle que lab_server.py (regles.BORD_BAS_14) : médiane × touche proche (14) cliquée SUR le bord bas = le
    // croisement est sous l'image ; le clic est le point le plus bas visible de la médiane (33). Le clic ne bouge pas.
    const P = donnees.points || {}, B = window.CIPRIO_BORD_BAS_14;
    if (B && P["14"] && P["14"][1] >= B && !P["33"]) { P["33"] = P["14"]; delete P["14"]; }
    const p = fileEcriture.then(async () => {
      const { error } = await sb.from("pointages").upsert({ image_id: im.id, match_id: MATCH, coach_id: USER.id, donnees }, { onConflict: "image_id" });
      if (error) { etat(T("Not saved: ", "Non enregistré : ") + error.message); return json({ error: error.message }, 500); }
      etat("");
      return json({ ok: true });
    });
    fileEcriture = p.catch(() => {});
    return p;
  }
  async function liste() {
    const { data, error } = await sb.from("pointages").select("image_id,donnees").eq("match_id", MATCH);
    if (error) return json({ error: error.message }, 500);
    const lab = Object.fromEntries(data.map((r) => [r.image_id, r.donnees]));
    const out = Object.values(IMAGES).map((im) => {
      const l = lab[im.id];
      const n = l ? Object.keys(l.points || {}).length + Object.keys(l.lines || {}).length : 0;
      return { name: im.nom, done: !!(l && (n || l.skip)), n, skip: !!(l && l.skip),
               ...(im.demandes && im.demandes.length && !im.mini ? { ask: im.demandes } : {}), ...(im.mini ? { mini: im.mini } : {}) };
    });
    return json(out);
  }

  // ---------- calculs du moteur : une tâche, le pont répond ----------
  const DELAI = { recaler_lignes: 30e3, prevoir: 60e3, completer: 20 * 60e3 };
  async function calcul(type, demande) {
    const { data: t, error } = await sb.from("taches").insert({ match_id: MATCH, type, demande }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    const t0 = Date.now();
    let prevenu = false;
    while (Date.now() - t0 < DELAI[type]) {
      await new Promise((r) => setTimeout(r, 400));
      const { data: r } = await sb.from("taches").select("etat,reponse,message").eq("id", t.id).maybeSingle();
      if (!r) continue;
      if (r.etat === "fini") { etat(""); return json(r.reponse || {}); }
      if (r.etat === "erreur") { etat(""); return json({ error: r.message || "erreur" }, 500); }
      if (r.etat === "en_attente" && !prevenu && Date.now() - t0 > 8e3) {
        prevenu = true;
        etat(T("Ciprio's calculation isn't answering yet…", "Le calcul de Ciprio ne répond pas encore…"));
      }
    }
    etat(T("Ciprio's calculation didn't answer.", "Le calcul de Ciprio n'a pas répondu."));
    return json({ error: T("Ciprio's calculation didn't answer. Try again in a moment.", "Le calcul de Ciprio n'a pas répondu. Réessayez dans un instant.") }, 504);
  }

  // ---------- aiguillage des appels de la page ----------
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const route = url.replace(location.origin, "");
    const corps = init.body;
    const nomDe = (pref) => decodeURIComponent(route.slice(pref.length)).split("?")[0];
    if (route === "annonce.json" || route === "hints.json" || route === "stade_mesure.json") {
      await pret;
      const v = PAGE[route.replace(".json", "")];
      return v == null ? new Response("", { status: 404 }) : json(v);
    }
    if (route === "/api/list") { await pret; return liste(); }
    if (route.startsWith("/api/label/")) {
      await pret;
      return (init.method || "GET").toUpperCase() === "POST" ? ecrireLabel(nomDe("/api/label/"), corps) : lireLabel(nomDe("/api/label/"));
    }
    if (route.startsWith("/api/refine/")) { await pret; return calcul("recaler_lignes", { image: nomDe("/api/refine/"), ...JSON.parse(corps || "{}") }); }
    if (route.startsWith("/api/prevoir/")) { await pret; await fileEcriture; return calcul("prevoir", { image: nomDe("/api/prevoir/"), ...JSON.parse(corps || "{}") }); }
    if (route === "/api/completer") { await pret; await fileEcriture; return calcul("completer", {}); }
    return vraiFetch(input, init);
  };
})();
