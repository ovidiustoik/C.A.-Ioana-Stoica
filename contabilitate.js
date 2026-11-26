'use strict';
/* Contabilitatea în partidă simplă a cabinetului (neplătitor de TVA) – versiunea 1.
   - Registrul-jurnal de încasări și plăți (cod 14-1-1/b): nr. crt., data, documentul (fel, număr), explicații,
     încasări numerar / bancă, plăți numerar / bancă; totaluri lunare; tipărire și CSV. Sumele în valută se trec în lei,
     cu valoarea în valută la explicații, la cursul BNR din ultima zi bancară anterioară operațiunii.
   - Fiecare plată se marchează: deductibilă, nedeductibilă sau parțial deductibilă (cu suma deductibilă).
   - Termene: e-Factura, contribuția CAA, Declarația unică. Rezumat anual: încasări, plăți deductibile, diferența.
   Nu se calculează impozit sau contribuții. Modelul registrului și regulile de corectare din O.M.F.P. nr. 170/2015
   nu au putut fi confruntate cu textul oficial – vezi mențiunile „de verificat”. */

const DOC_FELURI = ['Chitanță', 'Factură', 'Extras de cont', 'Ordin de plată', 'Bon fiscal', 'Dispoziție de plată', 'Dispoziție de încasare', 'Contract', 'Alt document'];
const MONEDE = ['RON', 'EUR', 'USD', 'GBP', 'CHF'];
const DEDUCT = { da: 'Deductibilă', nu: 'Nedeductibilă', partial: 'Parțial deductibilă' };
const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

