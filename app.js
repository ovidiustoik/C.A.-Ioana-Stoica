'use strict';
/* Cabinet de avocat – Stoica Ioana. Aplicație locală, fără server. */

/* ================= Utilitare ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const fmtDate = (s, o = { day: 'numeric', month: 'long', year: 'numeric' }) => (s ? parseYmd(s).toLocaleDateString('ro-RO', o) : '');
const fmtShort = s => fmtDate(s, { day: 'numeric', month: 'short' });
const fmtDay = s => parseYmd(s).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
const money = n => (Number(n) || 0).toLocaleString('ro-RO', { style: 'currency', currency: 'RON' });
const fmtSize = b => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

/* ================= Constante ================= */
const URG = {
  1: { l: 'Critică', c: 'u1' },
  2: { l: 'Ridicată', c: 'u2' },
  3: { l: 'Normală', c: 'u3' },
  4: { l: 'Scăzută', c: 'u4' },
};
const EVT = { termen: 'Termen în instanță', anaf: 'ANAF / fiscal', intalnire: 'Întâlnire client', personal: 'Personal', altul: 'Altul' };
const CASE_STATUS = { activ: 'În lucru', suspendat: 'Suspendat', finalizat: 'Finalizat', arhivat: 'Arhivat' };
const ROLES = ['Reclamant', 'Pârât', 'Petent', 'Intimat', 'Apelant', 'Recurent', 'Contestator', 'Creditor', 'Debitor', 'Inculpat', 'Suspect', 'Persoană vătămată', 'Parte civilă', 'Parte responsabilă civilmente', 'Altă calitate'];
const STAGES = ['Consultanță / precontencios', 'Fond', 'Apel', 'Recurs', 'Contestație în anulare', 'Revizuire', 'Executare silită', 'Urmărire penală', 'Cameră preliminară', 'Mediere', 'Altul'];
const PERSONAL_CATS = ['Identitate', 'Profesionale (legitimație, asigurare RCP, decizii)', 'Fiscale', 'Bancare', 'Proprietate', 'Auto', 'Sănătate', 'Contracte', 'Altele'];
const CASE_CATS = ['Contract de asistență / împuternicire', 'Acte de sesizare', 'Întâmpinări / note scrise', 'Probe', 'Citații și comunicări', 'Încheieri și hotărâri', 'Căi de atac', 'Corespondență client', 'Altele'];
const ANAF_KINDS = { datorie: 'Obligație de plată', notificare: 'Notificare / decizie', declaratie: 'Declarație de depus' };
const LEDGER_METHODS = ['Bancă', 'Numerar', 'Card / POS', 'Altă modalitate'];

const DEFAULT_LINKS = [
  ['Legislație', 'Portal legislativ (legislatie.just.ro)', 'https://legislatie.just.ro', 'Legislația României, forme consolidate'],
  ['Legislație', 'Monitorul Oficial', 'https://www.monitoruloficial.ro', ''],
  ['Legislație', 'EUR-Lex', 'https://eur-lex.europa.eu', 'Legislația Uniunii Europene'],
  ['Jurisprudență', 'ReJust', 'https://www.rejust.ro', 'Jurisprudența instanțelor (CSM)'],
  ['Jurisprudență', 'Înalta Curte de Casație și Justiție', 'https://www.scj.ro', 'RIL, HP, jurisprudență ICCJ'],
  ['Jurisprudență', 'Curtea Constituțională', 'https://www.ccr.ro', ''],
  ['Jurisprudență', 'HUDOC – CEDO', 'https://hudoc.echr.coe.int', ''],
  ['Jurisprudență', 'CURIA – CJUE', 'https://curia.europa.eu', ''],
  ['Instanțe și dosare', 'Portalul instanțelor de judecată', 'https://portal.just.ro', 'Căutare dosare, termene, soluții'],
  ['Instanțe și dosare', 'Registratura electronică', 'https://registratura.rejust.ro', 'Depunere acte în format electronic'],
  ['Plăți și fiscal', 'Ghișeul.ro', 'https://www.ghiseul.ro', 'Plăți taxe și impozite'],
  ['Plăți și fiscal', 'ANAF', 'https://www.anaf.ro', 'Servicii online, SPV'],
  ['Profesie și registre', 'UNBR', 'https://www.unbr.ro', ''],
  ['Profesie și registre', 'ONRC', 'https://www.onrc.ro', 'Registrul comerțului'],
  ['Profesie și registre', 'ANCPI ePay', 'https://epay.ancpi.ro', 'Extrase de carte funciară'],
  ['Instrumente', 'Claude', 'https://claude.ai', 'Asistent AI'],
  ['E-mail', 'Gmail', 'https://mail.google.com', 'Poșta Google'],
  ['E-mail', 'Yahoo Mail (Ymail)', 'https://mail.yahoo.com', 'Poșta Yahoo'],
];

const ICONS = {
  acasa: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  sarcini: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  dosare: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clienti: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  acte: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  geamantan: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  contabilitate: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2M7 3h10"/>',
  termene: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  linkuri: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  semnatura: '<path d="M4 20h16"/><path d="M15 4l5 5-9 9H6v-5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  setari: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const HOME_LINKS = [
  ['Claude', 'Asistent AI', 'https://claude.ai', 'l-claude'],
  ['ReJust', 'Jurisprudență', 'https://www.rejust.ro', 'l-rejust'],
  ['Portal.just', 'Dosare și termene', 'https://portal.just.ro', 'l-portal'],
  ['Ghișeul.ro', 'Plăți taxe', 'https://www.ghiseul.ro', 'l-ghiseul'],
];

const icon = k => `<svg viewBox="0 0 24 24">${ICONS[k] || ''}</svg>`;

const NAV = [
  ['acasa', 'Acasă – 7 zile'],
  ['sarcini', 'TO DO'],
  ['dosare', 'Dosare în lucru'],
  ['calendar', 'Calendar'],
  ['clienti', 'Clienți'],
  ['acte', 'Acte clienți'],
  ['geamantan', 'Geamantan personal'],
  ['semnatura', 'Semnătură electronică'],
  ['contabilitate', 'Contabilitate & ANAF'],
  ['termene', 'Calcul termene'],
  ['linkuri', 'Linkuri utile'],
  null,
  ['setari', 'Setări & backup'],
];

/* ================= Stare și persistență ================= */
const S = {};
const UI = {
  tf: { status: 'deschise', urg: '', caseId: '', q: '' },
  cf: { status: 'activ', q: '' },
  cal: today().slice(0, 7),
  homeCal: today().slice(0, 7),
  calSel: today(),
  ledgerYear: new Date().getFullYear(),
  calc: { start: today(), n: 15, unit: 'zile', res: null },
};

async function load() {
  await openDB();
  for (const s of STORES) if (s !== 'files') S[s] = await DB.all(s);
  if (!S.settings.find(x => x.id === 'init')) {
    for (const [group, title, url, note] of DEFAULT_LINKS) await save('links', { group, title, url, note });
    await save('settings', { id: 'init', value: true });
  }
}

const setting = (k, def) => { const r = S.settings.find(x => x.id === k); return r ? r.value : def; };
const setSetting = (k, value) => save('settings', { id: k, value });

async function save(store, obj) {
  if (!obj.id) obj.id = uid();
  if (!obj.createdAt) obj.createdAt = Date.now();
  obj.updatedAt = Date.now();
  await DB.put(store, obj);
  const i = S[store].findIndex(x => x.id === obj.id);
  if (i >= 0) S[store][i] = obj; else S[store].push(obj);
  return obj;
}

async function remove(store, id) {
  await DB.del(store, id);
  S[store] = S[store].filter(x => x.id !== id);
}

const byId = (store, id) => (id ? S[store].find(x => x.id === id) : null);

/* ================= Date derivate ================= */
const sortTasks = (a, b) => (a.done - b.done) || ((a.due || '9999') .localeCompare(b.due || '9999')) || (a.urgency - b.urgency) || (a.time || '99').localeCompare(b.time || '99');
const sortDayTasks = (a, b) => (a.done - b.done) || (a.urgency - b.urgency) || (a.time || '99').localeCompare(b.time || '99');
const clientName = id => byId('clients', id)?.name || '';
const caseLabel = c => [c.number || '(fără număr)', clientName(c.clientId) || c.object].filter(Boolean).join(' – ');
const caseOptions = (blank = true) => [...(blank ? [['', '— fără dosar —']] : []), ...S.cases.filter(c => c.status !== 'arhivat').sort((a, b) => caseLabel(a).localeCompare(caseLabel(b))).map(c => [c.id, caseLabel(c)])];
const clientOptions = () => [['', '— niciunul —'], ...S.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name])];
const urgOptions = Object.entries(URG).map(([k, v]) => [k, v.l]);
const nextHearing = caseId => S.events.filter(e => e.caseId === caseId && e.type === 'termen' && e.date >= today()).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];

function itemsOn(d) {
  const out = [];
  S.events.filter(e => e.date === d && !(e.anafId && S.tasks.some(t => t.anafId === e.anafId))).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .forEach(e => out.push({ kind: e.type || 'altul', label: (e.time ? e.time + ' ' : '') + e.title, act: 'editEvent', id: e.id, ev: e }));
  S.tasks.filter(t => t.due === d).sort(sortDayTasks)
    .forEach(t => out.push({ kind: t.source === 'anaf' ? 'anaf' : 'todo', label: t.title, act: 'editTask', id: t.id, done: t.done }));
  S.docs.filter(x => x.expiry === d)
    .forEach(x => out.push({ kind: 'expira', label: 'Expiră: ' + x.name, act: 'editDoc', id: x.id }));
  return out;
}

function expiryBadge(date) {
  if (!date) return '';
  const n = diffDays(today(), date);
  if (n < 0) return `<span class="pill u1">expirat</span>`;
  if (n <= 30) return `<span class="pill u2">expiră în ${plural(n, 'zi', 'zile')}</span>`;
  return `<span class="muted small">valabil până la ${fmtDate(date)}</span>`;
}

function dueLabel(d) {
  const n = diffDays(today(), d);
  if (n < 0) return `<span class="red">depășit cu ${plural(-n, 'zi', 'zile')}</span>`;
  if (n === 0) return `<span class="red">azi</span>`;
  if (n === 1) return 'mâine';
  return `în ${n} zile`;
}

/* ================= Zile nelucrătoare și termene ================= */
// Paștele ortodox (algoritmul Meeus pentru calendarul iulian + 13 zile; valabil 1900–2099)
function orthodoxEaster(y) {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const date = new Date(y, month - 1, day);
  date.setDate(date.getDate() + 13);
  return ymd(date);
}

const _hol = {};
function holidays(y) {
  const extra = setting('extraHolidays', '');
  const key = y + '|' + extra;
  if (_hol[key]) return _hol[key];
  const E = orthodoxEaster(y);
  const map = new Map([
    [`${y}-01-01`, 'Anul Nou'], [`${y}-01-02`, 'Anul Nou'],
    [`${y}-01-06`, 'Boboteaza'], [`${y}-01-07`, 'Sf. Ioan Botezătorul'],
    [`${y}-01-24`, 'Ziua Unirii Principatelor'],
    [addDays(E, -2), 'Vinerea Mare'], [E, 'Paștele'], [addDays(E, 1), 'A doua zi de Paști'],
    [`${y}-05-01`, 'Ziua Muncii'], [`${y}-06-01`, 'Ziua Copilului'],
    [addDays(E, 49), 'Rusaliile'], [addDays(E, 50), 'A doua zi de Rusalii'],
    [`${y}-08-15`, 'Adormirea Maicii Domnului'], [`${y}-11-30`, 'Sf. Andrei'],
    [`${y}-12-01`, 'Ziua Națională'], [`${y}-12-25`, 'Crăciunul'], [`${y}-12-26`, 'A doua zi de Crăciun'],
  ]);
  for (const s of extra.split(/[\s,;]+/)) if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s.startsWith(String(y))) map.set(s, 'Zi nelucrătoare adăugată manual');
  return (_hol[key] = map);
}
const holidayName = s => holidays(parseYmd(s).getFullYear()).get(s);
const isWeekend = s => { const d = parseYmd(s).getDay(); return d === 0 || d === 6; };
const isNonWorking = s => isWeekend(s) || !!holidayName(s);

