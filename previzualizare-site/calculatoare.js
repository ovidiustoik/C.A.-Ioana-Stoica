'use strict';
/* Calculul taxei judiciare de timbru (O.U.G. nr. 80/2013), în forma modificată prin Legea nr. 268/2024
   (în vigoare din 3.11.2024: art. 5 – partaj, art. 15 – familie) și Legea nr. 199/2025 (o scutire nouă, art. 29 alin. (6)).
   Verificat cu textul consolidat al ordonanței (portal legislativ, inclusiv RIL nr. 22/2025) și cu planul de seminar INM
   „Taxele judiciare de timbru și asistența judiciară”.
   Punctul de plecare a fost calculatorul „TJT_complex.xlsm”, depășit la partaj și divorț și cu câteva erori;
   fiecare regulă a fost confruntată cu textul consolidat al ordonanței. „nota” = precizare (practică neunitară etc.). */

// Baremul de la art. 3 alin. (1)
function barem(v) {
  if (v <= 0) return 0;
  if (v <= 500) return Math.max(v * 0.08, 20);
  if (v <= 5000) return 40 + (v - 500) * 0.07;
  if (v <= 25000) return 355 + (v - 5000) * 0.05;
  if (v <= 50000) return 1355 + (v - 25000) * 0.03;
  if (v <= 250000) return 2105 + (v - 50000) * 0.02;
  return 6105 + (v - 250000) * 0.01;
}
function baremPasi(v) {
  if (v <= 500) return `8% din ${lei(v)}${v * 0.08 < 20 ? ', dar nu mai puțin de 20 lei' : ''}`;
  if (v <= 5000) return `40 lei + 7% din ce depășește 500 lei (${lei(v - 500)})`;
  if (v <= 25000) return `355 lei + 5% din ce depășește 5.000 lei (${lei(v - 5000)})`;
  if (v <= 50000) return `1.355 lei + 3% din ce depășește 25.000 lei (${lei(v - 25000)})`;
  if (v <= 250000) return `2.105 lei + 2% din ce depășește 50.000 lei (${lei(v - 50000)})`;
  return `6.105 lei + 1% din ce depășește 250.000 lei (${lei(v - 250000)})`;
}
const lei = n => (Math.round(n * 100) / 100).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' lei';

/* Tipuri de reguli:
   barem  – baremul art. 3 aplicat valorii (cota = parte din valoare luată ca bază; jumatate; plus = sumă fixă adăugată; plafon)
   procent – p% din valoare, minim 20 lei (jumatate; plus)
   fix    – sumă fixă (unitate = se înmulțește cu un număr: participanți, motive)
   prag   – până la „limita” inclusiv: „sub”; peste: „peste”
   procentPlafon – p% din valoare, cel mult „plafon”
   jumatate – jumătate din taxa introdusă
   proc50 – 50% din taxa de la fond (din: 'barem' = calculată după art. 3 alin. (1) la suma contestată; 'taxa' = introdusă), cel puțin „min”
   scutit; netaxabil – cerere care nu se taxează
   imob: true – poate privi un imobil (art. 31 alin. (3): valoarea impozabilă, grila notarială dacă e contestată);
   'mereu' – privește întotdeauna un imobil */
const TAXE = [
  // --- art. 3: acțiuni evaluabile în bani
  ['Acțiuni evaluabile în bani', 'v1', 'Acțiuni și cereri evaluabile în bani (pretenții, despăgubiri etc.)', 'art. 3 alin. (1)', { k: 'barem' }, '', 'Prestații succesive pe durată nedeterminată: taxa se calculează la valoarea prestației anuale [art. 31 alin. (4)]. Dacă valoarea este micșorată după înregistrare, taxa rămâne la valoarea inițială (art. 37).'],
  ['Acțiuni evaluabile în bani', 'v7', 'Revendicare imobiliară și alte cereri privind proprietatea sau un drept real asupra unui imobil (inclusiv uzucapiune)', 'art. 3 alin. (1), art. 31 alin. (3)', { k: 'barem', imob: 'mereu' }, '', 'Taxa se calculează la valoarea impozabilă a imobilului; dacă aceasta este contestată sau vădit derizorie – după grila notarială [art. 31 alin. (3)].'],
  ['Acțiuni evaluabile în bani', 'v2', 'Constatarea nulității, anularea, rezoluțiunea sau rezilierea unui act juridic patrimonial', 'art. 3 alin. (2) lit. a)', { k: 'barem', imob: true }, '', 'Repunerea părților în situația anterioară, când este accesorie acestei cereri, este scutită [art. 3 alin. (2) lit. a)].'],
  ['Acțiuni evaluabile în bani', 'v3', 'Constatarea existenței sau inexistenței unui drept patrimonial', 'art. 3 alin. (2) lit. b)', { k: 'barem', imob: true }],
  ['Acțiuni evaluabile în bani', 'v4', 'Hotărâre care ține loc de act autentic de înstrăinare a unor imobile sau de constituire a unor drepturi reale asupra acestora', 'art. 3 alin. (2) lit. c)', { k: 'barem', imob: 'mereu' }],
  ['Acțiuni evaluabile în bani', 'v5', 'Daune morale, altele decât cele pentru atingeri aduse onoarei, demnității sau reputației', 'art. 3 alin. (1)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v6', 'Grănițuire împreună cu revendicarea unei porțiuni de teren', 'art. 8 alin. (1) lit. d)', { k: 'barem', plus: 100, imob: 'mereu', eticheta: 'Valoarea porțiunii de teren revendicate (lei)' }],
  // --- art. 4: drepturi reale
  ['Drepturi reale', 'r1', 'Acțiuni posesorii', 'art. 4 alin. (1)', { k: 'barem', cota: 0.2, imob: true, eticheta: 'Valoarea bunului a cărui posesie se cere (lei)' }],
  ['Drepturi reale', 'r2', 'Acțiuni privind un dezmembrământ al dreptului de proprietate', 'art. 4 alin. (2)', { k: 'barem', cota: 0.2, imob: true, eticheta: 'Valoarea bunului asupra căruia poartă dezmembrământul (lei)' }],
  ['Drepturi reale', 'r3', 'Servituți', 'art. 4 alin. (2) teza a doua', { k: 'barem', cota: 0.2, imob: 'mereu', eticheta: 'Valoarea imobilului (lei)' }],
  ['Drepturi reale', 'r4', 'Grănițuire', 'art. 8 alin. (1) lit. d)', { k: 'fix', suma: 100 }],
  // --- art. 5: partaj (forma dată de Legea nr. 268/2024, în vigoare din 3.11.2024)
  ['Partaj judiciar', 'p1', 'Stabilirea bunurilor supuse împărțelii', 'art. 5 alin. (1) lit. a)', { k: 'barem', jumatate: true, imob: true, eticheta: 'Valoarea bunurilor (lei)' }],
  ['Partaj judiciar', 'p3', 'Creanțe între coproprietari născute din starea de proprietate comună', 'art. 5 alin. (1) lit. b)', { k: 'barem', jumatate: true, eticheta: 'Valoarea creanțelor (lei)' }],
  ['Partaj judiciar', 'p4', 'Raportul donațiilor', 'art. 5 alin. (1) lit. c)', { k: 'barem', jumatate: true, eticheta: 'Valoarea bunurilor de raportat (lei)' }],
  ['Partaj judiciar', 'p5', 'Reducțiunea liberalităților excesive', 'art. 5 alin. (1) lit. d)', { k: 'barem', jumatate: true, eticheta: 'Valoarea părții de rezervă supuse reîntregirii (lei)' }],
  ['Partaj judiciar', 'p6', 'Partaj propriu-zis, indiferent de modalitatea de realizare', 'art. 5 alin. (1) lit. e)', { k: 'barem', jumatate: true, imob: true, eticheta: 'Valoarea masei partajabile (lei)' }],
  ['Partaj judiciar', 'p7', 'Mai multe dintre cererile de mai sus, în aceeași acțiune (o singură taxă)', 'art. 5 alin. (2)', { k: 'barem', jumatate: true, imob: true, eticheta: 'Valoarea cea mai mare dintre cereri (lei)' }, '', 'Se datorează o singură taxă, calculată la valoarea cea mai mare.'],
  ['Partaj judiciar', 'p2', 'Stabilirea calității de coproprietar sau de moștenitor și a cotelor-părți', 'art. 5 alin. (3)', { k: 'fix', suma: 50, unitate: 'Număr de coproprietari / moștenitori' }],
  // --- cereri neevaluabile
  ['Cereri neevaluabile în bani', 'n1', 'Daune morale pentru atingeri aduse onoarei, demnității sau reputației unei persoane fizice', 'art. 7 alin. (1)', { k: 'fix', suma: 100 }],
  ['Cereri neevaluabile în bani', 'n7', 'Despăgubiri pentru prejudicii materiale și morale din vătămări ale integrității fizice și/sau psihice', 'art. 7 alin. (2)', { k: 'fix', suma: 100 }, '', 'Taxă fixă introdusă prin Legea nr. 32/2021 (în vigoare din 20.03.2021), indiferent de valoarea pretinsă.'],
  ['Cereri neevaluabile în bani', 'n2', 'Constatarea existenței sau inexistenței unui drept nepatrimonial', 'art. 8 alin. (1) lit. a)', { k: 'fix', suma: 100 }],
  ['Cereri neevaluabile în bani', 'n3', 'Anularea sau constatarea nulității unui act juridic nepatrimonial', 'art. 8 alin. (1) lit. b)', { k: 'fix', suma: 100 }],
  ['Cereri neevaluabile în bani', 'n4', 'Dreptul de folosință al bunului închiriat sau arendat (fără plata unor sume)', 'art. 8 alin. (1) lit. c)', { k: 'fix', suma: 100 }],
  ['Cereri neevaluabile în bani', 'n5', 'Repunerea părților în situația anterioară, neaccesorie acțiunii în desființarea actului', 'art. 8 alin. (2)', { k: 'prag', limita: 5000, sub: 50, peste: 300, eticheta: 'Valoarea bunurilor (lei)' }, '', 'Când cererea este accesorie acțiunii în desființarea actului juridic patrimonial, nu se taxează separat.'],
  ['Cereri neevaluabile în bani', 'n6', 'Orice altă acțiune sau cerere neevaluabilă în bani', 'art. 27', { k: 'fix', suma: 20 }],
  // --- art. 9, 26: cereri în cursul procesului
  ['Cereri în cursul procesului', 'c1', 'Contestație în anulare', 'art. 26 alin. (1)', { k: 'fix', suma: 100 }],
  ['Cereri în cursul procesului', 'c2', 'Revizuire (pentru fiecare motiv invocat)', 'art. 26 alin. (2)', { k: 'fix', suma: 100, unitate: 'Număr de motive de revizuire' }],
  ['Cereri în cursul procesului', 'c3', 'Recuzare în materie civilă (pentru fiecare participant recuzat)', 'art. 9 lit. a)', { k: 'fix', suma: 100, unitate: 'Număr de persoane recuzate' }],
  ['Cereri în cursul procesului', 'c4', 'Strămutare în materie civilă', 'art. 9 lit. b)', { k: 'fix', suma: 100 }],
  ['Cereri în cursul procesului', 'c5', 'Repunere în termen', 'art. 9 lit. c)', { k: 'fix', suma: 20 }],
  ['Cereri în cursul procesului', 'c6', 'Cerere de perimare', 'art. 9 lit. d)', { k: 'fix', suma: 20 }],
  ['Cereri în cursul procesului', 'c7', 'Reexaminare – amendă judiciară și despăgubiri (art. 190 C.proc.civ.)', 'art. 9 lit. e)', { k: 'fix', suma: 20 }],
  ['Cereri în cursul procesului', 'c8', 'Reexaminare – anularea cererii de chemare în judecată (art. 200 alin. (4) C.proc.civ.)', 'art. 9 lit. f)', { k: 'fix', suma: 20 }],
  ['Cereri în cursul procesului', 'c9', 'Repunere pe rol, când suspendarea se datorează părților', 'art. 9 lit. g)', { k: 'jumatate', eticheta: 'Taxa datorată pentru cererea suspendată (lei)' }],
  ['Cereri în cursul procesului', 'c10', 'Refacerea înscrisurilor și a hotărârilor dispărute', 'art. 9 lit. h)', { k: 'fix', suma: 50 }],
  ['Cereri în cursul procesului', 'c11', 'Măsuri asigurătorii (inclusiv ordonanța asigurătorie europeană de indisponibilizare a conturilor bancare)', 'art. 11 alin. (1) lit. b)', { k: 'fix', suma: 100 }],
  ['Cereri în cursul procesului', 'c13', 'Măsuri asigurătorii asupra navelor și aeronavelor', 'art. 11 alin. (1) lit. b)', { k: 'fix', suma: 1000 }],
  ['Cereri în cursul procesului', 'c12', 'Contestație privind tergiversarea procesului și plângerea împotriva încheierii de soluționare', 'art. 11 alin. (1) lit. c)', { k: 'fix', suma: 20 }],
  ['Cereri în cursul procesului', 'c14', 'Copii simple de pe înscrisurile de la dosar, făcute de instanță', 'art. 9 lit. i)', { k: 'fix', suma: 0.2, unitate: 'Număr de pagini' }, '', 'Copiile făcute de prestatori privați din sediul instanței nu se taxează [art. 29 alin. (5)].'],
  ['Cereri în cursul procesului', 'c15', 'Legalizarea copiilor de pe înscrisurile de la dosar (pentru fiecare exemplar)', 'art. 9 lit. j)', { k: 'fix', suma: 1, unitate: 'Număr de pagini' }],
  ['Cereri în cursul procesului', 'c16', 'Certificate care atestă fapte sau situații din evidențele instanței ori din arhivă', 'art. 9 lit. k)', { k: 'fix', suma: 1, unitate: 'Număr de pagini' }],
  ['Cereri în cursul procesului', 'c17', 'Copii de pe hotărâri cu mențiunea că sunt definitive', 'art. 9 lit. l)', { k: 'fix', suma: 5, unitate: 'Număr de exemplare' }],
  // --- art. 10: executare silită (fără încuviințarea executării silite)
  ['Executare silită', 'e1', 'Suspendarea executării silite, inclusiv a executării provizorii', 'art. 10 alin. (1) lit. b)', { k: 'fix', suma: 50 }],
  ['Executare silită', 'e2', 'Contestație la executare evaluabilă în bani', 'art. 10 alin. (2)', { k: 'contestatie' }],
  ['Executare silită', 'e3', 'Contestație la executare când obiectul executării nu este evaluabil în bani', 'art. 10 alin. (2) teza finală', { k: 'fix', suma: 100 }],
  ['Executare silită', 'e4', 'Contestație la executare privind fondul dreptului (art. 712 alin. (2) C.proc.civ.)', 'art. 10 alin. (3)', { k: 'barem' }],
  ['Executare silită', 'e5', 'Întoarcerea executării silite', 'art. 10 alin. (4)', { k: 'prag', limita: 5000, sub: 50, peste: 300, eticheta: 'Valoarea cererii (lei)' }],
  ['Executare silită', 'e7', 'Stabilirea sumei datorate cu titlu de penalități pentru obligații de a face / a nu face (art. 906 alin. (4) C.proc.civ.)', 'art. 27', { k: 'fix', suma: 20 }, '', 'ÎCCJ – RIL nr. 22/2025 (M.Of. nr. 1103 din 28.11.2025): taxa este de 20 lei (art. 27), nu se calculează la valoarea penalităților.'],
  ['Executare silită', 'e6', 'Validarea popririi', 'art. 27', { k: 'fix', suma: 20 }, '', 'Practică neunitară. Opinia majoritară (Curtea de Apel Iași, minuta din 2020): cerere neevaluabilă în bani, 20 lei (art. 27), deoarece creditorul nu își mărește patrimoniul, ci dobândește un nou debitor. Opinia minoritară: taxă la valoarea creanței (art. 3 alin. (1)). ÎCCJ nu s-a pronunțat.'],
  // --- art. 15: familie (forma dată de Legea nr. 268/2024, în vigoare din 3.11.2024)
  ['Raporturi de familie', 'f1', 'Divorț prin acord, din motive temeinice sau după separarea în fapt (art. 373 lit. a)–c) C.civ.)', 'art. 15 lit. a)', { k: 'fix', suma: 200 }],
  ['Raporturi de familie', 'f3', 'Divorț din cauza stării sănătății (art. 373 lit. d) C.civ.)', 'art. 15 lit. b)', { k: 'fix', suma: 50 }],
  ['Raporturi de familie', 'f4', 'Despăgubiri sau stabilirea prestației compensatorii', 'art. 15 lit. c)', { k: 'fix', suma: 50 }],
  ['Raporturi de familie', 'f5', 'Cereri privind locuința minorului, autoritatea părintească, pensia de întreținere, legăturile personale, locuința familiei (neaccesorii divorțului)', 'art. 15 lit. d)', { k: 'fix', suma: 20, unitate: 'Număr de cereri' }],
  ['Raporturi de familie', 'f6', 'Orice altă cerere neevaluabilă în bani în materia raporturilor de familie', 'art. 15 lit. e)', { k: 'fix', suma: 20 }],
  ['Raporturi de familie', 'f7', 'Adopție, ocrotirea minorilor, tutelă, curatelă, consiliere judiciară, tutelă specială, mandat de ocrotire, asistarea persoanelor cu tulburări psihice', 'art. 29 alin. (1) lit. e)', { k: 'scutit' }],
  // --- art. 11 lit. a): înțelegerea părților / mediere
  ['Înțelegerea părților / mediere', 'm1', 'A se lua act de înțelegerea părților, inclusiv de acordul de mediere', 'art. 11 alin. (1) lit. a)', { k: 'fix', suma: 20 }],
  ['Înțelegerea părților / mediere', 'm2', 'Înțelegere/acord de mediere privind transferul proprietății sau al altui drept real asupra unui imobil', 'art. 11 alin. (1) lit. a)', { k: 'barem', jumatate: true, plus: 20, imob: 'mereu', eticheta: 'Valoarea imobilului cu valoarea cea mai mare (lei)' }, '', 'Taxa fixă de 20 lei + 50% din taxa care s-ar datora pentru acțiunea în revendicare a bunului cu valoarea cea mai mare.'],
  ['Înțelegerea părților / mediere', 'm3', 'Înțelegere/acord de mediere privind partajul', 'art. 11 alin. (1) lit. a)', { k: 'barem', jumatate: 2, plus: 20, imob: true, eticheta: 'Valoarea masei partajabile (lei)' }, '', 'Taxa fixă de 20 lei + 50% din taxa de partaj (care este, potrivit art. 5, jumătate din taxa de la art. 3 alin. (1)).'],
  // --- art. 6: proceduri speciale
  ['Proceduri speciale', 's1', 'Cerere de valoare redusă (inclusiv procedura europeană – Regulamentul (CE) nr. 861/2007)', 'art. 6 alin. (1)', { k: 'prag', limita: 2000, sub: 50, peste: 200, eticheta: 'Valoarea cererii (lei)' }],
  ['Proceduri speciale', 's2', 'Ordonanță de plată (inclusiv somația europeană de plată – Regulamentul (CE) nr. 1896/2006)', 'art. 6 alin. (2)', { k: 'fix', suma: 200 }],
  ['Proceduri speciale', 's6', 'Opoziție la somația europeană de plată; reexaminare în procedura europeană cu valoare redusă', 'art. 6 alin. (2^1)', { k: 'fix', suma: 100 }],
  ['Proceduri speciale', 's3', 'Evacuare – procedura specială (Titlul XI, Cartea a VI-a C.proc.civ.)', 'art. 6 alin. (3)', { k: 'fix', suma: 100 }],
  ['Proceduri speciale', 's4', 'Ordonanță președințială neevaluabilă în bani', 'art. 6 alin. (4)', { k: 'fix', suma: 20 }],
  ['Proceduri speciale', 's5', 'Ordonanță președințială evaluabilă în bani', 'art. 6 alin. (4)', { k: 'prag', limita: 2000, sub: 50, peste: 200, eticheta: 'Valoarea cererii (lei)' }],
  // --- alte cereri
  ['Alte cereri', 'a1', 'Drepturi de autor și drepturi conexe', 'art. 13 lit. a)', { k: 'fix', suma: 100 }],
  ['Alte cereri', 'a2', 'Calitatea de inventator sau de titular al brevetului', 'art. 13 lit. b)', { k: 'fix', suma: 100 }],
  ['Alte cereri', 'a3', 'Mărci, desene și modele industriale (cereri neevaluabile în bani)', 'art. 13 lit. c)', { k: 'fix', suma: 300 }],
  ['Alte cereri', 'a4', 'Cereri în procedura insolvenței', 'art. 14 alin. (1)', { k: 'fix', suma: 200 }, '', 'Textul art. 14 trimite încă la Legea nr. 85/2006, abrogată și înlocuită de Legea nr. 85/2014.'],
  ['Alte cereri', 'a5', 'Cereri privind înregistrări în registrul comerțului', 'art. 14 alin. (2)', { k: 'fix', suma: 100 }],
  ['Alte cereri', 'a6', 'Înregistrarea partidelor politice sau modificarea statutului lor', 'art. 12 lit. a)', { k: 'fix', suma: 300 }],
  ['Alte cereri', 'a7', 'Sindicate, patronate (Legea dialogului social nr. 62/2011)', 'art. 12 lit. b)', { k: 'fix', suma: 200 }],
  ['Alte cereri', 'a8', 'Dobândirea personalității juridice de către asociații, fundații, federații', 'art. 12 lit. c)', { k: 'fix', suma: 100 }],
  ['Alte cereri', 'a9', 'Contencios administrativ – anularea actului, recunoașterea dreptului, eliberarea unui înscris', 'art. 16 lit. a)', { k: 'fix', suma: 50 }],
  ['Alte cereri', 'a10', 'Contencios administrativ – cereri patrimoniale (repararea pagubelor)', 'art. 16 lit. b)', { k: 'procentPlafon', p: 10, plafon: 300, eticheta: 'Valoarea pretinsă (lei)' }],
  ['Alte cereri', 'a11', 'Conflicte de competență între birourile executorilor judecătorești (Legea nr. 188/2000)', 'art. 18 lit. a)', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a12', 'Plângere împotriva refuzului executorului judecătoresc de a-și îndeplini atribuțiile (Legea nr. 188/2000)', 'art. 18 lit. b)', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a13', 'Supralegalizarea semnăturii și ștampilei executorului judecătoresc (Legea nr. 188/2000)', 'art. 18 lit. c)', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a14', 'Plângere contravențională (împotriva procesului-verbal) și calea de atac împotriva hotărârii', 'art. 19', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a15', 'Cereri de carte funciară care nu pun în discuție fondul dreptului', 'art. 20', { k: 'fix', suma: 50 }],
  ['Alte cereri', 'a18', 'Înregistrarea asociațiilor de proprietari, de locatari sau mixte și apelul împotriva încheierii judecătorului-delegat', 'art. 21', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a16', 'Contestație împotriva deciziei de soluționare a conflictului de competență dintre notarii publici (Legea nr. 36/1995)', 'art. 17 lit. a)', { k: 'fix', suma: 100 }],
  ['Alte cereri', 'a17', 'Plângere împotriva încheierii de respingere a cererii de îndeplinire a unui act notarial', 'art. 17 lit. b)', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a19', 'Acțiune în anularea hotărârii arbitrale (pentru fiecare motiv)', 'art. 26 alin. (3)', { k: 'fix', suma: 100, unitate: 'Număr de motive' }],
  // --- căi de atac (art. 23–26, art. 28)
  ['Căi de atac', 'k1', 'Apel – cerere evaluabilă în bani taxată după art. 3 alin. (1)', 'art. 23 alin. (1) lit. b)', { k: 'proc50', din: 'barem', min: 20, eticheta: 'Suma contestată prin apel (lei)' }, '', 'Apelul incident și apelul provocat se taxează la fel [art. 23 alin. (2)]. Calea de atac împotriva unei hotărâri date într-o cerere scutită este scutită (art. 28).'],
  ['Căi de atac', 'k2', 'Apel – cerere neevaluabilă sau taxată după o regulă specială (partaj, taxă fixă etc.)', 'art. 23 alin. (1)', { k: 'proc50', din: 'taxa', min: 20, eticheta: 'Taxa datorată la fond (sau la suma contestată) (lei)' }, '', 'Se ia taxa care s-ar datora pentru cererea soluționată de prima instanță (la partaj – jumătatea din barem, art. 5), apoi 50%, dar cel puțin 20 lei.'],
  ['Căi de atac', 'k3', 'Recurs – motive de la art. 488 alin. (1) pct. 1–7 C.proc.civ.', 'art. 24 alin. (1)', { k: 'fix', suma: 100 }],
  ['Căi de atac', 'k4', 'Recurs – art. 488 alin. (1) pct. 8, cerere evaluabilă taxată după art. 3 alin. (1)', 'art. 24 alin. (2)', { k: 'proc50', din: 'barem', min: 100, eticheta: 'Suma contestată prin recurs (lei)' }, '', 'Dacă se invocă și motive de la pct. 1–7, verificați dacă se adaugă taxa de 100 lei de la art. 24 alin. (1) – practica nu este unitară.'],
  ['Căi de atac', 'k5', 'Recurs – art. 488 alin. (1) pct. 8, cerere evaluabilă cu regulă specială de taxare', 'art. 24 alin. (2)', { k: 'proc50', din: 'taxa', min: 100, eticheta: 'Taxa datorată la suma contestată (lei)' }],
  ['Căi de atac', 'k6', 'Recurs – art. 488 alin. (1) pct. 8, cerere neevaluabilă în bani', 'art. 24 alin. (2)', { k: 'fix', suma: 100 }],
  ['Căi de atac', 'k7', 'Apel/recurs împotriva încheierii de vânzare a bunurilor la partaj, a încheierii de suspendare sau a anulării cererii ca netimbrată, nesemnată ori pentru lipsa calității de reprezentant', 'art. 25 alin. (1)', { k: 'fix', suma: 20 }],
  ['Căi de atac', 'k8', 'Apel/recurs împotriva respingerii ca prematură, inadmisibilă, prescrisă sau pentru autoritate de lucru judecat; renunțare la drept sau la judecată; învoiala părților', 'art. 25 alin. (2)', { k: 'fix', suma: 50 }],
  ['Căi de atac', 'k9', 'Cale de atac îndreptată numai împotriva considerentelor', 'art. 25 alin. (3)', { k: 'fix', suma: 100 }],
  ['Căi de atac', 'k10', 'Cale de atac privind numai cheltuielile de judecată', 'ÎCCJ – RIL nr. 2/2020', { k: 'netaxabil' }, '', 'Nu se taxează căile de atac care vizează doar soluția asupra cererii accesorii de acordare a cheltuielilor de judecată (RIL nr. 2/2020).'],
  // --- cereri care nu se taxează (art. 35 alin. (2), art. 39, art. 43; O.U.G. nr. 51/2008)
  ['Cereri netaxabile', 'x1', 'Cereri în cursul judecății care nu modifică valoarea sau caracterul cererii (ex. îndreptarea, lămurirea, completarea hotărârii)', 'art. 35 alin. (2)', { k: 'netaxabil' }, '', 'Pentru cererile formulate în cursul procesului, regula este netimbrarea; se taxează doar cele prevăzute expres (art. 9) – plan de seminar INM.'],
  ['Cereri netaxabile', 'x2', 'Cerere de reexaminare a modului de stabilire a taxei (3 zile de la comunicare)', 'art. 39 alin. (1)', { k: 'scutit' }, '', 'Se soluționează de alt complet, în camera de consiliu, fără citare, prin încheiere definitivă [art. 39 alin. (2)]. Criticile privind caracterul timbrabil se pot face numai pe această cale (ÎCCJ – RIL nr. 7/2014).'],
  ['Cereri netaxabile', 'x3', 'Cerere de ajutor public judiciar (persoane fizice)', 'art. 12 alin. (2) O.U.G. nr. 51/2008', { k: 'scutit' }, '', 'Pentru cererea de chemare în judecată supusă regularizării, cererea de facilități se face în 5 zile de la comunicare [art. 33 alin. (2)].'],
  ['Cereri netaxabile', 'x4', 'Cerere de reexaminare împotriva încheierii privind facilitățile la plata taxei', 'art. 43 alin. (4)', { k: 'scutit' }],
  ['Cereri netaxabile', 'x5', 'Repunerea părților în situația anterioară, accesorie acțiunii în nulitate, anulare, rezoluțiune sau reziliere', 'art. 3 alin. (2) lit. a)', { k: 'scutit' }],
  // --- scutiri (fără cauzele penale)
  ['Scutite de taxă', 'z1', 'Pensii și alte drepturi din sistemele de asigurări sociale', 'art. 29 alin. (1) lit. a)', { k: 'scutit' }],
  ['Scutite de taxă', 'z2', 'Ajutor de șomaj, ajutor social, alocații, drepturile persoanelor cu dizabilități', 'art. 29 alin. (1) lit. a)', { k: 'scutit' }],
  ['Scutite de taxă', 'z3', 'Obligații de întreținere; nulitatea, anularea, rezoluțiunea sau rezilierea contractului de întreținere', 'art. 29 alin. (1) lit. c)', { k: 'scutit' }],
  ['Scutite de taxă', 'z4', 'Despăgubiri pentru condamnare sau măsuri preventive luate pe nedrept', 'art. 29 alin. (1) lit. d)', { k: 'scutit' }],
  ['Scutite de taxă', 'z5', 'Protecția consumatorilor, când reclamantul e persoană fizică sau asociație de consumatori', 'art. 29 alin. (1) lit. f)', { k: 'scutit' }],
  ['Scutite de taxă', 'z6', 'Exercitarea drepturilor electorale', 'art. 29 alin. (1) lit. h)', { k: 'scutit' }],
  ['Scutite de taxă', 'z7', 'Despăgubiri pentru încălcarea art. 2 și 3 din Convenția europeană a drepturilor omului', 'art. 29 alin. (1) lit. j)', { k: 'scutit' }],
  ['Scutite de taxă', 'z8', 'Fondul funciar – cereri formulate de prefect sau primar (Legea nr. 18/1991)', 'art. 29 alin. (2)', { k: 'scutit' }],
  ['Scutite de taxă', 'z9', 'Raporturile de serviciu ale funcționarilor publici (asimilate conflictelor de muncă)', 'art. 29 alin. (4)', { k: 'scutit' }, '', 'Art. 29 alin. (4) asimilează aceste cereri conflictelor de muncă, care sunt scutite de taxă potrivit legislației muncii.'],
  ['Scutite de taxă', 'z12', 'Valorificarea drepturilor Societății Naționale de Cruce Roșie', 'art. 29 alin. (1) lit. g)', { k: 'scutit' }],
  ['Scutite de taxă', 'z13', 'Drepturile foștilor deținuți și persecutați politic în perioada regimului comunist', 'art. 29 alin. (1) lit. k)', { k: 'scutit' }],
  ['Scutite de taxă', 'z14', 'Dizolvarea societăților sau a grupurilor de interes economic, cerută de Oficiul Național al Registrului Comerțului', 'art. 29 alin. (3)', { k: 'scutit' }],
  ['Scutite de taxă', 'z15', 'Cereri ale autorităților publice prevăzute de lege sau ale instituțiilor publice care au ca obiect venituri publice', 'art. 30', { k: 'scutit' }],
  ['Scutite de taxă', 'z11', 'Divorț și partajul bunurilor comune, cerute de victima infracțiunii de violență în familie', 'art. 29 alin. (6)', { k: 'scutit' }, '', 'Scutire introdusă prin Legea nr. 199/2025 (M.Of. nr. 1106 din 28.11.2025), în vigoare din 1.12.2025.'],
  ['Scutite de taxă', 'z10', 'Alte cereri scutite prin legi speciale', 'art. 29 alin. (1) lit. l)', { k: 'scutit' }],
].map(([cat, id, label, art, rule, verifica, nota]) => ({ cat, id, label, art, rule, verifica: verifica || '', nota: nota || '' }));

