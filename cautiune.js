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
