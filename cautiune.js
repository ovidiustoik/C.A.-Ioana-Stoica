'use strict';
/* Calculul cauțiunii în procesul civil.
   Baremul art. 719 alin. (2) C.proc.civ. (forma în vigoare): 10% până la 10.000 lei; 1.000 lei + 5% pentru ce depășește
   10.000 lei, până la 100.000 lei; 5.500 lei + 1% pentru ce depășește 100.000 lei, până la 1.000.000 lei; 14.500 lei + 0,1%
   pentru ce depășește 1.000.000 lei. Obiect neevaluabil în bani: 1.000 lei, dacă legea nu prevede altfel [alin. (3)].
   Același barem se aplică, prin trimitere, la art. 484 alin. (2), art. 507 și art. 512. „v” = de verificat. */

function cautBarem(v) {
  if (v <= 10000) return { suma: v * 0.1, lit: 'a)', pas: `10% din ${lei(v)}` };
  if (v <= 100000) return { suma: 1000 + (v - 10000) * 0.05, lit: 'b)', pas: `1.000 lei + 5% din ce depășește 10.000 lei (${lei(v - 10000)})` };
  if (v <= 1000000) return { suma: 5500 + (v - 100000) * 0.01, lit: 'c)', pas: `5.500 lei + 1% din ce depășește 100.000 lei (${lei(v - 100000)})` };
  return { suma: 14500 + (v - 1000000) * 0.001, lit: 'd)', pas: `14.500 lei + 0,1% din ce depășește 1.000.000 lei (${lei(v - 1000000)})` };
}

