#!/usr/bin/env python3
"""Construiește aplicația separată „Taxă de timbru & competență” din aceleași fișiere ca aplicația cabinetului.

Rezultă, în folderul calculator/:
  index.html                          – aplicația într-un singur fișier (publicată pe GitHub Pages, merge și offline)
  Taxa-timbru-competenta.html         – același fișier, pentru trimis pe e-mail / stick
  versiune.json                       – versiunea curentă (aplicația instalată verifică dacă a apărut una nouă)
  Instalare-Taxa-timbru-competenta.exe – fișierul de instalare pentru Windows (dacă există makensis)

Se rulează după orice modificare în taxa.js, competenta.js, grila.js sau style.css:
  python3 tools/construieste-calculator.py [versiune]      (implicit: data de azi, AAAA.LL.ZZ)
"""
import base64, datetime, json, os, shutil, subprocess, sys
from pathlib import Path

RAD = Path(__file__).resolve().parent.parent
CALC = RAD / 'calculator'
versiune = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().strftime('%Y.%m.%d')

def citeste(p):
    return (RAD / p).read_text(encoding='utf-8')

def script(cod):
    return '<script>\n' + cod.replace('</script', '<\\/script') + '\n</script>'

icon = 'data:image/svg+xml;base64,' + base64.b64encode((RAD / 'icon.svg').read_bytes()).decode()
scripturi = [citeste(f) for f in ('taxa.js', 'competenta.js', 'grila.js')]
scripturi.append(citeste('calculator/calc.js').replace('__VERSIUNE__', versiune))
pagina = (citeste('calculator/sablon.html')
          .replace('{{ICON}}', icon)
          .replace('{{CSS}}', citeste('style.css'))
          .replace('{{SCRIPTS}}', '\n'.join(script(s) for s in scripturi)))
for nume in ('index.html', 'Taxa-timbru-competenta.html'):
    (CALC / nume).write_text(pagina, encoding='utf-8')
(CALC / 'versiune.json').write_text(json.dumps({
    'versiune': versiune,
    'instalare': 'Instalare-Taxa-timbru-competenta.exe',
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('index.html și Taxa-timbru-competenta.html:', len(pagina.encode()) // 1024, 'KB, versiunea', versiune)

makensis = shutil.which('makensis') or next((str(p) for p in Path.home().glob('.cache/electron-builder/nsis-*/*/linux/makensis')), None)
if not makensis:
    print('makensis nu există: fișierul de instalare nu a fost refăcut.')
    sys.exit(0)
env = dict(os.environ)
nsis_dir = Path(makensis).resolve().parent.parent
env.setdefault('NSISDIR', str(nsis_dir))
subprocess.run([makensis, '-V2', '-INPUTCHARSET', 'UTF8', f'-DVERSIUNE={versiune}', 'instalare.nsi'], cwd=CALC, check=True, env=env)
print('Instalare-Taxa-timbru-competenta.exe:', (CALC / 'Instalare-Taxa-timbru-competenta.exe').stat().st_size // 1024, 'KB')