function computeTerm(start, n, unit) {
  const steps = [];
  let end;
  if (unit === 'zile') {
    end = addDays(start, n + 1);
    steps.push(`Termen pe zile (art. 181 alin. (1) pct. 2 C.proc.civ.): nu se socotesc nici ziua de la care începe să curgă (${fmtDate(start)}), nici ziua în care se împlinește.`);
    steps.push(`Cele ${n} zile întregi sunt ${fmtDate(addDays(start, 1))} – ${fmtDate(addDays(start, n))}; termenul se împlinește pe ${fmtDate(end)}.`);
  } else if (unit === 'saptamani') {
    end = addDays(start, 7 * n);
    steps.push(`Termen pe săptămâni (art. 181 alin. (1) pct. 3): se împlinește în ziua corespunzătoare din ultima săptămână – ${fmtDay(end)}.`);
  } else {
    const d = parseYmd(start);
    const months = unit === 'luni' ? n : 12 * n;
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(d.getDate(), last));
    end = ymd(target);
    steps.push(`Termen pe ${unit === 'luni' ? 'luni' : 'ani'} (art. 181 alin. (1) pct. 3): se împlinește în ziua corespunzătoare din ultima ${unit === 'luni' ? 'lună' : 'an'} – ${fmtDate(end)}.`);
    if (d.getDate() > last) steps.push('Luna de împlinire nu are zi corespunzătoare, deci termenul se împlinește în ultima zi a lunii.');
  }
  let final = end;
  while (isNonWorking(final)) final = addDays(final, 1);
  if (final !== end) {
    const why = holidayName(end) || (parseYmd(end).getDay() === 0 ? 'duminică' : 'sâmbătă');
    steps.push(`${fmtDate(end)} este zi nelucrătoare (${why}); termenul se prelungește până la sfârșitul primei zile lucrătoare (art. 181 alin. (2)): ${fmtDate(final)}.`);
  }
  return { end, final, steps };
}

/* ================= Formular generic (modal) ================= */
function fieldHtml(f, v) {
  v = v ?? f.default ?? '';
  const id = 'f_' + f.name;
  const req = f.required ? 'required' : '';
  let input;
  switch (f.type) {
    case 'textarea':
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" ${req}>${h(v)}</textarea>`; break;
    case 'select':
      input = `<select id="${id}" name="${f.name}" ${req}>${f.options.map(([val, lab]) => `<option value="${h(val)}" ${String(val) === String(v) ? 'selected' : ''}>${h(lab)}</option>`).join('')}</select>`; break;
    case 'checkbox':
      return `<label class="field check ${f.wide ? 'wide' : ''}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span>${h(f.label)}</span></label>`;
    case 'file':
      input = `<input id="${id}" type="file" name="${f.name}" multiple>`; break;
    case 'number':
      input = `<input id="${id}" type="number" name="${f.name}" value="${h(v)}" step="${f.step || 'any'}" ${f.min != null ? `min="${f.min}"` : ''} ${req}>`; break;
    default:
      input = `<input id="${id}" type="${f.type || 'text'}" name="${f.name}" value="${h(v)}" ${f.placeholder ? `placeholder="${h(f.placeholder)}"` : ''} ${req}>`;
  }
  return `<label class="field ${f.wide ? 'wide' : ''}" for="${id}"><span>${h(f.label)}${f.required ? ' *' : ''}</span>${input}${f.hint ? `<small>${h(f.hint)}</small>` : ''}</label>`;
}

function openForm({ title, fields, values = {}, submit = 'Salvează', onSave, onDelete, deleteLabel = 'Șterge', intro = '' }) {
  fields = fields.filter(Boolean);
  const dlg = $('#modal');
  dlg.innerHTML = `<form novalidate>
    <header><h2>${h(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Închide">✕</button></header>
    <div class="fields">${intro ? `<div class="callout wide field">${intro}</div>` : ''}${fields.map(f => fieldHtml(f, values[f.name])).join('')}</div>
    <footer>${onDelete ? `<button type="button" class="btn danger" data-del>${h(deleteLabel)}</button>` : ''}<span class="spacer"></span>
      <button type="button" class="btn ghost" data-close>Renunță</button><button type="submit" class="btn primary">${h(submit)}</button></footer>
  </form>`;
  const form = $('form', dlg);
  $$('[data-close]', dlg).forEach(b => b.onclick = () => dlg.close());
  if (onDelete) $('[data-del]', dlg).onclick = async () => {
    if (!confirm('Sigur ștergeți? Operațiunea nu poate fi anulată.')) return;
    try {
      await onDelete();
    } catch (err) {
      return toast(err.message || 'Eroare la ștergere.');
    }
    dlg.close();
    rerender();
    toast('Șters.');
  };
  form.onsubmit = async e => {
    e.preventDefault();
    const v = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (f.type === 'checkbox') v[f.name] = el.checked;
      else if (f.type === 'file') v[f.name] = [...el.files];
      else if (f.type === 'number') v[f.name] = el.value === '' ? '' : Number(el.value);
      else v[f.name] = el.value.trim();
      const empty = f.type === 'file' ? !v[f.name].length : (v[f.name] === '' || v[f.name] == null);
      if (f.required && empty) { el.focus(); toast(`Completați câmpul „${f.label}”.`); return; }
    }
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      await onSave(v);
      dlg.close();
      rerender();
      toast('Salvat.');
    } catch (err) {
      toast(err.message || 'Eroare la salvare.');
      btn.disabled = false;
    }
  };
  dlg.showModal();
  const first = $('input:not([type=checkbox]):not([type=file]), textarea, select', form);
  if (first && !('ontouchstart' in window)) first.focus();
}

/* ================= Formulare specifice ================= */
function taskForm(t = {}, preset = {}) {
  openForm({
    title: t.id ? 'Editează sarcina' : 'Sarcină nouă',
    values: { ...preset, ...t },
    fields: [
      { name: 'title', label: 'Sarcina', required: true, wide: true, placeholder: 'ex. Redactare întâmpinare' },
      { name: 'due', label: 'Data', type: 'date', default: preset.due ?? today() },
      { name: 'time', label: 'Ora (opțional)', type: 'time' },
      { name: 'urgency', label: 'Urgență', type: 'select', options: urgOptions, default: 3 },
      { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions() },
      { name: 'note', label: 'Note', type: 'textarea', wide: true },
      t.id ? { name: 'done', label: 'Finalizată', type: 'checkbox', wide: true } : null,
    ],
    onSave: async v => {
      const wasDone = !!t.done;
      await save('tasks', { ...t, ...v, urgency: Number(v.urgency), done: !!v.done, doneAt: v.done && !wasDone ? Date.now() : t.doneAt });
      if (t.anafId && v.done !== wasDone) await syncAnafFromTask(t.anafId, !!v.done);
    },
    onDelete: t.id ? () => remove('tasks', t.id) : null,
  });
}

function eventForm(ev = {}, preset = {}) {
  const c = byId('cases', preset.caseId);
  openForm({
    title: ev.id ? 'Editează evenimentul' : 'Eveniment / termen nou',
    values: { type: 'termen', title: c ? `Termen ${c.number || ''}`.trim() : '', ...preset, ...ev },
    fields: [
      { name: 'title', label: 'Titlu', required: true, wide: true },
      { name: 'date', label: 'Data', type: 'date', required: true, default: today() },
      { name: 'time', label: 'Ora', type: 'time' },
      { name: 'type', label: 'Tip', type: 'select', options: Object.entries(EVT) },
      { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions() },
      { name: 'location', label: 'Locul / instanța / sala', wide: true },
      { name: 'note', label: 'Note', type: 'textarea', wide: true },
      ev.id ? null : { name: 'prepDays', label: 'Sarcină de pregătire cu N zile înainte', type: 'number', min: 0, step: 1, hint: 'Opțional. Ex.: 3 – creează în TO DO „Pregătire: …” cu 3 zile înainte.' },
    ],
    onSave: async v => {
      const { prepDays, ...rest } = v;
      const saved = await save('events', { ...ev, ...rest });
      if (prepDays > 0) {
        await save('tasks', { title: 'Pregătire: ' + saved.title, due: addDays(saved.date, -prepDays), urgency: 2, caseId: saved.caseId, note: '', done: false, eventId: saved.id });
      }
    },
    onDelete: ev.id ? async () => {
      if (ev.anafId) { const a = byId('anaf', ev.anafId); if (a) await save('anaf', { ...a, eventId: '' }); }
      await remove('events', ev.id);
    } : null,
  });
}

function caseForm(c = {}) {
  openForm({
    title: c.id ? 'Editează dosarul' : 'Dosar nou',
    values: { status: 'activ', ...c },
    fields: [
      { name: 'number', label: 'Număr dosar', placeholder: 'ex. 1234/211/2026', hint: 'Lăsați gol dacă dosarul nu este încă înregistrat.' },
      { name: 'court', label: 'Instanța / organul judiciar' },
      { name: 'object', label: 'Obiectul cauzei', wide: true, required: true },
      { name: 'clientId', label: 'Client', type: 'select', options: clientOptions() },
      { name: 'clientNew', label: 'sau client nou (nume)', hint: 'Se creează automat în secțiunea Clienți.' },
      { name: 'role', label: 'Calitatea clientului', type: 'select', options: [['', '—'], ...ROLES.map(r => [r, r])] },
      { name: 'adverse', label: 'Partea adversă' },
      { name: 'stage', label: 'Stadiu procesual', type: 'select', options: [['', '—'], ...STAGES.map(r => [r, r])] },
      { name: 'panel', label: 'Complet / judecător / procuror' },
      { name: 'contract', label: 'Contract de asistență (nr./dată)' },
      { name: 'fee', label: 'Onorariu convenit (lei)', type: 'number', min: 0 },
      { name: 'status', label: 'Stare', type: 'select', options: Object.entries(CASE_STATUS) },
      { name: 'notes', label: 'Note / strategie / istoric', type: 'textarea', rows: 5, wide: true },
    ],
    onSave: async v => {
      const { clientNew, ...rest } = v;
      if (clientNew && !rest.clientId) rest.clientId = (await save('clients', { name: clientNew, type: 'PF' })).id;
      const saved = await save('cases', { ...c, ...rest });
      if (!c.id) location.hash = '#/dosar/' + saved.id;
    },
    onDelete: c.id ? () => deleteCase(c) : null,
    deleteLabel: 'Șterge dosarul',
  });
}

async function deleteCase(c) {
  if (!confirm('Se vor șterge și termenele, sarcinile și actele încărcate la acest dosar. Pentru a păstra istoricul, folosiți starea „Arhivat”. Continuați?')) throw new Error('Anulat.');
  for (const t of S.tasks.filter(x => x.caseId === c.id)) await remove('tasks', t.id);
  for (const e of S.events.filter(x => x.caseId === c.id)) await remove('events', e.id);
  for (const d of S.docs.filter(x => x.caseId === c.id)) await deleteDoc(d.id);
  for (const l of S.ledger.filter(x => x.caseId === c.id)) await save('ledger', { ...l, caseId: '' });
  await remove('cases', c.id);
  location.hash = '#/dosare';
}

