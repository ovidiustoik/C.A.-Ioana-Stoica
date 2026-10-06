# Cabinet de avocat – Stoica Ioana

Aplicație web pentru organizarea activității cabinetului. Rulează în browser (calculator, tabletă, telefon), nu are nevoie de server și **păstrează toate datele doar pe dispozitivul pe care este folosită**.

## Secțiuni

| Secțiune | Ce face |
|---|---|
| **Acasă – 7 zile** | Gmail și Yahoo Mail (Ymail) în prim-plan (și în bara laterală). TO DO pe următoarele 7 zile, grupat pe zile, cu bife, urgență și notă direct lângă fiecare sarcină. Sus apar restanțele. În lateral: termene în instanță (14 zile), obligații ANAF, acte care expiră, acces rapid. |
| **TO DO** | Toate sarcinile, cu filtre după stare, urgență (Critică / Ridicată / Normală / Scăzută) și dosar. |
| **Dosare în lucru** | Număr, instanță, client, calitate, parte adversă, stadiu, complet, onorariu, note. Fiecare dosar are propriile termene, sarcini, acte și încasări. |
| **Legătura cu portal.just.ro** | În aplicația desktop: „＋ Din portal.just.ro” creează un dosar după număr; „⟳ Actualizează de pe portal” preia instanța, obiectul, stadiul, completul, părțile, termenele și soluțiile. Zilnic, la prima pornire, dosarele în lucru se actualizează singure; termenele noi intră în calendar, iar fiecare soluție nouă devine o sarcină în TO DO. Notele scrise de mână nu sunt modificate. |
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

- **Portal.just.ro** se interoghează prin serviciul public `portalquery.just.ro`, doar din aplicația desktop (din browser serviciul nu poate fi apelat). Datele afișate sunt cele publicate pe portal; pentru acte procedurale verificați întotdeauna și sursa oficială.
- **Semnătura electronică** din aplicație este o imagine a semnăturii olografe aplicată pe PDF, adică o **semnătură electronică simplă** (Regulamentul eIDAS nr. 910/2014). Nu înlocuiește **semnătura electronică calificată**, singura cu efect echivalent semnăturii olografe (art. 25 alin. (2) eIDAS). Documentele Word se salvează mai întâi ca PDF. Dacă un PDF are deja o semnătură digitală, copia nouă o invalidează; aplicația avertizează în acest caz.

## Instalare pe calculator (la fel ca My Rejust)

1. În **GitHub Desktop**: *File → Clone repository* → `ovidiustoik/C.A.-Ioana-Stoica` → *Clone*.
2. Deschideți folderul (*Repository → Show in Explorer*) și dați dublu-clic pe **`Porneste.cmd`**.
   - Se deschide o fereastră neagră (programul local) și aplicația, într-o fereastră proprie (Edge sau Chrome).
   - La prima pornire apare pe **Desktop** iconița **„Cabinet Stoica”** (doamna Justiției). De atunci porniți de acolo.
3. Fereastra neagră trebuie să rămână deschisă cât lucrați (o puteți minimiza). Închiderea ei oprește aplicația.

**Actualizare:** în GitHub Desktop, *Fetch origin* → *Pull origin*. La următoarea pornire de pe iconiță, versiunea veche se oprește singură și pornește cea nouă.

**Ce face programul local (`server.ps1`, port 8766):** servește aplicația, face legătura cu **portal.just.ro** (preluarea dosarelor, termenelor și soluțiilor), deschide actele cu Word/Acrobat și salvează zilnic o **copie de siguranță** în `Documente\Cabinet Stoica\backup` (ultimele 30). Copiile de siguranță nu stau niciodată în folderul legat de GitHub.

**Datele** (sarcini, dosare, acte, semnătura) rămân **numai pe calculator**. Pe GitHub se află doar codul programului. My Rejust (portul 8765) și Cabinet Stoica (portul 8766) pot rula în același timp.

### Variante alternative

- **Online / telefon:** https://ovidiustoik.github.io/C.A.-Ioana-Stoica/ (fără legătura cu portalul și fără copia automată pe disc; pe telefon: „Adaugă pe ecranul principal”).
- **Aplicația Electron** (`electron/`, fișierul `.exe`): încarcă versiunea publicată online și are aceleași funcții ca programul local. Construire: `npm install`, apoi `npm run dist:win -- portable`.

Fiecare variantă își păstrează datele separat (sunt „browsere” diferite). Le mutați cu *Setări → Descarcă backup / Restaurează din backup*.

## Structură

- `Porneste.cmd`, `server.ps1`: pornirea pe calculator și programul local
- `index.html`, `style.css`: pagina și aspectul
- `local.js`: legătura paginii cu programul local
- `db.js`: stocarea locală (IndexedDB)
- `app.js`: logica aplicației
- `portal.js`: legătura cu portal.just.ro
- `sign.js`: semnătura electronică; `vendor/` conține pdf-lib (MIT) și PDF.js (Apache-2.0)
- `sw.js`, `manifest.webmanifest`, iconițele: funcționare offline și instalare pe telefon
- `electron/`, `build/`: varianta Electron și iconițele (doamna Justiției)
