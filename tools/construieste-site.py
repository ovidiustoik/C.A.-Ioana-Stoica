#!/usr/bin/env python3
"""Adaugă pagina „Calculatoare” pe site-ul www.avocatioanastoica.ro.

  python3 tools/construieste-site.py FOLDER_SITE [--previzualizare]

În FOLDER_SITE (copia site-ului) scrie:
  calculatoare.html  – pagina nouă, cu antetul, subsolul și bannerul de cookie-uri ale site-ului
  calculatoare.js    – calculatoarele (taxa.js, competenta.js, grila.js, cautiune.js, apj.js) + site/calculatoare-site.js
  calculatoare.css   – stilul calculatoarelor, izolat în .calc
și adaugă „Calculatoare” în meniul din site.js (o singură dată).

Cu --previzualizare (pentru o copie de test): paginile primesc „noindex” și o bandă „Previzualizare”, formularele
nu mai trimit nimic, iar Google Tag Manager / Analytics și pagina privată avocat.html se scot.
Scriptul Netlify adăugat de găzduire după </html> se scoate întotdeauna (Netlify îl pune singur).
"""
import re, sys
from pathlib import Path

RAD = Path(__file__).resolve().parent.parent
if len(sys.argv) < 2:
    sys.exit(__doc__)
SITE = Path(sys.argv[1])
PREVIZ = '--previzualizare' in sys.argv[2:]

def citeste(p):
    return p.read_text(encoding='utf-8')

# 1. Calculatoarele și stilul
js = '\n'.join(citeste(RAD / f) for f in ('taxa.js', 'competenta.js', 'grila.js', 'cautiune.js', 'apj.js', 'site/calculatoare-site.js'))
(SITE / 'calculatoare.js').write_text(js, encoding='utf-8')
(SITE / 'calculatoare.css').write_text(citeste(RAD / 'site/calculatoare.css'), encoding='utf-8')

# 2. Pagina: bannerul de cookie-uri se ia dintr-o pagină existentă, ca să fie identic
model = citeste(SITE / 'termeni.html')
m = re.search(r'<script src="site\.js"></script>\s*(.*?)</body>', model, re.S)
cookie = m.group(1).strip() if m else ''
pagina = citeste(RAD / 'site/calculatoare.sablon.html').replace('{{COOKIE}}', cookie)
(SITE / 'calculatoare.html').write_text(pagina, encoding='utf-8')

# 3. Meniul din site.js
sitejs = citeste(SITE / 'site.js')
if "'calculatoare.html'" not in sitejs:
    vechi = "    ['contact.html', 'Contact', 'contact']\n  ];"
    if vechi not in sitejs:
        sys.exit('Nu am găsit meniul în site.js: adăugați manual [\'calculatoare.html\', \'Calculatoare\', \'calculatoare\'].')
    sitejs = sitejs.replace(vechi, "    ['calculatoare.html', 'Calculatoare', 'calculatoare'],\n" + vechi)
    (SITE / 'site.js').write_text(sitejs, encoding='utf-8')

# 4. Curățenie și, la previzualizare, marcajele de test
BANDA = ('<div style="position:relative;z-index:2147483001;background:#fff3b0;color:#6b5300;'
         'font:600 14px/1.4 system-ui,sans-serif;text-align:center;padding:8px 12px;border-bottom:1px solid #e6d27a">'
         'Previzualizare – versiune de test a site-ului. Formularul nu trimite automat nimic.</div>')
for f in sorted(SITE.glob('*.html')):
    s = citeste(f)
    s = re.sub(r'\s*<script[^>]*/\.netlify/scripts/hud[^>]*></script>\s*', '\n', s)
    if PREVIZ:
        if f.name == 'avocat.html':
            f.unlink()
            continue
        i = s.find('<!-- Banner cookie-uri')
        if i >= 0:
            j = s.find('<script>', i)
            k = s.find('</script>', j) + len('</script>') if j >= 0 else -1
            if k > i:
                s = s[:i] + s[k:]
        if 'name="robots"' not in s:
            s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">', 1)
        s = re.sub(r'(<body[^>]*>)', r'\1\n' + BANDA, s, count=1)
    f.write_text(s, encoding='utf-8')
if PREVIZ:
    dc = SITE / 'date-cabinet.js'
    s = re.sub(r"trimitereAdresa:\s*'[^']*'", "trimitereAdresa: ''", citeste(dc))
    dc.write_text(s, encoding='utf-8')
print('Gata:', SITE, '(previzualizare)' if PREVIZ else '')
