# Ciprio

Site de Ciprio (en anglais) : analyse vidéo pour les staffs de football.

## Structure

- `index.html` : page d'accueil (HTML, CSS et JS inclus).
- `assets/site.css` : styles communs des autres pages.
- `src/pages/*.html` et `src/pages/blog/*.html` : contenu des pages secondaires (About, Contact, Blog, pages légales, 404).
- `src/partials/` : en-tête, menu et pied de page communs.
- `tools/build-pages.sh` : génère les pages HTML à partir de `src/`. À relancer après chaque modification de `src/` :
  `bash tools/build-pages.sh`
- `sitemap.xml`, `robots.txt` : référencement. Ajouter chaque nouvel article au sitemap (en anglais et en français).

## Version française (`/fr`)

- Sélecteur discret « ENG · FR » dans le menu ; il mène à la même page dans l'autre langue.
- `fr/index.html` est généré à partir de `index.html` : `python tools/fr_index.py`. Après une modification de la page d'accueil anglaise, relancer le script ; il s'arrête et liste les textes à retraduire s'il ne les retrouve plus.
- Pages secondaires : `src/pages/fr/` (mêmes noms de fichiers que les pages anglaises) avec `src/partials/nav.fr.html` et `footer.fr.html`, construites par `tools/build-pages.sh`.
- Un nouvel article doit être écrit dans les deux langues.
- `logo.svg` : logo, aussi utilisé comme icône d'onglet.

## Hébergement

Site statique déployé par Vercel (projet `ciprio`, https://ciprio.ai) à chaque push sur `main`.
`vercel.json` active les adresses sans `.html` (`/about`, `/blog/...`).

## Données (Supabase, projet `vista-analytics-ai`, région Paris)

- `waitlist` : demandes d'accès (e-mail, club, fonction).
- `contact_messages` : messages du formulaire de contact.

Les règles RLS autorisent uniquement l'insertion depuis le site. Consultation : Supabase → Table Editor.

## Espace coach (`/app`, chantier A)

Le coach crée son compte, envoie ses matchs, règle le terrain et suit l'état de chaque analyse. Pages non indexées.

- `app/index.html` (coque) + `assets/app/espace.css` + `assets/app/espace.js` (tous les écrans) : connexion / inscription (œil sur le mot de passe, code par e-mail), puis barre du haut (logo · tâche en cours avec barre de progression · ENG/FR · initiales) et menu à gauche : Nouvelle vidéo, Accueil (bonjour, à faire, chiffres, dernières vidéos, « pour bien démarrer », comment ça marche), Vidéos (filtres, recherche), fiche d'un match (Suivi, Plan de jeu, Rapport, Infos), Rapports, Plans de jeu (consignes collectives et individuelles, système), Votre équipe (effectif, numéros, postes), Aide (tournage, FAQ, contact), Paramètres (profil, préférences, mot de passe, compte). Le rapport est un aperçu verrouillé tant que l'analyse tactique n'existe pas.
- `app/pointage.html` : page de pointage du terrain. **Fichier généré** depuis `ciprio-lab/annot_modeles/index.html` par `python tools/porter_pointage.py` : ne jamais la modifier à la main, relancer le script après chaque changement de la page du labo.
- `assets/app/commun.js` : connexion Supabase (clé publique), langue, noms des états d'un match.
- `assets/app/pointage-pont.js` : redirige les appels de la page du labo (`/api/list`, `/api/label`, `/api/refine`, `/api/prevoir`, `/api/completer`) vers Supabase. Les calculs passent par la table `taches` et sont faits par `ciprio-lab/pont_site.py ecouter`.
- `assets/app/video.js` : interface unique d'envoi des vidéos, à brancher sur le stockage choisi par le fondateur.
- Admin, onglet « Matchs » : tous les matchs, leur état, le journal des tâches, et si le pont tourne.

Tables Supabase (projet `pazzrgvkgmdgqmtscspl`) : `profils`, `equipes`, `joueurs`, `plans_de_jeu`, `matchs`, `images_pointage`, `pointages` (+ `pointages_historique`, chaque version des clics, jamais effacée), `taches`, `travailleurs` ; dépôt privé `pointage` (images à pointer). Droits : le coach ne voit que ses matchs, l'admin voit tout, le pont utilise la clé secrète (jamais dans le navigateur).
