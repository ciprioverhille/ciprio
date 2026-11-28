/* Envoi des vidéos : UNE interface, quel que soit le stockage choisi (Supabase Pro, Cloudflare R2, Backblaze B2…).
   Les écrans n'appellent que CIPRIO_VIDEO.disponible() et CIPRIO_VIDEO.envoyer(match, fichier, progression).
   Brancher un stockage = remplir `fournisseur` ci-dessous et écrire son `envoyer` (adresse d'envoi signée demandée
   au serveur, puis envoi direct du navigateur vers le stockage, en plusieurs morceaux pour les gros fichiers).
   Tant que rien n'est branché : le coach donne un lien de partage Veo, ou la vidéo est déjà chez Ciprio. */
(() => {
  const fournisseur = null;   // à choisir par le fondateur : "supabase" | "r2" | "b2"

  window.CIPRIO_VIDEO = {
    fournisseur,
    disponible: () => !!fournisseur,
    // renvoie la description à ranger dans matchs.video : { type: "fichier", cle, taille, nom }
    async envoyer(_match, _fichier, _progression) {
      throw new Error("stockage des vidéos pas encore choisi");
    },
  };
})();
