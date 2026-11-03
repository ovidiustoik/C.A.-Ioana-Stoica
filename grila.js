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
