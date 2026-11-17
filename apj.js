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
