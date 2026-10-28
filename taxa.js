'use strict';
/* Calculul taxei judiciare de timbru (O.U.G. nr. 80/2013), în forma modificată prin Legea nr. 268/2024
   (în vigoare din 3.11.2024: art. 5 – partaj, art. 15 – familie) și Legea nr. 199/2025 (o scutire nouă, art. 29 alin. (6)).
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
   scutit */
const TAXE = [
  // --- art. 3: acțiuni evaluabile în bani
  ['Acțiuni evaluabile în bani', 'v1', 'Acțiuni și cereri evaluabile în bani (pretenții, despăgubiri etc.)', 'art. 3 alin. (1)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v2', 'Constatarea nulității, anularea, rezoluțiunea sau rezilierea unui act juridic patrimonial', 'art. 3 alin. (1) lit. a)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v3', 'Constatarea existenței sau inexistenței unui drept patrimonial', 'art. 3 alin. (1) lit. b)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v4', 'Hotărâre care ține loc de act autentic de înstrăinare sau de constituire a unui drept real', 'art. 3 alin. (1) lit. c)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v5', 'Daune morale, altele decât cele pentru atingeri aduse onoarei, demnității sau reputației', 'art. 3 alin. (1)', { k: 'barem' }],
  ['Acțiuni evaluabile în bani', 'v6', 'Grănițuire împreună cu revendicarea unei porțiuni de teren', 'art. 8 alin. (1) lit. d)', { k: 'barem', plus: 100, eticheta: 'Valoarea porțiunii de teren revendicate (lei)' }],
  // --- art. 4: drepturi reale
  ['Drepturi reale', 'r1', 'Acțiuni posesorii', 'art. 4 alin. (1)', { k: 'barem', cota: 0.2, eticheta: 'Valoarea bunului a cărui posesie se cere (lei)' }],
  ['Drepturi reale', 'r2', 'Acțiuni privind un dezmembrământ al dreptului de proprietate', 'art. 4 alin. (2)', { k: 'barem', cota: 0.2, eticheta: 'Valoarea bunului asupra căruia poartă dezmembrământul (lei)' }],
  ['Drepturi reale', 'r3', 'Servituți', 'art. 4 alin. (2) teza a doua', { k: 'barem', cota: 0.2, eticheta: 'Valoarea imobilului (lei)' }],
  ['Drepturi reale', 'r4', 'Grănițuire', 'art. 8 alin. (1) lit. d)', { k: 'fix', suma: 100 }],
  // --- art. 5: partaj (forma dată de Legea nr. 268/2024, în vigoare din 3.11.2024)
  ['Partaj judiciar', 'p1', 'Stabilirea bunurilor supuse împărțelii', 'art. 5 alin. (1)', { k: 'barem', jumatate: true, eticheta: 'Valoarea bunurilor (lei)' }],
  ['Partaj judiciar', 'p3', 'Creanțe între coproprietari născute din starea de proprietate comună', 'art. 5 alin. (1)', { k: 'barem', jumatate: true, eticheta: 'Valoarea creanțelor (lei)' }],
  ['Partaj judiciar', 'p4', 'Raportul donațiilor', 'art. 5 alin. (1)', { k: 'barem', jumatate: true, eticheta: 'Valoarea bunurilor de raportat (lei)' }],
  ['Partaj judiciar', 'p5', 'Reducțiunea liberalităților excesive', 'art. 5 alin. (1)', { k: 'barem', jumatate: true, eticheta: 'Valoarea în discuție (lei)' }],
  ['Partaj judiciar', 'p6', 'Partaj propriu-zis, indiferent de modalitatea de realizare', 'art. 5 alin. (1)', { k: 'barem', jumatate: true, eticheta: 'Valoarea masei partajabile (lei)' }],
  ['Partaj judiciar', 'p7', 'Mai multe dintre cererile de mai sus, în aceeași acțiune (o singură taxă)', 'art. 5 alin. (2)', { k: 'barem', jumatate: true, eticheta: 'Valoarea cea mai mare dintre cereri (lei)' }, '', 'Se datorează o singură taxă, calculată la valoarea cea mai mare.'],
  ['Partaj judiciar', 'p2', 'Stabilirea calității de coproprietar sau de moștenitor și a cotelor-părți', 'art. 5 alin. (3)', { k: 'fix', suma: 50, unitate: 'Număr de coproprietari / moștenitori' }],
  // --- cereri neevaluabile
  ['Cereri neevaluabile în bani', 'n1', 'Daune morale pentru atingeri aduse onoarei, demnității sau reputației unei persoane fizice', 'art. 7', { k: 'fix', suma: 100 }],
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
  ['Cereri în cursul procesului', 'c11', 'Măsuri asigurătorii', 'art. 11 lit. b)', { k: 'fix', suma: 100 }],
  // --- art. 10: executare silită (fără încuviințarea executării silite)
  ['Executare silită', 'e1', 'Suspendarea executării silite, inclusiv a executării provizorii', 'art. 10 alin. (1) lit. b)', { k: 'fix', suma: 50 }],
  ['Executare silită', 'e2', 'Contestație la executare evaluabilă în bani', 'art. 10 alin. (2)', { k: 'contestatie' }],
  ['Executare silită', 'e3', 'Contestație la executare când obiectul executării nu este evaluabil în bani', 'art. 10 alin. (2) teza finală', { k: 'fix', suma: 100 }],
  ['Executare silită', 'e4', 'Contestație la executare privind fondul dreptului (art. 712 alin. (2) C.proc.civ.)', 'art. 10 alin. (3)', { k: 'barem' }],
  ['Executare silită', 'e5', 'Întoarcerea executării silite', 'art. 10 alin. (4)', { k: 'prag', limita: 5000, sub: 50, peste: 300, eticheta: 'Valoarea cererii (lei)' }],
  ['Executare silită', 'e6', 'Validarea popririi', 'art. 27', { k: 'fix', suma: 20 }, '', 'Practică neunitară. Opinia majoritară (Curtea de Apel Iași, minuta din 2020): cerere neevaluabilă în bani, 20 lei (art. 27), deoarece creditorul nu își mărește patrimoniul, ci dobândește un nou debitor. Opinia minoritară: taxă la valoarea creanței (art. 3 alin. (1)). ÎCCJ nu s-a pronunțat.'],
  // --- art. 15: familie (forma dată de Legea nr. 268/2024, în vigoare din 3.11.2024)
  ['Raporturi de familie', 'f1', 'Divorț prin acord, din motive temeinice sau după separarea în fapt (art. 373 lit. a)–c) C.civ.)', 'art. 15 lit. a)', { k: 'fix', suma: 200 }],
  ['Raporturi de familie', 'f3', 'Divorț din cauza stării sănătății (art. 373 lit. d) C.civ.)', 'art. 15 lit. b)', { k: 'fix', suma: 50 }],
  ['Raporturi de familie', 'f4', 'Despăgubiri sau stabilirea prestației compensatorii', 'art. 15 lit. c)', { k: 'fix', suma: 50 }],
  ['Raporturi de familie', 'f5', 'Cereri privind locuința minorului, autoritatea părintească, pensia de întreținere, legăturile personale, locuința familiei (neaccesorii divorțului)', 'art. 15 lit. d)', { k: 'fix', suma: 20, unitate: 'Număr de cereri' }],
  ['Raporturi de familie', 'f6', 'Orice altă cerere neevaluabilă în bani în materia raporturilor de familie', 'art. 15 lit. e)', { k: 'fix', suma: 20 }],
  ['Raporturi de familie', 'f7', 'Adopție, ocrotirea minorilor, tutelă, curatelă, asistarea persoanelor cu tulburări psihice', 'art. 29 alin. (1) lit. e)', { k: 'scutit' }],
  // --- art. 11 lit. a): înțelegerea părților / mediere
  ['Înțelegerea părților / mediere', 'm1', 'A se lua act de înțelegerea părților, inclusiv de acordul de mediere', 'art. 11 lit. a)', { k: 'fix', suma: 20 }],
  ['Înțelegerea părților / mediere', 'm2', 'Înțelegere/acord de mediere privind transferul proprietății sau al altui drept real asupra unui imobil', 'art. 11 lit. a)', { k: 'barem', jumatate: true, plus: 20, eticheta: 'Valoarea imobilului (lei)' }, '', 'Taxa fixă de 20 lei + 50% din taxa care s-ar fi datorat potrivit art. 3 alin. (1).'],
  ['Înțelegerea părților / mediere', 'm3', 'Înțelegere/acord de mediere privind partajul', 'art. 11 lit. a)', { k: 'barem', jumatate: 2, plus: 20, eticheta: 'Valoarea masei partajabile (lei)' }, '', 'Taxa fixă de 20 lei + 50% din taxa de partaj (care este, potrivit art. 5, jumătate din taxa de la art. 3 alin. (1)).'],
  // --- art. 6: proceduri speciale
  ['Proceduri speciale', 's1', 'Cerere de valoare redusă', 'art. 6 alin. (1)', { k: 'prag', limita: 2000, sub: 50, peste: 200, eticheta: 'Valoarea cererii (lei)' }],
  ['Proceduri speciale', 's2', 'Ordonanță de plată', 'art. 6 alin. (2)', { k: 'fix', suma: 200 }],
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
  ['Alte cereri', 'a14', 'Plângere contravențională (împotriva procesului-verbal)', 'art. 19', { k: 'fix', suma: 20 }],
  ['Alte cereri', 'a15', 'Cereri de carte funciară care nu pun în discuție fondul dreptului', 'art. 20', { k: 'fix', suma: 50 }],
  // --- scutiri (fără cauzele penale)
  ['Scutite de taxă', 'z1', 'Pensii și alte drepturi din sistemele de asigurări sociale', 'art. 29 alin. (1) lit. a)', { k: 'scutit' }],
  ['Scutite de taxă', 'z2', 'Ajutor de șomaj, ajutor social, alocații, drepturile persoanelor cu dizabilități', 'art. 29 alin. (1) lit. a)', { k: 'scutit' }],
  ['Scutite de taxă', 'z3', 'Obligații de întreținere; nulitatea, anularea, rezoluțiunea sau rezilierea contractului de întreținere', 'art. 29 alin. (1) lit. c)', { k: 'scutit' }],
  ['Scutite de taxă', 'z4', 'Despăgubiri pentru condamnare sau măsuri preventive luate pe nedrept', 'art. 29 alin. (1) lit. d)', { k: 'scutit' }],
  ['Scutite de taxă', 'z5', 'Protecția consumatorilor, când reclamantul e persoană fizică sau asociație de consumatori', 'art. 29 alin. (1) lit. f)', { k: 'scutit' }],
  ['Scutite de taxă', 'z6', 'Exercitarea drepturilor electorale', 'art. 29 alin. (1) lit. h)', { k: 'scutit' }],
  ['Scutite de taxă', 'z7', 'Despăgubiri pentru încălcarea art. 2 și 3 din Convenția europeană a drepturilor omului', 'art. 29 alin. (1) lit. j)', { k: 'scutit' }],
  ['Scutite de taxă', 'z8', 'Fondul funciar – cereri formulate de prefect sau primar (Legea nr. 18/1991)', 'art. 29 alin. (2)', { k: 'scutit' }],
  ['Scutite de taxă', 'z9', 'Raporturile de serviciu ale funcționarilor publici', 'art. 29 alin. (4)', { k: 'scutit' }],
  ['Scutite de taxă', 'z11', 'Divorț și partajul bunurilor comune, cerute de victima infracțiunii de violență în familie', 'art. 29 alin. (6)', { k: 'scutit' }, '', 'Scutire introdusă prin Legea nr. 199/2025 (M.Of. nr. 1106 din 28.11.2025), în vigoare din 1.12.2025.'],
  ['Scutite de taxă', 'z10', 'Alte cereri scutite prin legi speciale', 'art. 29 alin. (1) lit. l)', { k: 'scutit' }],
].map(([cat, id, label, art, rule, verifica, nota]) => ({ cat, id, label, art, rule, verifica: verifica || '', nota: nota || '' }));

