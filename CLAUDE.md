# CATALOGUE — site ciprio.ai (dépôt CLAUDE-SITE, GitHub ciprioverhille/ciprio)

Lis CE fichier en premier, puis seulement ce dont la tâche a besoin. Réponds au fondateur en français.
Règle du fondateur (28/11/2026) : **rien ne doit vivre seulement dans une discussion Claude.** Chaque décision, chaque
état, chaque changement s'écrit dans son « livre » (ce dépôt, ciprio-lab, Supabase). Claude sait où sont les livres et
écrit dedans ; il ne garde rien pour lui. Une discussion perdue ne doit rien faire perdre.

## Où est quoi

| Besoin | Où |
|---|---|
| Structure du site, langues, construction des pages | `README.md` |
| Espace coach (compte, Mes matchs, pointage) | `app/`, `assets/app/` — détails dans `README.md` § « Espace coach » |
| Page de pointage | **générée** : `python tools/porter_pointage.py` depuis `ciprio-lab/annot_modeles/index.html` (jamais à la main) |
| Admin (dépenses, tâches, matchs, prospection…) | `src/pages/admin.html` → `bash tools/build-pages.sh` → `admin.html` |
| Données (comptes, matchs, clics, tâches, dépenses) | Supabase `pazzrgvkgmdgqmtscspl`. Chaque changement de schéma est une migration nommée, gardée par Supabase (`supabase_migrations.schema_migrations`) |
| Moteur d'analyse, état du projet, architecture | autre dépôt : `Desktop/ciprio-lab` → `CLAUDE.md`, `ETAT.md`, `ARCHITECTURE.md` |
| Calcul (GPU, modèle IA) | chantier B, dans ciprio-lab (pas ce dépôt) |

## Façon de travailler

- Une discussion = une tâche. À la fin : `ciprio-lab/ETAT.md` à jour, commit, push ; l'admin montre l'état.
- Site déployé par Vercel à chaque push sur `main` (une branche donne un aperçu protégé par Vercel).
- Pages anglaises d'abord ; le français suit (`tools/fr_index.py`, `src/pages/fr/`).
- Ne jamais payer ni créer de compte chez un fournisseur sans l'accord du fondateur. Clés secrètes jamais dans git.