// Ce trebuie introdus pentru fiecare tip de regulă
const taxaNum = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
const taxaImob = (t, v) => !!t.rule.imob && (t.rule.imob === 'mereu' || !!v.imob);
// Valoarea la care se calculează taxa: valoarea impozabilă sau, dacă aceasta e contestată/derizorie, grila notarială [art. 31 alin. (3)]
const taxaGrila = (t, v) => taxaImob(t, v) && !!v.contest && taxaNum(v.vgrila) > 0;
const taxaValoare = (t, v) => (taxaGrila(t, v) ? taxaNum(v.vgrila) : taxaNum(v.valoare));

function taxaCampuri(t) {
  const r = t.rule;
  if (r.k === 'barem' || r.k === 'procent' || r.k === 'prag' || r.k === 'procentPlafon' || r.k === 'jumatate' || r.k === 'proc50') {
    const l = r.eticheta || 'Valoarea obiectului cererii (lei)';
    const imob = taxaImob(t, TX.vals);
    if (imob && r.imob === 'mereu' && !r.eticheta) return [{ n: 'valoare', l: 'Valoarea impozabilă a imobilului (lei)' }];
    return [{ n: 'valoare', l: imob ? l.replace(' (lei)', ' (lei) – pentru imobile, valoarea impozabilă') : l }];
  }
  if (r.k === 'contestatie') return [{ n: 'debit', l: 'Valoarea debitului urmărit (lei)' }, { n: 'bunuri', l: 'Valoarea bunurilor urmărite (lei) – opțional' }];
  if (r.k === 'fix' && r.unitate) return [{ n: 'numar', l: r.unitate, implicit: 1 }];
  return [];
}

// Calculul propriu-zis: { suma, pasi[], scutit }
function taxaCalcul(t, v) {
  const r = t.rule, pasi = [];
  const num = taxaNum;
  let suma = 0;
  const camp = taxaCampuri(t)[0];
  const V = taxaValoare(t, v);
  if (camp && camp.n === 'valoare' && !V) return { suma: 0, lipsa: true, pasi: ['Introduceți valoarea pentru a calcula taxa.'] };
  if (camp && camp.n === 'debit' && !num(v.debit) && !num(v.bunuri)) return { suma: 0, lipsa: true, pasi: ['Introduceți valoarea pentru a calcula taxa.'] };
  if (taxaGrila(t, v)) pasi.push(`Valoarea impozabilă fiind contestată sau vădit derizorie, se ia valoarea după grila notarială: ${lei(V)} [art. 31 alin. (3)]`);
  else if (taxaImob(t, v) && num(v.valoare)) pasi.push(`Imobil: se ia valoarea impozabilă ${lei(V)} [art. 31 alin. (3)]`);
  switch (r.k) {
    case 'scutit': return { suma: 0, scutit: true, pasi: ['Cererea este scutită de taxa judiciară de timbru.'] };
    case 'netaxabil': return { suma: 0, scutit: true, netaxabil: true, pasi: ['Cererea nu se taxează.'] };
    case 'proc50': {
      const baza = r.din === 'barem' ? barem(V) : V;
      if (r.din === 'barem') pasi.push(`Taxa la suma contestată – barem art. 3 alin. (1): ${baremPasi(V)} = ${lei(baza)}`);
      else pasi.push(`Taxa de referință: ${lei(baza)}`);
      suma = baza / 2;
      pasi.push(`50%: ${lei(suma)}`);
      if (suma < r.min) { suma = r.min; pasi.push(`Minimum ${lei(r.min)}`); }
      break;
    }
    case 'fix': {
      const n = r.unitate ? Math.max(1, Math.round(num(v.numar) || 1)) : 1;
      suma = r.suma * n;
      pasi.push(r.unitate ? `${lei(r.suma)} × ${n} = ${lei(suma)}` : `Taxă fixă: ${lei(r.suma)}`);
      break;
    }
    case 'barem': {
      const val = V;
      const baza = r.cota ? val * r.cota : val;
      if (r.cota) pasi.push(`Baza de calcul: ${r.cota * 100}% din ${lei(val)} = ${lei(baza)}`);
      let x = barem(baza);
      pasi.push(`Barem art. 3 alin. (1): ${baremPasi(baza)} = ${lei(x)}`);
      for (let k = 0; k < Number(r.jumatate || 0); k++) { x /= 2; pasi.push(`Jumătate: ${lei(x)}`); }
      if (r.plus) { pasi.push(`Plus taxa fixă de ${lei(r.plus)}: ${lei(x + r.plus)}`); x += r.plus; }
      suma = x;
      break;
    }
    case 'procent': {
      const val = V;
      let x = val * r.p / 100;
      pasi.push(`${r.p}% din ${lei(val)} = ${lei(x)}`);
      if (x < 20) { x = 20; pasi.push('Minimum 20 lei'); }
      if (r.jumatate) { x /= 2; pasi.push(`Jumătate: ${lei(x)}`); }
      if (r.plus) { pasi.push(`Plus ${lei(r.plus)}: ${lei(x + r.plus)}`); x += r.plus; }
      suma = x;
      break;
    }
    case 'prag': {
      const val = V;
      suma = val <= r.limita ? r.sub : r.peste;
      pasi.push(`Valoare ${val <= r.limita ? 'de până la' : 'de peste'} ${lei(r.limita)}: ${lei(suma)}`);
      break;
    }
    case 'procentPlafon': {
      const val = V;
      suma = Math.min(val * r.p / 100, r.plafon);
      pasi.push(`${r.p}% din ${lei(val)} = ${lei(val * r.p / 100)}${val * r.p / 100 > r.plafon ? `, plafonat la ${lei(r.plafon)}` : ''}`);
      break;
    }
    case 'jumatate': {
      const val = V;
      suma = val / 2;
      pasi.push(`Jumătate din ${lei(val)} = ${lei(suma)}`);
      break;
    }
    case 'contestatie': {
      const d = num(v.debit), b = num(v.bunuri);
      const baza = d && b ? Math.min(d, b) : (d || b);
      if (d && b) pasi.push(`Se ia valoarea mai mică dintre debit (${lei(d)}) și bunuri (${lei(b)}): ${lei(baza)}`);
      const x = barem(baza);
      pasi.push(`Barem art. 3 alin. (1): ${baremPasi(baza)} = ${lei(x)}`);
      suma = Math.min(x, 1000);
      if (x > 1000) pasi.push('Plafon: cel mult 1.000 lei');
      break;
    }
  }
  return { suma: Math.round(suma * 100) / 100, pasi };
}

/* ---------- pagina ---------- */
// Avertisment afișat în fiecare calculator (taxă, competență, grilă, cauțiune, ajutor public judiciar, termene)
const avertismentJurist = (ce = 'Rezultatele') => `<div class="callout danger avertisment" role="note"><b>Atenție:</b> ${ce} sunt calculate automat și pot fi eronate. Necesită verificarea finală de către un jurist, pe baza textului legal în vigoare și a practicii instanței.</div>`;

const taxaTemei = t => (/O\.U\.G\.|RIL|Legea/.test(t.art) ? t.art : `${t.art} din O.U.G. nr. 80/2013`);
const taxaSuma = x => (x.netaxabil ? 'nu se taxează' : x.scutit ? 'scutită' : lei(x.suma));

// Reguli generale din O.U.G. nr. 80/2013, explicate în planul de seminar INM
const TAXA_REGULI = [
  'Fiecare capăt de cerere cu finalitate diferită se taxează separat, inclusiv cererile accesorii (art. 34 alin. (1)); pentru competență contează însă doar capătul principal, fără accesorii (art. 98 alin. (2) C.proc.civ.).',
  'Cererea reconvențională, intervenția principală și chemarea în garanție se taxează ca și cum ar fi fost formulate pe cale principală (art. 34 alin. (3)).',
  'Valoarea este cea arătată în cerere; dacă e contestată sau vădit derizorie, se evaluează potrivit art. 98 alin. (3) C.proc.civ. (art. 31 alin. (2)).',
  'Imobile: valoarea impozabilă; dacă e contestată sau vădit derizorie – grila notarială (art. 31 alin. (3)). Competența rămâne la valoarea impozabilă (art. 104 C.proc.civ.), deci taxa și competența se pot raporta la valori diferite.',
  'Prestații succesive pe durată nedeterminată: valoarea prestației anuale (art. 31 alin. (4)).',
  'Cererile depuse în cursul judecății care nu modifică valoarea sau caracterul cererii nu se taxează (art. 35 alin. (2)); se taxează doar cele prevăzute expres (art. 9).',
  'Creșterea valorii în cursul procesului: se plătește diferența (art. 36); micșorarea nu reduce taxa (art. 37).',
  'Termene: plata în cel mult 10 zile de la comunicare; cererea de facilități în 5 zile (art. 33 alin. (2)); reexaminarea taxei în 3 zile (art. 39 alin. (1)).',
  'Cererile introduse înainte de 28.06.2013 rămân supuse Legii nr. 146/1997, cu toate cererile și căile de atac din acel proces (art. 55; ÎCCJ – RIL nr. 25/2020).',
  'Restituire: integral sau jumătate în cazurile de la art. 45 (ex. renunțare înainte de comunicarea cererii, împăcare la divorț, tranzacție, achiesare – jumătate), în termen de un an.',
];

const TX = { sel: 'v1', q: '', vals: {}, cos: [] };

