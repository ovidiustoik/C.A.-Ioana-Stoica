'use strict';
/* Pagina „Calculatoare” de pe www.avocatioanastoica.ro: aceleași calculatoare ca în aplicația cabinetului
   (taxa.js, competenta.js, grila.js, cautiune.js, apj.js), afișate în #calculatoare. */
const $ = (s, r = document) => r.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const empty = msg => `<div class="empty">${msg}</div>`;

function toast(msg, ms = 2600) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), Math.max(ms, String(msg).length * 55));
}

const PAGINI = [['taxa', 'Taxă de timbru & competență', () => viewTaxa()], ['cautiune', 'Cauțiune', () => viewCautiune()], ['apj', 'Ajutor public judiciar', () => viewApj()]];

function rerender() {
  const loc = $('#calculatoare');
  if (!loc) return;
  const y = window.scrollY;
  const cheie = location.hash.replace(/^#\/?/, '');
  const pag = PAGINI.find(p => p[0] === cheie) || PAGINI[0];
  loc.innerHTML = `<nav class="calc-tabs" aria-label="Calculatoare">${PAGINI.map(p => `<a href="#${p[0]}" class="${p === pag ? 'active' : ''}">${p[1]}</a>`).join('')}</nav>${pag[2]()}`;
  window.scrollTo(0, y);
}
window.addEventListener('hashchange', rerender);

const copiaza = async text => { try { await navigator.clipboard.writeText(text); toast('Text copiat.'); } catch { toast('Selectați textul și copiați-l cu Ctrl+C.'); } };
const ACT = {
  taxaAdauga: () => taxaAdauga(),
  taxaGoleste: () => { TX.cos = []; rerender(); },
  taxaScoate: d => { TX.cos.splice(Number(d.i), 1); rerender(); },
  taxaCopiaza: () => copiaza(taxaText()),
  grilaAdauga: () => grilaAdauga(),
  grilaScoate: d => { GR.lista.splice(Number(d.i), 1); rerender(); },
  grilaFoloseste: () => grilaFoloseste(),
  cautCopiaza: () => copiaza(cautText(cautCalcul())),
  apjAdauga: () => apjAdauga(),
  apjScoate: d => { AP.membri.splice(Number(d.i), 1); rerender(); },
  apjPreiaTaxa: () => apjPreiaTaxa(),
  apjCopiaza: () => copiaza(apjText(apjCalcul())),
};

document.addEventListener('click', e => {
  const el = e.target.closest('#calculatoare [data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener('change', e => {
  if (e.target.closest('#calculatoare') && e.target.dataset.tx === 'sel') { TX.sel = e.target.value; TX.vals = { f127: TX.vals.f127 }; rerender(); }
});

document.addEventListener('toggle', e => { if (e.target.id === 'grila') GR.deschis = e.target.open; }, true);

// Câmpurile calculatoarelor: atributul data-* → funcția care salvează valoarea
const CALC_CAMPURI = [['txv', (k, v) => { TX.vals[k] = v; }], ['tx', (k, v) => { if (k === 'q') TX.q = v; }], ['grv', (k, v) => grilaSet(k, v)], ['cav', (k, v) => cautSet(k, v)], ['apv', (k, v) => apjSet(k, v)], ['apm', (k, v) => apjSetMembru(k, v)]];

document.addEventListener('input', e => {
  if (!e.target.closest('#calculatoare')) return;
  const leg = CALC_CAMPURI.map(([attr, set]) => [attr, e.target.dataset?.[attr], set]).find(([attr, key]) => key != null && !(attr === 'tx' && key === 'sel'));
  if (!leg) return;
  const [attr, key, set] = leg;
  set(key, e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value);
  const pos = e.target.selectionStart, sel = `[data-${attr}="${key}"]`;
  rerender();
  const again = $(sel);
  if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* câmp fără cursor */ } }
});

rerender();
