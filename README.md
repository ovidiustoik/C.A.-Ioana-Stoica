# Cabinet de avocat – Stoica Ioana

Aplicație web pentru organizarea activității cabinetului. Rulează în browser (calculator, tabletă, telefon), nu are nevoie de server și **păstrează toate datele doar pe dispozitivul pe care este folosită**.

## Secțiuni

| Secțiune | Ce face |
|---|---|
| **Acasă – 7 zile** | Gmail și Yahoo Mail (Ymail) în prim-plan (și în bara laterală). TO DO pe următoarele 7 zile, grupat pe zile, cu bife, urgență și notă direct lângă fiecare sarcină. Sus apar restanțele. În lateral: termene în instanță (14 zile), obligații ANAF, acte care expiră, acces rapid. |
| **TO DO** | Toate sarcinile, cu filtre după stare, urgență (Critică / Ridicată / Normală / Scăzută) și dosar. |
| **Dosare în lucru** | Număr, instanță, client, calitate, parte adversă, stadiu, complet, onorariu, note. Fiecare dosar are propriile termene, sarcini, acte și încasări. |
| **Calendar** | Vedere lunară cu termene, întâlniri, obligații ANAF, sarcini și expirări de acte. Zilele nelucrătoare sunt marcate. Export `.ics` pentru Google Calendar / Outlook / telefon. |
| **Clienți** | Date de contact și dosarele fiecărui client. |
| **Acte clienți** | Actele încărcate, grupate pe fiecare dosar și pe categorii. |
| **Semnătură electronică** | Semnătura „Stoica” desenată pe ecran (mouse, creion, deget) sau importată dintr-o fotografie; ștampilă/parafă opțională. Orice act PDF sau imagine se semnează cu butonul ✍: se alege pagina și locul, cu opțiunea „pe toate paginile”. Se creează o copie semnată, cu amprentă SHA-256, iar originalul rămâne neschimbat. |
| **Geamantan personal** | Acte personale și profesionale (CI, legitimație, asigurare RCP etc.), cu dată de expirare și alertă cu 30 de zile înainte. |
| **Contabilitate & ANAF** | Buton către SPV ANAF și Ghișeul.ro; evidența obligațiilor și notificărilor din SPV, introduse automat în calendar și TO DO; registru simplu de încasări și plăți, cu export CSV pentru Excel. |
| **Calcul termene** | Calculează ultima zi a unui termen procedural (art. 181 C.proc.civ.), cu prelungire peste zilele nelucrătoare, și îl poate adăuga în TO DO. |
| **Linkuri utile** | legislatie.just.ro, ReJust, Registratura electronică, Portalul instanțelor, Ghișeul.ro, ANAF, ICCJ, CCR, HUDOC, CJUE, UNBR, ONRC, ANCPI ePay, Claude etc. Se pot edita. |
| **Setări & backup** | Nume, adresa SPV, temă, zile nelucrătoare suplimentare, backup/restaurare, ștergerea datelor. |

## Limitări de știut

- **ANAF / SPV:** datele **nu se preiau automat**. Accesul în SPV cere autentificare personală, iar, din informațiile disponibile, ANAF nu oferă o interfață publică prin care o aplicație să citească mesajele SPV ale unei persoane fizice. Obligațiile se introduc manual, cu butonul „Adaugă din SPV”, iar aplicația le pune automat în calendar și în TO DO.
- **Calculul termenelor** aplică doar regulile generale din art. 181 C.proc.civ. și lista sărbătorilor legale din art. 139 Codul muncii, în forma cunoscută la realizarea aplicației. Nu acoperă reguli speciale. **Rezultatul trebuie verificat de fiecare dată.**
- **Datele stau doar în browserul de pe dispozitivul folosit.** Nu se sincronizează între telefon și calculator. Pentru mutare sau siguranță folosiți *Setări → Descarcă backup*, iar pe celălalt dispozitiv *Restaurează din backup*. Backup-ul conține și fișierele, deci trebuie păstrat în siguranță (secret profesional, GDPR).
- Nu folosiți aplicația în modul privat/incognito, pentru că datele se pierd la închidere.

- **Semnătura electronică** din aplicație este o imagine a semnăturii olografe aplicată pe PDF, adică o **semnătură electronică simplă** (Regulamentul eIDAS nr. 910/2014). Nu înlocuiește **semnătura electronică calificată**, singura cu efect echivalent semnăturii olografe (art. 25 alin. (2) eIDAS). Documentele Word se salvează mai întâi ca PDF. Dacă un PDF are deja o semnătură digitală, copia nouă o invalidează; aplicația avertizează în acest caz.

## Aplicația desktop (Windows / Mac)

Aplicația desktop are iconița cu doamna Justiției (cu ochii deschiși), fereastră proprie și scurtătură pe Desktop. Actele se deschid direct cu Word sau Acrobat, iar linkurile externe se deschid în browserul obișnuit.

**Actualizare automată:** aplicația desktop încarcă programul de la adresa publicată pe GitHub Pages, **https://ovidiustoik.github.io/C.A.-Ioana-Stoica/**. Orice modificare adusă în ramura `main` ajunge singură la următoarea pornire (sau la *Vizualizare → Reîncarcă*), fără descărcări noi. Fără internet, aplicația folosește ultima versiune păstrată pe calculator. Doar prima pornire are nevoie de internet.

**Datele** (sarcini, dosare, acte, semnătura) rămân **numai pe calculator**, în profilul aplicației; pe GitHub se află doar codul programului.

Fișierul `.exe` trebuie descărcat din nou doar dacă se schimbă partea de „ramă” (folderul `electron/`), ceea ce se întâmplă rar.

Aplicația nu este semnată cu un certificat de dezvoltator (costă anual), de aceea la prima pornire:
- **Windows** afișează „Windows a protejat PC-ul”: apăsați *Mai multe informații* → *Executare oricum*.
- **macOS** refuză deschiderea: clic dreapta pe aplicație → *Deschidere* → *Deschidere*. Dacă apare mesajul că aplicația „este deteriorată”, rulați în Terminal `xattr -cr "/Applications/Cabinet Stoica.app"`.

Construire: `npm install`, apoi `npm run dist:win -- portable` (sau `npm run dist:mac`). Pentru testare cu altă adresă: variabila de mediu `CABINET_URL`.

**Atenție:** datele din aplicația desktop și cele din browser sunt separate. Le mutați cu *Setări → Descarcă backup / Restaurează din backup*.

## Pornire (versiunea din browser)

- **Online:** https://ovidiustoik.github.io/C.A.-Ioana-Stoica/ (pe telefon: din meniul browserului, „Adaugă pe ecranul principal”).
- **Local:** în folderul proiectului rulați `python3 -m http.server 8000`, apoi accesați `http://localhost:8000`.

## Structură

- `index.html`: structura paginii
- `style.css`: aspectul (temă luminoasă/întunecată, adaptat pentru telefon)
- `db.js`: stocarea locală (IndexedDB)
- `app.js`: logica aplicației
- `sign.js`: semnătura electronică; `vendor/` conține pdf-lib (MIT) și PDF.js (Apache-2.0)
- `electron/`: aplicația desktop (ramă care încarcă versiunea publicată; `offline.html` la prima pornire fără internet); `build/`: iconițele (doamna Justiției)
- `sw.js`, `manifest.webmanifest`, `icon.svg`: funcționare offline și instalare ca aplicație
