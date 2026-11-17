'use strict';
/* Verificarea condițiilor pentru ajutorul public judiciar în materie civilă (O.U.G. nr. 51/2008) și, pentru persoanele
   juridice, a facilităților la plata taxei de timbru (art. 42–44 O.U.G. nr. 80/2013).
   Pragurile art. 8 alin. (1)–(2), în forma dată de Legea nr. 31/2023 (în vigoare din 15.01.2023): venitul mediu net lunar
   pe membru de familie, în ultimele două luni anterioare cererii, sub 25% din salariul de bază minim brut pe țară –
   avans integral; sub 50% – avans în proporție de 50%. Explicațiile practice provin din planul de seminar INM
   „Taxele judiciare de timbru și asistența judiciară”. „de verificat” = neconfirmat din textul în vigoare. */

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

const APJ_REL = [
  ['solicitant', 'Solicitantul'],
  ['sot', 'Soț / soție'],
  ['copil', 'Copil sau alt descendent în întreținere'],
  ['alta', 'Altă persoană care locuiește și gospodărește împreună cu solicitantul'],
];
const APJ_FORME = [
  ['a', 'a) asistență juridică prin avocat'],
  ['b', 'b) plata expertului, traducătorului sau interpretului'],
  ['c', 'c) plata onorariului executorului judecătoresc'],
  ['d', 'd) scutiri, reduceri, eșalonări sau amânări de la plata taxelor judiciare (inclusiv în executarea silită)'],
];
const APJ_CHELT = [
  ['ch_intr', 'Obligații de întreținere plătite (ex. pensie pentru un copil din altă relație)'],
  ['ch_med', 'Cheltuieli medicale lunare (tratamente, medicamente)'],
  ['ch_copii', 'Cheltuieli cu creșterea și educarea copiilor minori'],
  ['ch_loc', 'Locuință: chirie sau rată'],
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
  membri: [{ rel: 'solicitant', varsta: '', impreuna: '1', v1: '', v2: '', sursa: '' }],
};
const anum = x => Math.max(0, Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
const r2 = n => Math.round(n * 100) / 100;

function apjCalcul() {
  const v = AP.v, sal = apjSalariu(v.data || azi(), v.salManual);
  const prag1 = r2(sal.valoare * 0.25), prag2 = r2(sal.valoare * 0.5);
  const membri = AP.membri.filter(m => m.rel === 'solicitant' || m.impreuna);
  const n = membri.length;
  const total1 = membri.reduce((s, m) => s + anum(m.v1), 0), total2 = membri.reduce((s, m) => s + anum(m.v2), 0);
  const mediu = r2((total1 + total2) / 2), pe = n ? r2(mediu / n) : 0;
  const chelt = APJ_CHELT.reduce((s, [k]) => s + anum(v[k]), 0);
  const costuri = APJ_COST.reduce((s, [k]) => s + anum(v[k]), 0);
  const costAC = anum(v.co_avocat) + anum(v.co_expert) + anum(v.co_exec);
  const plafon = 10 * sal.valoare, primit = anum(v.primit);
  const verif = [];
  const pasi = [
    `Membri de familie luați în calcul: ${n} (solicitantul și persoanele care locuiesc și gospodăresc împreună cu el / aflate în întreținerea lui – art. 5)`,
    `Venit net total al familiei: luna 1 – ${lei(total1)}, luna 2 – ${lei(total2)}; media lunară = ${lei(mediu)}`,
    `Venit mediu net lunar pe membru de familie: ${lei(mediu)} / ${n} = ${lei(pe)}`,
    `Salariul de bază minim brut pe țară: ${lei(sal.valoare)} (${sal.sursa}); 25% = ${lei(prag1)}; 50% = ${lei(prag2)}`,
  ];
  if (sal.lipsa) verif.push('Data cererii este anterioară perioadelor verificate: introduceți salariul minim brut de la data cererii.');
  if (AP.membri.some(m => m.rel === 'copil' && anum(m.varsta) >= 18 && m.impreuna)) verif.push('Descendenții majori se includ în familie numai în condițiile art. 5 din O.U.G. nr. 51/2008 – verificați textul.');
  if (AP.membri.some(m => m.rel !== 'solicitant' && !m.impreuna)) pasi.push('Persoanele care nu locuiesc și nu gospodăresc împreună cu solicitantul nu au fost luate în calcul.');
  let incadrare, proc = 0;
  if (!n || (!total1 && !total2 && !AP.membri.some(m => m.v1 !== '' || m.v2 !== ''))) incadrare = 'lipsa';
  else if (pe < prag1) { incadrare = 'integral'; proc = 100; }
  else if (pe < prag2) { incadrare = 'jumatate'; proc = 50; }
  else incadrare = 'alin3';
  return { sal, prag1, prag2, n, total1, total2, mediu, pe, chelt, costuri, costAC, plafon, primit, incadrare, proc, pasi, verif };
}

const APJ_VERDICT = {
  integral: ['ok', 'Îndeplinește condiția de venit – ajutorul se avansează integral de stat', 'art. 8 alin. (1) O.U.G. nr. 51/2008'],
  jumatate: ['u3', 'Îndeplinește condiția de venit – ajutorul se avansează de stat în proporție de 50%', 'art. 8 alin. (2) O.U.G. nr. 51/2008'],
  alin3: ['u2', 'Venitul depășește pragurile art. 8 alin. (1)–(2)', 'art. 8 alin. (3) O.U.G. nr. 51/2008 – acordarea rămâne la aprecierea instanței'],
};

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
  if (r.incadrare === 'alin3') linii.push('Petentul nu se încadrează în pragurile art. 8 alin. (1)–(2); ajutorul poate fi acordat numai în condițiile art. 8 alin. (3), dacă se reține că costurile procesului îi limitează accesul efectiv la justiție.');
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
    ${i ? `<div class="apj-rand" style="align-items:center"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-apm="${i}.impreuna" ${m.impreuna ? 'checked' : ''}><span>Locuiește și gospodărește împreună cu solicitantul / este în întreținerea lui</span></label><button class="btn sm ghost" data-act="apjScoate" data-i="${i}">Scoate</button></div>` : ''}
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
  <div class="callout" style="margin-bottom:14px"><p>Verificare după <b>O.U.G. nr. 51/2008</b> (persoane fizice), cu pragurile din <b>Legea nr. 31/2023</b>, și după <b>art. 42–44 O.U.G. nr. 80/2013</b> (persoane juridice). Rezultatul este orientativ: aprecierea finală aparține instanței. Punctele marcate „de verificat” nu au putut fi confirmate din textul în vigoare.</p></div>
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
        <p class="muted small" style="margin:6px 0 0">Se iau în calcul toate veniturile cu caracter periodic, nu doar cele impozabile (art. 9; plan de seminar INM), ale solicitantului și ale membrilor familiei (art. 5).</p>
        ${apjMembriHtml()}
      </div>
      <div class="card">
        <h2>Cheltuieli lunare</h2>
        <p class="muted small" style="margin:6px 0 0">Nu se scad din venit la pragurile art. 8 alin. (1)–(2); servesc aprecierii instanței (art. 8 alin. (3)) și se dovedesc cu înscrisuri.</p>
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
        ${r.incadrare === 'alin3' ? `<div class="callout small" style="margin-top:8px">Ajutorul poate fi acordat și în alte situații, proporțional cu necesitățile, dacă costurile certe sau estimate ale procesului sunt de natură să limiteze accesul efectiv la justiție (art. 8 alin. (3)). Indicatori pentru apreciere: costurile procesului = ${lei(r.costuri)} (${lunaVenit ? String(r2(r.costuri / lunaVenit)).replace('.', ',') + ' luni de venit al familiei' : '—'}); venitul familiei după cheltuielile lunare declarate = ${lei(Math.max(0, lunaVenit - r.chelt))}${r.n ? ` (${lei(Math.max(0, lunaVenit - r.chelt) / r.n)} pe membru)` : ''}.</div>` : ''}
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
          <li>Dreptul este strict personal (art. 10): la coparticipare, fiecare reclamant trebuie să îndeplinească singur condițiile. Ajutorul nu acoperă cauțiunea pentru suspendarea executării și nu scutește de cheltuielile de judecată ale celeilalte părți (art. 453 C.proc.civ.). Eșalonarea poate ajunge la cel mult 48 de rate lunare.</li>
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
function apjAdauga() { AP.membri.push({ rel: 'sot', varsta: '', impreuna: '1', v1: '', v2: '', sursa: '' }); rerender(); }
function apjPreiaTaxa() { AP.v.co_taxa = String(TX.cos.reduce((s, x) => s + x.suma, 0)).replace('.', ','); rerender(); }