const CAUT_TIPURI = {
  s719: {
    l: 'Suspendarea executării silite (contestație la executare)', temei: 'art. 719 alin. (2)–(3) C.proc.civ.', barem: true, consumator: true,
    eticheta: 'Valoarea obiectului contestației (lei)',
    n: 'Suspendarea provizorie, până la soluționarea cererii de suspendare, se poate dispune în cazuri urgente numai dacă s-a plătit cauțiunea; suma rămâne indisponibilizată și se deduce din cauțiunea stabilită la soluționarea cererii de suspendare.',
  },
  r484: {
    l: 'Suspendarea executării hotărârii atacate cu recurs', temei: 'art. 484 alin. (2) C.proc.civ., cu calculul de la art. 719', barem: true,
    eticheta: 'Valoarea pentru care se cere suspendarea (lei)',
    n: 'Cererea se depune direct la instanța de recurs, cu dovada plății cauțiunii; cauțiunea este condiție de admisibilitate. Procedura suspendării provizorii nu se aplică în recurs.',
    v: 'Ce valoare se ia în calcul (obiectul hotărârii a cărei executare se suspendă) – verificați textul art. 484 și practica instanței.',
  },
  ca507: {
    l: 'Suspendarea executării în contestația în anulare', temei: 'art. 507 C.proc.civ. (se aplică art. 484 în mod corespunzător)', barem: true,
    eticheta: 'Valoarea pentru care se cere suspendarea (lei)',
  },
  rev512: {
    l: 'Suspendarea executării în revizuire', temei: 'art. 512 C.proc.civ. (se aplică art. 484 în mod corespunzător)', barem: true,
    eticheta: 'Valoarea pentru care se cere suspendarea (lei)',
  },
  ep450: {
    l: 'Suspendarea executării provizorii a hotărârii atacate cu apel', temei: 'art. 450 alin. (4) C.proc.civ.', barem: true,
    eticheta: 'Valoarea pentru care se cere suspendarea (lei)',
    n: 'Cererea se judecă de instanța de apel. Până la soluționarea ei se poate cere suspendarea provizorie pe calea ordonanței președințiale, cu aceeași cerință a cauțiunii.',
    v: 'Art. 450 alin. (4) spune că cuantumul se stabilește de instanță „în condițiile art. 719 alin. (2) și (3)”; unele versiuni consolidate trimit la art. 718 (numerotarea dinainte de republicare). Verificați textul în vigoare.',
  },
  sech2: {
    l: 'Sechestru asigurător sau poprire asigurătorie – creanță neconstatată în scris', temei: 'art. 953 alin. (2) C.proc.civ.', jumatate: true,
    eticheta: 'Valoarea reclamată (lei)',
    n: 'Cauțiunea este obligatorie și se depune odată cu cererea de sechestru, alături de dovada introducerii acțiunii. Poprirea asigurătorie urmează aceleași reguli.',
  },
  sech1: {
    l: 'Sechestru asigurător sau poprire asigurătorie – creanță constatată în scris', temei: 'art. 953 alin. (1), (3) C.proc.civ.', fixataInstanta: true,
    eticheta: 'Valoarea creanței (lei)',
    n: 'Cuantumul cauțiunii îl fixează instanța; doctrina consideră că obligarea la cauțiune este lăsată la aprecierea judecătorului.',
    v: 'Plafonul de 20% din valoarea creanței apare în comentarii doctrinare, nu l-am găsit în textul legii – de verificat.',
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
    verif.push('Scutirea consumatorilor (Legea nr. 193/2000, modificată prin O.U.G. nr. 58/2022) – practica este neunitară asupra domeniului de aplicare (ex. Curtea de Apel Iași, minuta din iulie 2024: oricare consumator sau numai pentru motive întemeiate pe Legea nr. 193/2000).');
    if (!venit) return { lipsa: true, pasi: [...pasi, 'Introduceți venitul lunar al consumatorului.'], verif };
    if (venit <= 2 * sal.valoare) return { suma: 0, scutit: true, temei: 'Legea nr. 193/2000 (derogare de la art. 719 alin. (2)–(3) C.proc.civ., introdusă prin O.U.G. nr. 58/2022)', pasi: [...pasi, 'Veniturile lunare nu depășesc două salarii minime: consumatorul este scutit de cauțiune.'], verif };
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
  pasi.push('Cuantumul se fixează de instanță.');
  pasi.push(`Pentru orientare: 20% din ${lei(val)} = ${lei(val * 0.2)} (plafon doctrinar, neconfirmat în text).`);
  return { fixata: true, temei: t.temei, pasi, verif };
}

function cautText(r) {
  const t = CAUT_TIPURI[CA.tip];
  if (r.lipsa) return '';
  if (r.scutit) return `Cererea privind ${t.l.toLowerCase()} nu este condiționată de plata unei cauțiuni, întrucât petentul, consumator, a dovedit că veniturile sale lunare nu depășesc valoarea cumulată a două salarii minime pe economie (${r.temei}).`;
  if (r.fixata) return `Pentru ${t.l.toLowerCase()}, cuantumul cauțiunii se fixează de instanță (${r.temei}).`;
  return `Cauțiunea datorată pentru ${t.l.toLowerCase()} este de ${lei(r.suma)}, calculată potrivit ${r.temei}.`;
}

function viewCautiune() {
  const t = CAUT_TIPURI[CA.tip], r = cautCalcul(), v = CA.v;
  const text = cautText(r);
  return `
  <div class="callout" style="margin-bottom:14px"><p>Calcul după <b>art. 719 alin. (2)–(3) C.proc.civ.</b> (aplicabil și suspendării în recurs, contestație în anulare și revizuire – art. 484, 507, 512) și după <b>art. 953</b> pentru măsurile asigurătorii. Punctele marcate „de verificat” nu au putut fi confirmate din textul în vigoare.</p></div>
  <div class="grid-2">
    <div class="card">
      <h2>Pentru ce se cere cauțiunea</h2>
      <label class="field" style="margin-top:10px"><select data-cav="tip">${Object.entries(CAUT_TIPURI).map(([k, x]) => `<option value="${k}" ${k === CA.tip ? 'selected' : ''}>${h(x.l)}</option>`).join('')}</select></label>
      ${t.barem ? `<label class="field" style="margin-top:10px"><span>Obiectul</span><select data-cav="evaluabil"><option value="1" ${v.evaluabil === '1' ? 'selected' : ''}>Evaluabil în bani</option><option value="0" ${v.evaluabil !== '1' ? 'selected' : ''}>Neevaluabil în bani (1.000 lei)</option></select></label>` : ''}
      ${!t.barem || v.evaluabil === '1' ? `<label class="field" style="margin-top:10px"><span>${h(t.eticheta)}</span><input type="text" inputmode="decimal" data-cav="valoare" value="${h(v.valoare ?? '')}" placeholder="0"></label>` : ''}
      ${t.consumator ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px"><input type="checkbox" data-cav="consumator" ${v.consumator ? 'checked' : ''}><span>Contestatorul este consumator (contract cu un profesionist)</span></label>
        ${v.consumator ? `<label class="field" style="margin-top:8px"><span>Venitul lunar al consumatorului (lei)</span><input type="text" inputmode="decimal" data-cav="venit" value="${h(v.venit ?? '')}" placeholder="0"></label>
        <label class="field" style="margin-top:8px"><span>Data cererii (pentru salariul minim)</span><input type="date" data-cav="data" value="${h(v.data || azi())}"></label>
        <label class="field" style="margin-top:8px"><span>Salariul minim, dacă diferă (implicit ${lei(apjSalariu(v.data || azi()).valoare)})</span><input type="text" inputmode="decimal" data-cav="salManual" value="${h(v.salManual ?? '')}" placeholder="0"></label>` : ''}` : ''}
    </div>
    <div class="card">
      <span class="muted small">${h(t.temei)}</span>
      <h2 style="margin:4px 0 10px">${h(t.l)}</h2>
      <div class="calc-result" style="text-transform:none">${r.lipsa ? '—' : r.scutit ? 'Scutit de cauțiune' : r.fixata ? 'Fixată de instanță' : lei(r.suma)}</div>
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
