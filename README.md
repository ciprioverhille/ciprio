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
