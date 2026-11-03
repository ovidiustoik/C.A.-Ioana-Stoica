'use strict';
/* Aplicația separată „Taxă de timbru & competență”: aceeași logică ca în aplicația cabinetului
   (taxa.js, competenta.js, grila.js), fără date despre dosare sau clienți. */
const VERSIUNE = '__VERSIUNE__';
const PAGINA = 'https://ovidiustoik.github.io/C.A.-Ioana-Stoica/calculator/';

const $ = (s, r = document) => r.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const empty = msg => `<div class="empty">${msg}</div>`;

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), Math.max(ms, String(msg).length * 55));
}

function rerender() {
  const y = window.scrollY;
  $('#view').innerHTML = viewTaxa();
  window.scrollTo(0, y);
}

const ACT = {
  taxaAdauga: () => taxaAdauga(),
  taxaGoleste: () => { TX.cos = []; rerender(); },
  taxaScoate: d => { TX.cos.splice(Number(d.i), 1); rerender(); },
  taxaCopiaza: async () => {
    try { await navigator.clipboard.writeText(taxaText()); toast('Text copiat.'); } catch { toast('Selectați textul și copiați-l cu Ctrl+C.'); }
  },
  grilaAdauga: () => grilaAdauga(),
  grilaScoate: d => { GR.lista.splice(Number(d.i), 1); rerender(); },
  grilaFoloseste: () => grilaFoloseste(),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener('change', e => {
  if (e.target.dataset.tx === 'sel') { TX.sel = e.target.value; TX.vals = {}; rerender(); }
});

document.addEventListener('toggle', e => { if (e.target.id === 'grila') GR.deschis = e.target.open; }, true);

document.addEventListener('input', e => {
  const tv = e.target.dataset?.txv || (e.target.dataset?.tx === 'q' ? 'q' : null), gv = e.target.dataset?.grv;
  if (!tv && !gv) return;
  const val = e.target.type === 'checkbox' ? (e.target.checked ? '1' : '') : e.target.value;
  if (gv) grilaSet(gv, val); else if (tv === 'q') TX.q = val; else TX.vals[tv] = val;
  const pos = e.target.selectionStart, sel = gv ? `[data-grv="${gv}"]` : tv === 'q' ? '[data-tx="q"]' : `[data-txv="${tv}"]`;
  rerender();
  const again = $(sel);
  if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* câmp fără cursor */ } }
});

// Versiunea instalată din fișier verifică, la pornire, dacă a apărut una nouă pe pagina publică.
async function verificaVersiunea() {
  if (location.protocol !== 'file:') return;
  try {
    const r = await fetch(PAGINA + 'versiune.json', { cache: 'no-store' });
    const j = await r.json();
    if (j.versiune && j.versiune > VERSIUNE) {
      $('#nou').innerHTML = `Există o versiune nouă (${h(j.versiune)}). <a href="${h(PAGINA + j.instalare)}" target="_blank" rel="noopener">Descărcați fișierul de instalare</a> și rulați-l din nou.`;
      $('#nou').hidden = false;
    }
  } catch { /* fără internet: rămâne versiunea instalată */ }
}

$('#versiune').textContent = VERSIUNE;
rerender();
verificaVersiunea();
// Publicată pe internet, pagina se poate instala ca aplicație (Chrome/Edge/Android) și merge și fără internet.
if (location.protocol.startsWith('http')) {
  document.head.insertAdjacentHTML('beforeend', '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="../icon-192.png">');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
