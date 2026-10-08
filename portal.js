'use strict';
/* Legătura cu portal.just.ro: serviciul public de interogare portalquery.just.ro (SOAP, operațiunea
   CautareDosare). Cererea pleacă din aplicația desktop (window.desktop.portal); din browser portalul
   nu poate fi interogat direct. */

const portalAvailable = () => !!window.desktop?.portal;
const RE_NR_DOSAR = /^\d{1,7}\/\d{1,4}\/\d{4}\**(\/[a-z]{1,3}\d*(\.\d+)*)?$/i;
const xmlEsc = s => String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function soapEnv(op, inner) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${op} xmlns="portalquery.just.ro">${inner}</${op}></soap:Body></soap:Envelope>`;
}
const pKid = (el, name) => (el ? [...el.children].find(c => c.localName === name) : null);
const pTxt = (el, name) => (pKid(el, name)?.textContent || '').trim();
const pKids = (el, name, sub) => { const c = pKid(el, name); return c ? [...c.children].filter(x => x.localName === sub) : []; };

// „Judecatoria CURTEA DE ARGES”, „JudecatoriaCURTEADEARGES” și „Judecătoria Curtea de Argeș” sunt aceeași instanță
const instKey = s => norm(s).replace(/[^a-z0-9]/g, '');
// Portalul scrie localitățile fără spații și diacritice („JudecatoriaCURTEADEARGES”); pentru cele din zonă
// avem forma corectă, celelalte rămân ca pe portal.
const LOCALITATI = { CURTEADEARGES: 'Curtea de Argeș', PITESTI: 'Pitești', ARGES: 'Argeș', CAMPULUNG: 'Câmpulung', COSTESTI: 'Costești', TOPOLOVENI: 'Topoloveni', MIOVENI: 'Mioveni' };
const instName = s => {
  const m = String(s || '').match(/^(Judecatoria|Tribunalul|CurteadeApel|Curtea\s*de\s*Apel)\s*(.*)$/i);
  if (!m) return String(s || '').trim();
  const tip = /^jud/i.test(m[1]) ? 'Judecătoria' : /^trib/i.test(m[1]) ? 'Tribunalul' : 'Curtea de Apel';
  const loc = m[2].trim();
  return `${tip} ${LOCALITATI[loc.toUpperCase().replace(/\s+/g, '')] || loc}`;
};

function parsePortal(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  const fault = xml.getElementsByTagNameNS('*', 'Fault')[0];
  if (fault) throw new Error('Portalul a refuzat cererea: ' + (pTxt(fault, 'faultstring') || 'eroare necunoscută'));
  return [...xml.getElementsByTagNameNS('*', 'Dosar')].map(el => ({
    numar: pTxt(el, 'numar'), institutie: pTxt(el, 'institutie'), obiect: pTxt(el, 'obiect'),
    categorie: pTxt(el, 'categorieCazNume') || pTxt(el, 'categorieCaz'),
    stadiu: pTxt(el, 'stadiuProcesualNume') || pTxt(el, 'stadiuProcesual'),
    data: pTxt(el, 'data').slice(0, 10), dataModificare: pTxt(el, 'dataModificare'), departament: pTxt(el, 'departament'),
    parti: pKids(el, 'parti', 'DosarParte').map(p => ({ nume: pTxt(p, 'nume'), calitate: pTxt(p, 'calitateParte') })),
    caiAtac: pKids(el, 'caiAtac', 'DosarCaleAtac').map(c => ({ data: pTxt(c, 'dataDeclarare').slice(0, 10), parte: pTxt(c, 'parteDeclaratoare'), tip: pTxt(c, 'tipCaleAtac') })),
    sedinte: pKids(el, 'sedinte', 'DosarSedinta').map(s => ({
      complet: pTxt(s, 'complet'), data: pTxt(s, 'data').slice(0, 10), ora: pTxt(s, 'ora').slice(0, 5),
      solutie: pTxt(s, 'solutie'), solutieSumar: pTxt(s, 'solutieSumar'),
      dataPronuntare: pTxt(s, 'dataPronuntare').slice(0, 10), document: pTxt(s, 'documentSedinta'),
      numarDocument: pTxt(s, 'numarDocument'), dataDocument: pTxt(s, 'dataDocument').slice(0, 10),
    })),
  }));
}

// Refuzul portalului (403 / pagină de protecție): nu insistăm cu alte cereri.
const isBlocked = msg => /\b403\b|refuzat toate variantele/i.test(String(msg));

async function portalSearch(numar) {
  if (!portalAvailable()) throw new Error('Legătura cu portalul funcționează doar în aplicația desktop.');
  let xml;
  try {
    xml = await window.desktop.portal('CautareDosare', soapEnv('CautareDosare', `<numarDosar>${xmlEsc(numar)}</numarDosar>`));
  } catch (err) {
    const detaliu = String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    const e = new Error(isBlocked(detaliu)
      ? 'Portalul instanțelor a refuzat interogarea automată (pagină de protecție anti-robot, eroarea 403). Nu ține de aplicație; încercați mai târziu sau consultați dosarul direct pe portal.just.ro.'
      : detaliu);
    e.detaliu = detaliu;
    e.blocat = isBlocked(detaliu);
    throw e;
  }
  return parsePortal(xml);
}

// Același număr poate apărea la mai multe instanțe (de ex. fond și apel).
function chooseResult(results) {
  return new Promise(resolve => {
    let chosen = null;
    openForm({
      title: 'Dosarul apare la mai multe instanțe',
      intro: 'Alegeți instanța la care urmăriți dosarul. Alegerea se reține pentru actualizările următoare.',
      fields: [{ name: 'i', label: 'Instanța', type: 'select', wide: true, options: results.map((r, i) => [String(i), `${instName(r.institutie)} · ${r.stadiu || '—'} · ${r.obiect || ''}`]) }],
      submit: 'Alege',
      onSave: async v => { chosen = results[Number(v.i)]; },
    });
    $('#modal').addEventListener('close', () => resolve(chosen), { once: true });
  });
}

function matchStage(stadiu) {
  const k = norm(stadiu);
  return STAGES.find(s => norm(s) === k) || '';
}

/* Aplică datele din portal: completează câmpurile goale, actualizează termenele și semnalează noutățile.
   Notele, clientul, onorariul și celelalte date introduse de mână rămân neatinse. */
async function applyPortal(c, p) {
  const first = !c.portal;
  const known = new Set((c.portal?.sedinte || []).map(s => s.data + '|' + s.solutie));
  const stats = { termeneNoi: 0, solutiiNoi: 0 };
  c.number = c.number || p.numar;
  c.court = c.court || instName(p.institutie);
  c.portalInst = p.institutie;
  if (!c.object && p.obiect) c.object = p.obiect;
  const st = matchStage(p.stadiu);
  if (st) c.stage = st;
  const sed = [...p.sedinte].filter(s => s.data).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
  if (sed.length && sed[sed.length - 1].complet) c.panel = sed[sed.length - 1].complet;
  c.portal = { ...p, sedinte: sed, la: Date.now() };
  await save('cases', c);

  for (const s of sed) {
    const existing = S.events.find(e => e.caseId === c.id && e.portal && e.date === s.data)
      || S.events.find(e => e.caseId === c.id && e.type === 'termen' && e.date === s.data && !e.portal);
    const note = [s.complet && 'Complet: ' + s.complet, s.solutie && 'Soluție: ' + s.solutie, s.solutieSumar].filter(Boolean).join('\n');
    // notele scrise de mână rămân în „note”; informațiile de pe portal stau separat, în „portalNote”
    if (existing) {
      await save('events', { ...existing, time: s.ora || existing.time, portal: true, portalNote: note });
    } else {
      await save('events', { title: `Termen ${c.number}`, date: s.data, time: s.ora, type: 'termen', caseId: c.id, location: c.court, note: '', portalNote: note, portal: true });
      if (!first && s.data >= today()) stats.termeneNoi++;
    }
    if (!first && s.solutie && !known.has(s.data + '|' + s.solutie)) {
      stats.solutiiNoi++;
      await save('tasks', {
        title: `Soluție nouă pe portal: ${c.number} – ${s.solutie}`, due: today(), urgency: 2, caseId: c.id, done: false,
        note: [s.solutieSumar, s.document && `${s.document} nr. ${s.numarDocument || '—'} din ${s.dataDocument ? fmtDate(s.dataDocument) : '—'}`].filter(Boolean).join('\n'),
      });
    }
  }
  return stats;
}

// Actualizările rulează strict una după alta (cea automată de la pornire și cele cerute de mână
// nu au voie să se suprapună, altfel termenele s-ar adăuga de două ori).
let _portalQueue = Promise.resolve();
function syncCase(c, opts = {}) {
  const run = () => syncCaseNow({ ...(c.id && byId('cases', c.id) || c) }, opts);
  const r = _portalQueue.then(run, run);
  _portalQueue = r.catch(() => {});
  return r;
}

async function syncCaseNow(c, { interactive = true } = {}) {
  if (!c.number || !RE_NR_DOSAR.test(c.number.trim())) throw new Error('Numărul dosarului lipsește sau nu are formatul 1234/211/2026.');
  const res = await portalSearch(c.number.trim());
  if (!res.length) throw new Error(`Dosarul ${c.number} nu a fost găsit pe portal.`);
  let p = res.find(r => c.portalInst && instKey(r.institutie) === instKey(c.portalInst))
    || res.find(r => c.court && instKey(r.institutie) === instKey(c.court))
    || (res.length === 1 ? res[0] : null);
  if (!p && interactive) p = await chooseResult(res);
  if (!p) throw new Error(`Dosarul ${c.number} apare la mai multe instanțe; deschideți-l și apăsați „Actualizează de pe portal”.`);
  return applyPortal(c, p);
}

const plural2 = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summary = st => [st.termeneNoi && plural2(st.termeneNoi, 'termen nou', 'termene noi'), st.solutiiNoi && plural2(st.solutiiNoi, 'soluție nouă', 'soluții noi')].filter(Boolean).join(', ');

function portalUnavailable() {
  openForm({
    title: 'Legătura cu portal.just.ro',
    intro: `<p>Preluarea datelor de pe portal funcționează în <b>aplicația desktop</b> „Cabinet Stoica”. Serviciul portalului nu poate fi apelat direct dintr-o pagină web.</p><p>Din browser puteți căuta manual dosarul pe <a href="https://portal.just.ro" target="_blank" rel="noopener">portal.just.ro</a>.</p>`,
    fields: [], submit: 'Am înțeles', onSave: async () => {},
  });
}

async function portalSyncOne(id) {
  if (!portalAvailable()) return portalUnavailable();
  const c = byId('cases', id);
  toast('Se preiau datele de pe portal…');
  try {
    const st = await syncCase({ ...c });
    toast(summary(st) ? 'Actualizat: ' + summary(st) + '.' : 'Dosar actualizat de pe portal.');
  } catch (err) { toast(err.message); }
  rerender();
}

let _syncRunning = false;
async function portalSyncAll({ quiet = false } = {}) {
  if (!portalAvailable()) return quiet ? null : portalUnavailable();
  if (_syncRunning) return;
  _syncRunning = true;
  const list = S.cases.filter(c => c.status === 'activ' && c.number && RE_NR_DOSAR.test(c.number.trim()));
  const tot = { termeneNoi: 0, solutiiNoi: 0 }, errors = [];
  let blocat = false;
  if (!quiet) toast(`Se actualizează ${plural2(list.length, 'dosar', 'dosare')} de pe portal…`);
  for (const c of list) {
    try {
      const st = await syncCase({ ...c }, { interactive: false });
      tot.termeneNoi += st.termeneNoi; tot.solutiiNoi += st.solutiiNoi;
    } catch (err) {
      errors.push(err.message);
      if (err.blocat) { blocat = true; break; } // protecția portalului: oprim, ca să nu agravăm blocarea
    }
    await new Promise(r => setTimeout(r, 600)); // nu suprasolicităm portalul
  }
  _syncRunning = false;
  await setSetting('portalLastSync', today());
  const msg = summary(tot);
  if (blocat) toast('Portalul instanțelor refuză momentan interogările automate (403). Actualizarea a fost oprită; dosarele rămân cum erau.');
  else if (!quiet || msg || errors.length) toast(`Portal: ${list.length - errors.length}/${list.length} dosare actualizate${msg ? ' – ' + msg : ''}${errors.length ? `; ${errors.length} cu probleme (vezi dosarele)` : ''}.`);
  if (errors.length) console.warn('Portal:', errors);
  rerender();
}

function portalNewCase() {
  if (!portalAvailable()) return portalUnavailable();
  openForm({
    title: 'Dosar nou din portal.just.ro',
    intro: 'Introduceți numărul dosarului. Aplicația preia de pe portal instanța, obiectul, părțile, stadiul și termenele.',
    fields: [
      { name: 'number', label: 'Număr dosar', required: true, wide: true, placeholder: 'ex. 1234/211/2026' },
      { name: 'clientId', label: 'Client (opțional)', type: 'select', options: clientOptions(), wide: true },
    ],
    submit: 'Caută pe portal',
    onSave: async v => {
      const number = v.number.trim();
      if (!RE_NR_DOSAR.test(number)) throw new Error('Numărul trebuie să aibă forma 1234/211/2026.');
      if (S.cases.some(c => c.number === number)) throw new Error('Dosarul există deja în listă.');
      const c = { number, clientId: v.clientId, status: 'activ', notes: '' };
      let res;
      try { res = await portalSearch(number); }
      catch (err) {
        // portalul nu răspunde: dosarul se adaugă oricum, datele se pot prelua mai târziu
        await save('cases', c);
        setTimeout(() => { location.hash = '#/dosar/' + c.id; toast('Dosarul a fost adăugat fără datele de pe portal. ' + err.message, 9000); }, 50);
        return;
      }
      if (!res.length) throw new Error('Dosarul nu a fost găsit pe portal.');
      await applyPortal(c, res[0]);
      if (res.length > 1) toast('Dosarul apare la mai multe instanțe; am ales prima. Puteți schimba din „Actualizează de pe portal”.');
      setTimeout(() => { location.hash = '#/dosar/' + c.id; }, 50);
    },
  });
}

function portalCard(c) {
  const p = c.portal;
  const btn = `<button class="btn sm" data-act="portalTest" title="Verifică legătura cu portalul">Test</button><button class="btn sm" data-act="portalSync" data-id="${c.id}">⟳ Actualizează de pe portal</button>`;
  if (!p) return `<div class="card"><div class="card-head"><h2>Portal.just.ro</h2>${btn}</div>${empty(portalAvailable() ? 'Dosarul nu a fost încă preluat de pe portal.' : 'Preluarea de pe portal funcționează în aplicația desktop.')}</div>`;
  const sol = p.sedinte.filter(s => s.solutie).reverse();
  return `<div class="card">
    <div class="card-head"><h2>Portal.just.ro</h2>${btn}</div>
    <p class="small muted" style="margin-top:0">Actualizat ${new Date(p.la).toLocaleString('ro-RO')} · ${h(instName(p.institutie))}${p.departament ? ' · ' + h(p.departament) : ''}</p>
    <div class="info-grid" style="margin-top:0">
      ${[['Obiect', p.obiect], ['Categorie', p.categorie], ['Stadiu', p.stadiu], ['Data dosarului', p.data && fmtDate(p.data)]].filter(([, v]) => v).map(([k, v]) => `<div><span>${k}</span><b>${h(v)}</b></div>`).join('')}
    </div>
    ${p.parti.length ? `<div class="group-title">Părți</div><ul class="list">${p.parti.map(x => `<li><span class="grow">${h(x.nume)}</span><span class="muted small">${h(x.calitate)}</span></li>`).join('')}</ul>` : ''}
    ${sol.length ? `<div class="group-title">Soluții</div><ul class="list">${sol.map(s => `<li><div class="grow"><b>${h(s.solutie)}</b> <span class="muted small">${fmtDate(s.data)}</span>${s.solutieSumar ? `<span class="small">${h(s.solutieSumar)}</span>` : ''}${s.document ? `<span class="muted small">${h(s.document)} ${h(s.numarDocument)}${s.dataDocument ? ' / ' + fmtDate(s.dataDocument) : ''}</span>` : ''}</div></li>`).join('')}</ul>` : ''}
    ${p.caiAtac.length ? `<div class="group-title">Căi de atac</div><ul class="list">${p.caiAtac.map(x => `<li><span class="grow">${h(x.tip)} – ${h(x.parte)}</span><span class="muted small">${x.data ? fmtDate(x.data) : ''}</span></li>`).join('')}</ul>` : ''}
  </div>`;
}

// Diagnostic: cum e pornită aplicația și ce răspunde portalul (pentru un dosar de probă oarecare)
async function portalTest() {
  const mod = window.desktop?.local ? 'programul local (iconița „Cabinet Stoica” / Porneste.cmd)'
    : window.desktop ? 'aplicația .exe (Electron)' : 'browser (fără legătură cu portalul)';
  let rez;
  if (!portalAvailable()) rez = '<p>În browser portalul nu poate fi interogat. Porniți aplicația de pe iconița „Cabinet Stoica”.</p>';
  else {
    toast('Se testează legătura cu portalul…');
    try {
      const r = await portalSearch('1/211/2026');
      rez = `<p><b style="color:var(--ok)">✓ Portalul răspunde.</b> Dosarul de probă 1/211/2026: ${r.length ? plural2(r.length, 'rezultat', 'rezultate') : 'niciun rezultat (normal pentru un număr de probă)'}.</p>`;
    } catch (err) {
      rez = `<p><b class="red">✗ ${h(err.message)}</b></p>${err.detaliu && err.detaliu !== err.message ? `<p class="small muted">Detalii tehnice: ${h(err.detaliu)}</p>` : ''}`;
    }
  }
  openForm({ title: 'Test: legătura cu portal.just.ro', intro: `<p>Mod de pornire: <b>${mod}</b></p>${rez}`, fields: [], submit: 'Închide', onSave: async () => {} });
}