function viewTaxa() {
  const q = norm(TX.q);
  const lista = TAXE.filter(t => !q || norm(t.label + ' ' + t.cat + ' ' + t.art).includes(q));
  const t = TAXE.find(x => x.id === TX.sel) || TAXE[0];
  const rez = taxaCalcul(t, TX.vals);
  const comp = compCalcul(t, TX.vals);
  const agregat = compAgregat(TX.cos);
  const cats = [...new Set(lista.map(x => x.cat))];
  const total = TX.cos.reduce((s, x) => s + x.suma, 0);
  const text = taxaText();
  return `
  ${avertismentJurist('Taxa și competența')}
  <div class="callout" style="margin-bottom:14px"><p>Taxa: <b>O.U.G. nr. 80/2013</b>, în forma modificată prin <b>Legea nr. 268/2024</b> (partaj și divorț, în vigoare din 3.11.2024) și <b>Legea nr. 199/2025</b>. Pentru cererile depuse înainte de 3.11.2024 la partaj și divorț se aplicau alte taxe.</p><p>Competența: <b>Codul de procedură civilă</b> republicat (cu Legea nr. 310/2018) și legile speciale indicate. Dacă litigiul are element de extraneitate, competența instanțelor române se verifică mai întâi după Regulamentul (UE) nr. 1215/2012 sau Cartea a VII-a C.proc.civ. Punctele marcate „de verificat” nu au putut fi confirmate din textul în vigoare.</p></div>
  <div class="grid-2">
    <div>
      <div class="card">
        <h2>Obiectul cererii</h2>
        <div class="field" style="margin-top:10px"><input type="search" data-tx="q" placeholder="Caută obiectul (ex. partaj, divorț, contestație)…" value="${h(TX.q)}"></div>
        <label class="field" style="margin-top:10px"><select data-tx="sel" size="10" style="min-height:220px">
          ${cats.map(c => `<optgroup label="${h(c)}">${lista.filter(x => x.cat === c).map(x => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${x.verifica ? '⚠ ' : ''}${h(x.label)}</option>`).join('')}</optgroup>`).join('')}
        </select></label>
        ${lista.length ? '' : empty('Niciun obiect nu se potrivește căutării.')}
      </div>
      ${typeof grilaHtml === 'function' ? grilaHtml() : ''}
      ${typeof compRegimHtml === 'function' ? compRegimHtml() : ''}
      <details class="card"><summary><h2 style="display:inline">Reguli de reținut</h2></summary><ul class="steps" style="margin-top:10px">${TAXA_REGULI.map(r => `<li>${h(r)}</li>`).join('')}</ul></details>
    </div>
    <div>
      <div class="card">
        <span class="muted small">${h(t.cat)} · ${h(taxaTemei(t))}</span>
        <h2 style="margin:4px 0 10px">${h(t.label)}</h2>
        ${t.verifica ? `<div class="callout warn small" style="margin-bottom:10px"><span class="pill u2">de verificat</span> ${h(t.verifica)}</div>` : ''}
        ${t.nota ? `<div class="callout small" style="margin-bottom:10px">${h(t.nota)}</div>` : ''}
        ${t.rule.imob === true ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px"><input type="checkbox" data-txv="imob" ${TX.vals.imob ? 'checked' : ''}><span>Cererea privește un imobil (taxa la valoarea impozabilă – art. 31 alin. (3))</span></label>` : ''}
        ${taxaCampuri(t).map(f => `<label class="field" style="margin-bottom:10px"><span>${h(f.l)}</span><input type="text" inputmode="decimal" data-txv="${f.n}" value="${h(TX.vals[f.n] ?? f.implicit ?? '')}" placeholder="0"></label>`).join('')}
        ${taxaImob(t, TX.vals) ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px"><input type="checkbox" data-txv="contest" ${TX.vals.contest ? 'checked' : ''}><span>Valoarea impozabilă este contestată sau apreciată de instanță ca vădit derizorie</span></label>
          ${TX.vals.contest ? `<label class="field" style="margin-bottom:6px"><span>Valoarea după grila notarială (lei) – pentru taxă</span><input type="text" inputmode="decimal" data-txv="vgrila" value="${h(TX.vals.vgrila ?? '')}" placeholder="0"></label>
          <p class="muted small" style="margin:0 0 10px">Calculați valoarea cu „Grila notarială – Curtea de Argeș 2026” (în stânga / mai jos). Competența rămâne la valoarea impozabilă.</p>` : ''}` : ''}
        <div class="calc-result" style="text-transform:none">${rez.netaxabil ? 'Nu se taxează' : rez.scutit ? 'Scutită de taxă' : rez.lipsa ? '—' : lei(rez.suma)}</div>
        <ol class="steps">${rez.pasi.map(p => `<li>${h(p)}</li>`).join('')}</ol>
        ${compCampuri(t).map(f => f.opt
          ? `<label class="field" style="margin:12px 0 0"><span>${h(f.l)}</span><select data-txv="${f.n}">${f.opt.map((o, i) => `<option value="${i}" ${String(TX.vals[f.n] ?? 0) === String(i) ? 'selected' : ''}>${h(o)}</option>`).join('')}</select></label>`
          : `<label class="field" style="margin:12px 0 0"><span>${h(f.l)}</span><input type="text" inputmode="decimal" data-txv="${f.n}" value="${h(TX.vals[f.n] ?? '')}" placeholder="0"></label>`).join('')}
        ${compHtml(t, comp)}
        <div class="actions"><button class="btn primary" data-act="taxaAdauga">＋ Adaugă la cerere (mai multe capete)</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Cererea – toate capetele</h2>${TX.cos.length ? '<button class="btn sm ghost" data-act="taxaGoleste">Golește</button>' : ''}</div>
        ${TX.cos.length ? `<ul class="list">${TX.cos.map((x, i) => `<li><span class="grow"><span>${i + 1}. ${h(x.label)}</span><span class="muted small">${h(x.art)}${x.detaliu ? ' · ' + h(x.detaliu) : ''}</span>${x.comp ? `<span class="small">Competență: <b>${h(x.comp.inst || '—')}</b>${x.comp.ter?.ex === true ? ' · teritorial exclusiv' : ''}</span>` : ''}</span><b class="nowrap">${taxaSuma(x)}</b><button class="icon-btn" data-act="taxaScoate" data-i="${i}" aria-label="Scoate">✕</button></li>`).join('')}</ul>
          <p style="font-size:1.1rem;margin:10px 0"><b>Total taxă: ${lei(total)}</b></p>
          ${agregat ? `<div class="comp"><h3>Competența pentru întreaga cerere</h3><ul class="steps">${agregat.map(l => `<li>${h(l)}</li>`).join('')}</ul></div>` : ''}
          <textarea readonly rows="9" style="width:100%;font:inherit;font-size:.9rem;padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink)">${h(text)}</textarea>
          <div class="actions"><button class="btn" data-act="taxaCopiaza">Copiază textul</button></div>`
          : empty('Adăugați capetele de cerere pentru a obține totalul și textul gata de folosit.')}
      </div>
    </div>
  </div>`;
}

function taxaText() {
  if (!TX.cos.length) return '';
  const total = TX.cos.reduce((s, x) => s + x.suma, 0);
  const linii = TX.cos.map((x, i) => `${i + 1}. ${x.label}${x.detaliu ? ' (' + x.detaliu + ')' : ''} – ${taxaSuma(x)}, potrivit ${x.temei || x.art + ' din O.U.G. nr. 80/2013'}`);
  const comp = compText(TX.cos);
  return `Taxa judiciară de timbru datorată este în cuantum de ${lei(total)}, după cum urmează:\n${linii.join(';\n')}.${comp ? '\n\n' + comp : ''}`;
}

function taxaAdauga() {
  const t = TAXE.find(x => x.id === TX.sel);
  if (!t) return;
  const rez = taxaCalcul(t, TX.vals);
  if (rez.lipsa) return toast('Introduceți mai întâi valoarea.');
  const campuri = taxaCampuri(t).filter(f => TX.vals[f.n]).map(f => ({ ...f, l: f.l.replace(/ – pentru imobile.*$/, '') }));
  if (taxaGrila(t, TX.vals)) campuri.push({ n: 'vgrila', l: 'Valoarea după grila notarială, folosită pentru taxă (lei)' });
  const opt = COMP[t.id]?.opt;
  const detaliu = campuri.map(f => `${f.l.replace(/ \(lei\).*$/, '').replace(/ – opțional$/, '')}: ${f.n === 'numar' ? TX.vals[f.n] : lei(Number(String(TX.vals[f.n]).replace(/\s/g, '').replace(',', '.')) || 0)}`).join(', ');
  const comp = compCalcul(t, TX.vals);
  const label = opt ? `${t.label} – ${opt[Math.min(opt.length - 1, Number(TX.vals.co) || 0)].l}` : t.label;
  TX.cos.push({ temei: taxaTemei(t), netaxabil: !!rez.netaxabil, label, art: t.art, suma: rez.suma, scutit: !!rez.scutit, detaliu, comp });
  rerender();
}

'use strict';
/* Competența generală, materială și teritorială pentru fiecare obiect din TAXE (taxa.js).
   Codul de procedură civilă este citat în forma republicată (M.Of. nr. 247/2015), cu modificările ulterioare
   (inclusiv Legea nr. 310/2018: art. 94 pct. 1 lit. j¹)–j³) și pragul de 200.000 lei la lit. k)).
   „v” = punct pe care nu l-am putut confirma din textul în vigoare – se afișează ca „de verificat”.
   Câmpuri: g – competența generală (implicit: instanțele judecătorești); m – materială {inst, grad, temei}
   sau VAL (după valoare); t – teritorială {r, temei, ex: true = exclusivă | 'cond' = exclusivă în anumite
   situații | 'spec' = normă specială, alt = competență alternativă}; opt – variante alese de utilizator;
   vl – etichetă pentru valoarea folosită doar la competență; n – notă. */

const PRAG_JUD = 200000;
const CPC = 'C.proc.civ.';
const VAL = { val: true };
const J = (lit, extra) => ({ inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. ${lit}) ${CPC}${extra ? '; ' + extra : ''}` });
const TRIB = temei => ({ inst: 'Tribunalul', grad: 2, temei: temei || `art. 95 pct. 1 ${CPC} (competența de drept comun a tribunalului)` });
const LA = (inst, temei, grad = 0) => ({ inst, grad, temei });

const T_GEN = { r: 'Instanța domiciliului sau sediului pârâtului', temei: `art. 107 ${CPC}` };
const ALT_CONTRACT = 'La alegerea reclamantului (art. 116) și: instanța locului prevăzut în contract pentru executarea obligației (art. 113 alin. (1) pct. 3); pentru consumatori, instanța domiciliului consumatorului (pct. 8).';
const ALT_DELICT = 'La alegerea reclamantului (art. 116) și: instanța locului unde s-a săvârșit fapta ilicită sau s-a produs prejudiciul (art. 113 alin. (1) pct. 9).';
const T_IMOBIL = { r: 'Exclusiv instanța în circumscripția căreia se află imobilul (dacă imobilul se află în circumscripțiile mai multor instanțe – art. 117 alin. (2))', temei: `art. 117 ${CPC}`, ex: true };
const T_IMOBIL_COND = { r: 'Drept real asupra unui imobil: exclusiv instanța locului imobilului (art. 117). Bun mobil sau drept de creanță: domiciliul/sediul pârâtului (art. 107).', temei: `art. 107, art. 117 ${CPC}`, ex: 'cond' };
const T_MOST = { r: 'Exclusiv instanța ultimului domiciliu al defunctului (până la ieșirea din indiviziune)', temei: `art. 118 ${CPC}`, ex: true };
const J_MOST = { inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. j¹) ${CPC} – cereri în materie de moștenire, indiferent de valoare (Legea nr. 310/2018; art. 105 a fost abrogat)` };
const N_RECURS_94 = 'Hotărârile date în apel în cererile de la art. 94 pct. 1 C.proc.civ. (inclusiv moștenire, uzucapiune, fond funciar – lit. j¹)–j³)) nu sunt supuse recursului (art. 483 alin. (2) – plan de seminar INM).';
const T_PARTAJ = { r: 'Moștenire (până la ieșirea din indiviziune): exclusiv instanța ultimului domiciliu al defunctului (art. 118). Imobil în coproprietate care nu provine din moștenire: instanța locului imobilului (art. 117 alin. (3), prin asemănare). Numai bunuri mobile: domiciliul pârâtului (art. 107). Partaj cerut odată cu divorțul: instanța divorțului.', temei: `art. 107, 117, 118 ${CPC}`, ex: 'cond' };
const T_EXEC = { r: 'Instanța de executare: judecătoria în circumscripția căreia se află domiciliul sau sediul debitorului la data sesizării organului de executare (debitor fără domiciliu în țară: domiciliul creditorului, apoi sediul biroului executorului)', temei: `art. 651 alin. (1) ${CPC}`, ex: true };
const T_DIVORT = { r: 'Judecătoria în circumscripția căreia se află cea din urmă locuință comună a soților, dacă cel puțin unul mai locuiește acolo; altfel – locuința pârâtului; pârâtul fără locuință în țară – locuința reclamantului; niciunul în țară – judecătoria convenită de soți, iar în lipsa acordului Judecătoria Sectorului 5 București', temei: `art. 915 ${CPC}`, ex: true };
const T_ACELASI = r => ({ r, temei: '', ex: 'spec' });
const T_MEDIERE = { r: 'Acord de mediere: judecătoria domiciliului, reședinței sau sediului oricăreia dintre părți ori judecătoria locului unde s-a încheiat acordul. Înțelegere în cursul procesului: instanța sesizată.', temei: 'art. 59 alin. (2) Legea nr. 192/2006; art. 438–441 ' + CPC };
const T_CONTENCIOS = { r: 'La alegerea reclamantului: instanța domiciliului său sau instanța de la sediul pârâtului (dacă alege sediul pârâtului, nu se mai poate invoca necompetența teritorială)', temei: 'art. 10 alin. (3) Legea nr. 554/2004' };
const OPT_CONTENCIOS = [
  { l: 'Act al unei autorități locale sau județene (fiscal: până la 3.000.000 lei)', inst: 'Tribunalul – secția de contencios administrativ și fiscal', grad: 2 },
  { l: 'Act al unei autorități centrale (fiscal: peste 3.000.000 lei)', inst: 'Curtea de apel – secția de contencios administrativ și fiscal', grad: 3 },
];
const G_CONTENCIOS = 'Instanța de contencios administrativ, după parcurgerea procedurii prealabile (art. 7 Legea nr. 554/2004), în afara excepțiilor legale';
const N_VALOARE = 'Valoarea se stabilește după capătul principal, fără accesorii – dobânzi, penalități, cheltuieli (art. 98). Pentru drepturi reale asupra unui imobil: valoarea impozabilă (art. 104).';
const N_EXCEPTII_J = 'Indiferent de valoare, sunt ale judecătoriei: moștenirea (art. 94 pct. 1 lit. j¹)), uzucapiunea (lit. j²)) și fondul funciar (lit. j³)).';

const COMP = {
  v1: { m: VAL, t: { ...T_GEN, alt: ALT_DELICT + ' Pentru contracte: ' + ALT_CONTRACT.replace('La alegerea reclamantului (art. 116) și: ', '') }, n: N_VALOARE },
  v2: {
    opt: [
      { l: 'Act juridic patrimonial (regula generală)', val: true, t: { ...T_GEN, alt: ALT_CONTRACT } },
      { l: 'Legat sau certificat de moștenitor (nulitate, anulare, revocare)', ...J_MOST, t: T_MOST },
    ],
    n: 'Valoarea = valoarea obiectului actului sau a părții din act dedusă judecății (art. 101). Dacă se cere și restituirea unui imobil pe cale reală, acel capăt atrage art. 117.',
  },
  v3: {
    opt: [
      { l: 'Constatarea unui drept patrimonial (regula generală)', val: true, t: T_IMOBIL_COND },
      { l: 'Moștenire: calitatea de moștenitor, cote, masa succesorală, vacanța succesorală, petiția de ereditate', ...J_MOST, t: T_MOST },
      { l: 'Uzucapiune', inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. j²) ${CPC} – uzucapiunea, indiferent de valoare`, t: T_IMOBIL },
      { l: 'Fond funciar (inclusiv cererile de drept comun ale terților vătămați prin aplicarea legilor fondului funciar)', inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. j³) ${CPC} – fondul funciar, cu excepția celor date prin lege altor instanțe`, t: T_IMOBIL },
    ],
    n: N_EXCEPTII_J + ' ' + N_RECURS_94,
  },
  v4: { m: VAL, t: { ...T_GEN, r: 'Acțiune personală imobiliară: instanța domiciliului sau sediului pârâtului', alt: 'La alegerea reclamantului, și instanța locului prevăzut în contract pentru executarea obligației (art. 113 alin. (1) pct. 3). Dacă locul executării nu rezultă din contract, rămâne domiciliul pârâtului.' }, n: 'Practica ÎCCJ (decizii din 2015 care invocă RIL nr. 8/2013) califică acțiunea drept personală imobiliară, deci art. 117 nu se aplică.', v: 'Valoarea pentru competență: valoarea obiectului contractului (art. 101) sau valoarea impozabilă a imobilului (art. 104) – verificați practica instanței.' },
  v5: { m: VAL, t: { ...T_GEN, alt: ALT_DELICT }, n: 'Daunele morale altele decât cele întemeiate pe art. 253 C.civ. se raportează la valoarea pretinsă. ' + N_VALOARE },
  v7: {
    opt: [
      { l: 'Revendicare sau alt drept real asupra imobilului', val: true, t: T_IMOBIL },
      { l: 'Uzucapiune', inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. j²) ${CPC} – uzucapiunea, indiferent de valoare`, t: T_IMOBIL },
    ],
  },
  v6: { m: VAL, t: T_IMOBIL, n: 'Grănițuirea singură este a judecătoriei (art. 94 pct. 1 lit. f)); revendicarea se raportează la valoarea impozabilă a porțiunii (art. 104). Capetele fiind strâns legate, le judecă instanța mai mare în grad (art. 99 alin. (2)).' },

  r1: { m: J('g'), t: { r: 'Imobil: instanța locului imobilului (art. 117 alin. (3), prin asemănare). Bun mobil: domiciliul pârâtului (art. 107).', temei: `art. 107, art. 117 ${CPC}`, ex: 'cond' } },
  r2: { m: VAL, t: T_IMOBIL_COND, n: 'Pentru un imobil, valoarea pentru competență este valoarea impozabilă (art. 104).' },
  r3: { m: J('e'), t: T_IMOBIL },
  r4: { m: J('f'), t: T_IMOBIL },

  p1: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p3: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p4: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p5: { m: J('j', 'împărțeală judiciară; reducțiunea liberalităților excesive este și cerere în materie de moștenire – lit. j¹)'), t: T_PARTAJ, n: 'Formulată separat de partaj, reducțiunea rămâne la judecătorie, indiferent de valoare (art. 94 pct. 1 lit. j¹)), cu competența exclusivă a art. 118.' },
  p6: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p7: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p2: { m: J('j', 'în materie de moștenire și lit. j¹)'), t: T_PARTAJ, n: 'Cererile privind calitatea de moștenitor sunt ale judecătoriei indiferent de valoare și indiferent dacă sunt principale sau accesorii partajului (Legea nr. 310/2018; plan de seminar INM).' },

  n1: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 1/2023`), t: { ...T_GEN, alt: ALT_DELICT } },
  n2: { m: TRIB(), t: T_GEN, n: 'Excepție: când legea o dă judecătoriei – stare civilă (art. 94 pct. 1 lit. b)), cereri date instanței de tutelă și de familie (lit. a)). Competența generală: rectificarea actelor de stare civilă se face prin dispoziția primarului (art. 58 alin. (1) din Legea nr. 119/1996), nu de instanță.' },
  n3: { m: TRIB(), t: T_GEN, n: 'Excepție: când legea o dă judecătoriei – stare civilă (art. 94 pct. 1 lit. b)), cereri date instanței de tutelă și de familie (lit. a)).' },
  n4: { m: VAL, vl: 'Chiria sau arenda anuală (lei) – pentru competență', t: { ...T_GEN, alt: 'Pentru imobil: și instanța locului unde se află imobilul (art. 113 alin. (1) pct. 4), la alegerea reclamantului.' }, n: 'Valoarea pentru competență = chiria sau arenda anuală (art. 101 alin. (3)). Dacă se cere evacuarea – judecătoria (art. 94 pct. 1 lit. d)).' },
  n7: { m: VAL, t: { ...T_GEN, alt: ALT_DELICT }, n: 'Taxa este fixă (100 lei), dar competența se stabilește după valoarea pretențiilor (art. 94 pct. 1 lit. k) / art. 95 pct. 1).' },
  n5: { m: VAL, t: T_GEN, n: N_VALOARE },
  n6: { m: TRIB(), t: T_GEN, n: 'Excepții: obligațiile de a face sau de a nu face neevaluabile în bani – judecătoria (art. 94 pct. 1 lit. h)); orice alte cereri date prin lege judecătoriei (art. 94).' },

  c1: { m: LA('Instanța a cărei hotărâre se atacă', `art. 505 alin. (1) ${CPC}`), t: T_ACELASI('Aceeași instanță (cale de retractare)') },
  c2: { m: LA('Instanța care a pronunțat hotărârea a cărei revizuire se cere', `art. 510 ${CPC}`), t: T_ACELASI('Aceeași instanță'), v: 'Pentru revizuirea pentru hotărâri potrivnice, verificați regula specială din art. 510.' },
  c3: { m: LA('Un alt complet al instanței la care funcționează judecătorul recuzat', `art. 51 ${CPC}`), t: T_ACELASI('Aceeași instanță'), v: 'Alineatele art. 51 (inclusiv situația în care nu se poate constitui completul) – de verificat în textul în vigoare.' },
  c4: { m: LA('Curtea de apel (pentru judecătoriile și tribunalele din circumscripția ei); ÎCCJ (când se cere strămutarea de la o curte de apel sau pentru motiv de siguranță publică)', `art. 142 ${CPC}`), t: T_ACELASI('Instanța ierarhic superioară arătată la competența materială') },
  c5: { m: LA('Instanța competentă să judece cererea privitoare la dreptul neexercitat în termen', `art. 186 ${CPC}`), t: T_ACELASI('Aceeași instanță') },
  c6: { m: LA('Instanța în fața căreia s-a produs perimarea (instanța sesizată cu cauza)', `art. 416 și urm. ${CPC}`), t: T_ACELASI('Aceeași instanță'), v: 'Articolul care prevede expres instanța care constată perimarea – de verificat.' },
  c7: { m: LA('Un alt complet al aceleiași instanțe', `art. 191 ${CPC}`), t: T_ACELASI('Aceeași instanță'), v: 'Textul art. 191 nu l-am putut citi integral – de verificat.' },
  c8: { m: LA('Un alt complet al aceleiași instanțe, desemnat aleatoriu', `art. 200 ${CPC}`), t: T_ACELASI('Aceeași instanță') },
  c9: { m: LA('Instanța care a suspendat judecata', ''), t: T_ACELASI('Aceeași instanță') },
  c10: { m: LA('Instanța învestită cu cauza (dosar în curs) sau instanța care a pronunțat hotărârea dispărută', `art. 1054–1056 ${CPC}`), t: T_ACELASI('Aceeași instanță'), n: 'Numerotarea diferă între forma inițială (art. 1053–1055) și cea republicată.' },
  c11: { m: LA('Instanța competentă să judece fondul cauzei (de regulă, după valoarea creanței)', `art. 953 și urm. (sechestru asigurător), art. 970 și urm. (poprire asigurătorie) ${CPC}`), t: T_ACELASI('Instanța sesizată cu acțiunea de fond'), v: 'Regula reiese din practică (cererea urmează acțiunea de fond); textul exact – de verificat.' },

  c12: { m: LA('Contestația: instanța sesizată cu procesul; plângerea împotriva încheierii: instanța ierarhic superioară', `art. 522–526 ${CPC}`), t: T_ACELASI('Instanța sesizată cu procesul'), v: 'Completul care soluționează contestația și instanța care judecă plângerea – de verificat în textul art. 524–525.' },
  c13: { m: LA('Instanța competentă să judece fondul cauzei', `art. 953 și urm. ${CPC}`), t: T_ACELASI('Instanța sesizată cu acțiunea de fond'), v: 'Regula reiese din practică (cererea urmează acțiunea de fond); textul exact – de verificat.' },
  c14: { m: LA('Instanța la care se află dosarul (eliberează grefa)', ''), t: T_ACELASI('Aceeași instanță') },
  c15: { m: LA('Instanța la care se află dosarul (eliberează grefa)', ''), t: T_ACELASI('Aceeași instanță') },
  c16: { m: LA('Instanța din ale cărei evidențe sau arhivă rezultă faptele', ''), t: T_ACELASI('Aceeași instanță') },
  c17: { m: LA('Instanța care a pronunțat hotărârea (în arhiva căreia se află dosarul)', ''), t: T_ACELASI('Aceeași instanță') },
  e7: { m: LA('Judecătoria – instanța de executare', `art. 906 alin. (4), art. 651 ${CPC}`, 1), t: T_EXEC },
  e1: { m: LA('Instanța de executare sesizată cu contestația (judecătoria); pentru executarea provizorie a unei hotărâri – instanța de apel', `art. 719, art. 651 ${CPC}; art. 450 (executarea provizorie); ÎCCJ – Decizia nr. 27/2021`, 1), t: T_EXEC },
  e2: { m: LA('Judecătoria – instanța de executare', `art. 714 alin. (1), art. 651 ${CPC}`, 1), t: T_EXEC, n: 'Contestația privind lămurirea titlului emis de o instanță se poate face la instanța care a pronunțat hotărârea (art. 714). Executarea silită fiscală are reguli proprii (Legea nr. 207/2015, art. 260 și urm.).' },
  e3: { m: LA('Judecătoria – instanța de executare', `art. 714 alin. (1), art. 651 ${CPC}`, 1), t: T_EXEC, n: 'Executarea silită fiscală are reguli proprii (Legea nr. 207/2015, art. 260 și urm.).' },
  e4: { m: LA('Judecătoria – instanța de executare', `art. 714 alin. (1), art. 651 ${CPC}`, 1), t: T_EXEC },
  e5: { m: LA('Instanța care a desființat titlul sau executarea; dacă s-a dispus rejudecarea – instanța care rejudecă fondul; altfel, pe cale separată – instanța de executare', `art. 723 ${CPC}`), t: { ...T_EXEC, r: 'Pe cale separată: ' + T_EXEC.r } },
  e6: { m: LA('Judecătoria – instanța de executare', `art. 790, art. 651 ${CPC}`, 1), t: T_EXEC, n: 'La poprirea fiscală există reguli speciale în Codul de procedură fiscală.' },

  f1: { g: 'Instanța judecătorească; divorțul prin acord se poate face și pe cale administrativă sau notarială (art. 375 C.civ.)', m: LA('Judecătoria', `art. 915 ${CPC}`, 1), t: T_DIVORT, n: 'Art. 915 în forma republicată (art. 914 în forma inițială). Cererile accesorii (nume, autoritate părintească, pensie, partaj) urmează instanța divorțului.' },
  f3: { m: LA('Judecătoria', `art. 915 ${CPC}`, 1), t: T_DIVORT },
  f4: { m: LA('Instanța care judecă divorțul', `art. 388, art. 390 C.civ.; art. 123 ${CPC}`, 1), t: T_DIVORT, n: 'Despăgubirile (art. 388 C.civ.) și prestația compensatorie (art. 390 C.civ.) se cer în procesul de divorț.' },
  f5: { m: J('a', 'instanța de tutelă și de familie'), t: { r: 'Instanța domiciliului sau reședinței minorului', temei: `art. 114 alin. (1) ${CPC}; ÎCCJ – deciziile nr. 1664/2015 și 1774/2015`, ex: true, alt: 'Pensia de întreținere cerută separat: și instanța domiciliului creditorului reclamant (art. 113 alin. (1) pct. 2). Cereri formulate odată cu divorțul: instanța divorțului.' }, n: 'ÎCCJ (2015) califică această competență drept exclusivă; au existat și opinii contrare în practica instanțelor inferioare.' },
  f6: { m: J('a', 'instanța de tutelă și de familie'), t: { r: 'Ocrotirea persoanei fizice: domiciliul sau reședința persoanei ocrotite (art. 114). Celelalte cereri: domiciliul pârâtului (art. 107).', temei: `art. 107, art. 114 ${CPC}`, ex: 'cond' } },
  f7: {
    opt: [
      { l: 'Tutelă, curatelă, alte măsuri de ocrotire', inst: 'Judecătoria (instanța de tutelă și de familie)', grad: 1, temei: `art. 94 pct. 1 lit. a) ${CPC}`, t: { r: 'Instanța domiciliului sau reședinței persoanei ocrotite', temei: `art. 114 alin. (1) ${CPC}`, ex: true } },
      { l: 'Adopție', inst: 'Tribunalul', grad: 2, temei: 'Legea nr. 273/2004', t: { r: 'Tribunalul domiciliului adoptatului', temei: 'Legea nr. 273/2004', ex: 'spec' } },
    ],
  },

  m1: { m: LA('Instanța sesizată cu procesul (hotărâre de expedient); acord de mediere înaintea procesului – judecătoria', `art. 438–441 ${CPC}; art. 59 Legea nr. 192/2006`, 1), t: T_MEDIERE },
  m2: { m: LA('Instanța sesizată cu procesul; acord de mediere înaintea procesului – judecătoria', `art. 438–441 ${CPC}; art. 59 Legea nr. 192/2006`, 1), t: T_MEDIERE, v: 'Nu am găsit o regulă care să impună, pentru acordul privind un imobil, instanța locului imobilului (art. 117) – verificați practica judecătoriei.' },
  m3: { m: LA('Instanța sesizată cu procesul; acord de mediere înaintea procesului – judecătoria', `art. 438–441 ${CPC}; art. 59 Legea nr. 192/2006`, 1), t: T_MEDIERE, v: 'La partajul succesoral, verificați dacă se aplică regula exclusivă a art. 118 (ultimul domiciliu al defunctului).' },

  s1: { m: LA('Judecătoria', `art. 1028 ${CPC}`, 1), t: { ...T_GEN, alt: 'Se aplică regulile generale, inclusiv competența alternativă (art. 113, art. 116).' } },
  s2: { m: VAL, extra: `art. 1015 ${CPC} – instanța competentă să judece fondul cauzei în primă instanță`, t: { ...T_GEN, alt: ALT_CONTRACT } },
  s6: { m: LA('—', 'Regulamentele (CE) nr. 1896/2006 și nr. 861/2007; Cartea a VII-a C.proc.civ.'), t: T_ACELASI('—'), v: 'Instanța care judecă opoziția la somația europeană, respectiv reexaminarea în procedura europeană cu valoare redusă – de verificat în normele naționale de punere în aplicare.' },
  s3: { m: LA('Judecătoria, indiferent de valoarea imobilului', `art. 94 pct. 1 lit. d), art. 1036 ${CPC}`, 1), t: { r: 'Judecătoria în circumscripția căreia se află imobilul, chiar dacă locatarul l-a părăsit sau contractul a încetat', temei: `art. 1036 ${CPC}`, ex: true } },
  s4: { m: LA('Instanța competentă să judece fondul în primă instanță', `art. 997 alin. (1) ${CPC}`), t: { ...T_GEN, r: 'Potrivit regulilor generale de competență teritorială', temei: `art. 107 și urm. ${CPC}; ÎCCJ – Decizia nr. 27/2020` } },
  s5: { m: VAL, extra: `art. 997 alin. (1) ${CPC} – instanța competentă să judece fondul`, t: { ...T_GEN, r: 'Potrivit regulilor generale de competență teritorială', temei: `art. 107 și urm. ${CPC}; ÎCCJ – Decizia nr. 27/2020` } },

  a1: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016 (proprietate intelectuală, indiferent de valoare)`), t: { ...T_GEN, alt: ALT_DELICT }, n: 'Competență specializată: complete specializate în proprietate intelectuală; necompetența specializată este necompetență materială de ordine publică (art. 129 alin. (2) pct. 2 C.proc.civ., după Legea nr. 310/2018; ÎCCJ – RIL nr. 17/2018).' },
  a2: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016`), t: T_GEN, n: 'Competență specializată: complete specializate în proprietate intelectuală; necompetența specializată este necompetență materială de ordine publică (art. 129 alin. (2) pct. 2 C.proc.civ., după Legea nr. 310/2018; ÎCCJ – RIL nr. 17/2018).', v: 'Căile de atac împotriva deciziilor OSIM au reguli speciale (Tribunalul București) – verificați legea specială.' },
  a3: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016`), t: T_GEN, n: 'Competență specializată: complete specializate în proprietate intelectuală; necompetența specializată este necompetență materială de ordine publică (art. 129 alin. (2) pct. 2 C.proc.civ., după Legea nr. 310/2018; ÎCCJ – RIL nr. 17/2018).', v: 'Căile de atac împotriva deciziilor OSIM au reguli speciale (Tribunalul București) – verificați legea specială.' },
  a4: { m: LA('Tribunalul (judecătorul-sindic)', `art. 41 Legea nr. 85/2014`, 2), t: { r: 'Exclusiv tribunalul în circumscripția căruia își are sediul debitorul', temei: `art. 120 ${CPC}; art. 41 Legea nr. 85/2014`, ex: true } },
  a5: { g: 'Mai întâi registratorul (oficiul registrului comerțului); instanța – pe calea plângerii', m: LA('Tribunalul', 'Legea nr. 265/2022', 2), t: { r: 'Plângerea împotriva încheierii registratorului se depune la oficiul registrului comerțului, în 10 zile, și se înaintează tribunalului', temei: 'Legea nr. 265/2022', ex: 'spec' }, v: 'Articolul exact din Legea nr. 265/2022 și tribunalul competent teritorial – de verificat.' },
  a6: { m: LA('Tribunalul București', 'Legea nr. 14/2003', 2), t: { r: 'Tribunalul București', temei: 'Legea nr. 14/2003', ex: true } },
  a7: {
    opt: [
      { l: 'Sindicat sau organizație patronală', inst: 'Judecătoria', grad: 1, temei: 'Legea nr. 367/2022', t: { r: 'Judecătoria în circumscripția căreia își are sediul organizația', temei: 'Legea nr. 367/2022', ex: 'spec' } },
      { l: 'Federație sau confederație', inst: 'Tribunalul', grad: 2, temei: 'art. 44–45 Legea nr. 367/2022', t: { r: 'Tribunalul în circumscripția căruia își are sediul', temei: 'Legea nr. 367/2022', ex: 'spec' } },
    ],
    v: 'Textul art. 14 din Legea nr. 367/2022 (cererea sindicatului) nu l-am putut citi integral – verificați.',
  },
  a8: {
    opt: [
      { l: 'Asociație sau fundație', inst: 'Judecătoria', grad: 1, temei: 'O.G. nr. 26/2000', t: { r: 'Judecătoria în circumscripția căreia își are sediul', temei: 'O.G. nr. 26/2000', ex: 'spec' } },
      { l: 'Federație', inst: 'Tribunalul', grad: 2, temei: 'O.G. nr. 26/2000', t: { r: 'Tribunalul în circumscripția căruia își are sediul', temei: 'O.G. nr. 26/2000', ex: 'spec' }, v: 'Pentru federații am găsit o singură sursă indirectă – verificați art. 35 și urm. din O.G. nr. 26/2000.' },
    ],
  },
  a9: { g: G_CONTENCIOS, opt: OPT_CONTENCIOS, temei: 'art. 10 alin. (1) Legea nr. 554/2004', t: T_CONTENCIOS },
  a10: { g: G_CONTENCIOS, opt: OPT_CONTENCIOS, temei: 'art. 10 alin. (1) Legea nr. 554/2004', t: T_CONTENCIOS },
  a11: { m: LA('—', 'Legea nr. 188/2000'), t: T_ACELASI('—'), v: 'Nu am putut confirma textul care stabilește instanța pentru conflictele de competență între birourile executorilor – de verificat.' },
  a12: { m: LA('Judecătoria', 'art. 56 Legea nr. 188/2000', 1), t: { r: 'Judecătoria în circumscripția căreia își are sediul biroul executorului (plângere în 5 zile de la comunicarea refuzului)', temei: 'art. 56 Legea nr. 188/2000', ex: 'spec' } },
  a13: { m: LA('—', 'Legea nr. 188/2000'), t: T_ACELASI('—'), v: 'Nu am putut verifica organul sau instanța competentă pentru supralegalizare – de verificat.' },
  a14: { g: 'Mai întâi organul constatator; instanța – pe calea plângerii', m: LA('Judecătoria', 'art. 32 O.G. nr. 2/2001', 1), t: { r: 'Judecătoria în circumscripția căreia s-a săvârșit contravenția sau, la alegere, cea a domiciliului/sediului contravenientului; la contravențiile privind circulația pe drumurile publice – numai judecătoria locului săvârșirii (O.U.G. nr. 195/2002)', temei: 'art. 32 O.G. nr. 2/2001', ex: 'spec' } },
  a15: { g: 'Mai întâi registratorul de carte funciară (OCPI); instanța – pe calea plângerii', m: LA('Judecătoria', 'art. 31 Legea nr. 7/1996', 1), t: { r: 'Judecătoria în circumscripția căreia se află imobilul; plângerea se depune la biroul de cadastru și publicitate imobiliară, în 15 zile de la comunicare', temei: 'art. 31 Legea nr. 7/1996', ex: true } },

  a16: { m: LA('—', 'Legea nr. 36/1995'), t: T_ACELASI('—'), v: 'Instanța competentă pentru contestația împotriva deciziei de soluționare a conflictului de competență dintre notari – de verificat în Legea nr. 36/1995.' },
  a17: { m: LA('Judecătoria în circumscripția căreia își are sediul biroul notarial', 'Legea nr. 36/1995', 1), t: { r: 'Judecătoria sediului biroului notarial', temei: 'Legea nr. 36/1995', ex: 'spec' }, v: 'Articolul exact din Legea nr. 36/1995 și termenul plângerii – de verificat.' },
  a18: { m: LA('Judecătoria (judecătorul delegat)', `art. 94 pct. 1 lit. c) ${CPC}; Legea nr. 196/2018`, 1), t: T_ACELASI('—'), v: 'Judecătoria competentă teritorial și calea de atac pentru înregistrarea asociației de proprietari – de verificat în Legea nr. 196/2018.' },
  a19: { m: LA('Curtea de apel în circumscripția căreia a avut loc arbitrajul', `art. 610 ${CPC}`, 3), t: { r: 'Curtea de apel a locului arbitrajului', temei: `art. 610 ${CPC}`, ex: 'spec' }, v: 'Numărul articolului (Cartea a IV-a C.proc.civ. – acțiunea în anulare) – de verificat.' },
  k1: { m: LA('Instanța ierarhic superioară: tribunalul pentru hotărârile judecătoriei, curtea de apel pentru hotărârile tribunalului', `art. 95 pct. 2, art. 96 pct. 2 ${CPC}`), t: T_ACELASI('Apelul se depune la instanța a cărei hotărâre se atacă') },
  k2: { m: LA('Instanța ierarhic superioară: tribunalul pentru hotărârile judecătoriei, curtea de apel pentru hotărârile tribunalului', `art. 95 pct. 2, art. 96 pct. 2 ${CPC}`), t: T_ACELASI('Apelul se depune la instanța a cărei hotărâre se atacă') },
  k3: { m: LA('Instanța de recurs: curtea de apel sau ÎCCJ, după caz (tribunalul – pentru recursurile date de lege în competența sa)', `art. 95 pct. 3, art. 96 pct. 3, art. 97 pct. 1 ${CPC}`), t: T_ACELASI('Recursul se depune la instanța a cărei hotărâre se atacă'), n: N_RECURS_94, v: 'Verificați dacă hotărârea este supusă recursului (celelalte excepții de la art. 483 alin. (2) C.proc.civ.).' },
  k4: { m: LA('Instanța de recurs: curtea de apel sau ÎCCJ, după caz', `art. 96 pct. 3, art. 97 pct. 1 ${CPC}`), t: T_ACELASI('Recursul se depune la instanța a cărei hotărâre se atacă'), n: N_RECURS_94, v: 'Verificați dacă hotărârea este supusă recursului (celelalte excepții de la art. 483 alin. (2) C.proc.civ.).' },
  k5: { m: LA('Instanța de recurs: curtea de apel sau ÎCCJ, după caz', `art. 96 pct. 3, art. 97 pct. 1 ${CPC}`), t: T_ACELASI('Recursul se depune la instanța a cărei hotărâre se atacă'), n: N_RECURS_94, v: 'Verificați dacă hotărârea este supusă recursului (celelalte excepții de la art. 483 alin. (2) C.proc.civ.).' },
  k6: { m: LA('Instanța de recurs: curtea de apel sau ÎCCJ, după caz', `art. 96 pct. 3, art. 97 pct. 1 ${CPC}`), t: T_ACELASI('Recursul se depune la instanța a cărei hotărâre se atacă'), n: N_RECURS_94, v: 'Verificați dacă hotărârea este supusă recursului (celelalte excepții de la art. 483 alin. (2) C.proc.civ.).' },
  k7: { m: LA('Instanța competentă să judece calea de atac (de regulă, instanța ierarhic superioară)', ''), t: T_ACELASI('Calea de atac se depune la instanța a cărei hotărâre se atacă') },
  k8: { m: LA('Instanța competentă să judece calea de atac (de regulă, instanța ierarhic superioară)', ''), t: T_ACELASI('Calea de atac se depune la instanța a cărei hotărâre se atacă') },
  k9: { m: LA('Instanța competentă să judece calea de atac (de regulă, instanța ierarhic superioară)', ''), t: T_ACELASI('Calea de atac se depune la instanța a cărei hotărâre se atacă') },
  k10: { m: LA('Instanța competentă să judece calea de atac (de regulă, instanța ierarhic superioară)', ''), t: T_ACELASI('Calea de atac se depune la instanța a cărei hotărâre se atacă') },
  x1: { m: LA('Instanța care judecă sau a judecat cauza', ''), t: T_ACELASI('Aceeași instanță') },
  x2: { m: LA('Aceeași instanță, alt complet, în camera de consiliu, fără citare', 'art. 39 alin. (1)–(2) O.U.G. nr. 80/2013'), t: T_ACELASI('Aceeași instanță') },
  x3: { m: LA('Instanța competentă să judece cauza; pentru o cerere incidentală – instanța sesizată cu cererea principală', 'O.U.G. nr. 51/2008'), t: T_ACELASI('Instanța sesizată cu cauza'), n: 'Reexaminarea încheierii de respingere: 5 zile de la comunicare, alt complet, camera de consiliu (plan de seminar INM).' },
  x4: { m: LA('Aceeași instanță, alt complet, în camera de consiliu', 'art. 43 alin. (5) O.U.G. nr. 80/2013'), t: T_ACELASI('Aceeași instanță') },
  x5: { m: LA('Instanța care judecă acțiunea principală (cerere accesorie)', `art. 123 ${CPC}`), t: T_ACELASI('Instanța sesizată cu acțiunea principală') },
  z12: { m: LA('Potrivit obiectului cererii', ''), t: T_ACELASI('Potrivit obiectului cererii'), n: 'Scutirea privește persoana care formulează cererea; competența se stabilește după obiectul concret – alegeți și obiectul cererii.' },
  z13: { m: LA('Potrivit obiectului cererii', ''), t: T_ACELASI('Potrivit obiectului cererii'), n: 'Competența se stabilește după obiectul concret al cererii (de regulă, legea specială privind drepturile foștilor deținuți politici).' },
  z14: { m: LA('Tribunalul', 'Legea nr. 31/1990', 2), t: T_ACELASI('Tribunalul sediului societății'), v: 'Articolul din Legea nr. 31/1990 și instanța competentă teritorial – de verificat.' },
  z15: { m: LA('Potrivit obiectului cererii', ''), t: T_ACELASI('Potrivit obiectului cererii'), n: 'Scutire subiectivă (art. 30); competența se stabilește după obiectul concret al cererii.' },
  z1: { m: LA('Tribunalul (litigii de asigurări sociale)', 'Legea nr. 360/2023', 2), t: { r: 'Instanța domiciliului reclamantului', temei: 'art. 130 Legea nr. 360/2023', ex: 'spec' } },
  z2: { m: LA('—', ''), t: T_ACELASI('—'), v: 'Obiect eterogen: drepturile de asigurări sociale (ex. ajutorul de șomaj) – tribunalul; actele autorităților (ajutor social, alocații, încadrarea în grad de handicap) – contencios administrativ (Legea nr. 554/2004). Alegeți obiectul concret și verificați legea specială.' },
  z3: {
    opt: [
      { l: 'Obligația legală de întreținere (pensie de întreținere)', inst: 'Judecătoria (instanța de tutelă și de familie)', grad: 1, temei: `art. 94 pct. 1 lit. a) ${CPC}`, t: { r: 'Domiciliul pârâtului (art. 107) sau, la alegere, domiciliul creditorului reclamant (art. 113 alin. (1) pct. 2)', temei: `art. 107, art. 113 alin. (1) pct. 2 ${CPC}` } },
      { l: 'Contract de întreținere (nulitate, rezoluțiune etc.)', val: true, t: { ...T_GEN, alt: ALT_CONTRACT } },
    ],
  },
  z4: { m: LA('Tribunalul în circumscripția căruia domiciliază reclamantul', 'art. 541 C.proc.pen.', 2), t: { r: 'Tribunalul domiciliului reclamantului', temei: 'art. 541 C.proc.pen.', ex: 'spec' } },
  z5: { m: VAL, t: { r: 'Domiciliul consumatorului (art. 113 alin. (1) pct. 8) sau domiciliul/sediul profesionistului pârât (art. 107), la alegere', temei: `art. 107, art. 113 alin. (1) pct. 8 ${CPC}` }, n: N_VALOARE },
  z6: { m: LA('—', ''), t: T_ACELASI('—'), v: 'Competența diferă după legea electorală aplicabilă (alegeri locale, parlamentare, prezidențiale, europarlamentare, referendum) – verificați legea specială.' },
  z7: { m: LA('—', ''), t: T_ACELASI('—'), v: 'Competența depinde de temeiul acțiunii (răspundere civilă – după valoare; contencios administrativ – Legea nr. 554/2004).' },
  z8: { g: 'Mai întâi comisiile de fond funciar; instanța – pe calea plângerii împotriva hotărârii comisiei județene', m: J('j³', 'art. 53 alin. (2) Legea nr. 18/1991'), t: { r: 'Judecătoria în a cărei rază teritorială este situat terenul (plângere în 30 de zile de la comunicare)', temei: 'art. 53 alin. (2) Legea nr. 18/1991', ex: true }, n: 'Excepție: cererile întemeiate pe Legea nr. 165/2013 (anularea deciziei Comisiei Naționale pentru Compensarea Imobilelor sau refuzul de a soluționa dosarul) sunt ale secției civile a tribunalului (art. 35 alin. (1)–(2) din Legea nr. 165/2013 – plan de seminar INM). ' + N_RECURS_94 },
  z9: { g: G_CONTENCIOS, m: LA('Tribunalul – secția de contencios administrativ și fiscal', 'Codul administrativ (regula fostului art. 109 din Legea nr. 188/1999)', 2), t: T_CONTENCIOS, v: 'Articolul din Codul administrativ (O.U.G. nr. 57/2019) care preia regula – de verificat.' },
  z11: { m: LA('Judecătoria', `art. 915 ${CPC}; art. 94 pct. 1 lit. j) (partaj)`, 1), t: T_DIVORT, n: 'Partajul cerut odată cu divorțul se judecă de instanța divorțului.' },
  z10: { m: LA('—', ''), t: T_ACELASI('—'), v: 'Competența se stabilește după legea specială.' },
};

// Competența facultativă (art. 127 C.proc.civ., după Legea nr. 310/2018 și Decizia CCR nr. 290/2018)
const F127 = [
  'Nicio parte nu este judecător, procuror, asistent judiciar, grefier sau instanță',
  'Reclamantul este judecător, procuror, asistent judiciar, grefier sau o instanță',
  'Pârâtul este judecător, procuror, asistent judiciar, grefier sau o instanță',
];
const F127_TEXT = {
  1: 'Competență facultativă (art. 127 alin. (1) C.proc.civ.): dacă cererea ar fi de competența instanței la care reclamantul își desfășoară activitatea sau a unei instanțe inferioare acesteia, se sesizează o instanță de același grad din circumscripția oricăreia dintre curțile de apel învecinate cu curtea de apel în care se află instanța unde lucrează. Instanța proprie nu poate fi sesizată (normă de ordine publică; excepția se poate invoca și din oficiu).',
  2: 'Competență facultativă (art. 127 alin. (2) C.proc.civ.): dacă cererea ar fi de competența instanței la care pârâtul își desfășoară activitatea sau a unei instanțe inferioare acesteia, reclamantul poate sesiza o instanță de același grad din circumscripția oricăreia dintre curțile de apel învecinate.',
};

/* Rezultatul pentru un obiect: { gen, inst, grad, temei, ter, notes[], verif[], lipsa } */
function compCalcul(t, v) {
  const c = COMP[t.id];
  if (!c) return null;
  const num = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
  const out = { gen: c.g || 'Instanțele judecătorești', ter: c.t, notes: c.n ? [c.n] : [], verif: c.v ? [c.v] : [], optiuni: c.opt || null };
  let m = c.m;
  if (c.opt) {
    const o = c.opt[Math.min(c.opt.length - 1, Number(v.co) || 0)];
    m = o.val ? VAL : { inst: o.inst, grad: o.grad, temei: o.temei || c.temei };
    if (o.t) out.ter = o.t; else if (!c.t && o.val) out.ter = T_GEN;
    if (o.v) out.verif.push(o.v);
    if (o.val) out.notes.push(N_VALOARE);
  }
  if (m && m.val) {
    const camp = c.vl || !taxaCampuri(t).some(x => x.n === 'valoare') ? 'cv' : 'valoare';
    const val = num(v[camp]);
    const extra = c.extra ? `; ${c.extra}` : '';
    if (!val) Object.assign(out, { inst: 'Judecătoria (până la 200.000 lei inclusiv) sau Tribunalul (peste 200.000 lei)', grad: 0, temei: `art. 94 pct. 1 lit. k), art. 95 pct. 1 ${CPC}${extra}`, lipsa: true });
    else if (val <= PRAG_JUD) Object.assign(out, { inst: 'Judecătoria', grad: 1, temei: `art. 94 pct. 1 lit. k) ${CPC} – cereri evaluabile în bani de până la 200.000 lei inclusiv${extra}` });
    else Object.assign(out, { inst: 'Tribunalul', grad: 2, temei: `art. 95 pct. 1 ${CPC} – cereri evaluabile în bani de peste 200.000 lei${extra}` });
  } else if (m) Object.assign(out, { inst: m.inst, grad: m.grad || 0, temei: m.temei });
  if (F127_TEXT[v.f127]) out.f127 = F127_TEXT[v.f127];
  if (typeof taxaGrila === 'function' && taxaGrila(t, v)) out.notes.unshift('Competența se raportează la valoarea impozabilă (art. 104 C.proc.civ.), chiar dacă taxa se calculează după grila notarială [art. 31 alin. (3) O.U.G. nr. 80/2013].');
  return out;
}

function compCampuri(t) {
  const c = COMP[t.id];
  if (!c) return [];
  const f = [];
  if (c.opt) f.push({ n: 'co', l: 'Situația concretă', opt: c.opt.map(o => o.l) });
  f.push({ n: 'f127', l: 'Calitatea părților (competența facultativă – art. 127)', opt: F127 });
  const o = c.opt && c.opt[Math.min(c.opt.length - 1, Number(TX.vals.co) || 0)];
  if (c.vl) f.push({ n: 'cv', l: c.vl });
  else if ((c.m && c.m.val) || (o && o.val)) {
    if (!taxaCampuri(t).some(x => x.n === 'valoare')) f.push({ n: 'cv', l: 'Valoarea obiectului cererii (lei) – pentru competență' });
  }
  return f;
}

const EXCL = { true: 'exclusivă', cond: 'exclusivă în anumite situații', spec: 'normă specială' };

function compHtml(t, rez) {
  if (!rez) return '';
  const ex = rez.ter && rez.ter.ex !== undefined && rez.ter.ex !== false ? `<span class="pill ${rez.ter.ex === true ? 'u1' : 'u3'}">${EXCL[rez.ter.ex]}</span>` : '';
  return `<div class="comp">
    <h3>Competența</h3>
    <dl>
      <dt>Generală</dt><dd>${h(rez.gen)}</dd>
      <dt>Materială</dt><dd><b>${h(rez.inst || '—')}</b>${rez.temei ? `<br><span class="muted small">${h(rez.temei)}</span>` : ''}${rez.lipsa ? '<br><span class="muted small">Introduceți valoarea pentru a alege instanța.</span>' : ''}</dd>
      <dt>Teritorială</dt><dd>${h(rez.ter?.r || '—')} ${ex}${rez.ter?.temei ? `<br><span class="muted small">${h(rez.ter.temei)}</span>` : ''}${rez.ter?.alt ? `<br><span class="small">${h(rez.ter.alt)}</span>` : ''}${rez.f127 ? `<br><span class="small"><b>${h(rez.f127)}</b></span>` : ''}</dd>
    </dl>
    ${rez.notes.map(n => `<div class="callout small" style="margin-top:8px">${h(n)}</div>`).join('')}
    ${rez.verif.map(n => `<div class="callout warn small" style="margin-top:8px"><span class="pill u2">de verificat</span> ${h(n)}</div>`).join('')}
  </div>`;
}

/* Competența pentru toate capetele de cerere din coș */
function compAgregat(cos) {
  const items = cos.filter(x => x.comp);
  if (!items.length) return null;
  const linii = [];
  const cuGrad = items.filter(x => x.comp.grad > 0);
  const faraGrad = items.filter(x => !(x.comp.grad > 0));
  const NUME = { 1: 'Judecătoria', 2: 'Tribunalul', 3: 'Curtea de apel' }, DE = { 1: 'judecătorie', 2: 'tribunal', 3: 'curtea de apel' };
  if (cuGrad.length) {
    const max = Math.max(...cuGrad.map(x => x.comp.grad));
    const diferite = new Set(cuGrad.map(x => x.comp.grad)).size > 1;
    if (!diferite) linii.push(`Competența materială: ${NUME[max]} pentru ${cuGrad.length === items.length ? 'toate capetele' : 'capetele cu instanță determinată'}.`);
    else linii.push(`Capetele țin de instanțe de grad diferit. Dacă sunt întemeiate pe un titlu comun ori pe aceeași cauză sau sunt în strânsă legătură, se judecă toate de ${DE[max]} – instanța mai mare în grad (art. 99 alin. (2) ${CPC}); dacă au cauze diferite, competența se stabilește pentru fiecare capăt în parte (art. 99 alin. (1)).`);
  }
  linii.push(`Cererile accesorii, adiționale și incidentale se judecă de instanța competentă pentru cererea principală (art. 123 ${CPC}). Pentru competență contează doar capătul principal, fără accesorii (art. 98 alin. (2)), deși taxa se datorează pentru fiecare capăt (art. 34 alin. (1) O.U.G. nr. 80/2013).`);
  if (faraGrad.length) linii.push(`Instanța se stabilește după regula proprie pentru: ${faraGrad.map(x => x.label).join('; ')}.`);
  const excl = items.filter(x => x.comp.ter && x.comp.ter.ex === true);
  const cond = items.filter(x => x.comp.ter && x.comp.ter.ex === 'cond');
  if (excl.length) linii.push(`Atenție – competență teritorială exclusivă: ${excl.map(x => `${x.label} (${x.comp.ter.temei})`).join('; ')}. Ea nu poate fi înlăturată prin alegerea reclamantului sau prin convenția părților.`);
  if (cond.length) linii.push(`Verificați dacă devine exclusivă (imobil, moștenire, ocrotire): ${cond.map(x => x.label).join('; ')}.`);
  if (items.some(x => /divor/i.test(x.label)) && items.length > 1) linii.push('Cererile formulate odată cu divorțul urmează competența instanței divorțului.');
  const f127 = items.find(x => x.comp.f127);
  if (f127) linii.push(f127.comp.f127);
  if (items.some(x => x.comp.verif && x.comp.verif.length)) linii.push('Unele capete au puncte marcate „de verificat”.');
  return linii;
}

function compText(cos) {
  const items = cos.filter(x => x.comp);
  if (!items.length) return '';
  const linii = items.map((x, i) => `${i + 1}. ${x.label} – competența materială: ${x.comp.inst || '—'}${x.comp.temei ? ' (' + x.comp.temei + ')' : ''}; competența teritorială: ${(x.comp.ter?.r || '—').replace(/\.$/, '')}${x.comp.ter?.temei ? ' (' + x.comp.ter.temei + ')' : ''}${x.comp.ter?.ex === true ? ' – competență exclusivă' : ''}`);
  const ag = compAgregat(cos) || [];
  return `Competența de soluționare:\n${linii.join(';\n')}.\n${ag.join('\n')}`;
}

/* Regimul excepției de necompetență – sinteză după planul de seminar INM „Competența instanțelor judecătorești” */
const COMP_REGIM = [
  'Verificarea din oficiu: la primul termen la care părțile sunt legal citate și pot pune concluzii, instanța verifică competența generală, materială și teritorială (art. 131 alin. (1), forma dată de Legea nr. 310/2018 pentru procesele începute după 21.12.2018). Excepțional, pentru lămuriri sau probe se acordă un singur termen (art. 131 alin. (2)); valoarea poate fi estimată din înscrisuri și explicații (art. 98 alin. (3)). Competența internațională se verifică din oficiu (art. 1.071).',
  'Necompetența materială și cea teritorială exclusivă: se invocă cel mai târziu la primul termen la care părțile sunt legal citate și pot pune concluzii sau la termenul acordat potrivit art. 131 alin. (2), sub sancțiunea decăderii (art. 130 alin. (2)). Excepția nu se poate uni cu fondul.',
  'Necompetența de ordine privată: numai pârâtul, prin întâmpinare sau, dacă aceasta nu e obligatorie, la primul termen la care părțile sunt legal citate și pot pune concluzii (art. 130 alin. (3)). Instanța nu o poate invoca din oficiu. Decăderea se constată din oficiu.',
  'Necompetența generală și cea internațională: în orice stare a pricinii. În practică, competența generală se verifică mai ales când există convenție arbitrală sau când cauza ține de un organ administrativ.',
  'Competența specializată: se verifică la primirea dosarului, în etapa scrisă, fără citare (art. 200 alin. (1)–(2)); după Legea nr. 310/2018 este necompetență materială (art. 129 alin. (2) pct. 2; ÎCCJ – RIL nr. 17/2018). Declinarea se face prin încheiere (art. 136 alin. (1)); conflictul îl soluționează secția corespunzătoare a instanței superioare (art. 136 alin. (2)).',
  'Respingerea excepției: încheiere interlocutorie, atacabilă numai odată cu fondul (art. 132 alin. (2)).',
  'Admiterea excepției: sentință (art. 424 alin. (1)) de declinare către instanța sau organul cu activitate jurisdicțională competent, fără cale de atac (art. 132 alin. (3)).',
  'Organ fără activitate jurisdicțională: cererea se respinge ca inadmisibilă; lipsa competenței instanțelor române: se respinge ca nefiind de competența jurisdicției române (art. 1.071 alin. (1)). În ambele cazuri hotărârea este supusă numai recursului la instanța ierarhic superioară (art. 132 alin. (4)).',
  'Convenție arbitrală invocată (art. 554): arbitraj instituționalizat – declinare către instituția permanentă de arbitraj; arbitraj ad-hoc – respingerea cererii ca nefiind de competența instanțelor judecătorești.',
  'Conflictul de competență: se înaintează dosarul instanței ierarhic superioare comune (art. 133–135); regulatorul de competență este definitiv.',
];

const COMP_MINUTE = [
  'Admite excepţia necompetenţei teritoriale a Judecătoriei …, invocată de pârât.\nDeclină competenţa de soluţionare a cauzei în favoarea Judecătoriei ….\nFără cale de atac.',
  'Admite excepţia necompetenţei materiale a Judecătoriei …, invocată din oficiu.\nDeclină competenţa de soluţionare a cauzei în favoarea Tribunalului ….\nFără cale de atac.',
  'Admite excepţia necompetenţei generale a instanțelor judecătorești, invocată din oficiu.\nRespinge cererea ca inadmisibilă.\nCu drept de recurs în termen de 30 de zile de la comunicare.\nCererea de recurs se depune la … [instanța a cărei hotărâre se atacă].',
  'Admite excepţia necompetenţei specializate a completului … din cadrul …, invocată din oficiu.\nDeclină competenţa de soluţionare a cauzei în favoarea unuia dintre completele … specializate în ….\nTrimite dosarul serviciului de registratură în vederea repartizării aleatorii.\nFără cale de atac.',
  'Respinge excepția de necompetență teritorială, invocată de pârât, ca neîntemeiată.',
  'Admite excepția tardivității invocării excepției de necompetență teritorială. Decade pârâtul din dreptul de a invoca excepția de necompetență teritorială. Respinge excepția de necompetență teritorială, invocată de pârât, ca tardivă.',
  'Stabileşte competenţa de soluţionare a cauzei în favoarea ….\nDefinitivă.',
];

function compRegimHtml() {
  return `<details class="card"><summary><h2 style="display:inline">Excepția de necompetență – regim și minute</h2></summary>
    <ul class="steps" style="margin-top:10px">${COMP_REGIM.map(r => `<li>${h(r)}</li>`).join('')}</ul>
    <h3 style="margin:14px 0 6px;font-size:1rem">Modele de minută</h3>
    ${COMP_MINUTE.map(m => `<pre class="minuta">${h(m)}</pre>`).join('')}
    <p class="muted small" style="margin:6px 0 0">Sursa: planul de seminar INM „Competența instanțelor judecătorești”. La excepția invocată peste termen, seminarul arată că soluția conformă art. 185 alin. (1) ar fi anularea excepției, deși practica o respinge ca tardivă.</p>
  </details>`;
}

'use strict';
/* Grila notarială orientativă – Circumscripția Judecătoriei Curtea de Argeș, anul 2026 (tabelele nr. 1–5,
   pag. 20–24, întocmite de Societatea Experți Judiciari S.R.L. Pitești). Valorile sunt în lei/mp.
   Se folosește la taxa de timbru numai când valoarea impozabilă este contestată sau apreciată de instanță
   ca vădit derizorie [art. 31 alin. (3) O.U.G. nr. 80/2013]. Competența rămâne la valoarea impozabilă (art. 104 C.proc.civ.). */

const GRILA_TITLU = 'Grila notarială – Circumscripția Judecătoriei Curtea de Argeș, 2026';
const ZONE = ['A', 'B', 'C', 'D'];

// Tabelul nr. 1 – teren intravilan/extravilan, orașul Curtea de Argeș și localitățile arondate
const G_T1 = {
  oras: { l: 'Orașul Curtea de Argeș', cc: { A: 168, B: 110, C: 47, D: 33 }, at: { A: 108, B: 60, C: 27, D: 16 }, alte: 5, extravilan: 3, padure: 5 },
  centru: { l: 'Comună – sate de centru', cc: { A: 13 }, at: { A: 9 }, alte: 4.5 },
  sate: { l: 'Alte sate', cc: { A: 12 }, at: { A: 8 }, alte: 4.5 },
};
const G_T1_CAT = {
  cc: 'Curți-construcții (C.C)',
  at: 'Altă categorie de teren – arabil, livadă, pășuni, fânețe (A.T)',
  drum: 'Drum (1/2 din A.T)',
  alte: 'Alte categorii de teren intravilan, inclusiv luciu de apă',
  extravilan: 'Zona extravilan (numai orașul)',
  padure: 'Pădure (numai orașul)',
};
// Tabelul nr. 2 – teren extravilan al comunelor, după categoria de folosință (Legea nr. 18/1991)
const G_T2 = [
  ['arabil', 'Arabil', 3], ['vie', 'Vie', 3], ['livada', 'Livadă', 3], ['faneata', 'Fâneață', 3], ['pasune', 'Pășune', 3],
  ['alte', 'Alte terenuri', 2], ['hb', 'HB – luciu de apă', 3], ['pseculara', 'Pădure seculară', 4], ['ptanara', 'Pădure tânără', 3],
  ['obstepas', 'Teren obște, pășune alpină (Asociația Moșnenilor, zona de munte)', 1.5], ['obstepad', 'Teren obște, pădure (Asociația Moșnenilor, zona de munte)', 2],
];
// Tabelul nr. 3 – garsoniere și apartamente (lei/mp suprafață utilă): [oraș, alte localități]
const G_T3 = [
  ['subsol', 'Subsol/demisol', 3415, 2376],
  ['p1', 'Parter, confort 1', 4428, 2970], ['p2', 'Parter, confort 2', 1768, 2376], ['p3', 'Parter, confort 3', 3537, 1930],
  ['e1c1', 'Etaj I, confort 1', 4826, 2970], ['e1c2', 'Etaj I, confort 2', 3915, 2376], ['e1c3', 'Etaj I, confort 3', 3192, 2004],
  ['e2c1', 'Etaj II, confort 1', 4455, 2970], ['e2c2', 'Etaj II, confort 2', 4826, 2376], ['e2c3', 'Etaj II, confort 3', 3192, 1930],
  ['e3c1', 'Etaj III, confort 1', 4630, 1633], ['e3c2', 'Etaj III, confort 2', 3712, 1485], ['e3c3', 'Etaj III, confort 3', 3057, 891],
  ['e4c1', 'Etaj IV, confort 1', 3685, null], ['e4c2', 'Etaj IV, confort 2', 2943, null], ['e4c3', 'Etaj IV, confort 3', 1930, null],
  ['e5c1', 'Etaj V, confort 1', 2943, null], ['e5c2', 'Etaj V, confort 2', 2349, null], ['e5c3', 'Etaj V, confort 3', 2349, null],
  ['mans', 'Mansardă, confort 1', 2598, null], ['camin', 'Cameră în cămin de nefamiliști', 1485, null],
];
// Tabelul nr. 4 – case individuale, zona urbană Curtea de Argeș (lei/mp suprafață construită)
const G_T4 = { beton: { A: 2025, B: 1755, C: 1485, D: 1215 }, lemn: { A: 1215, B: 1147, C: 945, D: 877 } };
// Tabelul nr. 5 – case individuale, zona rurală
const G_T5 = { beton: 1755, lemn: 1080 };
const G_STRUCT = { beton: 'Beton, cărămidă, BCA / zidărie', lemn: 'Lemn, paiantă și alte materiale' };
const G_VECHIME = [['0', 'Până la 30 de ani', 0], ['30', 'Între 30 și 40 de ani (−20%)', 20], ['41', 'Între 41 și 50 de ani (−30%)', 30], ['50', 'Peste 50 de ani (−35%)', 35]];
const G_AJUST = [['', 'Fără'], ['lemn89', 'Locuință din lemn sau structură metalică și lemn, construită după 1989 (valoarea de la beton/cărămidă −15%)'], ['cabana', 'Cabană sau casă de vacanță construită după 1989 (valoarea de la beton/cărămidă −15%)']];

const G_TIPURI = {
  ti: 'Teren – orașul Curtea de Argeș și localitățile arondate (tabelul nr. 1)',
  te: 'Teren extravilan al comunelor (tabelul nr. 2)',
  ap: 'Garsonieră / apartament (tabelul nr. 3)',
  cu: 'Casă individuală – zona urbană Curtea de Argeș (tabelul nr. 4)',
  cr: 'Casă individuală – zona rurală (tabelul nr. 5)',
};

const GR = { tip: 'ti', v: { loc: 'oras', cat: 'cc', zona: 'A', t2: 'arabil', ap: 'e1c1', aploc: 'oras', struct: 'beton', vech: '0', ajust: '' }, lista: [] };

const gnum = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
const gr2 = n => Math.round(n * 100) / 100;

// Calculul unui element: { valoare, pasi[], eroare, descriere }
function grilaCalcul(tip, v) {
  const pasi = [];
  if (tip === 'ti') {
    const L = G_T1[v.loc] || G_T1.oras, mp = gnum(v.mp);
    let unit = null;
    const zona = v.loc === 'oras' ? v.zona : 'A';
    if (v.cat === 'cc' || v.cat === 'at') unit = L[v.cat][zona] ?? null;
    else if (v.cat === 'drum') unit = L.at[zona] != null ? L.at[zona] / 2 : null;
    else unit = L[v.cat] ?? null;
    if (unit == null) return { eroare: 'Grila nu are valoare pentru această combinație (localitate / categorie / zonă).' };
    pasi.push(`${L.l}, ${G_T1_CAT[v.cat]}${['cc', 'at', 'drum'].includes(v.cat) ? `, zona ${zona}` : ''}: ${lei(unit)}/mp${v.cat === 'drum' ? ' (jumătate din A.T)' : ''}`);
    if (!mp) return { eroare: 'Introduceți suprafața (mp).', pasi };
    pasi.push(`${mp} mp × ${lei(unit)} = ${lei(mp * unit)}`);
    return { valoare: gr2(mp * unit), pasi, descriere: `teren ${mp} mp, ${L.l}, ${G_T1_CAT[v.cat]}` };
  }
  if (tip === 'te') {
    const c = G_T2.find(x => x[0] === v.t2) || G_T2[0], mp = gnum(v.mp);
    pasi.push(`${c[1]}: ${lei(c[2])}/mp`);
    if (!mp) return { eroare: 'Introduceți suprafața (mp).', pasi };
    pasi.push(`${mp} mp × ${lei(c[2])} = ${lei(mp * c[2])}`);
    return { valoare: gr2(mp * c[2]), pasi, descriere: `teren extravilan ${mp} mp, ${c[1].toLowerCase()}` };
  }
  if (tip === 'ap') {
    const r = G_T3.find(x => x[0] === v.ap) || G_T3[0], mp = gnum(v.mp);
    let unit = v.aploc === 'alte' ? r[3] : r[2];
    if (unit == null) return { eroare: 'Grila nu are valoare pentru această poziție în „alte localități”.' };
    pasi.push(`${r[1]}, ${v.aploc === 'alte' ? 'alte localități' : 'orașul Curtea de Argeș'}: ${lei(unit)}/mp suprafață utilă`);
    if (v.nou) { unit *= 1.2; pasi.push(`Bloc construit începând cu anul 2000: +20% → ${lei(unit)}/mp`); }
    if (!mp) return { eroare: 'Introduceți suprafața utilă (mp).', pasi };
    pasi.push(`${mp} mp × ${lei(unit)} = ${lei(mp * unit)}`);
    return { valoare: gr2(mp * unit), pasi, descriere: `apartament ${mp} mp utili, ${r[1].toLowerCase()}` };
  }
  if (tip === 'cu' || tip === 'cr') {
    const ajust = v.ajust || '';
    const struct = ajust ? 'beton' : v.struct;
    let unit = tip === 'cu' ? G_T4[struct][v.zona] : G_T5[struct];
    pasi.push(`${tip === 'cu' ? `Zona urbană, zona ${v.zona}` : 'Zona rurală'}, ${G_STRUCT[struct]}: ${lei(unit)}/mp construit`);
    if (ajust) { unit *= 0.85; pasi.push(`${G_AJUST.find(x => x[0] === ajust)[1].replace(/ \(.*$/, '')}: −15% → ${lei(unit)}/mp`); }
    const vech = G_VECHIME.find(x => x[0] === v.vech) || G_VECHIME[0];
    if (vech[2]) { unit *= 1 - vech[2] / 100; pasi.push(`Vechime ${vech[1].toLowerCase().replace(/ \(.*$/, '')}: −${vech[2]}% → ${lei(unit)}/mp`); }
    let mp = gnum(v.mp);
    if (!mp && gnum(v.sol)) {
      const sol = gnum(v.sol), niv = Math.max(1, Math.round(gnum(v.niv) || 1));
      mp = sol * niv + (v.mans ? sol * 0.75 : 0);
      pasi.push(`Suprafața construită desfășurată: ${sol} mp × ${niv} niveluri${v.mans ? ` + mansardă/pod locuibil 75% × ${sol} mp` : ''} = ${gr2(mp)} mp`);
    }
    if (!mp) return { eroare: 'Introduceți suprafața construită desfășurată sau suprafața la sol și numărul de niveluri.', pasi };
    let val = mp * unit;
    pasi.push(`${gr2(mp)} mp × ${lei(unit)} = ${lei(val)}`);
    const sub = gnum(v.subsol);
    if (sub) { const s = sub * unit * 0.5; val += s; pasi.push(`Subsol (subsol tehnic, boxe, beci, garaj): ${sub} mp × 50% × ${lei(unit)} = ${lei(s)}`); }
    return { valoare: gr2(val), pasi, descriere: `casă ${gr2(mp)} mp construiți, ${tip === 'cu' ? `zona urbană ${v.zona}` : 'zona rurală'}` };
  }
  return { eroare: 'Tip necunoscut.' };
}

const gSel = (n, opts, val) => `<select data-grv="${n}">${opts.map(([k, l]) => `<option value="${k}" ${String(val) === String(k) ? 'selected' : ''}>${h(l)}</option>`).join('')}</select>`;
const gInp = (n, l, val, ph = '0') => `<label class="field" style="margin-top:8px"><span>${h(l)}</span><input type="text" inputmode="decimal" data-grv="${n}" value="${h(val ?? '')}" placeholder="${ph}"></label>`;
const gChk = (n, l, val) => `<label class="check" style="margin-top:8px;display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-grv="${n}" ${val ? 'checked' : ''}><span>${h(l)}</span></label>`;
const gFld = (l, inner) => `<label class="field" style="margin-top:8px"><span>${h(l)}</span>${inner}</label>`;

function grilaCampuri() {
  const v = GR.v;
  if (GR.tip === 'ti') {
    const cats = Object.entries(G_T1_CAT).filter(([k]) => v.loc === 'oras' || !['extravilan', 'padure'].includes(k));
    return gFld('Localitatea', gSel('loc', Object.entries(G_T1).map(([k, x]) => [k, x.l]), v.loc))
      + gFld('Categoria de teren', gSel('cat', cats, v.cat))
      + (v.loc === 'oras' && ['cc', 'at', 'drum'].includes(v.cat) ? gFld('Zona', gSel('zona', ZONE.map(z => [z, 'Zona ' + z]), v.zona)) : '')
      + gInp('mp', 'Suprafața (mp)', v.mp);
  }
  if (GR.tip === 'te') return gFld('Categoria de folosință', gSel('t2', G_T2.map(x => [x[0], `${x[1]} – ${String(x[2]).replace('.', ',')} lei/mp`]), v.t2)) + gInp('mp', 'Suprafața (mp)', v.mp);
  if (GR.tip === 'ap') return gFld('Localitatea', gSel('aploc', [['oras', 'Orașul Curtea de Argeș (toate blocurile – zona A)'], ['alte', 'Alte localități arondate']], v.aploc))
    + gFld('Etajul și confortul', gSel('ap', G_T3.map(x => [x[0], x[1]]), v.ap))
    + gInp('mp', 'Suprafața utilă (mp)', v.mp) + gChk('nou', 'Bloc construit începând cu anul 2000 (+20%)', v.nou);
  const zona = GR.tip === 'cu' ? gFld('Zona', gSel('zona', ZONE.map(z => [z, 'Zona ' + z]), v.zona)) : '';
  return zona + gFld('Structura', gSel('struct', Object.entries(G_STRUCT), v.struct))
    + gFld('Vechimea', gSel('vech', G_VECHIME.map(x => [x[0], x[1]]), v.vech))
    + gFld('Situații speciale', gSel('ajust', G_AJUST, v.ajust))
    + gInp('mp', 'Suprafața construită desfășurată din documentația cadastrală (mp)', v.mp)
    + `<p class="muted small" style="margin:6px 0 0">Dacă nu există documentație cadastrală avizată: suprafața la sol × numărul de niveluri (+ 75% pentru mansardă/pod locuibil).</p>`
    + gInp('sol', 'Suprafața construită la sol (mp) – opțional', v.sol) + gInp('niv', 'Numărul de niveluri – opțional', v.niv, '1')
    + gChk('mans', 'Are mansardă sau pod locuibil', v.mans)
    + gInp('subsol', 'Subsol tehnic, boxe, beci, garaje (mp) – 50% din valoarea de la parter', v.subsol);
}

function grilaHtml() {
  const rez = grilaCalcul(GR.tip, GR.v);
  const total = GR.lista.reduce((s, x) => s + x.valoare, 0);
  return `<details class="card grila" ${GR.deschis ? 'open' : ''} id="grila">
    <summary><h2 style="display:inline">Grila notarială – Curtea de Argeș 2026</h2></summary>
    <div style="margin-top:10px">${avertismentJurist('Valorile după grilă')}</div>
    <p class="muted small" style="margin:8px 0">Se folosește pentru taxă numai dacă valoarea impozabilă a imobilului este contestată sau apreciată de instanță ca vădit derizorie [art. 31 alin. (3) O.U.G. nr. 80/2013]. Competența rămâne raportată la valoarea impozabilă (art. 104 C.proc.civ.). Grila acoperă numai circumscripția Judecătoriei Curtea de Argeș; zonele A–D se stabilesc după nomenclatorul de străzi al grilei.</p>
    ${gFld('Ce evaluați', gSel('tip', Object.entries(G_TIPURI), GR.tip))}
    ${grilaCampuri()}
    <div class="calc-result" style="text-transform:none;margin-top:10px">${rez.eroare ? '—' : lei(rez.valoare)}</div>
    <ol class="steps">${(rez.pasi || []).map(p => `<li>${h(p)}</li>`).join('')}${rez.eroare ? `<li>${h(rez.eroare)}</li>` : ''}</ol>
    ${GR.tip === 'cu' || GR.tip === 'cr' ? '<div class="callout warn small" style="margin-top:8px"><span class="pill u2">de verificat</span> Grila nu precizează cum se cumulează reducerea pentru vechime cu reducerea de 15%; aplicația le aplică succesiv. Pentru construcții nefinalizate grila cere raport de evaluare ANEVAR, iar pentru demisolul cu altă destinație – tariful destinației respective.</div>' : ''}
    ${GR.tip === 'ap' ? '<div class="callout warn small" style="margin-top:8px"><span class="pill u2">de verificat</span> Valorile sunt preluate exact din grilă. Câteva par neobișnuite (parter confort 2 – 1.768 lei; etaj II confort 2 – 4.826 lei, mai mult decât confortul 1). Mențiunea „se vor multiplica cu procentul de 20%” pentru blocurile din 2000 a fost aplicată ca majorare cu 20%.</div>' : ''}
    <div class="actions"><button class="btn" data-act="grilaAdauga">＋ Adaugă la evaluare</button></div>
    ${GR.lista.length ? `<ul class="list" style="margin-top:10px">${GR.lista.map((x, i) => `<li><span class="grow">${h(x.descriere)}</span><b class="nowrap">${lei(x.valoare)}</b><button class="icon-btn" data-act="grilaScoate" data-i="${i}" aria-label="Scoate">✕</button></li>`).join('')}</ul>
      <p style="margin:10px 0"><b>Valoare totală după grilă: ${lei(total)}</b></p>
      <div class="actions"><button class="btn primary" data-act="grilaFoloseste">Folosește valoarea pentru taxa de timbru</button></div>` : ''}
  </details>`;
}

function grilaAdauga() {
  const rez = grilaCalcul(GR.tip, GR.v);
  if (rez.eroare) return toast(rez.eroare);
  GR.lista.push({ descriere: rez.descriere, valoare: rez.valoare });
  GR.deschis = true;
  rerender();
}

function grilaFoloseste() {
  const total = gr2(GR.lista.reduce((s, x) => s + x.valoare, 0));
  if (!total) return;
  const t = TAXE.find(x => x.id === TX.sel);
  if (!t || !t.rule.imob) return toast('Alegeți întâi un obiect privind un imobil (ex. revendicare, partaj, uzucapiune).');
  Object.assign(TX.vals, { imob: '1', contest: '1', vgrila: String(total).replace('.', ',') });
  toast('Valoarea după grilă a fost preluată pentru calculul taxei.');
  rerender();
}

function grilaSet(n, val) {
  GR.deschis = true;
  if (n === 'tip') { GR.tip = val; return; }
  GR.v[n] = val;
  if (n === 'loc' && val !== 'oras' && ['extravilan', 'padure'].includes(GR.v.cat)) GR.v.cat = 'cc';
}

'use strict';
/* Calculul cauțiunii în procesul civil – verificat cu textele consolidate transmise (Codul de procedură civilă, consolidat
   la 14.12.2025; Legea nr. 193/2000, art. 13 alin. (9), introdus prin art. I pct. 4 din O.U.G. nr. 58/2022).
   Art. 719 alin. (2): cauțiunea se calculează la valoarea obiectului contestației, progresiv pe tranșe: a) 10% până la
   10.000 lei; b) 1.000 lei + 5% pentru ce depășește 10.000 lei; c) 5.500 lei + 1% pentru ce depășește 100.000 lei;
   d) 14.500 lei + 0,1% pentru ce depășește 1.000.000 lei. Alin. (3): obiect neevaluabil – 1.000 lei, dacă legea nu
   dispune altfel. Art. 484 alin. (2) trimite la cauțiunea de la art. 719; art. 507 și 512 trimit la art. 484; art. 450
   alin. (4) trimite la art. 719 alin. (2)–(3). Art. 953: alin. (1) facultativă, alin. (2) jumătate din valoarea
   reclamată, alin. (3) obligatorie; la alin. (1) și (3) cuantumul îl fixează instanța, în limita generală de 20% din
   art. 1.057 alin. (2). „v” = de verificat. */

function cautBarem(v) {
  if (v <= 10000) return { suma: v * 0.1, lit: 'a)', pas: `10% din ${lei(v)}` };
  if (v <= 100000) return { suma: 1000 + (v - 10000) * 0.05, lit: 'b)', pas: `1.000 lei + 5% din ce depășește 10.000 lei (${lei(v - 10000)})` };
  if (v <= 1000000) return { suma: 5500 + (v - 100000) * 0.01, lit: 'c)', pas: `5.500 lei + 1% din ce depășește 100.000 lei (${lei(v - 100000)})` };
  return { suma: 14500 + (v - 1000000) * 0.001, lit: 'd)', pas: `14.500 lei + 0,1% din ce depășește 1.000.000 lei (${lei(v - 1000000)})` };
}

const N_POATE = 'Plata cauțiunii nu produce singură suspendarea: instanța „poate” dispune măsura, motivat. Plafonul general de 20% din art. 1.057 alin. (2) nu înlocuiește baremul special al art. 719.';
const N_RECURS = 'Reperul valoric: obiectul și întinderea executării a cărei suspendare se cere, astfel cum rezultă din hotărârea atacată și din cererea de suspendare – nu automat valoarea inițială a întregului litigiu (raționament de aplicare a trimiterii la art. 719, nu formulare textuală a art. 484).';

const CAUT_TIPURI = {
  s719: {
    l: 'Suspendarea executării silite (contestație la executare)', temei: 'art. 719 alin. (2)–(3) C.proc.civ.', barem: true, consumator: true,
    eticheta: 'Valoarea obiectului contestației (lei)',
    n: 'Suspendarea provizorie, până la soluționarea cererii de suspendare, se poate dispune în cazuri urgente numai dacă s-a plătit cauțiunea; suma rămâne indisponibilizată și se deduce din cauțiunea stabilită la soluționarea cererii de suspendare. ' + N_POATE,
  },
  r484: {
    l: 'Suspendarea executării hotărârii atacate cu recurs', temei: 'art. 484 alin. (2) C.proc.civ. (cauțiunea prevăzută la art. 719)', barem: true,
    eticheta: 'Valoarea executării a cărei suspendare se cere (lei)',
    n: 'Cererea, formulată în condițiile art. 83 alin. (2)–(3), se depune direct la instanța de recurs, cu o copie certificată de pe cererea de recurs și dovada depunerii cauțiunii prevăzute la art. 719; dacă dosarul nu a ajuns încă la instanța de recurs, se alătură și o copie legalizată de pe dispozitivul hotărârii atacate. ' + N_RECURS + ' ' + N_POATE,
  },
  ca507: {
    l: 'Suspendarea executării în contestația în anulare', temei: 'art. 507 → art. 484 → art. 719 C.proc.civ.', barem: true,
    eticheta: 'Valoarea executării a cărei suspendare se cere (lei)',
    n: 'Art. 507: instanța poate suspenda executarea hotărârii a cărei anulare se cere, sub condiția dării unei cauțiuni; art. 484 se aplică în mod corespunzător. ' + N_RECURS + ' ' + N_POATE,
  },
  rev512: {
    l: 'Suspendarea executării în revizuire', temei: 'art. 512 → art. 484 → art. 719 C.proc.civ.', barem: true,
    eticheta: 'Valoarea executării a cărei suspendare se cere (lei)',
    n: 'Art. 512: instanța poate suspenda executarea hotărârii a cărei revizuire se cere, sub condiția dării unei cauțiuni; art. 484 se aplică în mod corespunzător. ' + N_RECURS + ' ' + N_POATE,
  },
  ep450: {
    l: 'Suspendarea executării provizorii a hotărârii atacate cu apel', temei: 'art. 450 alin. (4) C.proc.civ., în condițiile art. 719 alin. (2)–(3)', barem: true,
    eticheta: 'Valoarea pentru care se cere suspendarea (lei)',
    n: 'Cererea se judecă de instanța de apel; art. 719 alin. (6) se aplică în mod corespunzător [art. 450 alin. (3)]. Până la soluționarea ei, suspendarea poate fi încuviințată provizoriu, prin ordonanță președințială, chiar înainte de sosirea dosarului, tot cu plata cauțiunii [art. 450 alin. (5)]. ' + N_POATE,
  },
  sech2: {
    l: 'Sechestru asigurător sau poprire asigurătorie – creanță neconstatată în scris', temei: 'art. 953 alin. (2) C.proc.civ.', jumatate: true,
    eticheta: 'Valoarea reclamată (lei)',
    n: 'Cauțiunea este obligatorie și se depune odată cu cererea de sechestru, alături de dovada introducerii acțiunii. Legea prevede aici expres jumătate din valoarea reclamată, astfel că plafonul general de 20% (art. 1.057 alin. (2)) nu o reduce. Poprirea asigurătorie urmează aceleași reguli.',
  },
  sech1: {
    l: 'Sechestru asigurător sau poprire asigurătorie – creanță scrisă și exigibilă', temei: 'art. 953 alin. (1), art. 1.057 alin. (2) C.proc.civ.', fixataInstanta: true, facultativa: true,
    eticheta: 'Valoarea obiectului cererii (lei)',
    n: 'Instanța „poate” obliga creditorul la cauțiune: măsura este facultativă, iar cuantumul îl fixează instanța, cel mult 20% din valoarea obiectului cererii (art. 1.057 alin. (2)).',
  },
  sech3: {
    l: 'Sechestru asigurător sau poprire asigurătorie – creanță neexigibilă (debitorul a micșorat asigurările, pericol de sustragere etc.)', temei: 'art. 953 alin. (3), art. 1.057 alin. (2) C.proc.civ.', fixataInstanta: true,
    eticheta: 'Valoarea obiectului cererii (lei)',
    n: 'Cauțiunea este obligatorie; cuantumul îl fixează instanța, cel mult 20% din valoarea obiectului cererii (art. 1.057 alin. (2)). Creditorul trebuie să dovedească și celelalte condiții de la alin. (1).',
  },
};

const CA = { tip: 's719', v: { evaluabil: '1' } };
const cnum = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);

function cautCalcul() {
  const t = CAUT_TIPURI[CA.tip], v = CA.v, pasi = [], verif = t.v ? [t.v] : [];
  const val = cnum(v.valoare);
  if (t.consumator && v.consumator) {
    const sal = apjSalariu(v.data || azi(), v.salManual);
    const venit = cnum(v.venit);
    pasi.push(`Consumator: venit lunar ${lei(venit)}; plafon = 2 × salariul minim (${lei(sal.valoare)}) = ${lei(2 * sal.valoare)}`);
    pasi.push('Art. 13 alin. (9) din Legea nr. 193/2000: calitatea de consumator nu este suficientă – trebuie dovedite veniturile lunare proprii (nu venitul pe membru de familie din O.U.G. nr. 51/2008).');
    verif.push('Aplicarea scutirii trebuie ancorată în materia protecției împotriva clauzelor abuzive (Legea nr. 193/2000), nu extinsă automat la orice litigiu al unui consumator; practica este neunitară (ex. Curtea de Apel Iași, minuta din iulie 2024). Exceptarea de la cauțiune nu înseamnă admiterea suspendării.');
    if (!venit) return { lipsa: true, pasi: [...pasi, 'Introduceți venitul lunar al consumatorului.'], verif };
    if (venit <= 2 * sal.valoare) return { suma: 0, scutit: true, temei: 'art. 13 alin. (9) din Legea nr. 193/2000 (introdus prin art. I pct. 4 din O.U.G. nr. 58/2022), prin derogare de la art. 719 alin. (2)–(3) C.proc.civ.', pasi: [...pasi, 'Veniturile lunare nu depășesc două salarii minime: consumatorul este scutit de cauțiune.'], verif };
    pasi.push('Veniturile depășesc două salarii minime: se datorează cauțiunea.');
  }
  if (t.barem && v.evaluabil !== '1') return { suma: 1000, temei: t.temei.replace(/alin\. \(2\)–\(3\)/, 'alin. (3)'), pasi: [...pasi, 'Obiect neevaluabil în bani: 1.000 lei [art. 719 alin. (3)], dacă legea nu prevede altfel.'], verif };
  if (!val) return { lipsa: true, pasi: [...pasi, 'Introduceți valoarea.'], verif };
  if (t.barem) {
    const b = cautBarem(val);
    pasi.push(`Barem art. 719 alin. (2) lit. ${b.lit}: ${b.pas} = ${lei(b.suma)}`);
    return { suma: Math.round(b.suma * 100) / 100, temei: `${t.temei}; art. 719 alin. (2) lit. ${b.lit}`, pasi, verif };
  }
  if (t.jumatate) {
    pasi.push(`Jumătate din valoarea reclamată: ${lei(val)} / 2 = ${lei(val / 2)}`);
    return { suma: Math.round(val * 50) / 100, temei: t.temei, pasi, verif };
  }
  pasi.push(t.facultativa ? 'Cauțiunea este facultativă; dacă instanța o impune, îi fixează cuantumul.' : 'Cauțiunea este obligatorie; cuantumul îl fixează instanța.');
  pasi.push(`Plafon: cel mult 20% din ${lei(val)} = ${lei(val * 0.2)} (art. 1.057 alin. (2)).`);
  return { fixata: true, plafon: Math.round(val * 20) / 100, temei: t.temei, pasi, verif };
}

function cautText(r) {
  const t = CAUT_TIPURI[CA.tip];
  if (r.lipsa) return '';
  if (r.scutit) return `Cererea privind ${t.l.toLowerCase()} nu este condiționată de plata unei cauțiuni, întrucât petentul, consumator, a dovedit că veniturile sale lunare nu depășesc valoarea cumulată a două salarii minime pe economie (${r.temei}).`;
  if (r.fixata) return `Pentru ${t.l.toLowerCase()}, cuantumul cauțiunii se fixează de instanță, în limita a 20% din valoarea obiectului cererii, adică cel mult ${lei(r.plafon)} (${r.temei}).`;
  return `Cauțiunea datorată pentru ${t.l.toLowerCase()} este de ${lei(r.suma)}, calculată potrivit ${r.temei}.`;
}

function viewCautiune() {
  const t = CAUT_TIPURI[CA.tip], r = cautCalcul(), v = CA.v;
  const text = cautText(r);
  return `
  ${avertismentJurist('Cauțiunea și explicațiile')}
  <div class="callout" style="margin-bottom:14px"><p>Calcul după <b>art. 719 alin. (2)–(3) C.proc.civ.</b> (aplicabil prin trimitere și la art. 450, 484, 507, 512), după <b>art. 953</b> și <b>art. 1.057 alin. (2)</b> pentru măsurile asigurătorii și după <b>art. 13 alin. (9) din Legea nr. 193/2000</b> pentru consumatori – texte consolidate verificate (Codul, consolidat la 14.12.2025).</p></div>
  <div class="grid-2">
    <div class="card">
      <h2>Pentru ce se cere cauțiunea</h2>
      <label class="field" style="margin-top:10px"><select data-cav="tip">${Object.entries(CAUT_TIPURI).map(([k, x]) => `<option value="${k}" ${k === CA.tip ? 'selected' : ''}>${h(x.l)}</option>`).join('')}</select></label>
      ${t.barem ? `<label class="field" style="margin-top:10px"><span>Obiectul</span><select data-cav="evaluabil"><option value="1" ${v.evaluabil === '1' ? 'selected' : ''}>Evaluabil în bani</option><option value="0" ${v.evaluabil !== '1' ? 'selected' : ''}>Neevaluabil în bani (1.000 lei)</option></select></label>` : ''}
      ${!t.barem || v.evaluabil === '1' ? `<label class="field" style="margin-top:10px"><span>${h(t.eticheta)}</span><input type="text" inputmode="decimal" data-cav="valoare" value="${h(v.valoare ?? '')}" placeholder="0"></label>` : ''}
      ${t.consumator ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" data-cav="consumator" ${v.consumator ? 'checked' : ''}><span>Contestatorul este consumator (art. 13 alin. (9) din Legea nr. 193/2000)</span></label>
        ${v.consumator ? `<label class="field" style="margin-top:8px"><span>Veniturile lunare ale consumatorului (lei)</span><input type="text" inputmode="decimal" data-cav="venit" value="${h(v.venit ?? '')}" placeholder="0"></label>
        <label class="field" style="margin-top:8px"><span>Data cererii (pentru salariul minim)</span><input type="date" data-cav="data" value="${h(v.data || azi())}"></label>
        <label class="field" style="margin-top:8px"><span>Salariul minim, dacă diferă (implicit ${lei(apjSalariu(v.data || azi()).valoare)})</span><input type="text" inputmode="decimal" data-cav="salManual" value="${h(v.salManual ?? '')}" placeholder="0"></label>` : ''}` : ''}
    </div>
    <div class="card">
      <span class="muted small">${h(t.temei)}</span>
      <h2 style="margin:4px 0 10px">${h(t.l)}</h2>
      <div class="calc-result" style="text-transform:none">${r.lipsa ? '—' : r.scutit ? 'Scutit de cauțiune' : r.fixata ? `Fixată de instanță – cel mult ${lei(r.plafon)}` : lei(r.suma)}</div>
      <ol class="steps">${r.pasi.map(p => `<li>${h(p)}</li>`).join('')}</ol>
      ${t.n ? `<div class="callout small" style="margin-top:8px">${h(t.n)}</div>` : ''}
      ${r.verif.map(x => `<div class="callout warn small" style="margin-top:8px"><span class="pill u2">de verificat</span> ${h(x)}</div>`).join('')}
      ${text ? `<textarea readonly rows="4" style="width:100%;margin-top:10px;font:inherit;font-size:.9rem;padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink)">${h(text)}</textarea>
      <div class="actions"><button class="btn" data-act="cautCopiaza">Copiază textul</button></div>` : ''}
    </div>
  </div>`;
}

function cautSet(n, val) {
  if (n === 'tip') { CA.tip = val; CA.v = { evaluabil: '1' }; return; }
  CA.v[n] = val;
}

'use strict';
/* Verificarea condițiilor pentru ajutorul public judiciar în materie civilă (O.U.G. nr. 51/2008) și, pentru persoanele
   juridice, a facilităților la plata taxei de timbru (art. 42–44 O.U.G. nr. 80/2013).
   Pragurile art. 8 alin. (1)–(2), în forma dată de Legea nr. 31/2023 (în vigoare din 15.01.2023): venitul mediu net lunar
   pe membru de familie, în ultimele două luni anterioare cererii, sub 25% din salariul de bază minim brut pe țară –
   avans integral; sub 50% – avans în proporție de 50%. Art. 5, 6, 8 alin. (3) și 9 sunt verificate cu forma consolidată
   de pe Portalul Legislativ (ultima consolidare: 3.11.2024; art. 8 alin. (3) în forma dată de Legea nr. 268/2024).
   Explicațiile practice provin din planul de seminar INM „Taxele judiciare de timbru și asistența judiciară”. */

const azi = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Salariul de bază minim brut pe țară (verificat pentru perioadele de mai jos; pentru date anterioare se introduce manual)
const SALARII_MINIME = [
  ['2026-07-01', 4325, 'H.G. nr. 146/2026, de la 1.07.2026'],
  ['2025-01-01', 4050, 'în vigoare între 1.01.2025 și 30.06.2026'],
];
function apjSalariu(data, manual) {
  const s = SALARII_MINIME.find(x => data >= x[0]);
  if (anum(manual)) return { valoare: anum(manual), sursa: 'valoare introdusă manual' };
  if (s) return { valoare: s[1], sursa: s[2] };
  return { valoare: 4050, sursa: 'pentru cereri anterioare datei de 1.01.2025 introduceți manual salariul minim de la acea dată', lipsa: true };
}

// Familia (art. 5): alin. (1) – soțul/soția și descendenții în linie dreaptă ai solicitantului; alin. (2) – persoana cu
// domiciliul ori reședința comună care gospodărește împreună cu solicitantul și descendenții acesteia
const APJ_REL = [
  ['solicitant', 'Solicitantul'],
  ['sot', 'Soț / soție (art. 5 alin. (1))'],
  ['copil', 'Copil sau alt descendent în linie dreaptă al solicitantului (art. 5 alin. (1))'],
  ['alta', 'Persoană cu domiciliul ori reședința comună, care gospodărește împreună cu solicitantul (art. 5 alin. (2))'],
  ['copil_alta', 'Copil sau alt descendent în linie dreaptă al acestei persoane (art. 5 alin. (2))'],
];
const APJ_FORME = [
  ['a', 'a) asistență prin avocat – plata onorariului pentru reprezentare, asistență juridică și, după caz, apărare, printr-un avocat numit sau ales'],
  ['b', 'b) plata expertului, traducătorului sau interpretului folosit în cursul procesului, cu încuviințarea instanței'],
  ['c', 'c) plata onorariului executorului judecătoresc'],
  ['d', 'd) scutiri, reduceri, eșalonări sau amânări de la plata taxelor judiciare, inclusiv în faza de executare silită'],
];
// Sumele datorate periodic pentru necesități de bază (art. 9: „chiriile și obligațiile de întreținere”)
const APJ_PERIODICE = [
  ['ch_intr', 'Obligații de întreținere plătite periodic (ex. pensie pentru un copil din altă relație)'],
  ['ch_chirie', 'Chiria locuinței'],
];
// Alte cheltuieli dovedite, pentru evaluarea de la art. 8 alin. (3)
const APJ_CHELT = [
  ['ch_med', 'Cheltuieli medicale lunare (tratamente, medicamente)'],
  ['ch_copii', 'Cheltuieli cu creșterea și educarea copiilor minori'],
  ['ch_rata', 'Rata la creditul pentru locuință'],
  ['ch_util', 'Utilități și întreținere (apă, gaz, energie, încălzire)'],
  ['ch_alte', 'Alte cheltuieli lunare dovedite'],
];
const APJ_COST = [
  ['co_taxa', 'Taxa judiciară de timbru'],
  ['co_avocat', 'Onorariul avocatului'],
  ['co_expert', 'Onorariul expertului / traducătorului / interpretului'],
  ['co_exec', 'Onorariul executorului judecătoresc'],
  ['co_alte', 'Alte costuri estimate ale procesului'],
];

const AP = {
  v: { tip: 'fizica', data: azi(), f_d: '1' },
  membri: [{ rel: 'solicitant', varsta: '', impreuna: '1', intretinere: '1', studii: '', v1: '', v2: '', sursa: '' }],
};

// Dacă un membru intră în familie potrivit art. 5: { da, motiv }
function apjInclus(m) {
  if (m.rel === 'solicitant') return { da: true };
  if (m.rel === 'sot') return { da: true, motiv: 'soț/soție – art. 5 alin. (1)' };
  if (m.rel === 'alta') return m.impreuna ? { da: true, motiv: 'domiciliu ori reședință comună și gospodărire împreună – art. 5 alin. (2)' } : { da: false, motiv: 'nu are domiciliul ori reședința comună sau nu gospodărește împreună cu solicitantul' };
  const alin = m.rel === 'copil' ? 'art. 5 alin. (1)' : 'art. 5 alin. (2)';
  if (m.varsta === '' || m.varsta == null) return { da: false, motiv: 'introduceți vârsta' };
  const ani = anum(m.varsta);
  if (!m.intretinere) return { da: false, motiv: 'nu se află în întreținerea solicitantului' };
  if (ani < 18) return { da: true, motiv: `descendent de până la 18 ani în întreținerea solicitantului – ${alin}` };
  if (ani > 26) return { da: false, motiv: 'are peste 26 de ani' };
  if (!m.studii) return { da: false, motiv: 'între 18 și 26 de ani, dar nu se află în continuarea studiilor' };
  return { da: true, motiv: `descendent între 18 și 26 de ani, în continuarea studiilor și în întreținerea solicitantului – ${alin}` };
}
const apjIncadrare = (pe, p1, p2) => (pe < p1 ? 'integral' : pe < p2 ? 'jumatate' : 'alin3');
const anum = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
const r2 = n => Math.round(n * 100) / 100;

function apjCalcul() {
  const v = AP.v, sal = apjSalariu(v.data || azi(), v.salManual);
  const prag1 = r2(sal.valoare * 0.25), prag2 = r2(sal.valoare * 0.5);
  const membri = AP.membri.filter(m => apjInclus(m).da);
  const n = membri.length;
  const total1 = membri.reduce((s, m) => s + anum(m.v1), 0), total2 = membri.reduce((s, m) => s + anum(m.v2), 0);
  const mediu = r2((total1 + total2) / 2), pe = n ? r2(mediu / n) : 0;
  const periodice = APJ_PERIODICE.reduce((s, [k]) => s + anum(v[k]), 0);
  const chelt = periodice + APJ_CHELT.reduce((s, [k]) => s + anum(v[k]), 0);
  const costuri = APJ_COST.reduce((s, [k]) => s + anum(v[k]), 0);
  const costAC = anum(v.co_avocat) + anum(v.co_expert) + anum(v.co_exec);
  const plafon = 10 * sal.valoare, primit = anum(v.primit);
  const verif = [];
  const pasi = [
    `Membri de familie luați în calcul: ${n} (art. 5)`,
    `Venit net total al familiei: luna 1 – ${lei(total1)}, luna 2 – ${lei(total2)}; media lunară = ${lei(mediu)}`,
    `Venit mediu net lunar pe membru de familie: ${lei(mediu)} / ${n} = ${lei(pe)}`,
    `Salariul de bază minim brut pe țară: ${lei(sal.valoare)} (${sal.sursa}); 25% = ${lei(prag1)}; 50% = ${lei(prag2)}`,
  ];
  if (sal.lipsa) verif.push('Data cererii este anterioară perioadelor verificate: introduceți salariul minim brut de la data cererii.');
  AP.membri.forEach((m, i) => { const r = apjInclus(m); if (i && !r.da) pasi.push(`Membrul ${i + 1} nu a fost luat în calcul: ${r.motiv}.`); });
  if (AP.membri.some(m => m.varsta !== '' && anum(m.varsta) === 18 && ['copil', 'copil_alta'].includes(m.rel))) verif.push('Vârsta de exact 18 ani: textul art. 5 folosește „până la 18 ani” și „peste 18 ani” – verificați încadrarea (aplicația cere, pentru 18 ani, continuarea studiilor).');
  if (AP.membri.some(m => m.rel === 'copil_alta' && apjInclus(m).da) && !AP.membri.some(m => m.rel === 'alta' && apjInclus(m).da)) verif.push('Descendenții persoanei de la art. 5 alin. (2) se iau în calcul alături de acea persoană – adăugați-o și pe ea.');
  let incadrare = 'lipsa';
  if (n && (total1 || total2 || AP.membri.some(m => m.v1 !== '' || m.v2 !== ''))) incadrare = apjIncadrare(pe, prag1, prag2);
  // Varianta în care obligațiile periodice dovedite (art. 9: chirii, obligații de întreținere) diminuează resursele
  const mediuNet = r2(Math.max(0, mediu - periodice)), peNet = n ? r2(mediuNet / n) : 0;
  const incadrareNet = periodice && incadrare !== 'lipsa' ? apjIncadrare(peNet, prag1, prag2) : incadrare;
  return { sal, prag1, prag2, n, total1, total2, mediu, pe, periodice, mediuNet, peNet, incadrareNet, chelt, costuri, costAC, plafon, primit, incadrare, pasi, verif };
}

const APJ_VERDICT = {
  integral: ['ok', 'Îndeplinește condiția de venit – ajutorul se avansează integral de stat', 'art. 8 alin. (1) O.U.G. nr. 51/2008'],
  jumatate: ['u3', 'Îndeplinește condiția de venit – ajutorul se avansează de stat în proporție de 50%', 'art. 8 alin. (2) O.U.G. nr. 51/2008'],
  alin3: ['u2', 'Venitul depășește pragurile art. 8 alin. (1)–(2)', 'art. 8 alin. (3) O.U.G. nr. 51/2008 – evaluare concretă de către instanță'],
};
const APJ_ORDINE = { integral: 3, jumatate: 2, alin3: 1, lipsa: 0 };
const APJ_ALIN3 = 'Art. 8 alin. (3) (forma dată de Legea nr. 268/2024, de la 3.11.2024): ajutorul se acordă și în alte situații, proporțional cu nevoile solicitantului, dacă costurile certe sau estimate ale procesului sunt de natură să îi limiteze accesul efectiv la justiție, prin raportare la veniturile realizate și cheltuielile dovedite. Alineatul nu adaugă forme de ajutor față de art. 6 – deci nu este, singur, temei pentru scutirea de cauțiune (care nu este taxă judiciară).';

function apjJuridica() {
  const v = AP.v, taxa = anum(v.co_taxa), venit = anum(v.pj_venit);
  const pasi = [], temei = [];
  if (taxa && venit) {
    const p = r2(taxa / venit * 100);
    pasi.push(`Taxa (${lei(taxa)}) reprezintă ${String(p).replace('.', ',')}% din media venitului net pe ultimele 3 luni (${lei(venit)})`);
    if (taxa > venit * 0.1) temei.push('art. 42 alin. (2) lit. a) – taxa depășește 10% din media venitului net pe ultimele 3 luni de activitate');
  }
  if (v.pj_lichidare) temei.push('art. 42 alin. (2) lit. b) – persoana juridică este în lichidare sau dizolvare ori are bunurile indisponibilizate');
  if (!temei.length) pasi.push('Nu este îndeplinit niciunul dintre cazurile art. 42 alin. (2). Excepțional, instanța poate acorda facilități dacă plata taxei ar afecta semnificativ activitatea curentă (art. 42 alin. (3)).');
  return { pasi, temei };
}

function apjText(r) {
  if (AP.v.tip !== 'fizica' || !APJ_VERDICT[r.incadrare]) return '';
  const taxa = anum(AP.v.co_taxa);
  const linii = [`Venitul mediu net lunar pe membru de familie al petentului, în ultimele două luni anterioare cererii, este de ${lei(r.pe)} (${r.n} membri de familie), raportat la pragurile de ${lei(r.prag1)} [25%] și ${lei(r.prag2)} [50%] din salariul de bază minim brut pe țară de ${lei(r.sal.valoare)}, prevăzute de art. 8 alin. (1) și (2) din O.U.G. nr. 51/2008.`];
  if (r.incadrare === 'integral' && taxa) linii.push(`Propunere de dispozitiv: „Admite cererea de ajutor public judiciar. Scutește petentul de obligația de plată a taxei judiciare de timbru în cuantum de ${lei(taxa)}.”`);
  if (r.incadrare === 'jumatate' && taxa) linii.push(`Propunere de dispozitiv: „Admite în parte cererea de ajutor public judiciar. Reduce cuantumul taxei judiciare de timbru stabilite în sarcina petentului de la suma de ${lei(taxa)} la suma de ${lei(taxa / 2)}.” – verificați dacă instanța aplică proporția de 50% prin reducere, eșalonare sau amânare.`);
  if (r.incadrare === 'alin3') linii.push('Petentul nu se încadrează în pragurile art. 8 alin. (1)–(2); ajutorul poate fi acordat, proporțional cu nevoile sale, în condițiile art. 8 alin. (3), dacă se reține că costurile certe sau estimate ale procesului îi limitează accesul efectiv la justiție, prin raportare la veniturile realizate și cheltuielile dovedite.');
  if (APJ_ORDINE[r.incadrareNet] > APJ_ORDINE[r.incadrare]) linii.push(`Ținând seama de obligațiile periodice dovedite (chirie, obligații de întreținere – art. 9), resursele pe membru de familie ar fi de ${lei(r.peNet)}, sub pragul de ${lei(r.incadrareNet === 'integral' ? r.prag1 : r.prag2)}.`);
  return linii.join('\n');
}

const apjIn = (k, l, attr = 'apv') => `<label class="field" style="margin-top:8px"><span>${h(l)}</span><input type="text" inputmode="decimal" data-${attr}="${k}" value="${h(AP.v[k] ?? '')}" placeholder="0"></label>`;
const apjChk = (k, l) => `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:8px"><input type="checkbox" data-apv="${k}" ${AP.v[k] ? 'checked' : ''}><span>${h(l)}</span></label>`;

function apjMembriHtml() {
  return AP.membri.map((m, i) => `<div class="apj-membru">
    <div class="apj-rand">
      <label class="field"><span>Membru ${i + 1}</span><select data-apm="${i}.rel" ${i === 0 ? 'disabled' : ''}>${APJ_REL.filter(([k]) => i === 0 ? k === 'solicitant' : k !== 'solicitant').map(([k, l]) => `<option value="${k}" ${m.rel === k ? 'selected' : ''}>${h(l)}</option>`).join('')}</select></label>
      <label class="field apj-mic"><span>Vârsta</span><input type="text" inputmode="numeric" data-apm="${i}.varsta" value="${h(m.varsta)}" placeholder="ani"></label>
    </div>
    <div class="apj-rand">
      <label class="field"><span>Venit net – luna 1 (lei)</span><input type="text" inputmode="decimal" data-apm="${i}.v1" value="${h(m.v1)}" placeholder="0"></label>
      <label class="field"><span>Venit net – luna 2 (lei)</span><input type="text" inputmode="decimal" data-apm="${i}.v2" value="${h(m.v2)}" placeholder="0"></label>
    </div>
    <label class="field"><span>Sursa veniturilor (salariu, pensie, indemnizație, chirii, pensie de întreținere primită, activități independente…)</span><input type="text" data-apm="${i}.sursa" value="${h(m.sursa)}" placeholder="ex. salariu, pensie"></label>
    ${i ? `<div class="apj-rand" style="align-items:center">
      ${m.rel === 'alta' ? `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-apm="${i}.impreuna" ${m.impreuna ? 'checked' : ''}><span>Are domiciliul ori reședința comună și gospodărește împreună cu solicitantul</span></label>` : ''}
      ${['copil', 'copil_alta'].includes(m.rel) ? `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-apm="${i}.intretinere" ${m.intretinere ? 'checked' : ''}><span>În întreținerea solicitantului</span></label>
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-apm="${i}.studii" ${m.studii ? 'checked' : ''}><span>Continuă studiile (pentru 18–26 de ani)</span></label>` : ''}
      <button class="btn sm ghost" data-act="apjScoate" data-i="${i}">Scoate</button></div>
      <p class="small ${apjInclus(m).da ? 'muted' : ''}" style="margin:6px 0 0">${apjInclus(m).da ? '✓ Intră în familie' : '✕ Nu intră în familie'}${apjInclus(m).motiv ? ': ' + h(apjInclus(m).motiv) : ''}</p>` : ''}
  </div>`).join('');
}

function viewApj() {
  const v = AP.v, r = apjCalcul(), juridica = v.tip === 'juridica';
  const taxaCos = typeof TX !== 'undefined' ? TX.cos.reduce((s, x) => s + x.suma, 0) : 0;
  const ver = APJ_VERDICT[r.incadrare];
  const pj = juridica ? apjJuridica() : null;
  const text = apjText(r);
  const lunaVenit = r.mediu;
  return `
  ${avertismentJurist('Încadrarea și propunerea de dispozitiv')}
  <div class="callout" style="margin-bottom:14px"><p>Verificare după <b>O.U.G. nr. 51/2008</b> (forma consolidată la 3.11.2024; pragurile din <b>Legea nr. 31/2023</b>, art. 8 alin. (3) în forma dată de <b>Legea nr. 268/2024</b>) și, pentru persoane juridice, după <b>art. 42–44 O.U.G. nr. 80/2013</b>. Aprecierea finală aparține instanței.</p></div>
  <div class="grid-2">
    <div>
      <div class="card">
        <h2>Solicitantul</h2>
        <label class="field" style="margin-top:10px"><select data-apv="tip"><option value="fizica" ${!juridica ? 'selected' : ''}>Persoană fizică – ajutor public judiciar (O.U.G. nr. 51/2008)</option><option value="juridica" ${juridica ? 'selected' : ''}>Persoană juridică – facilități la plata taxei (O.U.G. nr. 80/2013)</option></select></label>
        ${juridica ? `${apjIn('co_taxa', 'Taxa judiciară de timbru datorată (lei)')}
          ${taxaCos ? `<button class="btn sm" style="margin-top:6px" data-act="apjPreiaTaxa">Preia totalul din „Taxă timbru” (${lei(taxaCos)})</button>` : ''}
          ${apjIn('pj_venit', 'Media venitului net pe ultimele 3 luni de activitate (lei)')}
          ${apjChk('pj_lichidare', 'Este în lichidare sau dizolvare ori are bunurile indisponibilizate')}`
        : `<label class="field" style="margin-top:10px"><span>Data cererii</span><input type="date" data-apv="data" value="${h(v.data || azi())}"></label>
          ${apjIn('salManual', `Salariul minim brut, dacă diferă (implicit ${lei(apjSalariu(v.data || azi()).valoare)})`)}`}
      </div>
      ${juridica ? '' : `<div class="card">
        <div class="card-head"><h2>Familia și veniturile (ultimele 2 luni)</h2><button class="btn sm" data-act="apjAdauga">＋ Membru</button></div>
        <p class="muted small" style="margin:6px 0 0">Familia (art. 5): soțul/soția și descendenții în linie dreaptă în întreținerea solicitantului – până la 18 ani sau, între 18 și 26 de ani, dacă își continuă studiile; persoana cu domiciliul ori reședința comună care gospodărește împreună cu solicitantul și descendenții acesteia, în aceleași condiții. Venituri (art. 9): orice venituri periodice – salarii, indemnizații, onorarii, rente, chirii, profit din activități comerciale sau independente –, nu doar cele impozabile.</p>
        ${apjMembriHtml()}
      </div>
      <div class="card">
        <h2>Sume datorate periodic (art. 9)</h2>
        <p class="muted small" style="margin:6px 0 0">Art. 9 cere ca și sumele datorate periodic pentru necesități de bază, „cum ar fi chiriile și obligațiile de întreținere”, să fie „luate în calcul”. Textul nu spune „se scad”; aplicația arată separat situația în care ele diminuează resursele, ca argument ce trebuie dovedit (art. 14).</p>
        ${APJ_PERIODICE.map(([k, l]) => apjIn(k, l + ' (lei/lună)')).join('')}
      </div>
      <div class="card">
        <h2>Alte cheltuieli dovedite</h2>
        <p class="muted small" style="margin:6px 0 0">Servesc evaluării de la art. 8 alin. (3) („veniturile realizate și cheltuielile dovedite”) și se dovedesc cu înscrisuri.</p>
        ${APJ_CHELT.map(([k, l]) => apjIn(k, l + ' (lei)')).join('')}
      </div>`}
    </div>
    <div>
      ${juridica ? `<div class="card">
        <h2>Facilități pentru persoana juridică</h2>
        <div class="calc-result" style="text-transform:none">${pj.temei.length ? 'Poate beneficia de facilități' : 'Caz excepțional (art. 42 alin. (3))'}</div>
        <ol class="steps">${[...pj.pasi, ...pj.temei.map(t => 'Temei: ' + t + ' O.U.G. nr. 80/2013')].map(p => `<li>${h(p)}</li>`).join('')}</ol>
        <div class="callout small" style="margin-top:8px">Persoanele juridice pot obține numai reduceri, eșalonări sau amânări – nu și scutire. Eșalonarea: cel mult 24 de luni și 12 termene (art. 44 alin. (2)). Cererea se face prin cererea de chemare în judecată sau în condițiile art. 33 alin. (2) ori art. 36 (art. 43 alin. (1)); încheierea se dă fără citare, în camera de consiliu; reexaminare în 5 zile, scutită de taxă, la alt complet (art. 43 alin. (3)–(5)). Nu se aplică O.U.G. nr. 51/2008 (plan de seminar INM).</div>
      </div>` : `<div class="card">
        <h2>Rezultat</h2>
        ${ver ? `<p style="margin:8px 0"><span class="pill ${ver[0]}">${h(ver[2])}</span></p><div class="calc-result" style="text-transform:none;font-size:1.15rem">${h(ver[1])}</div>` : '<div class="calc-result">—</div><p class="muted">Introduceți veniturile membrilor familiei (0 dacă nu au venituri).</p>'}
        <ol class="steps">${r.pasi.map(p => `<li>${h(p)}</li>`).join('')}</ol>
        ${APJ_ORDINE[r.incadrareNet] > APJ_ORDINE[r.incadrare] ? `<div class="callout small" style="margin-top:8px"><b>Cu obligațiile periodice scăzute</b> (chirie, întreținere: ${lei(r.periodice)}/lună): ${lei(r.mediuNet)} / ${r.n} = ${lei(r.peNet)} pe membru – s-ar încadra la ${h(APJ_VERDICT[r.incadrareNet][2])}. Este o interpretare sistematică a art. 9, coroborat cu art. 8 alin. (3) și art. 14; trebuie susținută cu dovada obligației, a cuantumului și a plăților.</div>` : ''}
        ${r.incadrare === 'alin3' ? `<div class="callout small" style="margin-top:8px">${h(APJ_ALIN3)} Indicatori pentru apreciere: costurile procesului = ${lei(r.costuri)} (${lunaVenit ? String(r2(r.costuri / lunaVenit)).replace('.', ',') + ' luni de venit al familiei' : '—'}); venitul familiei după cheltuielile lunare declarate = ${lei(Math.max(0, lunaVenit - r.chelt))}${r.n ? ` (${lei(Math.max(0, lunaVenit - r.chelt) / r.n)} pe membru)` : ''}.</div>` : ''}
        ${r.verif.map(x => `<div class="callout warn small" style="margin-top:8px"><span class="pill u2">de verificat</span> ${h(x)}</div>`).join('')}
      </div>
      <div class="card">
        <h2>Costurile procesului și formele cerute</h2>
        ${APJ_COST.map(([k, l]) => apjIn(k, l + ' (lei)')).join('')}
        ${taxaCos ? `<button class="btn sm" style="margin-top:6px" data-act="apjPreiaTaxa">Preia taxa din „Taxă timbru” (${lei(taxaCos)})</button>` : ''}
        <h3 style="margin:14px 0 4px;font-size:1rem">Formele ajutorului cerute (art. 6)</h3>
        ${APJ_FORME.map(([k, l]) => apjChk('f_' + k, l)).join('')}
        ${apjIn('primit', 'Ajutor public judiciar primit în ultimele 12 luni, în formele a)–c) (lei)')}
        <ol class="steps" style="margin-top:10px">
          <li>Plafon anual pentru formele a)–c): 10 salarii minime brute = ${lei(r.plafon)} (art. 7); disponibil: ${lei(Math.max(0, r.plafon - r.primit))}${r.costAC ? `; cerut acum: ${lei(r.costAC)}${r.costAC > r.plafon - r.primit ? ' – depășește plafonul' : ''}` : ''}.</li>
          <li>Plafonul nu se aplică scutirilor, reducerilor, eșalonărilor sau amânărilor de la plata taxelor (forma d) – plan de seminar INM.</li>
        </ol>
      </div>
      <div class="card">
        <h2>Acte și procedură</h2>
        <ol class="steps">
          <li>Nominalizarea membrilor familiei (art. 5) și dovezile veniturilor fiecăruia pe ultimele 2 luni: adeverințe de salariu, cupon de pensie, adeverințe de venit de la administrația financiară (instanța poate verifica și în PatrimVen).</li>
          <li>Dovezile cheltuielilor lunare și ale obligațiilor de întreținere sau de plată.</li>
          <li>Declarația pe propria răspundere privind ajutorul primit în ultimele 12 luni (art. 14 alin. (1)) – nu este necesară când se cere ajutor doar pentru taxele judiciare (plan de seminar INM).</li>
          <li>Cererea de ajutor public judiciar este scutită de taxă (art. 12 alin. (2)). Pentru cererea de chemare în judecată supusă regularizării, cererea privind taxa se face în 5 zile de la comunicare (art. 33 alin. (2) O.U.G. nr. 80/2013).</li>
          <li>Încheierea de respingere: cerere de reexaminare în 5 zile de la comunicare, la alt complet, în camera de consiliu.</li>
          <li>Dreptul este strict personal (art. 10): la coparticipare, fiecare reclamant trebuie să îndeplinească singur condițiile. Ajutorul nu acoperă cauțiunea pentru suspendarea executării (art. 6 nu o enumeră, iar cauțiunea nu este taxă judiciară) și nu scutește de cheltuielile de judecată ale celeilalte părți (art. 453 C.proc.civ.). Eșalonarea poate ajunge la cel mult 48 de rate lunare.</li>
        </ol>
        ${text ? `<textarea readonly rows="7" style="width:100%;margin-top:10px;font:inherit;font-size:.9rem;padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink)">${h(text)}</textarea>
        <div class="actions"><button class="btn" data-act="apjCopiaza">Copiază textul</button></div>` : ''}
      </div>`}
    </div>
  </div>`;
}

