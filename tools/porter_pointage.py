"""Porte la page de pointage du labo sur le site : ciprio-lab/annot_modeles/index.html -> app/pointage.html.

La page est reprise TELLE QUELLE (mêmes dessins, mêmes textes, mêmes règles du fondateur). Trois retouches seulement :
  1. charger Supabase + assets/app/commun.js + assets/app/pointage-pont.js avant le script de la page
     (pointage-pont.js redirige les appels /api/... du serveur local vers Supabase et le pont du moteur) ;
  2. les images viennent du dépôt Supabase : img.src = await CIPRIO_IMAGE(nom) au lieu de "frames/" + nom ;
  3. page non indexée par les moteurs de recherche.
À relancer après chaque modification de la page du labo :  python tools/porter_pointage.py [chemin/vers/ciprio-lab]
"""
import os
import sys

ICI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Desktop", "ciprio-lab")
SRC = os.path.join(LAB, "annot_modeles", "index.html")
DST = os.path.join(ICI, "app", "pointage.html")

html = open(SRC, encoding="utf-8").read()
# règle du fondateur reprise de regles.py (même valeur que lab_server.py) : 14 cliqué sur le bord bas = point 33
import re as _re
BORD = float(_re.search(r"^BORD_BAS_14\s*=\s*([0-9.]+)", open(os.path.join(LAB, "regles.py"), encoding="utf-8").read(), _re.M).group(1))


def remplace_une_fois(texte, avant, apres):
    n = texte.count(avant)
    if n != 1:
        sys.exit(f"ARRÊT : « {avant[:60]} » trouvé {n} fois dans la page du labo (attendu : 1). Adapter ce script.")
    return texte.replace(avant, apres)


html = remplace_une_fois(html, '<script>\n(async () => {',
                         '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n'
                         '<script src="/assets/app/commun.js"></script>\n'
                         f'<script>window.CIPRIO_BORD_BAS_14 = {BORD};</script>\n'
                         '<script src="/assets/app/pointage-pont.js"></script>\n'
                         '<script>\n(async () => {')
html = remplace_une_fois(html, 'img.src = "frames/" + list[idx];', 'img.src = await CIPRIO_IMAGE(list[idx]);')
html = remplace_une_fois(html, '<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">')
html = remplace_une_fois(html, "<!doctype html>\n", "<!doctype html>\n<!-- FICHIER GÉNÉRÉ par tools/porter_pointage.py depuis "
                         "ciprio-lab/annot_modeles/index.html : ne pas modifier ici. -->\n")
os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w", encoding="utf-8", newline="\n").write(html)
print("page portée :", DST)