function clientForm(c = {}) {
  openForm({
    title: c.id ? 'Editează clientul' : 'Client nou',
    values: { type: 'PF', ...c },
    intro: c.id ? '' : 'Datele clienților rămân doar pe acest dispozitiv.',
    fields: [
      { name: 'name', label: 'Nume / denumire', required: true, wide: true },
      { name: 'type', label: 'Tip', type: 'select', options: [['PF', 'Persoană fizică'], ['PJ', 'Persoană juridică']] },
      { name: 'idCode', label: 'CNP / CUI' },
      { name: 'phone', label: 'Telefon', type: 'tel' },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'address', label: 'Adresă', wide: true },
      { name: 'notes', label: 'Note', type: 'textarea', wide: true },
    ],
    onSave: v => save('clients', { ...c, ...v }),
    onDelete: c.id ? async () => {
      for (const k of S.cases.filter(x => x.clientId === c.id)) await save('cases', { ...k, clientId: '' });
      await remove('clients', c.id);
    } : null,
  });
}

function anafForm(a = {}) {
  openForm({
    title: a.id ? 'Editează înregistrarea ANAF' : 'Înregistrare nouă din SPV / ANAF',
    values: { kind: 'datorie', status: 'deschis', addCal: true, urgency: 2, received: today(), ...a, addCal: a.id ? !!(a.taskId || a.eventId) : true },
    fields: [
      { name: 'kind', label: 'Tip', type: 'select', options: Object.entries(ANAF_KINDS) },
      { name: 'status', label: 'Stare', type: 'select', options: [['deschis', 'Neplătit / nerezolvat'], ['rezolvat', 'Plătit / rezolvat']] },
      { name: 'title', label: 'Descriere', required: true, wide: true, placeholder: 'ex. Impozit pe venit / CAS / CASS; Decizie de impunere; D212' },
      { name: 'docNo', label: 'Nr. document / înregistrare' },
      { name: 'amount', label: 'Sumă (lei)', type: 'number', min: 0 },
      { name: 'received', label: 'Data primirii în SPV', type: 'date' },
      { name: 'due', label: 'Scadență / termen', type: 'date', required: true },
      { name: 'urgency', label: 'Urgență în TO DO', type: 'select', options: urgOptions },
      { name: 'note', label: 'Note', type: 'textarea', wide: true },
      { name: 'addCal', label: 'Pune automat în calendar și în TO DO', type: 'checkbox', wide: true },
    ],
    onSave: v => saveAnaf(a, v),
    onDelete: a.id ? async () => {
      if (a.taskId && byId('tasks', a.taskId)) await remove('tasks', a.taskId);
      if (a.eventId && byId('events', a.eventId)) await remove('events', a.eventId);
      await remove('anaf', a.id);
    } : null,
  });
}

async function saveAnaf(a, v) {
  const { addCal, ...rest } = v;
  const rec = await save('anaf', { ...a, ...rest, urgency: Number(v.urgency) });
  const label = `ANAF: ${rec.title}${rec.amount ? ' – ' + money(rec.amount) : ''}`;
  const done = rec.status === 'rezolvat';
  if (addCal) {
    const t = byId('tasks', rec.taskId) || {};
    const task = await save('tasks', { ...t, title: label, due: rec.due, urgency: rec.urgency, done, doneAt: done ? (t.doneAt || Date.now()) : null, caseId: '', note: t.note ?? rec.note ?? '', source: 'anaf', anafId: rec.id });
    const e = byId('events', rec.eventId) || {};
    const ev = await save('events', { ...e, title: label, date: rec.due, type: 'anaf', note: [ANAF_KINDS[rec.kind], rec.docNo && 'Nr. ' + rec.docNo, rec.note].filter(Boolean).join(' · '), anafId: rec.id });
    rec.taskId = task.id; rec.eventId = ev.id;
  } else {
    if (rec.taskId && byId('tasks', rec.taskId)) await remove('tasks', rec.taskId);
    if (rec.eventId && byId('events', rec.eventId)) await remove('events', rec.eventId);
    rec.taskId = ''; rec.eventId = '';
  }
  await save('anaf', rec);
}

async function syncAnafFromTask(anafId, done) {
  const a = byId('anaf', anafId);
  if (a) await save('anaf', { ...a, status: done ? 'rezolvat' : 'deschis' });
}

function ledgerForm(l = {}) {
  openForm({
    title: l.id ? 'Editează înregistrarea' : 'Înregistrare nouă în registru',
    values: { type: 'incasare', date: today(), method: 'Bancă', ...l },
    fields: [
      { name: 'type', label: 'Tip', type: 'select', options: [['incasare', 'Încasare'], ['plata', 'Plată / cheltuială']] },
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'amount', label: 'Sumă (lei)', type: 'number', min: 0, required: true },
      { name: 'method', label: 'Modalitate', type: 'select', options: LEDGER_METHODS.map(m => [m, m]) },
      { name: 'description', label: 'Explicație', required: true, wide: true, placeholder: 'ex. Onorariu dosar 1234/211/2026; Cotizație barou; Chirie sediu' },
      { name: 'docNo', label: 'Document justificativ (nr.)' },
      { name: 'clientId', label: 'Client', type: 'select', options: clientOptions() },
      { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions(), wide: true },
    ],
    onSave: v => save('ledger', { ...l, ...v }),
    onDelete: l.id ? () => remove('ledger', l.id) : null,
  });
}