// Ce trebuie introdus pentru fiecare tip de regulă
function taxaCampuri(t) {
  const r = t.rule;
  if (r.k === 'barem' || r.k === 'procent' || r.k === 'prag' || r.k === 'procentPlafon' || r.k === 'jumatate') return [{ n: 'valoare', l: r.eticheta || 'Valoarea obiectului cererii (lei)' }];
  if (r.k === 'contestatie') return [{ n: 'debit', l: 'Valoarea debitului urmărit (lei)' }, { n: 'bunuri', l: 'Valoarea bunurilor urmărite (lei) – opțional' }];
  if (r.k === 'fix' && r.unitate) return [{ n: 'numar', l: r.unitate, implicit: 1 }];
  return [];
}

// Calculul propriu-zis: { suma, pasi[], scutit }
function taxaCalcul(t, v) {
  const r = t.rule, pasi = [];
  const num = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
  let suma = 0;
  const camp = taxaCampuri(t)[0];
  if (camp && camp.n !== 'numar' && !num(v[camp.n]) && !num(v.bunuri)) return { suma: 0, lipsa: true, pasi: ['Introduceți valoarea pentru a calcula taxa.'] };
  switch (r.k) {
    case 'scutit': return { suma: 0, scutit: true, pasi: ['Cererea este scutită de taxa judiciară de timbru.'] };
    case 'fix': {
      const n = r.unitate ? Math.max(1, Math.round(num(v.numar) || 1)) : 1;
      suma = r.suma * n;
      pasi.push(r.unitate ? `${lei(r.suma)} × ${n} = ${lei(suma)}` : `Taxă fixă: ${lei(r.suma)}`);
      break;
    }
    case 'barem': {
      const val = num(v.valoare);
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
      const val = num(v.valoare);
      let x = val * r.p / 100;
      pasi.push(`${r.p}% din ${lei(val)} = ${lei(x)}`);
      if (x < 20) { x = 20; pasi.push('Minimum 20 lei'); }
      if (r.jumatate) { x /= 2; pasi.push(`Jumătate: ${lei(x)}`); }
      if (r.plus) { pasi.push(`Plus ${lei(r.plus)}: ${lei(x + r.plus)}`); x += r.plus; }
      suma = x;
      break;
    }
    case 'prag': {
      const val = num(v.valoare);
      suma = val <= r.limita ? r.sub : r.peste;
      pasi.push(`Valoare ${val <= r.limita ? 'de până la' : 'de peste'} ${lei(r.limita)}: ${lei(suma)}`);
      break;
    }
    case 'procentPlafon': {
      const val = num(v.valoare);
      suma = Math.min(val * r.p / 100, r.plafon);
      pasi.push(`${r.p}% din ${lei(val)} = ${lei(val * r.p / 100)}${val * r.p / 100 > r.plafon ? `, plafonat la ${lei(r.plafon)}` : ''}`);
      break;
    }
    case 'jumatate': {
      const val = num(v.valoare);
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
const TX = { sel: 'v1', q: '', vals: {}, cos: [] };

function viewTaxa() {
  const q = norm(TX.q);
  const lista = TAXE.filter(t => !q || norm(t.label + ' ' + t.cat + ' ' + t.art).includes(q));
  const t = TAXE.find(x => x.id === TX.sel) || TAXE[0];
  const rez = taxaCalcul(t, TX.vals);
  const cats = [...new Set(lista.map(x => x.cat))];
  const total = TX.cos.reduce((s, x) => s + x.suma, 0);
  const text = taxaText();
  return `
  <div class="callout" style="margin-bottom:14px"><p>Calcul potrivit <b>O.U.G. nr. 80/2013</b>, în forma modificată prin <b>Legea nr. 268/2024</b> (partaj și divorț, în vigoare din 3.11.2024) și <b>Legea nr. 199/2025</b>. Pentru cererile depuse înainte de 3.11.2024 la partaj și divorț se aplicau alte taxe.</p></div>
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
    </div>
    <div>
      <div class="card">
        <span class="muted small">${h(t.cat)} · ${h(t.art)} din O.U.G. nr. 80/2013</span>
        <h2 style="margin:4px 0 10px">${h(t.label)}</h2>
        ${t.verifica ? `<div class="callout warn small" style="margin-bottom:10px"><span class="pill u2">de verificat</span> ${h(t.verifica)}</div>` : ''}
        ${t.nota ? `<div class="callout small" style="margin-bottom:10px">${h(t.nota)}</div>` : ''}
        ${taxaCampuri(t).map(f => `<label class="field" style="margin-bottom:10px"><span>${h(f.l)}</span><input type="text" inputmode="decimal" data-txv="${f.n}" value="${h(TX.vals[f.n] ?? f.implicit ?? '')}" placeholder="0"></label>`).join('')}
        <div class="calc-result" style="text-transform:none">${rez.scutit ? 'Scutită de taxă' : rez.lipsa ? '—' : lei(rez.suma)}</div>
        <ol class="steps">${rez.pasi.map(p => `<li>${h(p)}</li>`).join('')}</ol>
        <div class="actions"><button class="btn primary" data-act="taxaAdauga">＋ Adaugă la cerere (mai multe capete)</button></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Cererea – toate capetele</h2>${TX.cos.length ? '<button class="btn sm ghost" data-act="taxaGoleste">Golește</button>' : ''}</div>
        ${TX.cos.length ? `<ul class="list">${TX.cos.map((x, i) => `<li><span class="grow"><span>${i + 1}. ${h(x.label)}</span><span class="muted small">${h(x.art)}${x.detaliu ? ' · ' + h(x.detaliu) : ''}</span></span><b class="nowrap">${x.scutit ? 'scutită' : lei(x.suma)}</b><button class="icon-btn" data-act="taxaScoate" data-i="${i}" aria-label="Scoate">✕</button></li>`).join('')}</ul>
          <p style="font-size:1.1rem;margin:10px 0"><b>Total: ${lei(total)}</b></p>
          <textarea readonly rows="5" style="width:100%;font:inherit;font-size:.9rem;padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink)">${h(text)}</textarea>
          <div class="actions"><button class="btn" data-act="taxaCopiaza">Copiază textul</button></div>`
          : empty('Adăugați capetele de cerere pentru a obține totalul și textul gata de folosit.')}
      </div>
    </div>
  </div>`;
}

function taxaText() {
  if (!TX.cos.length) return '';
  const total = TX.cos.reduce((s, x) => s + x.suma, 0);
  const linii = TX.cos.map((x, i) => `${i + 1}. ${x.label}${x.detaliu ? ' (' + x.detaliu + ')' : ''} – ${x.scutit ? 'scutită' : lei(x.suma)}, potrivit ${x.art} din O.U.G. nr. 80/2013`);
  return `Taxa judiciară de timbru datorată este în cuantum de ${lei(total)}, după cum urmează:\n${linii.join(';\n')}.`;
}

function taxaAdauga() {
  const t = TAXE.find(x => x.id === TX.sel);
  if (!t) return;
  const rez = taxaCalcul(t, TX.vals);
  if (rez.lipsa) return toast('Introduceți mai întâi valoarea.');
  const campuri = taxaCampuri(t).filter(f => TX.vals[f.n]);
  const detaliu = campuri.map(f => `${f.l.replace(/ \(lei\).*$/, '').replace(/ – opțional$/, '')}: ${f.n === 'numar' ? TX.vals[f.n] : lei(Number(String(TX.vals[f.n]).replace(/\s/g, '').replace(',', '.')) || 0)}`).join(', ');
  TX.cos.push({ label: t.label, art: t.art, suma: rez.suma, scutit: !!rez.scutit, detaliu });
  rerender();
}
