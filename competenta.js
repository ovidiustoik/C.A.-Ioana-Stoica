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
  v2: { m: VAL, t: { ...T_GEN, alt: ALT_CONTRACT }, n: 'Valoarea = valoarea obiectului actului sau a părții din act dedusă judecății (art. 101). Dacă se cere și restituirea unui imobil pe cale reală, acel capăt atrage art. 117.' },
  v3: { m: VAL, t: T_IMOBIL_COND, n: N_EXCEPTII_J + ' ' + N_VALOARE },
  v4: { m: VAL, t: { ...T_GEN, r: 'Acțiune personală imobiliară: instanța domiciliului sau sediului pârâtului', alt: 'La alegerea reclamantului, și instanța locului prevăzut în contract pentru executarea obligației (art. 113 alin. (1) pct. 3). Dacă locul executării nu rezultă din contract, rămâne domiciliul pârâtului.' }, n: 'Practica ÎCCJ (decizii din 2015 care invocă RIL nr. 8/2013) califică acțiunea drept personală imobiliară, deci art. 117 nu se aplică.', v: 'Valoarea pentru competență: valoarea obiectului contractului (art. 101) sau valoarea impozabilă a imobilului (art. 104) – verificați practica instanței.' },
  v5: { m: VAL, t: { ...T_GEN, alt: ALT_DELICT }, n: 'Daunele morale altele decât cele întemeiate pe art. 253 C.civ. se raportează la valoarea pretinsă. ' + N_VALOARE },
  v6: { m: VAL, t: T_IMOBIL, n: 'Grănițuirea singură este a judecătoriei (art. 94 pct. 1 lit. f)); revendicarea se raportează la valoarea impozabilă a porțiunii (art. 104). Capetele fiind strâns legate, le judecă instanța mai mare în grad (art. 99 alin. (2)).' },

  r1: { m: J('g'), t: { r: 'Imobil: instanța locului imobilului (art. 117 alin. (3), prin asemănare). Bun mobil: domiciliul pârâtului (art. 107).', temei: `art. 107, art. 117 ${CPC}`, ex: 'cond' } },
  r2: { m: VAL, t: T_IMOBIL_COND, n: 'Pentru un imobil, valoarea pentru competență este valoarea impozabilă (art. 104).' },
  r3: { m: J('e'), t: T_IMOBIL },
  r4: { m: J('f'), t: T_IMOBIL },

  p1: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p3: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p4: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p5: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p6: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p7: { m: J('j', 'împărțeală judiciară, indiferent de valoare'), t: T_PARTAJ },
  p2: { m: J('j', 'în materie de moștenire și lit. j¹)'), t: T_PARTAJ },

  n1: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 1/2023`), t: { ...T_GEN, alt: ALT_DELICT } },
  n2: { m: TRIB(), t: T_GEN, n: 'Excepție: când legea o dă judecătoriei – stare civilă (art. 94 pct. 1 lit. b)), cereri date instanței de tutelă și de familie (lit. a)).' },
  n3: { m: TRIB(), t: T_GEN, n: 'Excepție: când legea o dă judecătoriei – stare civilă (art. 94 pct. 1 lit. b)), cereri date instanței de tutelă și de familie (lit. a)).' },
  n4: { m: VAL, vl: 'Chiria sau arenda anuală (lei) – pentru competență', t: { ...T_GEN, alt: 'Pentru imobil: și instanța locului unde se află imobilul (art. 113 alin. (1) pct. 4), la alegerea reclamantului.' }, n: 'Valoarea pentru competență = chiria sau arenda anuală (art. 101 alin. (3)). Dacă se cere evacuarea – judecătoria (art. 94 pct. 1 lit. d)).' },
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
  s3: { m: LA('Judecătoria, indiferent de valoarea imobilului', `art. 94 pct. 1 lit. d), art. 1036 ${CPC}`, 1), t: { r: 'Judecătoria în circumscripția căreia se află imobilul, chiar dacă locatarul l-a părăsit sau contractul a încetat', temei: `art. 1036 ${CPC}`, ex: true } },
  s4: { m: LA('Instanța competentă să judece fondul în primă instanță', `art. 997 alin. (1) ${CPC}`), t: { ...T_GEN, r: 'Potrivit regulilor generale de competență teritorială', temei: `art. 107 și urm. ${CPC}; ÎCCJ – Decizia nr. 27/2020` } },
  s5: { m: VAL, extra: `art. 997 alin. (1) ${CPC} – instanța competentă să judece fondul`, t: { ...T_GEN, r: 'Potrivit regulilor generale de competență teritorială', temei: `art. 107 și urm. ${CPC}; ÎCCJ – Decizia nr. 27/2020` } },

  a1: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016 (proprietate intelectuală, indiferent de valoare)`), t: { ...T_GEN, alt: ALT_DELICT } },
  a2: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016`), t: T_GEN, v: 'Căile de atac împotriva deciziilor OSIM au reguli speciale (Tribunalul București) – verificați legea specială.' },
  a3: { m: TRIB(`art. 95 pct. 1 ${CPC}; ÎCCJ – RIL nr. 18/2016`), t: T_GEN, v: 'Căile de atac împotriva deciziilor OSIM au reguli speciale (Tribunalul București) – verificați legea specială.' },
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
  z8: { g: 'Mai întâi comisiile de fond funciar; instanța – pe calea plângerii împotriva hotărârii comisiei județene', m: J('j³', 'art. 53 alin. (2) Legea nr. 18/1991'), t: { r: 'Judecătoria în a cărei rază teritorială este situat terenul (plângere în 30 de zile de la comunicare)', temei: 'art. 53 alin. (2) Legea nr. 18/1991', ex: true } },
  z9: { g: G_CONTENCIOS, m: LA('Tribunalul – secția de contencios administrativ și fiscal', 'Codul administrativ (regula fostului art. 109 din Legea nr. 188/1999)', 2), t: T_CONTENCIOS, v: 'Articolul din Codul administrativ (O.U.G. nr. 57/2019) care preia regula – de verificat.' },
  z11: { m: LA('Judecătoria', `art. 915 ${CPC}; art. 94 pct. 1 lit. j) (partaj)`, 1), t: T_DIVORT, n: 'Partajul cerut odată cu divorțul se judecă de instanța divorțului.' },
  z10: { m: LA('—', ''), t: T_ACELASI('—'), v: 'Competența se stabilește după legea specială.' },
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
  return out;
}

function compCampuri(t) {
  const c = COMP[t.id];
  if (!c) return [];
  const f = [];
  if (c.opt) f.push({ n: 'co', l: 'Situația concretă', opt: c.opt.map(o => o.l) });
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
      <dt>Teritorială</dt><dd>${h(rez.ter?.r || '—')} ${ex}${rez.ter?.temei ? `<br><span class="muted small">${h(rez.ter.temei)}</span>` : ''}${rez.ter?.alt ? `<br><span class="small">${h(rez.ter.alt)}</span>` : ''}</dd>
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
  linii.push(`Cererile accesorii, adiționale și incidentale se judecă de instanța competentă pentru cererea principală (art. 123 ${CPC}).`);
  if (faraGrad.length) linii.push(`Instanța se stabilește după regula proprie pentru: ${faraGrad.map(x => x.label).join('; ')}.`);
  const excl = items.filter(x => x.comp.ter && x.comp.ter.ex === true);
  const cond = items.filter(x => x.comp.ter && x.comp.ter.ex === 'cond');
  if (excl.length) linii.push(`Atenție – competență teritorială exclusivă: ${excl.map(x => `${x.label} (${x.comp.ter.temei})`).join('; ')}. Ea nu poate fi înlăturată prin alegerea reclamantului sau prin convenția părților.`);
  if (cond.length) linii.push(`Verificați dacă devine exclusivă (imobil, moștenire, ocrotire): ${cond.map(x => x.label).join('; ')}.`);
  if (items.some(x => /divor/i.test(x.label)) && items.length > 1) linii.push('Cererile formulate odată cu divorțul urmează competența instanței divorțului.');
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