function linkForm(l = {}) {
  const groups = [...new Set(S.links.map(x => x.group))];
  openForm({
    title: l.id ? 'Editează linkul' : 'Link nou',
    values: l,
    fields: [
      { name: 'title', label: 'Denumire', required: true, wide: true },
      { name: 'url', label: 'Adresă (URL)', type: 'url', required: true, wide: true, placeholder: 'https://' },
      { name: 'group', label: 'Grupă', default: groups[0] || 'Diverse', hint: 'Grupe existente: ' + groups.join(', ') },
      { name: 'note', label: 'Descriere scurtă' },
    ],
    onSave: v => {
      if (!/^https?:\/\//i.test(v.url)) v.url = 'https://' + v.url;
      return save('links', { ...l, ...v });
    },
    onDelete: l.id ? () => remove('links', l.id) : null,
  });
}

/* ================= Documente ================= */
function uploadForm(scope, caseId = '') {
  openForm({
    title: scope === 'personal' ? 'Adaugă în geamantan' : 'Adaugă acte la dosar',
    submit: 'Încarcă',
    values: { caseId, category: scope === 'personal' ? PERSONAL_CATS[0] : CASE_CATS[0] },
    fields: [
      { name: 'files', label: 'Fișiere', type: 'file', required: true, wide: true, hint: 'Puteți selecta mai multe fișiere (PDF, Word, imagini etc.).' },
      scope === 'case' ? { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions(false), required: true, wide: true } : null,
      { name: 'category', label: 'Categorie', type: 'select', options: (scope === 'personal' ? PERSONAL_CATS : CASE_CATS).map(c => [c, c]) },
      { name: 'name', label: 'Denumire (opțional)', hint: 'Implicit: numele fișierului.' },
      { name: 'expiry', label: 'Valabil până la (opțional)', type: 'date', hint: 'Primiți alertă cu 30 de zile înainte.' },
      { name: 'note', label: 'Note', type: 'textarea', wide: true, rows: 2 },
    ],
    onSave: async v => {
      for (const f of v.files) {
        const id = uid();
        await DB.put('files', { id, blob: new Blob([f], { type: f.type }) });
        await save('docs', {
          id, scope, caseId: scope === 'case' ? v.caseId : '',
          name: v.name && v.files.length === 1 ? v.name : f.name.replace(/\.[^.]+$/, ''),
          fileName: f.name, mime: f.type, size: f.size,
          category: v.category, expiry: v.expiry, note: v.note,
        });
      }
    },
  });
}

function docForm(d) {
  openForm({
    title: 'Detalii act',
    values: d,
    fields: [
      { name: 'name', label: 'Denumire', required: true, wide: true },
      d.scope === 'case' ? { name: 'caseId', label: 'Dosar', type: 'select', options: caseOptions(false), wide: true } : null,
      { name: 'category', label: 'Categorie', type: 'select', options: (d.scope === 'personal' ? PERSONAL_CATS : CASE_CATS).map(c => [c, c]) },
      { name: 'expiry', label: 'Valabil până la', type: 'date' },
      { name: 'note', label: 'Note', type: 'textarea', wide: true, rows: 2 },
    ],
    onSave: v => save('docs', { ...d, ...v }),
    onDelete: () => deleteDoc(d.id),
  });
}

async function deleteDoc(id) {
  await DB.del('files', id);
  await remove('docs', id);
}

async function openDoc(id, asDownload) {
  const d = byId('docs', id);
  const rec = await DB.get('files', id);
  if (!d || !rec) return toast('Fișierul nu a fost găsit.');
  if (asDownload) return download(d.fileName, rec.blob);
  // În aplicația desktop actul se deschide cu programul implicit (Word, Acrobat etc.)
  if (window.desktop) {
    const err = await window.desktop.openFile(d.fileName, await rec.blob.arrayBuffer());
    if (err) toast('Nu s-a putut deschide: ' + err);
    return;
  }
  const url = URL.createObjectURL(rec.blob);
  const w = window.open(url, '_blank');
  if (!w) download(d.fileName, rec.blob);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function docRow(d, showCase = false) {
  const ext = (d.fileName || '').includes('.') ? d.fileName.split('.').pop().slice(0, 4) : 'doc';
  const c = showCase && byId('cases', d.caseId);
  return `<div class="doc">
    <div class="doc-ico">${h(ext)}</div>
    <div class="doc-main">
      <a data-act="openDoc" data-id="${d.id}" title="Deschide">${h(d.name)}</a>
      <small>${h(d.category || '')} · ${fmtSize(d.size || 0)} · adăugat ${fmtDate(ymd(new Date(d.createdAt)), { day: 'numeric', month: 'short', year: 'numeric' })}${c ? ' · ' + h(caseLabel(c)) : ''}</small>
      ${d.expiry ? `<div>${expiryBadge(d.expiry)}</div>` : ''}
      ${d.note ? `<small>${h(d.note)}</small>` : ''}
    </div>
    <button class="icon-btn sign-btn" data-act="signDoc" data-id="${d.id}" title="Semnează electronic" aria-label="Semnează">✍</button>
    <button class="icon-btn" data-act="dlDoc" data-id="${d.id}" title="Descarcă" aria-label="Descarcă">⤓</button>
    <button class="icon-btn" data-act="editDoc" data-id="${d.id}" title="Editează" aria-label="Editează">✎</button>
  </div>`;
}

/* ================= Componente de afișare ================= */
function taskRow(t, { showDate = false } = {}) {
  const u = URG[t.urgency] || URG[3];
  const c = byId('cases', t.caseId);
  const overdue = !t.done && t.due && t.due < today();
  return `<li class="task ${u.c} ${t.done ? 'done' : ''}">
    <input type="checkbox" class="chk" data-act="toggleTask" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Bifează ca finalizată">
    <div class="task-body">
      <div class="task-line">
        <span class="pill ${u.c}">${u.l}</span>
        <span class="task-title" data-act="editTask" data-id="${t.id}">${h(t.title)}</span>
        ${t.time ? `<span class="muted small">${h(t.time)}</span>` : ''}
        ${showDate && t.due ? `<span class="small ${overdue ? 'red' : 'muted'}">${fmtShort(t.due)}</span>` : ''}
        ${c ? `<a class="tag" href="#/dosar/${c.id}">${h(c.number || c.object)}</a>` : ''}
        ${t.source === 'anaf' ? '<span class="tag">ANAF</span>' : ''}
      </div>
      <textarea class="note" data-note="${t.id}" rows="1" placeholder="Adaugă o notă…">${h(t.note)}</textarea>
    </div>
    <button class="icon-btn" data-act="editTask" data-id="${t.id}" title="Editează" aria-label="Editează">✎</button>
  </li>`;
}

const agendaRow = it => `<div class="agenda-item"><span class="dot ${it.kind}"></span>
  <span class="time">${h(it.ev?.time || '')}</span>
  <a href="#" data-act="${it.act}" data-id="${it.id}" class="grow">${h(it.ev ? it.ev.title : it.label)}</a>
  ${it.ev?.caseId && byId('cases', it.ev.caseId) ? `<a class="tag" href="#/dosar/${it.ev.caseId}">${h(byId('cases', it.ev.caseId).number || 'dosar')}</a>` : ''}
  ${it.ev?.location ? `<span class="muted small">${h(it.ev.location)}</span>` : ''}</div>`;

const empty = msg => `<div class="empty">${msg}</div>`;

/* ================= Vederi ================= */
function viewHome() {
  const t0 = today();
  const days = [...Array(7)].map((_, i) => addDays(t0, i));
  const end = days[6];
  const open = S.tasks.filter(t => !t.done);
  const overdue = open.filter(t => t.due && t.due < t0).sort(sortTasks);
  const week = S.tasks.filter(t => t.due >= t0 && t.due <= end);
  const hearings = S.events.filter(e => e.type === 'termen' && e.date >= t0 && e.date <= addDays(t0, 13)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const anafDue = S.anaf.filter(a => a.status !== 'rezolvat').sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const expiring = S.docs.filter(d => d.expiry && diffDays(t0, d.expiry) <= 30).sort((a, b) => a.expiry.localeCompare(b.expiry));
  const noDate = open.filter(t => !t.due).sort(sortTasks);
  const lastBackup = setting('lastBackup', null);
  const hasData = S.tasks.length + S.cases.length + S.docs.length > 0;
  const needBackup = hasData && (!lastBackup || diffDays(lastBackup, t0) > 14);
  const name = setting('greetName', 'Ioana');
  const hr = new Date().getHours();
  const greet = hr < 11 ? 'Bună dimineața' : hr < 18 ? 'Bună ziua' : 'Bună seara';

  const dayCard = (d, i) => {
    const tasks = S.tasks.filter(t => t.due === d).sort(sortDayTasks);
    const agenda = itemsOn(d).filter(x => x.act !== 'editTask');
    const openN = tasks.filter(t => !t.done).length;
    const hol = holidayName(d);
    return `<section class="day ${i === 0 ? 'today' : ''}">
      <div class="day-head"><h3>${i === 0 ? 'Azi · ' : i === 1 ? 'Mâine · ' : ''}${fmtDay(d)}</h3>
        <span class="badge">${openN ? plural(openN, 'sarcină deschisă', 'sarcini deschise') : tasks.length ? 'totul bifat ✓' : ''}${hol ? ' · ' + h(hol) : ''}</span>
        <button class="icon-btn" data-act="newTask" data-due="${d}" title="Adaugă sarcină în această zi" aria-label="Adaugă sarcină">＋</button></div>
      ${agenda.map(agendaRow).join('')}
      ${tasks.length ? `<ul class="tasks">${tasks.map(t => taskRow(t)).join('')}</ul>` : agenda.length ? '' : empty('Nicio sarcină.')}
    </section>`;
  };

  return `
  <div class="launch">${HOME_LINKS.map(([t, sub, url, k]) => `<a class="launch-btn ${k}" href="${url}" target="_blank" rel="noopener"><span class="fav">${t.charAt(0)}</span><span><b>${t}</b><small>${sub}</small></span><span class="go">↗</span></a>`).join('')}</div>
  <div class="stats">
    <a class="stat ${overdue.length ? 'alert' : ''}" href="#/sarcini"><b>${overdue.length}</b><span>restante</span></a>
    <a class="stat" href="#/sarcini"><b>${week.filter(t => !t.done && t.due === t0).length}</b><span>sarcini azi</span></a>
    <a class="stat" href="#/sarcini"><b>${week.filter(t => !t.done).length}</b><span>deschise în 7 zile</span></a>
    <a class="stat" href="#/calendar"><b>${hearings.filter(e => e.date <= end).length}</b><span>termene în 7 zile</span></a>
    <a class="stat ${anafDue.some(a => a.due && diffDays(t0, a.due) <= 7) ? 'alert' : ''}" href="#/contabilitate"><b>${anafDue.length}</b><span>obligații ANAF deschise</span></a>
    <a class="stat" href="#/dosare"><b>${S.cases.filter(c => c.status === 'activ').length}</b><span>dosare în lucru</span></a>
  </div>
  ${needBackup ? `<div class="callout warn" style="margin-bottom:16px"><p><b>Faceți o copie de siguranță.</b> ${lastBackup ? 'Ultima copie: ' + fmtDate(lastBackup) + '.' : 'Nu ați făcut încă nicio copie.'} Datele sunt păstrate doar în acest browser.</p><button class="btn sm" data-act="backup">Descarcă backup acum</button></div>` : ''}
  <div class="grid-2">
    <div>
      <h2 style="margin-bottom:10px">${greet}, ${h(name)}! Iată următoarele 7 zile.</h2>
      <form class="quick" data-form="quickTask">
        <input name="title" placeholder="Sarcină nouă… (Enter pentru a adăuga)" autocomplete="off" aria-label="Sarcină nouă">
        <select name="due" aria-label="Ziua">${days.map((d, i) => `<option value="${d}">${i === 0 ? 'Azi' : i === 1 ? 'Mâine' : fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</option>`).join('')}<option value="">Fără dată</option></select>
        <select name="urgency" aria-label="Urgență">${urgOptions.map(([k, l]) => `<option value="${k}" ${k === '3' ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn primary">Adaugă</button>
      </form>
      ${overdue.length ? `<section class="day overdue"><div class="day-head"><h3>Restante</h3><span class="badge">${plural(overdue.length, 'sarcină', 'sarcini')}</span></div><ul class="tasks">${overdue.map(t => taskRow(t, { showDate: true })).join('')}</ul></section>` : ''}
      ${days.map(dayCard).join('')}
    </div>
    <div>
      ${miniCalendar()}
      <div class="card">
        <div class="card-head"><h2>Termene în instanță – 14 zile</h2><button class="btn sm" data-act="newEvent">＋ Termen</button></div>
        ${hearings.length ? `<ul class="list">${hearings.map(e => `<li><span class="dot termen"></span><div class="grow"><a href="#" data-act="editEvent" data-id="${e.id}">${h(e.title)}</a><span class="muted small">${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}${e.time ? ', ora ' + h(e.time) : ''}${e.location ? ' · ' + h(e.location) : ''}</span></div>${e.caseId ? `<a class="tag" href="#/dosar/${e.caseId}">dosar</a>` : ''}</li>`).join('')}</ul>` : empty('Niciun termen programat.')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Obligații ANAF</h2><a class="btn sm" href="#/contabilitate">Deschide</a></div>
        ${anafDue.length ? `<ul class="list">${anafDue.slice(0, 6).map(a => `<li><span class="dot anaf"></span><div class="grow"><a href="#" data-act="editAnaf" data-id="${a.id}">${h(a.title)}</a><span class="muted small">${a.amount ? money(a.amount) + ' · ' : ''}scadent ${fmtShort(a.due)} (${dueLabel(a.due)})</span></div></li>`).join('')}</ul>` : empty('Nicio obligație deschisă.')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Acte care expiră (30 zile)</h2></div>
        ${expiring.length ? `<ul class="list">${expiring.map(d => `<li><span class="dot expira"></span><div class="grow"><a href="#" data-act="editDoc" data-id="${d.id}">${h(d.name)}</a><span>${expiryBadge(d.expiry)}</span></div></li>`).join('')}</ul>` : empty('Niciun act nu expiră curând.')}
      </div>
      ${noDate.length ? `<div class="card"><div class="card-head"><h2>Sarcini fără dată</h2></div><ul class="tasks">${noDate.map(t => taskRow(t)).join('')}</ul></div>` : ''}
      <div class="card">
        <div class="card-head"><h2>Acces rapid</h2><a class="btn sm" href="#/linkuri">Toate</a></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${S.links.slice(0, 10).map(l => `<a class="tag" href="${h(l.url)}" target="_blank" rel="noopener">${h(l.title)}</a>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

function viewTasks() {
  const f = UI.tf;
  const t0 = today();
  let list = S.tasks.slice();
  if (f.status === 'deschise') list = list.filter(t => !t.done);
  if (f.status === 'finalizate') list = list.filter(t => t.done);
  if (f.urg) list = list.filter(t => String(t.urgency) === f.urg);
  if (f.caseId) list = list.filter(t => t.caseId === f.caseId);
  if (f.q) list = list.filter(t => norm(t.title + ' ' + t.note).includes(norm(f.q)));
  list.sort(sortTasks);
  const groups = f.status === 'finalizate'
    ? [['Finalizate', list.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))]]
    : [
      ['Restante', list.filter(t => !t.done && t.due && t.due < t0)],
      ['Azi', list.filter(t => t.due === t0)],
      ['Următoarele 7 zile', list.filter(t => t.due > t0 && t.due <= addDays(t0, 7))],
      ['Mai târziu', list.filter(t => t.due > addDays(t0, 7))],
      ['Fără dată', list.filter(t => !t.due)],
      ['Finalizate (trecute)', list.filter(t => t.done && t.due && t.due < t0)],
    ];
  return `
  <div class="toolbar">
    <select data-filter="tf.status"><option value="deschise">Deschise</option><option value="finalizate">Finalizate</option><option value="toate">Toate</option></select>
    <select data-filter="tf.urg"><option value="">Orice urgență</option>${urgOptions.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
    <select data-filter="tf.caseId">${caseOptions().map(([v, l]) => `<option value="${h(v)}">${v ? h(l) : 'Toate dosarele'}</option>`).join('')}</select>
    <input data-filter="tf.q" type="search" placeholder="Filtrează…" value="${h(f.q)}">
    <span class="spacer"></span>
    <button class="btn primary" data-act="newTask">＋ Sarcină nouă</button>
  </div>
  ${list.length ? groups.filter(([, l]) => l.length).map(([title, l]) => `<div class="group-title">${title} · ${l.length}</div><section class="day"><ul class="tasks">${l.map(t => taskRow(t, { showDate: true })).join('')}</ul></section>`).join('') : `<div class="card">${empty('Nicio sarcină pentru filtrele alese.')}</div>`}`;
}

function viewCases() {
  const f = UI.cf;
  let list = S.cases.slice();
  if (f.status) list = list.filter(c => c.status === f.status);
  if (f.q) list = list.filter(c => norm([c.number, c.court, c.object, c.adverse, c.notes, clientName(c.clientId)].join(' ')).includes(norm(f.q)));
  list.sort((a, b) => {
    const na = nextHearing(a.id)?.date || '9999', nb = nextHearing(b.id)?.date || '9999';
    return na.localeCompare(nb) || (b.updatedAt - a.updatedAt);
  });
  return `
  <div class="toolbar">
    <select data-filter="cf.status"><option value="">Toate</option>${Object.entries(CASE_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
    <input data-filter="cf.q" type="search" placeholder="Număr, client, obiect, instanță…" value="${h(f.q)}">
    <span class="spacer"></span>
    <button class="btn" data-act="portalSyncAll" title="Preia termenele și soluțiile tuturor dosarelor în lucru">⟳ Actualizează de pe portal</button>
    <button class="btn" data-act="portalNewCase">＋ Din portal.just.ro</button>
    <button class="btn primary" data-act="newCase">＋ Dosar nou</button>
  </div>
  <div class="card table-wrap">
    ${list.length ? `<table>
      <thead><tr><th>Dosar</th><th>Client</th><th>Obiect</th><th>Instanța</th><th>Stadiu</th><th>Următorul termen</th><th class="num">Sarcini</th><th class="num">Acte</th></tr></thead>
      <tbody>${list.map(c => {
        const nh = nextHearing(c.id);
        const openT = S.tasks.filter(t => t.caseId === c.id && !t.done).length;
        return `<tr class="click" data-act="goCase" data-id="${c.id}">
          <td class="nowrap"><b>${h(c.number || '—')}</b>${c.status !== 'activ' ? `<br><span class="pill u4">${CASE_STATUS[c.status]}</span>` : ''}</td>
          <td>${h(clientName(c.clientId))}${c.role ? `<br><span class="muted small">${h(c.role)}</span>` : ''}</td>
          <td>${h(c.object)}</td><td>${h(c.court)}</td><td>${h(c.stage)}</td>
          <td class="nowrap">${nh ? `${fmtDate(nh.date, { day: 'numeric', month: 'short', year: 'numeric' })}${nh.time ? ' ' + h(nh.time) : ''}<br><span class="muted small">${dueLabel(nh.date)}</span>` : '<span class="muted">—</span>'}</td>
          <td class="num">${openT || ''}</td><td class="num">${S.docs.filter(d => d.caseId === c.id).length || ''}</td></tr>`;
      }).join('')}</tbody></table>` : empty(S.cases.length ? 'Niciun dosar pentru filtrele alese.' : 'Nu există încă dosare. Adăugați primul dosar cu butonul „Dosar nou”.')}
  </div>`;
}

function viewCase(id) {
  const c = byId('cases', id);
  if (!c) return `<div class="card">${empty('Dosarul nu există.')} <a href="#/dosare">Înapoi la dosare</a></div>`;
  const client = byId('clients', c.clientId);
  const events = S.events.filter(e => e.caseId === id).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  const tasks = S.tasks.filter(t => t.caseId === id).sort(sortTasks);
  const docs = S.docs.filter(d => d.caseId === id);
  const pays = S.ledger.filter(l => l.caseId === id && l.type === 'incasare');
  const paid = pays.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const info = [
    ['Instanța', c.court], ['Client', client ? `<a href="#" data-act="editClient" data-id="${client.id}">${h(client.name)}</a>` : ''],
    ['Calitate', c.role], ['Parte adversă', c.adverse], ['Stadiu', c.stage], ['Complet', c.panel],
    ['Contract asistență', c.contract], ['Onorariu', c.fee ? `${money(c.fee)} <span class="muted small">(încasat ${money(paid)})</span>` : (paid ? 'încasat ' + money(paid) : '')],
    ['Stare', CASE_STATUS[c.status]],
  ].filter(([, v]) => v);
  const byCat = {};
  docs.forEach(d => (byCat[d.category || 'Altele'] ||= []).push(d));
  return `
  <p style="margin:0 0 12px"><a href="#/dosare">← Dosare</a></p>
  <div class="card">
    <div class="case-title"><h2>${h(c.number || 'Dosar fără număr')}</h2><span class="muted">${h(c.object)}</span></div>
    <div class="info-grid">${info.map(([k, v]) => `<div><span>${k}</span><b>${k === 'Client' || k === 'Onorariu' ? v : h(v)}</b></div>`).join('')}</div>
    ${c.notes ? `<div class="callout" style="margin-top:14px;white-space:pre-wrap">${h(c.notes)}</div>` : ''}
    <div class="actions">
      <button class="btn primary" data-act="newEvent" data-case="${id}">＋ Termen</button>
      <button class="btn" data-act="newTask" data-case="${id}">＋ Sarcină</button>
      <button class="btn" data-act="upload" data-scope="case" data-case="${id}">＋ Acte</button>
      <button class="btn" data-act="newLedger" data-case="${id}">＋ Încasare</button>
      <button class="btn" data-act="editCase" data-id="${id}">Editează</button>
      <a class="btn ghost" href="https://portal.just.ro" target="_blank" rel="noopener">Portalul instanțelor ↗</a>
    </div>
  </div>
  <div class="grid-2" style="margin-top:14px">
    <div>
      <div class="card">
        <div class="card-head"><h2>Sarcini</h2></div>
        ${tasks.length ? `<ul class="tasks">${tasks.map(t => taskRow(t, { showDate: true })).join('')}</ul>` : empty('Nicio sarcină.')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Acte din dosar · ${docs.length}</h2><button class="btn sm" data-act="upload" data-scope="case" data-case="${id}">＋ Încarcă</button></div>
        ${docs.length ? Object.entries(byCat).map(([cat, l]) => `<div class="group-title">${h(cat)}</div>${l.map(d => docRow(d)).join('')}`).join('') : empty('Niciun act încărcat.')}
      </div>
    </div>
    <div>
      ${portalCard(c)}
      <div class="card">
        <div class="card-head"><h2>Termene și evenimente</h2></div>
        ${events.length ? `<ul class="list">${events.map(e => `<li><span class="dot ${e.type}"></span><div class="grow"><a href="#" data-act="editEvent" data-id="${e.id}">${h(e.title)}</a><span class="muted small">${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${e.time ? ', ' + h(e.time) : ''}${e.date < today() ? ' · trecut' : ''}${e.portal ? ' · portal' : ''}</span>${e.note ? `<span class="small">${h(e.note)}</span>` : ''}${e.portalNote ? `<span class="small muted" style="white-space:pre-line">${h(e.portalNote)}</span>` : ''}</div></li>`).join('')}</ul>` : empty('Niciun termen.')}
      </div>
      <div class="card">
        <div class="card-head"><h2>Încasări pe dosar</h2></div>
        ${pays.length ? `<ul class="list">${pays.map(l => `<li><div class="grow"><a href="#" data-act="editLedger" data-id="${l.id}">${h(l.description)}</a><span class="muted small">${fmtDate(l.date)}${l.docNo ? ' · ' + h(l.docNo) : ''}</span></div><b class="nowrap">${money(l.amount)}</b></li>`).join('')}</ul>` : empty('Nicio încasare înregistrată.')}
      </div>
    </div>
  </div>`;
}

// Calendar lunar compact pentru prima pagină; clic pe zi deschide calendarul complet.
function miniCalendar() {
  const [y, m] = UI.homeCal.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const weeks = Math.ceil((offset + new Date(y, m, 0).getDate()) / 7);
  const start = addDays(ymd(first), -offset);
  const t0 = today();
  const cells = [...Array(weeks * 7)].map((_, i) => {
    const d = addDays(start, i);
    const kinds = [...new Set(itemsOn(d).filter(it => !it.done).map(it => it.kind))].slice(0, 3);
    const cls = [d.slice(0, 7) !== UI.homeCal && 'other', d === t0 && 'today', isNonWorking(d) && 'off'].filter(Boolean).join(' ');
    const tip = [holidayName(d), ...itemsOn(d).map(it => it.label)].filter(Boolean).join('\n');
    return `<button type="button" class="mc-day ${cls}" data-act="homeCalDay" data-date="${d}" title="${h(tip)}"><span>${parseYmd(d).getDate()}</span><i>${kinds.map(k => `<b class="dot ${k}"></b>`).join('')}</i></button>`;
  }).join('');
  return `<div class="card minical">
    <div class="card-head">
      <button class="icon-btn" data-act="homeCalMove" data-d="-1" aria-label="Luna anterioară">‹</button>
      <h2>${first.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</h2>
      <button class="icon-btn" data-act="homeCalMove" data-d="1" aria-label="Luna următoare">›</button>
      <a class="btn sm" href="#/calendar">Calendar</a>
    </div>
    <div class="mc-grid">${['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'].map(x => `<span class="mc-dow">${x}</span>`).join('')}${cells}</div>
  </div>`;
}

function viewCalendar() {
  const [y, m] = UI.cal.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const dim = new Date(y, m, 0).getDate();
  const weeks = Math.ceil((offset + dim) / 7);
  const start = addDays(ymd(first), -offset);
  const t0 = today();
  const cells = [...Array(weeks * 7)].map((_, i) => {
    const d = addDays(start, i);
    const items = itemsOn(d);
    const cls = [d.slice(0, 7) !== UI.cal && 'other', d === t0 && 'today', d === UI.calSel && 'sel', isNonWorking(d) && 'off'].filter(Boolean).join(' ');
    return `<div class="cell ${cls}" data-act="calDay" data-date="${d}" title="${h(holidayName(d) || '')}">
      <span class="n">${parseYmd(d).getDate()}</span>
      ${items.slice(0, 3).map(it => `<span class="chip ${it.kind} ${it.done ? 'done' : ''}">${h(it.label)}</span>`).join('')}
      ${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ''}
    </div>`;
  }).join('');
  const sel = UI.calSel;
  const selItems = itemsOn(sel);
  const hol = holidayName(sel);
  return `
  <div class="grid-2">
    <div>
      <div class="cal-head">
        <button class="btn sm" data-act="calMove" data-d="-1" aria-label="Luna anterioară">‹</button>
        <h2>${first.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</h2>
        <button class="btn sm" data-act="calMove" data-d="1" aria-label="Luna următoare">›</button>
        <button class="btn sm ghost" data-act="calToday">Azi</button>
        <span class="spacer"></span>
        <button class="btn sm" data-act="exportIcs" title="Pentru import în Google Calendar, Outlook sau telefon">Export .ics</button>
        <button class="btn sm primary" data-act="newEvent" data-date="${sel}">＋ Eveniment</button>
      </div>
      <div class="cal">${['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>
      <div class="legend">
        <span><i class="dot termen"></i>Termen instanță</span><span><i class="dot anaf"></i>ANAF</span>
        <span><i class="dot intalnire"></i>Întâlnire</span><span><i class="dot personal"></i>Personal</span>
        <span><i class="dot todo"></i>Sarcină</span><span><i class="dot expira"></i>Expirare act</span>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h2 style="text-transform:capitalize">${fmtDay(sel)}</h2></div>
      ${hol ? `<p class="small red" style="margin-top:0">Zi nelucrătoare: ${h(hol)}</p>` : ''}
      <div class="actions" style="margin:0 0 10px">
        <button class="btn sm" data-act="newEvent" data-date="${sel}">＋ Eveniment</button>
        <button class="btn sm" data-act="newTask" data-due="${sel}">＋ Sarcină</button>
      </div>
      ${selItems.length ? `<ul class="list">${selItems.map(it => `<li><span class="dot ${it.kind}"></span><div class="grow"><a href="#" data-act="${it.act}" data-id="${it.id}" style="${it.done ? 'text-decoration:line-through' : ''}">${h(it.label)}</a>${it.ev?.location ? `<span class="muted small">${h(it.ev.location)}</span>` : ''}${it.ev?.caseId && byId('cases', it.ev.caseId) ? `<span class="small"><a href="#/dosar/${it.ev.caseId}">${h(caseLabel(byId('cases', it.ev.caseId)))}</a></span>` : ''}</div></li>`).join('')}</ul>` : empty('Nimic programat.')}
    </div>
  </div>`;
}

function viewClients() {
  const list = S.clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  return `
  <div class="toolbar"><span class="muted small">${plural(list.length, 'client', 'clienți')}</span><span class="spacer"></span><button class="btn primary" data-act="newClient">＋ Client nou</button></div>
  <div class="card table-wrap">
    ${list.length ? `<table><thead><tr><th>Nume</th><th>CNP / CUI</th><th>Telefon</th><th>E-mail</th><th>Dosare</th></tr></thead><tbody>
      ${list.map(c => `<tr class="click" data-act="editClient" data-id="${c.id}"><td><b>${h(c.name)}</b> <span class="muted small">${c.type}</span>${c.address ? `<br><span class="muted small">${h(c.address)}</span>` : ''}</td>
        <td>${h(c.idCode)}</td>
        <td class="nowrap">${c.phone ? `<a href="tel:${h(c.phone)}">${h(c.phone)}</a>` : ''}</td>
        <td>${c.email ? `<a href="mailto:${h(c.email)}">${h(c.email)}</a>` : ''}</td>
        <td>${S.cases.filter(k => k.clientId === c.id).map(k => `<a class="tag" href="#/dosar/${k.id}">${h(k.number || k.object)}</a>`).join(' ')}</td></tr>`).join('')}
    </tbody></table>` : empty('Nu există încă clienți.')}
  </div>`;
}

function viewCaseDocs() {
  const cases = S.cases.slice().sort((a, b) => (a.status === 'activ' ? 0 : 1) - (b.status === 'activ' ? 0 : 1) || caseLabel(a).localeCompare(caseLabel(b)));
  const orphan = S.docs.filter(d => d.scope === 'case' && !byId('cases', d.caseId));
  return `
  <div class="toolbar"><span class="muted small">Actele din dosarele clienților, grupate pe dosar.</span><span class="spacer"></span>
    <button class="btn primary" data-act="upload" data-scope="case" ${S.cases.length ? '' : 'disabled'}>＋ Încarcă acte</button></div>
  ${cases.length ? cases.map(c => {
    const docs = S.docs.filter(d => d.caseId === c.id);
    return `<details class="case-docs" ${docs.length && c.status === 'activ' ? '' : ''}>
      <summary><span>${h(caseLabel(c))}</span><span class="muted small">${h(c.object || '')}</span><span class="spacer"></span><span class="tag">${plural(docs.length, 'act', 'acte')}</span></summary>
      <div class="inner">
        ${docs.length ? docs.map(d => docRow(d)).join('') : empty('Niciun act.')}
        <div class="actions"><button class="btn sm" data-act="upload" data-scope="case" data-case="${c.id}">＋ Încarcă la acest dosar</button><a class="btn sm ghost" href="#/dosar/${c.id}">Deschide dosarul</a></div>
      </div></details>`;
  }).join('') : `<div class="card">${empty('Creați mai întâi un dosar în secțiunea „Dosare în lucru”.')}</div>`}
  ${orphan.length ? `<div class="card"><h2>Acte fără dosar</h2>${orphan.map(d => docRow(d)).join('')}</div>` : ''}`;
}

function viewSuitcase() {
  const docs = S.docs.filter(d => d.scope === 'personal');
  const cats = PERSONAL_CATS.filter(c => docs.some(d => d.category === c));
  const other = docs.filter(d => !PERSONAL_CATS.includes(d.category));
  return `
  <div class="toolbar"><span class="muted small">Acte personale și profesionale: CI, legitimație, asigurare RCP, acte fiscale, contracte etc. Setați data expirării pentru a primi alerte.</span>
    <span class="spacer"></span><button class="btn primary" data-act="upload" data-scope="personal">＋ Adaugă acte</button></div>
  ${docs.length ? `<div class="grid-cards">${cats.map(cat => `<div class="card" style="margin:0"><div class="card-head"><h2>${h(cat)}</h2></div>${docs.filter(d => d.category === cat).map(d => docRow(d)).join('')}</div>`).join('')}
    ${other.length ? `<div class="card" style="margin:0"><h2>Altele</h2>${other.map(d => docRow(d)).join('')}</div>` : ''}</div>` : `<div class="card">${empty('Geamantanul este gol. Adăugați primele acte.')}</div>`}`;
}

function viewAccounting(tab) {
  const tabs = `<div class="tabs"><a href="#/contabilitate" class="${tab !== 'registru' ? 'active' : ''}">ANAF – Spațiul Privat Virtual</a><a href="#/contabilitate/registru" class="${tab === 'registru' ? 'active' : ''}">Registru încasări și plăți</a></div>`;
  return tabs + (tab === 'registru' ? viewLedger() : viewAnaf());
}

function viewAnaf() {
  const spv = setting('spvUrl', 'https://www.anaf.ro');
  const list = S.anaf.slice().sort((a, b) => (a.status === 'rezolvat') - (b.status === 'rezolvat') || (a.due || '').localeCompare(b.due || ''));
  const openSum = list.filter(a => a.status !== 'rezolvat').reduce((s, a) => s + (Number(a.amount) || 0), 0);
  return `
  <div class="grid-2">
    <div class="card">
      <div class="card-head"><h2>Obligații și notificări</h2><button class="btn primary sm" data-act="newAnaf">＋ Adaugă din SPV</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Descriere</th><th>Scadență</th><th class="num">Sumă</th><th>Stare</th><th></th></tr></thead><tbody>
        ${list.map(a => `<tr><td><a href="#" data-act="editAnaf" data-id="${a.id}"><b>${h(a.title)}</b></a><br><span class="muted small">${ANAF_KINDS[a.kind]}${a.docNo ? ' · nr. ' + h(a.docNo) : ''}${a.received ? ' · primit ' + fmtShort(a.received) : ''}</span></td>
          <td class="nowrap">${fmtDate(a.due, { day: 'numeric', month: 'short', year: 'numeric' })}${a.status !== 'rezolvat' ? `<br><span class="small">${dueLabel(a.due)}</span>` : ''}</td>
          <td class="num">${a.amount ? money(a.amount) : ''}</td>
          <td>${a.status === 'rezolvat' ? '<span class="pill ok">rezolvat</span>' : '<span class="pill u2">deschis</span>'}</td>
          <td class="nowrap">${a.status !== 'rezolvat' ? `<button class="btn sm" data-act="resolveAnaf" data-id="${a.id}">${a.kind === 'datorie' ? 'Plătit' : 'Rezolvat'} ✓</button>` : ''}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="2">Total deschis</td><td class="num">${money(openSum)}</td><td colspan="2"></td></tr></tfoot></table></div>` : empty('Nicio înregistrare. Adăugați obligațiile și notificările găsite în SPV.')}
    </div>
    <div>
      <div class="card">
        <h2>Spațiul Privat Virtual</h2>
        <div class="actions"><a class="btn primary" href="${h(spv)}" target="_blank" rel="noopener">Deschide ANAF / SPV ↗</a><a class="btn" href="https://www.ghiseul.ro" target="_blank" rel="noopener">Plătește pe Ghișeul.ro ↗</a></div>
        <p class="small muted">Adresa butonului se poate modifica din Setări (ex. pagina exactă de autentificare SPV pe care o folosiți).</p>
      </div>
      <div class="card">
        <div class="callout warn">
          <p><b>De ce nu se preiau automat datele din SPV?</b></p>
          <p>Accesul în SPV se face cu datele personale de autentificare (utilizator și parolă sau certificat digital), iar, din câte știu, ANAF nu oferă o interfață publică prin care o aplicație să citească automat mesajele și situația fiscală a unei persoane fizice. O aplicație care ar stoca parola SPV ar crea și un risc de securitate.</p>
          <p><b>Fluxul recomandat:</b> deschideți SPV → verificați mesajele primite și situația obligațiilor → pentru fiecare datorie sau notificare apăsați „Adaugă din SPV”. Aplicația o pune automat în calendar și în TO DO, iar când o marcați „Plătit”, se bifează și sarcina.</p>
        </div>
      </div>
    </div>
  </div>`;
}

function viewLedger() {
  const y = String(UI.ledgerYear);
  const years = [...new Set([new Date().getFullYear(), ...S.ledger.map(l => Number(l.date.slice(0, 4)))])].sort((a, b) => b - a);
  const list = S.ledger.filter(l => l.date.startsWith(y)).sort((a, b) => a.date.localeCompare(b.date));
  const inc = list.filter(l => l.type === 'incasare').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const out = list.filter(l => l.type === 'plata').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  return `
  <div class="toolbar">
    <select data-filter="ledgerYear">${years.map(v => `<option value="${v}" ${String(v) === y ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <span class="spacer"></span>
    <button class="btn" data-act="exportCsv">Export CSV (Excel)</button>
    <button class="btn primary" data-act="newLedger">＋ Înregistrare</button>
  </div>
  <div class="stats">
    <div class="stat"><b>${money(inc)}</b><span>încasări ${y}</span></div>
    <div class="stat"><b>${money(out)}</b><span>plăți ${y}</span></div>
    <div class="stat"><b>${money(inc - out)}</b><span>diferență</span></div>
  </div>
  <div class="card table-wrap">
    ${list.length ? `<table><thead><tr><th>Data</th><th>Document</th><th>Explicație</th><th>Modalitate</th><th class="num">Încasări</th><th class="num">Plăți</th></tr></thead><tbody>
      ${list.map(l => `<tr class="click" data-act="editLedger" data-id="${l.id}"><td class="nowrap">${fmtDate(l.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td><td>${h(l.docNo)}</td>
        <td>${h(l.description)}${l.clientId ? `<br><span class="muted small">${h(clientName(l.clientId))}</span>` : ''}</td><td>${h(l.method)}</td>
        <td class="num">${l.type === 'incasare' ? money(l.amount) : ''}</td><td class="num">${l.type === 'plata' ? money(l.amount) : ''}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">Total ${y}</td><td class="num">${money(inc)}</td><td class="num">${money(out)}</td></tr></tfoot></table>` : empty('Nicio înregistrare în ' + y + '.')}
  </div>
  <p class="small muted">Evidență orientativă, utilă pentru urmărirea onorariilor și a cheltuielilor. Nu înlocuiește registrul de încasări și plăți în forma prevăzută de reglementările fiscale și nici verificarea de către un contabil.</p>`;
}

function viewTermCalc() {
  const c = UI.calc;
  const r = c.res;
  const y = new Date().getFullYear();
  const hol = [...holidays(y).entries()].sort();
  return `
  <div class="grid-2">
    <div>
      <div class="card">
        <h2>Calculul termenelor procedurale</h2>
        <form class="calc-form" data-form="calc" style="margin-top:12px">
          <label class="field"><span>Data de la care curge termenul</span><input type="date" name="start" value="${h(c.start)}" required></label>
          <label class="field"><span>Durata</span><input type="number" name="n" min="1" step="1" value="${h(c.n)}" required></label>
          <label class="field"><span>Unitate</span><select name="unit">${[['zile', 'zile'], ['saptamani', 'săptămâni'], ['luni', 'luni'], ['ani', 'ani']].map(([v, l]) => `<option value="${v}" ${c.unit === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="btn primary">Calculează</button>
        </form>
        <div class="actions">${[[15, 'zile'], [30, 'zile'], [10, 'zile'], [5, 'zile'], [1, 'luni']].map(([n, u]) => `<button class="btn sm ghost" data-act="calcPreset" data-n="${n}" data-unit="${u}">${n} ${u === 'luni' ? 'lună' : u}</button>`).join('')}</div>
      </div>
      ${r ? `<div class="card">
        <span class="muted small">Ultima zi în care actul poate fi făcut</span>
        <div class="calc-result">${fmtDay(r.final)} ${parseYmd(r.final).getFullYear()}</div>
        <ol class="steps">${r.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol>
        <form class="quick" data-form="calcTask" style="margin:14px 0 0">
          <input name="title" placeholder="Ce trebuie depus? (ex. Apel împotriva sentinței)" required>
          <select name="caseId">${caseOptions().map(([v, l]) => `<option value="${h(v)}">${h(l)}</option>`).join('')}</select>
          <button class="btn primary">Adaugă în TO DO</button>
        </form>
      </div>` : ''}
    </div>
    <div>
      <div class="card"><div class="callout danger">
        <p><b>Verificați întotdeauna rezultatul.</b> Calculul aplică regulile generale din art. 181 C.proc.civ. (termene pe zile libere; termene pe săptămâni, luni, ani; prelungirea până la prima zi lucrătoare). Nu ține cont de reguli speciale (ex. termene pe ore, termene de drept material sau penal, suspendări, întreruperi, comunicări prin poștă – art. 183) și nici de modificări legislative recente.</p>
      </div></div>
      <div class="card">
        <h2>Zile nelucrătoare ${y}</h2>
        <p class="small muted">Weekenduri și sărbători legale conform art. 139 din Codul muncii, în forma cunoscută la data realizării aplicației. Zilele suplimentare se adaugă din Setări.</p>
        <ul class="list">${hol.map(([d, n]) => `<li><span class="grow"><span>${fmtDay(d)}</span></span><span class="muted small">${h(n)}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>`;
}

function viewLinks() {
  const groups = {};
  S.links.forEach(l => (groups[l.group || 'Diverse'] ||= []).push(l));
  return `
  <div class="toolbar"><span class="spacer"></span><button class="btn ghost" data-act="resetLinks">Adaugă linkurile implicite lipsă</button><button class="btn primary" data-act="newLink">＋ Link nou</button></div>
  ${Object.entries(groups).map(([g, l]) => `<div class="group-title">${h(g)}</div><div class="grid-cards">${l.map(x => `
    <div class="card link-card" style="margin:0">
      <div class="fav">${h(x.title.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0"><a class="title" href="${h(x.url)}" target="_blank" rel="noopener">${h(x.title)} ↗</a>
        ${x.note ? `<div class="small">${h(x.note)}</div>` : ''}<small>${h(x.url.replace(/^https?:\/\//, ''))}</small></div>
      <button class="icon-btn" data-act="editLink" data-id="${x.id}" title="Editează" aria-label="Editează">✎</button>
    </div>`).join('')}</div>`).join('')}`;
}

function viewSettings() {
  const lastBackup = setting('lastBackup', null);
  const theme = setting('theme', 'auto');
  return `
  <div class="grid-2">
    <div>
      <div class="card">
        <h2>Preferințe</h2>
        <form data-form="settings" style="display:grid;gap:12px;margin-top:12px">
          <label class="field"><span>Nume afișat</span><input name="name" value="${h(setting('name', 'Ioana Stoica'))}"></label>
          <label class="field"><span>Nume folosit în salut</span><input name="greetName" value="${h(setting('greetName', 'Ioana'))}"></label>
          <label class="field"><span>Adresa butonului „SPV ANAF”</span><input name="spvUrl" type="url" value="${h(setting('spvUrl', 'https://www.anaf.ro'))}"><small>Lipiți aici adresa exactă a paginii de autentificare SPV pe care o folosiți.</small></label>
          <label class="field check"><input type="checkbox" name="portalAuto" ${setting('portalAuto', true) ? 'checked' : ''}><span>Actualizează zilnic dosarele în lucru de pe portal.just.ro (în aplicația desktop, la prima pornire din zi)</span></label>
          <label class="field"><span>Temă</span><select name="theme">${[['auto', 'Automată (după sistem)'], ['light', 'Luminoasă'], ['dark', 'Întunecată']].map(([v, l]) => `<option value="${v}" ${theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Zile nelucrătoare suplimentare</span><textarea name="extraHolidays" rows="3" placeholder="ex. 2026-12-24, 2026-12-31">${h(setting('extraHolidays', ''))}</textarea><small>Format AAAA-LL-ZZ, separate prin virgulă sau rând nou. Se folosesc în calendar și la calculul termenelor.</small></label>
          <div><button class="btn primary">Salvează preferințele</button></div>
        </form>
      </div>
    </div>
    <div>
      <div class="card">
        <h2>Copie de siguranță</h2>
        <p class="small">Toate datele (inclusiv fișierele încărcate) sunt păstrate <b>doar în acest browser, pe acest dispozitiv</b>. Nu sunt trimise nicăieri. Dacă ștergeți datele browserului sau schimbați dispozitivul, le pierdeți – de aceea descărcați periodic un backup și păstrați-l într-un loc sigur (ex. stick criptat).</p>
        <p class="small">Ultimul backup: <b>${lastBackup ? fmtDate(lastBackup) : 'niciodată'}</b></p>
        <div class="actions"><button class="btn primary" data-act="backup">Descarcă backup</button><button class="btn" data-act="restore">Restaurează din backup…</button></div>
        <p class="small muted" id="storageInfo"></p>
      </div>
      <div class="card">
        <h2>Zona periculoasă</h2>
        <p class="small">Șterge definitiv toate datele din aplicație de pe acest dispozitiv.</p>
        <button class="btn danger" data-act="wipe">Șterge toate datele</button>
      </div>
    </div>
  </div>`;
}

function viewSearch(q) {
  q = q || '';
  const n = norm(q);
  const hit = (...xs) => norm(xs.join(' ')).includes(n);
  const tasks = S.tasks.filter(t => hit(t.title, t.note)).sort(sortTasks);
  const cases = S.cases.filter(c => hit(c.number, c.court, c.object, c.adverse, c.notes, c.panel, clientName(c.clientId)));
  const clients = S.clients.filter(c => hit(c.name, c.idCode, c.phone, c.email, c.address, c.notes));
  const docs = S.docs.filter(d => hit(d.name, d.fileName, d.category, d.note));
  const events = S.events.filter(e => hit(e.title, e.location, e.note));
  const total = tasks.length + cases.length + clients.length + docs.length + events.length;
  const sec = (title, arr, fn) => arr.length ? `<div class="card"><h2>${title} · ${arr.length}</h2>${fn(arr)}</div>` : '';
  return `<p class="muted">${plural(total, 'rezultat', 'rezultate')} pentru „${h(q)}”.</p>
    ${sec('Dosare', cases, a => `<ul class="list">${a.map(c => `<li><a href="#/dosar/${c.id}" class="grow"><b>${h(caseLabel(c))}</b> <span class="muted">${h(c.object)}</span></a></li>`).join('')}</ul>`)}
    ${sec('Sarcini', tasks, a => `<ul class="tasks">${a.map(t => taskRow(t, { showDate: true })).join('')}</ul>`)}
    ${sec('Clienți', clients, a => `<ul class="list">${a.map(c => `<li><a href="#" data-act="editClient" data-id="${c.id}" class="grow">${h(c.name)}</a><span class="muted small">${h(c.phone || '')}</span></li>`).join('')}</ul>`)}
    ${sec('Termene și evenimente', events, a => `<ul class="list">${a.map(e => `<li><span class="dot ${e.type}"></span><a href="#" data-act="editEvent" data-id="${e.id}" class="grow">${h(e.title)}</a><span class="muted small">${fmtDate(e.date)}</span></li>`).join('')}</ul>`)}
    ${sec('Acte', docs, a => a.map(d => docRow(d, true)).join(''))}`;
}

/* ================= Router ================= */
const ROUTES = {
  acasa: [viewHome, 'Acasă'],
  sarcini: [viewTasks, 'TO DO'],
  dosare: [viewCases, 'Dosare în lucru'],
  dosar: [viewCase, 'Dosar'],
  calendar: [viewCalendar, 'Calendar'],
  clienti: [viewClients, 'Clienți'],
  acte: [viewCaseDocs, 'Acte clienți'],
  geamantan: [viewSuitcase, 'Geamantan personal'],
  semnatura: [viewSignature, 'Semnătură electronică'],
  contabilitate: [viewAccounting, 'Contabilitate & ANAF'],
  termene: [viewTermCalc, 'Calcul termene'],
  linkuri: [viewLinks, 'Linkuri utile'],
  setari: [viewSettings, 'Setări & backup'],
  cautare: [viewSearch, 'Căutare'],
};

function route() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  const key = ROUTES[name] ? name : 'acasa';
  const param = decodeURIComponent(rest.join('/'));
  const [fn, title] = ROUTES[key];
  $('#view').innerHTML = fn(param);
  $('#pageTitle').textContent = key === 'dosar' ? (byId('cases', param)?.number || 'Dosar') : title;
  document.title = `${$('#pageTitle').textContent} · Cabinet Stoica`;
  renderNav(key === 'dosar' ? 'dosare' : key);
  afterRender();
}

function rerender() {
  const y = window.scrollY;
  route();
  window.scrollTo(0, y);
}

function renderNav(active) {
  const t0 = today();
  const due = S.tasks.filter(t => !t.done && t.due && t.due <= t0).length;
  const anafSoon = S.anaf.filter(a => a.status !== 'rezolvat' && a.due && diffDays(t0, a.due) <= 7).length;
  const counts = { sarcini: due, contabilitate: anafSoon };
  $('#nav').innerHTML = NAV.map(n => n ? `<a href="#/${n[0]}" class="${n[0] === active ? 'active' : ''}">${icon(n[0])}<span>${n[1]}</span>${counts[n[0]] ? `<span class="count">${counts[n[0]]}</span>` : ''}</a>` : '<div class="sep"></div>').join('');
  $('#brandName').textContent = setting('name', 'Ioana Stoica');
  $('#sidebarFoot').textContent = window.desktop ? 'Datele sunt stocate doar pe acest calculator.' : 'Datele sunt stocate local, doar pe acest dispozitiv.';
}

function afterRender() {
  $$('textarea.note').forEach(autoGrow);
  $$('[data-filter]').forEach(el => {
    const v = getPath(el.dataset.filter);
    if (el.tagName === 'SELECT') el.value = String(v ?? '');
  });
  const info = $('#storageInfo');
  if (info && navigator.storage?.estimate) {
    navigator.storage.estimate().then(async e => {
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      info.textContent = `Spațiu folosit: ${fmtSize(e.usage || 0)}${e.quota ? ' din aprox. ' + fmtSize(e.quota) : ''}. ${persisted ? 'Stocare persistentă activată.' : 'Browserul nu a confirmat stocarea persistentă – faceți backup regulat.'}`;
    });
  }
}

function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function getPath(p) { return p.split('.').reduce((o, k) => o?.[k], UI); }
function setPath(p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], UI)[last] = v; }

/* ================= Acțiuni ================= */
const ACT = {
  toggleMenu: () => document.querySelector('.app').classList.toggle('menu-open'),
  newTask: d => taskForm({}, { due: d.due ?? today(), caseId: d.case || '' }),
  editTask: d => taskForm(byId('tasks', d.id)),
  toggleTask: async (d, el) => {
    const t = byId('tasks', d.id);
    await save('tasks', { ...t, done: el.checked, doneAt: el.checked ? Date.now() : null });
    if (t.anafId) await syncAnafFromTask(t.anafId, el.checked);
    if (el.checked) toast('Bravo! Sarcină bifată ✓');
    setTimeout(rerender, 250);
  },
  newEvent: d => eventForm({}, { date: d.date || today(), caseId: d.case || '' }),
  editEvent: d => eventForm(byId('events', d.id)),
  newCase: () => caseForm(),
  editCase: d => caseForm(byId('cases', d.id)),
  portalSync: d => portalSyncOne(d.id),
  portalSyncAll: () => portalSyncAll(),
  portalNewCase: () => portalNewCase(),
  goCase: d => { location.hash = '#/dosar/' + d.id; },
  newClient: () => clientForm(),
  editClient: d => clientForm(byId('clients', d.id)),
  newAnaf: () => anafForm(),
  editAnaf: d => anafForm(byId('anaf', d.id)),
  resolveAnaf: async d => {
    const a = byId('anaf', d.id);
    await saveAnaf(a, { ...a, status: 'rezolvat', addCal: !!(a.taskId || a.eventId) });
    toast('Marcat ca rezolvat; sarcina din TO DO a fost bifată.');
    rerender();
  },
  newLedger: d => ledgerForm(d.case ? { caseId: d.case, clientId: byId('cases', d.case)?.clientId || '', description: 'Onorariu ' + (byId('cases', d.case)?.number || '') } : {}),
  editLedger: d => ledgerForm(byId('ledger', d.id)),
  upload: d => uploadForm(d.scope, d.case || ''),
  openDoc: d => openDoc(d.id),
  dlDoc: d => openDoc(d.id, true),
  editDoc: d => docForm(byId('docs', d.id)),
  signDoc: d => startSigning({ doc: byId('docs', d.id) }),
  sigDraw: () => signaturePad(),
  sigDownload: d => fetch(setting(d.k)).then(r => r.blob()).then(b => download('semnatura-stoica.png', b)),
  sigDelete: async d => {
    if (!confirm('Ștergeți imaginea salvată?')) return;
    await remove('settings', d.k);
    rerender();
  },
  newLink: () => linkForm(),
  editLink: d => linkForm(byId('links', d.id)),
  resetLinks: async () => {
    let n = 0;
    for (const [group, title, url, note] of DEFAULT_LINKS) {
      if (!S.links.some(l => l.url.replace(/\/$/, '') === url)) { await save('links', { group, title, url, note }); n++; }
    }
    toast(n ? `Am adăugat ${plural(n, 'link', 'linkuri')}.` : 'Toate linkurile implicite există deja.');
    rerender();
  },
  calDay: d => { UI.calSel = d.date; if (d.date.slice(0, 7) !== UI.cal) UI.cal = d.date.slice(0, 7); rerender(); },
  calMove: d => {
    const [y, m] = UI.cal.split('-').map(Number);
    const nd = new Date(y, m - 1 + Number(d.d), 1);
    UI.cal = ymd(nd).slice(0, 7);
    rerender();
  },
  homeCalMove: d => {
    const [y, m] = UI.homeCal.split('-').map(Number);
    UI.homeCal = ymd(new Date(y, m - 1 + Number(d.d), 1)).slice(0, 7);
    rerender();
  },
  homeCalDay: d => { UI.calSel = d.date; UI.cal = d.date.slice(0, 7); location.hash = '#/calendar'; },
  calToday: () => { UI.cal = today().slice(0, 7); UI.calSel = today(); rerender(); },
  exportIcs: () => exportIcs(),
  exportCsv: () => exportCsv(),
  calcPreset: d => { UI.calc.n = Number(d.n); UI.calc.unit = d.unit; UI.calc.res = computeTerm(UI.calc.start, UI.calc.n, UI.calc.unit); rerender(); },
  backup: () => backup(),
  restore: () => $('#restoreInput').click(),
  wipe: () => openForm({
    title: 'Ștergerea tuturor datelor',
    intro: '<b>Atenție:</b> se șterg definitiv sarcinile, dosarele, clienții, actele și contabilitatea de pe acest dispozitiv. Recomandăm să descărcați întâi un backup.',
    submit: 'Șterge definitiv',
    fields: [{ name: 'confirm', label: 'Pentru confirmare scrieți STERGE', required: true, wide: true }],
    onSave: async v => {
      if (v.confirm !== 'STERGE') throw new Error('Scrieți exact STERGE (cu majuscule).');
      for (const s of STORES) { await DB.clear(s); if (s !== 'files') S[s] = []; }
      location.hash = '#/acasa';
    },
  }),
};

const FORMS = {
  quickTask: async f => {
    const title = f.title.value.trim();
    if (!title) return f.title.focus();
    await save('tasks', { title, due: f.due.value, urgency: Number(f.urgency.value), note: '', done: false, caseId: '' });
    rerender();
    $('form[data-form=quickTask] input[name=title]')?.focus();
  },
  search: f => { const q = f.q.value.trim(); if (q) location.hash = '#/cautare/' + encodeURIComponent(q); },
  calc: f => {
    UI.calc = { start: f.start.value, n: Number(f.n.value), unit: f.unit.value };
    if (!UI.calc.start || !(UI.calc.n > 0)) return toast('Completați data și durata.');
    UI.calc.res = computeTerm(UI.calc.start, UI.calc.n, UI.calc.unit);
    rerender();
  },
  calcTask: async f => {
    const r = UI.calc.res;
    await save('tasks', {
      title: f.title.value.trim(), due: r.final, urgency: 1, caseId: f.caseId.value, done: false,
      note: `Termen calculat: ${UI.calc.n} ${UI.calc.unit} de la ${fmtDate(UI.calc.start)}. Verificați calculul.`,
    });
    // Sarcină de avertizare cu 3 zile lucrătoare înainte
    let warn = addDays(r.final, -1), k = 0;
    while (k < 3 && warn > today()) { if (!isNonWorking(warn)) k++; if (k < 3) warn = addDays(warn, -1); }
    if (warn > today() && warn < r.final) await save('tasks', { title: 'Atenție, se apropie termenul: ' + f.title.value.trim(), due: warn, urgency: 2, caseId: f.caseId.value, done: false, note: 'Ultima zi: ' + fmtDate(r.final) });
    toast('Adăugat în TO DO (cu reamintire prealabilă).');
    f.reset();
    rerender();
  },
  sigPrefs: async f => {
    await setSetting('sigText', f.sigText.value.trim());
    await setSetting('sigDate', f.sigDate.checked);
    await setSetting('sigStamp', f.sigStamp.checked);
    toast('Preferințe salvate.');
  },
  settings: async f => {
    await setSetting('name', f.name.value.trim() || 'Ioana Stoica');
    await setSetting('greetName', f.greetName.value.trim() || 'Ioana');
    await setSetting('spvUrl', f.spvUrl.value.trim() || 'https://www.anaf.ro');
    await setSetting('theme', f.theme.value);
    await setSetting('portalAuto', f.portalAuto.checked);
    await setSetting('extraHolidays', f.extraHolidays.value.trim());
    applyTheme();
    toast('Preferințe salvate.');
    rerender();
  },
};

/* ================= Export / backup ================= */
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }

function exportIcs() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cabinet Stoica//RO', 'CALSCALE:GREGORIAN'];
  for (const e of S.events) {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@cabinet-stoica`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const [hh, mm] = e.time.split(':').map(Number);
      const endH = pad((hh + 1) % 24);
      lines.push(`DTSTART:${d}T${pad(hh)}${pad(mm)}00`, `DTEND:${hh === 23 ? addDays(e.date, 1).replace(/-/g, '') : d}T${endH}${pad(mm)}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, '')}`);
    }
    const c = byId('cases', e.caseId);
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    const desc = [EVT[e.type], c && 'Dosar ' + caseLabel(c), e.note].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${icsEscape(desc)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  download(`calendar-cabinet-${today()}.ics`, lines.join('\r\n'), 'text/calendar');
}

function exportCsv() {
  const y = String(UI.ledgerYear);
  const rows = [['Data', 'Document', 'Explicație', 'Client', 'Dosar', 'Modalitate', 'Încasări', 'Plăți']];
  S.ledger.filter(l => l.date.startsWith(y)).sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
    const amt = (Number(l.amount) || 0).toFixed(2).replace('.', ',');
    rows.push([fmtDate(l.date, { day: '2-digit', month: '2-digit', year: 'numeric' }), l.docNo, l.description, clientName(l.clientId), byId('cases', l.caseId)?.number || '', l.method, l.type === 'incasare' ? amt : '', l.type === 'plata' ? amt : '']);
  });
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  download(`registru-incasari-plati-${y}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
}

const blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

async function backup() {
  toast('Se pregătește backup-ul…');
  const data = { app: 'cabinet-stoica', version: 1, exportedAt: new Date().toISOString(), stores: {} };
  for (const s of STORES) {
    if (s === 'files') {
      const files = await DB.all('files');
      data.stores.files = await Promise.all(files.map(async f => ({ id: f.id, data: await blobToDataUrl(f.blob) })));
    } else data.stores[s] = S[s].filter(x => s !== 'settings' || x.id !== 'lastBackup');
  }
  download(`backup-cabinet-${today()}.json`, JSON.stringify(data), 'application/json');
  await setSetting('lastBackup', today());
  rerender();
}

async function restore(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { return toast('Fișierul nu este un backup valid.'); }
  if (data?.app !== 'cabinet-stoica' || !data.stores) return toast('Fișierul nu este un backup al acestei aplicații.');
  if (!confirm(`Restaurați backup-ul din ${new Date(data.exportedAt).toLocaleString('ro-RO')}? Datele actuale de pe acest dispozitiv vor fi înlocuite.`)) return;
  for (const s of STORES) {
    await DB.clear(s);
    for (const rec of data.stores[s] || []) {
      if (s === 'files') await DB.put('files', { id: rec.id, blob: await (await fetch(rec.data)).blob() });
      else await DB.put(s, rec);
    }
  }
  for (const s of STORES) if (s !== 'files') S[s] = await DB.all(s);
  applyTheme();
  toast('Backup restaurat.');
  rerender();
}

function applyTheme() {
  const t = setting('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

/* ================= Evenimente globale ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('dialog')) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.matches('textarea.note')) {
    const t = byId('tasks', el.dataset.note);
    if (t && t.note !== el.value) { await save('tasks', { ...t, note: el.value }); toast('Notă salvată.'); }
  } else if (el.dataset.filter) {
    setPath(el.dataset.filter, el.value);
    rerender();
  } else if (el.dataset.sigImport && el.files[0]) {
    try {
      await setSetting(el.dataset.sigImport, await imageToSignature(el.files[0]));
      toast('Imagine importată.');
      rerender();
    } catch (err) { toast(err.message); }
    el.value = '';
  } else if (el.hasAttribute('data-sign-file') && el.files[0]) {
    const file = el.files[0];
    el.value = '';
    startSigning({ file });
  } else if (el.id === 'restoreInput' && el.files[0]) {
    await restore(el.files[0]);
    el.value = '';
  }
});

document.addEventListener('input', e => {
  if (e.target.matches('textarea.note')) autoGrow(e.target);
  if (e.target.matches('input[type=search][data-filter]')) {
    clearTimeout(e.target._t);
    const el = e.target;
    el._t = setTimeout(() => {
      setPath(el.dataset.filter, el.value);
      const pos = el.selectionStart;
      rerender();
      const again = $(`[data-filter="${el.dataset.filter}"]`);
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    }, 250);
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  FORMS[f.dataset.form]?.(f);
});

window.addEventListener('hashchange', () => {
  document.querySelector('.app').classList.remove('menu-open');
  route();
  window.scrollTo(0, 0);
});

/* ================= Pornire ================= */
(async function init() {
  try {
    await load();
  } catch (err) {
    $('#view').innerHTML = `<div class="callout danger"><p><b>Aplicația nu poate accesa stocarea locală.</b></p><p>Probabil browserul este în modul privat/incognito sau stocarea este blocată. Detalii: ${h(err?.message || err)}</p></div>`;
    return;
  }
  applyTheme();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if (window.desktop) document.documentElement.classList.add('desktop');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  route();
  // O dată pe zi, dosarele în lucru se actualizează singure de pe portal (doar în aplicația desktop)
  if (portalAvailable() && setting('portalAuto', true) && setting('portalLastSync', '') !== today()) {
    setTimeout(() => portalSyncAll({ quiet: true }), 4000);
  }
  // La miezul nopții, „Azi” trebuie să se actualizeze
  let day = today();
  setInterval(() => { if (today() !== day && !$('#modal').open) { day = today(); rerender(); } }, 60000);
})();