const r2c = n => Math.round((Number(n) || 0) * 100) / 100;
const lei2 = n => (Number(n) || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Înregistrările vechi aveau „method” liber (Bancă, Numerar, Card…): se citesc ca numerar sau bancă
const modalitate = l => l.modalitate || (/numerar/i.test(l.method || '') ? 'numerar' : 'banca');
const documentRand = l => (l.docFel ? `${l.docFel}${l.docNo ? ' nr. ' + l.docNo : ''}` : (l.docNo || ''));
const explicatii = l => {
  let t = l.description || '';
  if (l.valuta && l.valuta.moneda && l.valuta.moneda !== 'RON' && l.valuta.suma) {
    t += ` (${lei2(l.valuta.suma)} ${l.valuta.moneda} × ${String(l.valuta.curs).replace('.', ',')} lei, curs BNR din ${fmtDate(l.valuta.dataCurs, { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
  }
  return t;
};
// Suma deductibilă a unei plăți (încasările nu au)
const deductibil = l => {
  if (l.type !== 'plata' || (l.deductibil || 'da') === 'nu') return 0;
  const a = Number(l.amount) || 0;
  if (l.deductibil !== 'partial') return r2c(a);
  return r2c(Math.sign(a) * Math.min(Math.abs(Number(l.sumaDeductibila) || 0), Math.abs(a)));
};

// Ultima zi bancară anterioară unei date (BNR nu publică cursul în weekend și în zilele de sărbătoare legală)
function ziBancaraAnterioara(data) {
  let d = addDays(data, -1);
  while (isNonWorking(d)) d = addDays(d, -1);
  return d;
}
function adaugaZileLucratoare(data, n) {
  let d = data, k = 0;
  while (k < n) { d = addDays(d, 1); if (!isNonWorking(d)) k++; }
  return d;
}

// Înregistrările unui an, în ordine cronologică, cu numărul curent și semnul (stornările sunt negative)
function registruAn(an) {
  const lista = S.ledger.filter(l => (l.date || '').startsWith(String(an)))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
  return lista.map((l, i) => {
    const s = r2c(l.amount), m = modalitate(l);
    return { l, nr: i + 1, incNum: l.type === 'incasare' && m === 'numerar' ? s : 0, incBanca: l.type === 'incasare' && m === 'banca' ? s : 0,
      platNum: l.type === 'plata' && m === 'numerar' ? s : 0, platBanca: l.type === 'plata' && m === 'banca' ? s : 0, ded: deductibil(l) };
  });
}
const sumeRanduri = rs => rs.reduce((t, r) => ({ incNum: r2c(t.incNum + r.incNum), incBanca: r2c(t.incBanca + r.incBanca), platNum: r2c(t.platNum + r.platNum), platBanca: r2c(t.platBanca + r.platBanca), ded: r2c(t.ded + r.ded) }), { incNum: 0, incBanca: 0, platNum: 0, platBanca: 0, ded: 0 });

// Registrul pe luni: [{ luna, randuri, total }]
function registruPeLuni(an) {
  const rs = registruAn(an), luni = [];
  for (let m = 1; m <= 12; m++) {
    const randuri = rs.filter(r => Number(r.l.date.slice(5, 7)) === m);
    if (randuri.length) luni.push({ luna: m, randuri, total: sumeRanduri(randuri) });
  }
  return { luni, total: sumeRanduri(rs) };
}

/* ---------- formularul înregistrării ---------- */
function ledgerForm(l = {}) {
  const v0 = l.valuta || {};
  openForm({
    title: l.id ? 'Înregistrare în registrul-jurnal' : 'Înregistrare nouă în registrul-jurnal',
    intro: 'Sumele în valută se trec în lei, la cursul BNR din ultima zi bancară anterioară operațiunii; valoarea în valută apare la explicații.',
    values: { type: 'incasare', date: today(), modalitate: modalitate(l), docFel: l.docFel || (l.docNo ? 'Alt document' : 'Chitanță'), moneda: v0.moneda || 'RON', sumaValuta: v0.suma ?? '', curs: v0.curs ?? '', deductibil: l.deductibil || 'da', ...l },
    fields: [
      { name: 'type', label: 'Tip', type: 'select', options: [['incasare', 'Încasare'], ['plata', 'Plată']] },
      { name: 'date', label: 'Data operațiunii', type: 'date', required: true },
      { name: 'modalitate', label: 'Numerar sau bancă', type: 'select', options: [['numerar', 'Numerar'], ['banca', 'Bancă']] },
      { name: 'docFel', label: 'Documentul – felul', type: 'select', options: DOC_FELURI.map(d => [d, d]) },
      { name: 'docNo', label: 'Documentul – numărul' },
      { name: 'description', label: 'Explicații', required: true, wide: true, placeholder: 'ex. Onorariu contract asistență juridică nr. 12/2026; Cotizație barou; Chirie sediu' },
      { name: 'moneda', label: 'Moneda', type: 'select', options: MONEDE.map(m => [m, m]) },
      { name: 'sumaValuta', label: 'Suma în valută (dacă nu e în lei)', type: 'number', min: 0 },
      { name: 'curs', label: 'Cursul BNR (lei pentru o unitate)', type: 'number', min: 0, step: '0.0001', hint: 'Cursul din ultima zi bancară anterioară datei operațiunii – aplicația arată data după salvare; cursurile se găsesc pe bnr.ro.' },
      { name: 'amount', label: 'Suma în lei', type: 'number', min: 0, hint: 'La valută se calculează singură: suma în valută × cursul.' },
      { name: 'deductibil', label: 'Plata este (doar pentru plăți)', type: 'select', options: Object.entries(DEDUCT) },
      { name: 'sumaDeductibila', label: 'Suma deductibilă, la plata parțial deductibilă (lei)', type: 'number', min: 0 },
      { name: 'clientId', label: 'Client', type: 'select', options: clientOptions() },
      { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions(), wide: true },
    ],
    onSave: v => {
      const rec = { ...l, type: v.type, date: v.date, modalitate: v.modalitate, method: v.modalitate === 'numerar' ? 'Numerar' : 'Bancă', docFel: v.docFel, docNo: v.docNo, description: v.description, clientId: v.clientId, caseId: v.caseId };
      if (v.moneda !== 'RON') {
        if (!(Number(v.sumaValuta) > 0) || !(Number(v.curs) > 0)) throw new Error('Pentru valută completați suma în valută și cursul BNR.');
        rec.valuta = { moneda: v.moneda, suma: Number(v.sumaValuta), curs: Number(v.curs), dataCurs: ziBancaraAnterioara(v.date) };
        rec.amount = r2c(Number(v.sumaValuta) * Number(v.curs));
      } else {
        delete rec.valuta;
        if (!(Number(v.amount) > 0)) throw new Error('Completați suma în lei.');
        rec.amount = r2c(v.amount);
      }
      if (v.type === 'plata') {
        rec.deductibil = v.deductibil;
        rec.sumaDeductibila = v.deductibil === 'partial' ? r2c(v.sumaDeductibila) : '';
        if (v.deductibil === 'partial' && !(rec.sumaDeductibila > 0 && rec.sumaDeductibila <= rec.amount)) throw new Error('La plata parțial deductibilă, suma deductibilă trebuie să fie între 0 și suma plății.');
      } else { delete rec.deductibil; delete rec.sumaDeductibila; }
      return save('ledger', rec);
    },
    onDelete: l.id ? () => remove('ledger', l.id) : null,
  });
}

// Corectarea prin stornare: se adaugă o înregistrare în minus, cu trimitere la cea corectată
async function stornare(id) {
  const l = byId('ledger', id);
  if (!l) return;
  const nr = registruAn(l.date.slice(0, 4)).find(r => r.l.id === id)?.nr;
  if (!confirm(`Stornați înregistrarea nr. ${nr} din ${fmtDate(l.date)} (${lei2(l.amount)} lei)? Se adaugă azi o înregistrare cu aceeași sumă, în minus.`)) return;
  await save('ledger', { ...l, id: undefined, createdAt: undefined, date: today(), amount: -Math.abs(r2c(l.amount)), sumaDeductibila: l.sumaDeductibila ? -Math.abs(l.sumaDeductibila) : '', valuta: l.valuta ? { ...l.valuta, suma: -Math.abs(l.valuta.suma) } : undefined, description: `Stornare înregistrare nr. ${nr} din ${fmtDate(l.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}: ${l.description}`, storno: id, facturaId: '' });
  toast('Stornare adăugată.');
  rerender();
}

/* ---------- Registrul-jurnal ---------- */
function viewLedger() {
  const y = String(UI.ledgerYear);
  const ani = [...new Set([new Date().getFullYear(), ...S.ledger.map(l => Number((l.date || '').slice(0, 4)))].filter(Boolean))].sort((a, b) => b - a);
  const { luni, total } = registruPeLuni(y);
  const cel = n => (n ? lei2(n) : '');
  return `
  <div class="toolbar">
    <select data-filter="ledgerYear">${ani.map(v => `<option value="${v}" ${String(v) === y ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <span class="muted small">Registrul-jurnal de încasări și plăți – cod 14-1-1/b</span>
    <span class="spacer"></span>
    <button class="btn" data-act="tiparesteRegistru">Tipărește</button>
    <button class="btn" data-act="exportCsv">CSV (Excel)</button>
    <button class="btn primary" data-act="newLedger">＋ Înregistrare</button>
  </div>
  <div class="stats">
    <div class="stat"><b>${money(total.incNum + total.incBanca)}</b><span>încasări ${y} (numerar ${lei2(total.incNum)} · bancă ${lei2(total.incBanca)})</span></div>
    <div class="stat"><b>${money(total.platNum + total.platBanca)}</b><span>plăți ${y} (numerar ${lei2(total.platNum)} · bancă ${lei2(total.platBanca)})</span></div>
    <div class="stat"><b>${money(total.ded)}</b><span>din care plăți deductibile</span></div>
  </div>
  <div class="card table-wrap">
    ${luni.length ? `<table class="registru"><thead>
      <tr><th rowspan="2">Nr. crt.</th><th rowspan="2">Data</th><th rowspan="2">Documentul (felul, numărul)</th><th rowspan="2">Explicații</th><th colspan="2" class="num">Încasări</th><th colspan="2" class="num">Plăți</th><th rowspan="2"></th></tr>
      <tr><th class="num">numerar</th><th class="num">bancă</th><th class="num">numerar</th><th class="num">bancă</th></tr></thead>
      ${luni.map(m => `<tbody>${m.randuri.map(r => `<tr class="${r.l.storno ? 'storno' : ''}">
        <td>${r.nr}</td><td class="nowrap">${fmtDate(r.l.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td><td>${h(documentRand(r.l))}</td>
        <td>${h(explicatii(r.l))}${r.l.type === 'plata' ? `<br><span class="pill ${(r.l.deductibil || 'da') === 'nu' ? 'u1' : r.l.deductibil === 'partial' ? 'u2' : 'ok'}">${DEDUCT[r.l.deductibil || 'da']}${r.l.deductibil === 'partial' ? ' – ' + lei2(r.l.sumaDeductibila) + ' lei' : ''}</span>` : ''}${r.l.clientId ? ` <span class="muted small">${h(clientName(r.l.clientId))}</span>` : ''}</td>
        <td class="num">${cel(r.incNum)}</td><td class="num">${cel(r.incBanca)}</td><td class="num">${cel(r.platNum)}</td><td class="num">${cel(r.platBanca)}</td>
        <td class="nowrap"><button class="icon-btn" data-act="editLedger" data-id="${r.l.id}" title="Modifică" aria-label="Modifică">✎</button>${r.l.storno ? '' : `<button class="icon-btn" data-act="stornare" data-id="${r.l.id}" title="Stornează (corectare prin înregistrare în minus)" aria-label="Stornează">↺</button>`}</td></tr>`).join('')}
        <tr class="total-luna"><td colspan="4">Total ${LUNI[m.luna - 1]} ${y}</td><td class="num">${lei2(m.total.incNum)}</td><td class="num">${lei2(m.total.incBanca)}</td><td class="num">${lei2(m.total.platNum)}</td><td class="num">${lei2(m.total.platBanca)}</td><td></td></tr></tbody>`).join('')}
      <tfoot><tr><td colspan="4">Total ${y}</td><td class="num">${lei2(total.incNum)}</td><td class="num">${lei2(total.incBanca)}</td><td class="num">${lei2(total.platNum)}</td><td class="num">${lei2(total.platBanca)}</td><td></td></tr></tfoot></table>`
    : empty('Nicio înregistrare în ' + y + '.')}
  </div>
  <div class="callout warn small"><span class="pill u2">de verificat</span> Coloanele urmează modelul 14-1-1/b descris în O.M.F.P. nr. 170/2015, după surse secundare; textul oficial al modelului și al regulilor de corectare nu a putut fi consultat. Corectarea se face prin „Stornează” (înregistrare în minus, cu trimitere la cea corectată), iar „Modifică” rămâne pentru greșelile de introducere de dinaintea tipăririi.</div>`;
}

function registruTiparire() {
  const y = String(UI.ledgerYear), cab = dateCabinet(), { luni, total } = registruPeLuni(y);
  const w = window.open('', '_blank');
  if (!w) return toast('Permiteți ferestrele noi (pop-up) pentru tipărire.');
  const rand = (c, cls = '') => `<tr class="${cls}">${c.map((x, i) => `<td class="${i >= 4 ? 'n' : ''}">${x}</td>`).join('')}</tr>`;
  w.document.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Registrul-jurnal de încasări și plăți ${y}</title>
  <style>@page{size:A4 landscape;margin:12mm}body{font:11px/1.35 Arial,sans-serif;color:#000}h1{font-size:15px;margin:0}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #000;padding:3px 5px;vertical-align:top}th{background:#eee}td.n{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;background:#f4f4f4}.cap{display:flex;justify-content:space-between}</style></head><body>
  <div class="cap"><div><b>${h(cab.denumireOficiala || cab.denumire || '')}</b><br>CIF: ${h(cab.cif || '')}<br>${h(cab.sediu || '')}</div><div style="text-align:right">Cod 14-1-1/b</div></div>
  <h1 style="text-align:center;margin-top:8px">REGISTRUL-JURNAL DE ÎNCASĂRI ȘI PLĂȚI</h1><div style="text-align:center">Anul ${y}</div>
  <table><thead><tr><th rowspan="2">Nr. crt.</th><th rowspan="2">Data</th><th rowspan="2">Documentul (felul, numărul)</th><th rowspan="2">Felul operațiunii (explicații)</th><th colspan="2">Încasări</th><th colspan="2">Plăți</th></tr><tr><th>numerar</th><th>bancă</th><th>numerar</th><th>bancă</th></tr></thead><tbody>
  ${luni.map(m => m.randuri.map(r => rand([r.nr, fmtDate(r.l.date, { day: '2-digit', month: '2-digit', year: 'numeric' }), h(documentRand(r.l)), h(explicatii(r.l)), r.incNum ? lei2(r.incNum) : '', r.incBanca ? lei2(r.incBanca) : '', r.platNum ? lei2(r.platNum) : '', r.platBanca ? lei2(r.platBanca) : ''])).join('') +
    rand(['', '', '', `Total ${LUNI[m.luna - 1]}`, lei2(m.total.incNum), lei2(m.total.incBanca), lei2(m.total.platNum), lei2(m.total.platBanca)], 't')).join('')}
  ${rand(['', '', '', `Total anul ${y}`, lei2(total.incNum), lei2(total.incBanca), lei2(total.platNum), lei2(total.platBanca)], 't')}
  </tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

function exportCsv() {
  const y = String(UI.ledgerYear), { luni, total } = registruPeLuni(y);
  const n = x => (x ? lei2(x).replace(/\./g, '') : '');
  const rows = [['Nr. crt.', 'Data', 'Documentul (felul, numărul)', 'Explicații', 'Încasări numerar', 'Încasări bancă', 'Plăți numerar', 'Plăți bancă', 'Deductibilitate', 'Suma deductibilă']];
  for (const m of luni) {
    for (const r of m.randuri) rows.push([r.nr, fmtDate(r.l.date, { day: '2-digit', month: '2-digit', year: 'numeric' }), documentRand(r.l), explicatii(r.l), n(r.incNum), n(r.incBanca), n(r.platNum), n(r.platBanca), r.l.type === 'plata' ? DEDUCT[r.l.deductibil || 'da'] : '', r.l.type === 'plata' ? n(r.ded) : '']);
    rows.push(['', '', '', `Total ${LUNI[m.luna - 1]} ${y}`, n(m.total.incNum) || '0', n(m.total.incBanca) || '0', n(m.total.platNum) || '0', n(m.total.platBanca) || '0', '', n(m.total.ded) || '0']);
  }
  rows.push(['', '', '', `Total ${y}`, n(total.incNum) || '0', n(total.incBanca) || '0', n(total.platNum) || '0', n(total.platBanca) || '0', '', n(total.ded) || '0']);
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(`registru-jurnal-incasari-plati-${y}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
}

/* ---------- Termene ---------- */
function termeneContabile(azi = today()) {
  const out = [];
  // e-Factura: 5 zile lucrătoare de la emitere, pentru facturile emise netrimise încă în SPV
  for (const f of S.facturi.filter(f => f.tip === 'emisa' && ['ciorna', 'semnata'].includes(f.stare || 'ciorna'))) {
    out.push({ data: adaugaZileLucratoare(f.data, 5), titlu: `Transmiterea în e-Factura a facturii ${f.numar} (${f.partener?.nume || ''})`, temei: 'art. 10 alin. (7) O.U.G. nr. 120/2021 – 5 zile lucrătoare de la emitere', facturaId: f.id });
  }
  // CAA: ziua de 25 a lunii următoare, pentru luna curentă și pentru luna anterioară
  const [y, m] = azi.split('-').map(Number);
  for (const dm of [-1, 0]) {
    const luna = new Date(y, m - 1 + dm, 1), urm = new Date(luna.getFullYear(), luna.getMonth() + 1, 25);
    out.push({ data: ymd(urm), titlu: `Contribuția CAA pentru luna ${LUNI[luna.getMonth()]} ${luna.getFullYear()}`, temei: 'termen indicat de dumneavoastră – de verificat în reglementarea CAA', verif: true });
  }
  // Declarația unică: 25 mai a anului următor celui de raportare
  const anDu = azi.slice(5) > '05-25' ? y + 1 : y;
  out.push({ data: `${anDu}-05-25`, titlu: `Declarația unică pentru veniturile din ${anDu - 1}`, temei: 'art. 122 Cod fiscal – depunere și plată până la 25 mai inclusiv' });
  return out.map(t => ({ ...t, zile: diffDays(azi, t.data), nelucratoare: isNonWorking(t.data) })).sort((a, b) => a.data.localeCompare(b.data));
}

function viewTermene() {
  const t0 = today(), lista = termeneContabile(t0).filter(t => t.zile >= -31);
  return `<div class="card table-wrap">
    <table><thead><tr><th>Termen</th><th>Obligația</th><th>Temei</th><th class="num">Zile rămase</th></tr></thead><tbody>
    ${lista.map(t => `<tr><td class="nowrap"><b>${fmtDate(t.data, { day: 'numeric', month: 'short', year: 'numeric' })}</b>${t.nelucratoare ? `<br><span class="small red">zi nelucrătoare${holidayName(t.data) ? ' – ' + h(holidayName(t.data)) : ''}</span>` : ''}</td>
      <td>${h(t.titlu)}${t.facturaId ? ` <a href="#" data-act="editFactura" data-id="${t.facturaId}" class="small">deschide factura</a>` : ''}</td>
      <td class="small">${h(t.temei)}${t.verif ? ' <span class="pill u2">de verificat</span>' : ''}</td>
      <td class="num ${t.zile < 0 ? 'red' : ''}">${t.zile < 0 ? 'depășit cu ' + -t.zile : t.zile}</td></tr>`).join('')}
    </tbody></table>
  </div>
  <div class="callout small">Zilele lucrătoare exclud weekendurile și sărbătorile legale (art. 139 Codul muncii: 1–2 ianuarie, 6 și 7 ianuarie, 24 ianuarie, Vinerea Mare, Paștele și a doua zi, 1 mai, 1 iunie, Rusaliile și a doua zi, 15 august, 30 noiembrie, 1 decembrie, 25–26 decembrie), plus zilele adăugate în Setări. <span class="pill u2">de verificat</span> Termenul e-Factura are și o limită: cel mult 5 zile lucrătoare de la termenul de emitere (ziua de 15 a lunii următoare, art. 319 alin. (16) Cod fiscal). Când un termen cade într-o zi nelucrătoare, aplicația îl semnalează, dar nu îl mută: regula de prelungire nu a fost verificată.</div>`;
}

/* ---------- Rezumat anual ---------- */
function rezumatAn(an) {
  const { luni, total } = registruPeLuni(an);
  const inc = r2c(total.incNum + total.incBanca), plati = r2c(total.platNum + total.platBanca);
  return { luni, inc, plati, ded: total.ded, neded: r2c(plati - total.ded), dif: r2c(inc - total.ded) };
}

function viewRezumat() {
  const y = String(UI.ledgerYear), r = rezumatAn(y);
  const ani = [...new Set([new Date().getFullYear(), ...S.ledger.map(l => Number((l.date || '').slice(0, 4)))].filter(Boolean))].sort((a, b) => b - a);
  return `<div class="toolbar"><select data-filter="ledgerYear">${ani.map(v => `<option value="${v}" ${String(v) === y ? 'selected' : ''}>${v}</option>`).join('')}</select><span class="muted small">Rezumat calculat din registrul-jurnal</span></div>
  <div class="stats">
    <div class="stat"><b>${money(r.inc)}</b><span>încasări ${y}</span></div>
    <div class="stat"><b>${money(r.ded)}</b><span>plăți deductibile</span></div>
    <div class="stat"><b>${money(r.dif)}</b><span>diferența (încasări − plăți deductibile)</span></div>
    <div class="stat"><b>${money(r.neded)}</b><span>plăți nedeductibile</span></div>
  </div>
  <div class="card table-wrap"><table><thead><tr><th>Luna</th><th class="num">Încasări</th><th class="num">Plăți</th><th class="num">Plăți deductibile</th><th class="num">Diferența</th></tr></thead><tbody>
    ${r.luni.map(m => { const i = r2c(m.total.incNum + m.total.incBanca), p = r2c(m.total.platNum + m.total.platBanca); return `<tr><td>${LUNI[m.luna - 1]}</td><td class="num">${lei2(i)}</td><td class="num">${lei2(p)}</td><td class="num">${lei2(m.total.ded)}</td><td class="num">${lei2(i - m.total.ded)}</td></tr>`; }).join('') || `<tr><td colspan="5">${empty('Nicio înregistrare în ' + y + '.')}</td></tr>`}
  </tbody><tfoot><tr><td>Total ${y}</td><td class="num">${lei2(r.inc)}</td><td class="num">${lei2(r.plati)}</td><td class="num">${lei2(r.ded)}</td><td class="num">${lei2(r.dif)}</td></tr></tfoot></table></div>
  <p class="small muted">Versiunea 1 nu calculează impozitul pe venit sau contribuțiile. Diferența este doar încasări minus plăți marcate deductibile (inclusiv partea deductibilă a plăților parțial deductibile).</p>`;
}

/* ---------- reamintirea copiei de siguranță ---------- */
function ultimaModificare() {
  let t = 0;
  for (const s of STORES) if (s !== 'files' && s !== 'settings') for (const x of S[s] || []) t = Math.max(t, x.updatedAt || 0);
  return t;
}
function backupBanner() {
  const t = ultimaModificare();
  if (!t) return '';
  const ultima = setting('lastBackupAt', 0);
  if (ultima && ultima >= t) return '';
  return `<div class="callout warn backup-banner"><b>Aveți modificări care nu sunt în nicio copie de siguranță.</b> ${ultima ? 'Ultima copie: ' + new Date(ultima).toLocaleString('ro-RO') + '.' : 'Nu ați făcut încă nicio copie.'} Datele sunt păstrate doar în acest browser. <button class="btn sm" data-act="backup">Descarcă copia (JSON)</button></div>`;
}
