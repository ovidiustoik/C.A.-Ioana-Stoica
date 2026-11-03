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