function apjSet(n, val) { AP.v[n] = val; }
function apjSetMembru(key, val) {
  const [i, f] = key.split('.');
  if (AP.membri[i]) AP.membri[i][f] = val;
}
function apjAdauga() { AP.membri.push({ rel: 'sot', varsta: '', impreuna: '1', intretinere: '1', studii: '', v1: '', v2: '', sursa: '' }); rerender(); }
function apjPreiaTaxa() { AP.v.co_taxa = String(TX.cos.reduce((s, x) => s + x.suma, 0)).replace('.', ','); rerender(); }

'use strict';
/* Pagina „Calculatoare” de pe www.avocatioanastoica.ro: aceleași calculatoare ca în aplicația cabinetului
   (taxa.js, competenta.js, grila.js, cautiune.js, apj.js), afișate în #calculatoare. */
const $ = (s, r = document) => r.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const empty = msg => `<div class="empty">${msg}</div>`;

function toast(msg, ms = 2600) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), Math.max(ms, String(msg).length * 55));
}

const PAGINI = [['taxa', 'Taxă de timbru & competență', () => viewTaxa()], ['cautiune', 'Cauțiune', () => viewCautiune()], ['apj', 'Ajutor public judiciar', () => viewApj()]];

function rerender() {
  const loc = $('#calculatoare');
  if (!loc) return;
  const y = window.scrollY;
  const cheie = location.hash.replace(/^#\/?/, '');
  const pag = PAGINI.find(p => p[0] === cheie) || PAGINI[0];
  loc.innerHTML = `<nav class="calc-tabs" aria-label="Calculatoare">${PAGINI.map(p => `<a href="#${p[0]}" class="${p === pag ? 'active' : ''}">${p[1]}</a>`).join('')}</nav>${pag[2]()}`;
  window.scrollTo(0, y);
}
window.addEventListener('hashchange', rerender);

const copiaza = async text => { try { await navigator.clipboard.writeText(text); toast('Text copiat.'); } catch { toast('Selectați textul și copiați-l cu Ctrl+C.'); } };
const ACT = {
  taxaAdauga: () => taxaAdauga(),
  taxaGoleste: () => { TX.cos = []; rerender(); },
  taxaScoate: d => { TX.cos.splice(Number(d.i), 1); rerender(); },
  taxaCopiaza: () => copiaza(taxaText()),
  grilaAdauga: () => grilaAdauga(),
  grilaScoate: d => { GR.lista.splice(Number(d.i), 1); rerender(); },
  grilaFoloseste: () => grilaFoloseste(),
  cautCopiaza: () => copiaza(cautText(cautCalcul())),
  apjAdauga: () => apjAdauga(),
  apjScoate: d => { AP.membri.splice(Number(d.i), 1); rerender(); },
  apjPreiaTaxa: () => apjPreiaTaxa(),
  apjCopiaza: () => copiaza(apjText(apjCalcul())),
};

document.addEventListener('click', e => {
  const el = e.target.closest('#calculatoare [data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener('change', e => {
  if (e.target.closest('#calculatoare') && e.target.dataset.tx === 'sel') { TX.sel = e.target.value; TX.vals = { f127: TX.vals.f127 }; rerender(); }
});

document.addEventListener('toggle', e => { if (e.target.id === 'grila') GR.deschis = e.target.open; }, true);

// Câmpurile calculatoarelor: atributul data-* → funcția care salvează valoarea
const CALC_CAMPURI = [['txv', (k, v) => { TX.vals[k] = v; }], ['tx', (k, v) => { if (k === 'q') TX.q = v; }], ['grv', (k, v) => grilaSet(k, v)], ['cav', (k, v) => cautSet(k, v)], ['apv', (k, v) => apjSet(k, v)], ['apm', (k, v) => apjSetMembru(k, v)]];

document.addEventListener('input', e => {
  if (!e.target.closest('#calculatoare')) return;
  const leg = CALC_CAMPURI.map(([attr, set]) => [attr, e.target.dataset?.[attr], set]).find(([attr, key]) => key != null && !(attr === 'tx' && key === 'sel'));
  if (!leg) return;
  const [attr, key, set] = leg;
  set(key, e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value);
  const pos = e.target.selectionStart, sel = `[data-${attr}="${key}"]`;
  rerender();
  const again = $(sel);
  if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* câmp fără cursor */ } }
});

rerender();
