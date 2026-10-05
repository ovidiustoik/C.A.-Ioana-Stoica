'use strict';
/* Semnătură electronică: desenarea/importul semnăturii olografe și aplicarea ei pe PDF-uri.
   Folosește pdf-lib (scriere PDF) și PDF.js (previzualizare), incluse local în /vendor. */

/* ================= Încărcarea bibliotecilor ================= */
let _pdfjs = null;
async function pdfjs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import(new URL('vendor/pdf.min.mjs', location.href).href);
  _pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', location.href).href;
  return _pdfjs;
}

let _pdflib = null;
function pdflib() {
  if (_pdflib) return _pdflib;
  _pdflib = new Promise((resolve, reject) => {
    if (window.PDFLib) return resolve(window.PDFLib);
    const s = document.createElement('script');
    s.src = 'vendor/pdf-lib.min.js';
    s.onload = () => resolve(window.PDFLib);
    s.onerror = () => { _pdflib = null; reject(new Error('Biblioteca PDF nu a putut fi încărcată.')); };
    document.head.appendChild(s);
  });
  return _pdflib;
}

/* ================= Utilitare imagine ================= */
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Imaginea nu poate fi citită.')); i.src = src; });

// Decupează marginile transparente ale unei semnături.
function trimCanvas(c, padding = 12) {
  const ctx = c.getContext('2d');
  const { width: w, height: hgt } = c;
  const d = ctx.getImageData(0, 0, w, hgt).data;
  let x0 = w, y0 = hgt, x1 = -1, y1 = -1;
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - padding); y0 = Math.max(0, y0 - padding);
  x1 = Math.min(w - 1, x1 + padding); y1 = Math.min(hgt - 1, y1 + padding);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Dintr-o fotografie/scanare a semnăturii: fundalul alb devine transparent.
async function imageToSignature(file, maxW = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, maxW / img.width);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const p = id.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      const a = Math.max(0, Math.min(255, (225 - lum) * 255 / 120));
      p[i + 3] = Math.min(p[i + 3], a);
    }
    ctx.putImageData(id, 0, 0);
    const t = trimCanvas(c, 6);
    if (!t) throw new Error('Nu am găsit nicio semnătură în imagine. Folosiți o fotografie clară, pe hârtie albă.');
    return t.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

/* ================= Panoul de desenat semnătura ================= */
function signaturePad() {
  const dlg = $('#modal');
  dlg.classList.remove('wide');
  dlg.innerHTML = `<form>
    <header><h2>Desenați semnătura</h2><button type="button" class="icon-btn" data-close aria-label="Închide">✕</button></header>
    <div class="pad-body">
      <p class="small muted" style="margin:0 0 8px">Semnați în chenar cu mouse-ul, cu creionul tabletei sau cu degetul (pe ecran tactil). Puteți reîncerca de câte ori doriți.</p>
      <div class="pad-wrap"><canvas id="pad"></canvas><div class="pad-line"></div><span class="pad-x">✕</span></div>
      <div class="actions" style="margin-top:10px">
        <label class="small">Culoare:
          <select id="padColor"><option value="#1b2f8a">Albastru (pix)</option><option value="#111111">Negru</option></select></label>
        <span class="spacer"></span>
        <button type="button" class="btn sm" id="padClear">Șterge și reîncearcă</button>
      </div>
    </div>
    <footer><span class="spacer"></span><button type="button" class="btn ghost" data-close>Renunță</button><button type="submit" class="btn primary">Salvează semnătura</button></footer>
  </form>`;
  const canvas = $('#pad', dlg);
  const ctx = canvas.getContext('2d');
  const R = 3; // rezoluție mărită pentru o semnătură clară la tipărire
  let strokes = 0;
  const setup = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * R; canvas.height = r.height * R;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
  let last = null, lastW = 0;
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * R, y: (e.clientY - r.top) * R, t: e.timeStamp, p: e.pressure }; };
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    last = pos(e); lastW = 2.6 * R; strokes++;
    ctx.fillStyle = ctx.strokeStyle = $('#padColor', dlg).value;
    ctx.beginPath(); ctx.arc(last.x, last.y, lastW / 2, 0, Math.PI * 2); ctx.fill();
  });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const p = pos(ev);
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      if (dist < 1) continue;
      const speed = dist / Math.max(1, p.t - last.t);
      // linie mai subțire la viteză mare, ca la un stilou
      let w = Math.max(1.1 * R, Math.min(3.4 * R, 3.6 * R - speed * 0.55));
      if (ev.pointerType === 'pen' && ev.pressure > 0) w = (0.9 + ev.pressure * 2.8) * R;
      w = lastW * 0.6 + w * 0.4;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      const mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, mx, my);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p; lastW = w;
    }
  });
  const end = () => { last = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  $('#padClear', dlg).onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes = 0; };
  $$('[data-close]', dlg).forEach(b => b.onclick = () => dlg.close());
  $('form', dlg).onsubmit = async e => {
    e.preventDefault();
    const t = strokes && trimCanvas(canvas, 3 * R);
    if (!t) return toast('Desenați mai întâi semnătura.');
    await setSetting('signature', t.toDataURL('image/png'));
    dlg.close();
    toast('Semnătura a fost salvată.');
    rerender();
  };
  dlg.showModal();
  requestAnimationFrame(setup);
}

/* ================= Blocul de semnătură (semnătură + text + ștampilă) ================= */
async function buildStamp({ withText, text, withDate, withStamp }) {
  const sig = await loadImage(setting('signature'));
  const stamp = withStamp && setting('stamp') ? await loadImage(setting('stamp')) : null;
  const sigH = 260;
  const sigW = sig.width * sigH / sig.height;
  const lines = [];
  if (withText && text) lines.push(text);
  if (withDate) lines.push(new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const fontPx = 72, lineH = 88;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = `${fontPx}px Georgia, "Times New Roman", serif`;
  const textW = Math.max(0, ...lines.map(l => meas.measureText(l).width));
  const blockW = Math.max(sigW, textW);
  const blockH = sigH + lines.length * lineH + (lines.length ? 10 : 0);
  const stH = stamp ? Math.min(blockH * 1.05, 340) : 0;
  const stW = stamp ? stamp.width * stH / stamp.height : 0;
  const overlap = stamp ? stW * 0.3 : 0;
  const c = document.createElement('canvas');
  c.width = Math.ceil(stW - overlap + blockW + 8);
  c.height = Math.ceil(Math.max(blockH, stH) + 8);
  const ctx = c.getContext('2d');
  if (stamp) { ctx.globalAlpha = 0.9; ctx.drawImage(stamp, 0, (c.height - stH) / 2, stW, stH); ctx.globalAlpha = 1; }
  const bx = stW - overlap;
  ctx.drawImage(sig, bx + (blockW - sigW) / 2, 0, sigW, sigH);
  ctx.font = meas.font;
  ctx.fillStyle = '#1d2433';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + blockW / 2, sigH + 10 + i * lineH));
  return c.toDataURL('image/png');
}

/* ================= Conversii ================= */
const isPdf = d => /pdf/i.test(d.mime || '') || /\.pdf$/i.test(d.fileName || '');
const isImage = d => /^image\//i.test(d.mime || '') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(d.fileName || '');

async function imageToPdfBytes(blob) {
  const { PDFDocument } = await pdflib();
  const url = URL.createObjectURL(blob);
  let png;
  try {
    const img = await loadImage(url);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    png = await new Promise(r => c.toBlob(r, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
  const pdf = await PDFDocument.create();
  const im = await pdf.embedPng(await png.arrayBuffer());
  const landscape = im.width > im.height;
  const [W, H] = landscape ? [842, 595] : [595, 842]; // A4
  const page = pdf.addPage([W, H]);
  const k = Math.min((W - 60) / im.width, (H - 60) / im.height, 1);
  page.drawImage(im, { x: (W - im.width * k) / 2, y: (H - im.height * k) / 2, width: im.width * k, height: im.height * k });
  return new Uint8Array(await pdf.save());
}

async function sha256(bytes) {
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const hasDigitalSignature = bytes => {
  const s = new TextDecoder('latin1').decode(bytes);
  return /\/ByteRange\s*\[/.test(s) && /\/(Sig|DocTimeStamp)\b/.test(s);
};

/* ================= Fereastra de semnare ================= */
async function startSigning({ doc = null, file = null }) {
  if (!setting('signature')) {
    toast('Configurați mai întâi semnătura.');
    location.hash = '#/semnatura';
    return;
  }
  let name, blob;
  if (doc) {
    const rec = await DB.get('files', doc.id);
    if (!rec) return toast('Fișierul nu a fost găsit.');
    name = doc.name; blob = rec.blob;
  } else { name = file.name.replace(/\.[^.]+$/, ''); blob = file; }
  const meta = doc || { fileName: file.name, mime: file.type };
  let bytes;
  try {
    if (isPdf(meta)) bytes = new Uint8Array(await blob.arrayBuffer());
    else if (isImage(meta)) bytes = await imageToPdfBytes(blob);
    else {
      return openForm({
        title: 'Format care nu poate fi semnat direct',
        intro: `<p>Semnătura se aplică pe documente <b>PDF</b> și pe <b>imagini</b> (scanări, fotografii), care se transformă automat în PDF.</p>
          <p>Pentru un document Word: deschideți-l în Word → <i>Fișier → Salvare ca → PDF</i>, apoi încărcați PDF-ul și semnați-l. Alternativ, din secțiunea „Semnătură electronică” puteți descărca semnătura ca imagine PNG și o puteți insera direct în Word (<i>Inserare → Imagini</i>).</p>`,
        fields: [], submit: 'Am înțeles', onSave: async () => {},
      });
    }
  } catch (err) { return toast(err.message || 'Documentul nu poate fi citit.'); }

  if (hasDigitalSignature(bytes) && !confirm('Documentul pare să conțină deja o semnătură digitală (de ex. calificată). Orice modificare, inclusiv aplicarea semnăturii olografe, o va INVALIDA în copia nouă. Originalul rămâne neschimbat. Continuați?')) return;

  const lib = await pdfjs();
  let pdf;
  try {
    pdf = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  } catch (err) {
    return toast(/password/i.test(err?.name + err?.message) ? 'PDF-ul este protejat cu parolă și nu poate fi semnat.' : 'PDF-ul nu poate fi deschis.');
  }

  const opts = {
    page: pdf.numPages, // implicit ultima pagină
    fx: 0.58, fy: 0.78, fw: 0.3,
    withText: true, text: setting('sigText', 'Av. Ioana Stoica'),
    withDate: setting('sigDate', true), withStamp: !!setting('stamp') && setting('sigStamp', true),
    allPages: false,
  };
  let stampUrl = await buildStamp(opts);
  let aspect = (await loadImage(stampUrl)).width / (await loadImage(stampUrl)).height;

  const dlg = $('#modal');
  dlg.classList.add('wide');
  const saveTargets = doc ? '' : `<label class="field"><span>Salvează copia semnată și în aplicație</span><select id="sgTarget"><option value="">Nu – doar o descarc</option><option value="personal">Geamantan personal</option>${caseOptions(false).map(([v, l]) => `<option value="case:${h(v)}">Dosar: ${h(l)}</option>`).join('')}</select></label>`;
  dlg.innerHTML = `<form>
    <header><h2>Semnează: ${h(name)}</h2><button type="button" class="icon-btn" data-close aria-label="Închide">✕</button></header>
    <div class="sign-layout">
      <div class="sign-stage"><div class="page-wrap" id="sgWrap"><canvas id="sgCanvas"></canvas><img id="sgOverlay" class="sig-overlay" alt="Semnătura" draggable="false"></div></div>
      <div class="sign-side">
        <div class="pager"><button type="button" class="btn sm" id="sgPrev">‹</button><span id="sgPageLbl"></span><button type="button" class="btn sm" id="sgNext">›</button></div>
        <p class="small muted">Faceți clic pe pagină acolo unde doriți semnătura sau trageți-o cu mouse-ul.</p>
        <label class="field"><span>Mărime semnătură</span><input type="range" id="sgSize" min="10" max="70" value="${opts.fw * 100}"></label>
        <label class="field check"><input type="checkbox" id="sgWithText" ${opts.withText ? 'checked' : ''}><span>Text sub semnătură</span></label>
        <label class="field"><input id="sgText" value="${h(opts.text)}"></label>
        <label class="field check"><input type="checkbox" id="sgWithDate" ${opts.withDate ? 'checked' : ''}><span>Data de azi</span></label>
        ${setting('stamp') ? `<label class="field check"><input type="checkbox" id="sgWithStamp" ${opts.withStamp ? 'checked' : ''}><span>Ștampila / parafa</span></label>` : ''}
        <label class="field check"><input type="checkbox" id="sgAll"><span>Pe toate paginile (în același loc)</span></label>
        ${saveTargets}
        <p class="small muted">Originalul nu se modifică; se creează o copie nouă, semnată.</p>
      </div>
    </div>
    <footer><span class="spacer"></span><button type="button" class="btn ghost" data-close>Renunță</button><button type="submit" class="btn primary">Semnează și salvează</button></footer>
  </form>`;
  const canvas = $('#sgCanvas', dlg), overlay = $('#sgOverlay', dlg), wrap = $('#sgWrap', dlg);
  let renderTask = null;

  const placeOverlay = () => {
    overlay.src = stampUrl;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const w = opts.fw * W, hh = w / aspect;
    opts.fx = Math.min(Math.max(0, opts.fx), 1 - w / W);
    opts.fy = Math.min(Math.max(0, opts.fy), 1 - hh / H);
    Object.assign(overlay.style, { left: opts.fx * W + 'px', top: opts.fy * H + 'px', width: w + 'px', height: hh + 'px' });
  };
  const renderPage = async () => {
    const page = await pdf.getPage(opts.page);
    const base = page.getViewport({ scale: 1 });
    const stage = $('.sign-stage', dlg);
    const scale = Math.min((stage.clientWidth - 24) / base.width, (window.innerHeight * 0.68) / base.height);
    const vp = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.style.width = base.width * scale + 'px'; canvas.style.height = base.height * scale + 'px';
    if (renderTask) renderTask.cancel();
    renderTask = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: vp });
    try { await renderTask.promise; } catch { /* anulat */ }
    $('#sgPageLbl', dlg).textContent = `Pagina ${opts.page} din ${pdf.numPages}`;
    placeOverlay();
  };
  const rebuild = async () => {
    stampUrl = await buildStamp(opts);
    const im = await loadImage(stampUrl);
    aspect = im.width / im.height;
    placeOverlay();
  };

  // poziționare prin clic și tragere
  let drag = null;
  wrap.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    if (e.target === overlay) {
      const o = overlay.getBoundingClientRect();
      drag = { dx: e.clientX - o.left, dy: e.clientY - o.top };
    } else {
      const w = opts.fw * r.width, hh = w / aspect;
      opts.fx = (e.clientX - r.left - w / 2) / r.width;
      opts.fy = (e.clientY - r.top - hh / 2) / r.height;
      placeOverlay();
      drag = { dx: w / 2, dy: hh / 2 };
    }
    wrap.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  wrap.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    opts.fx = (e.clientX - r.left - drag.dx) / r.width;
    opts.fy = (e.clientY - r.top - drag.dy) / r.height;
    placeOverlay();
  });
  wrap.addEventListener('pointerup', () => { drag = null; });

  $('#sgPrev', dlg).onclick = () => { if (opts.page > 1) { opts.page--; renderPage(); } };
  $('#sgNext', dlg).onclick = () => { if (opts.page < pdf.numPages) { opts.page++; renderPage(); } };
  $('#sgSize', dlg).oninput = e => { opts.fw = e.target.value / 100; placeOverlay(); };
  $('#sgWithText', dlg).onchange = e => { opts.withText = e.target.checked; rebuild(); };
  $('#sgText', dlg).onchange = e => { opts.text = e.target.value; rebuild(); };
  $('#sgWithDate', dlg).onchange = e => { opts.withDate = e.target.checked; rebuild(); };
  if ($('#sgWithStamp', dlg)) $('#sgWithStamp', dlg).onchange = e => { opts.withStamp = e.target.checked; rebuild(); };
  $('#sgAll', dlg).onchange = e => { opts.allPages = e.target.checked; };
  $$('[data-close]', dlg).forEach(b => b.onclick = () => dlg.close());
  dlg.addEventListener('close', () => { dlg.classList.remove('wide'); pdf.destroy(); }, { once: true });

  $('form', dlg).onsubmit = async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', dlg);
    btn.disabled = true; btn.textContent = 'Se semnează…';
    try {
      const signed = await applySignature(bytes, pdf, opts, stampUrl, aspect);
      const hash = await sha256(signed);
      const when = new Date().toLocaleString('ro-RO');
      const outName = `${name} (semnat)`;
      const outFile = outName.replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
      const outBlob = new Blob([signed], { type: 'application/pdf' });
      const target = doc ? (doc.scope === 'personal' ? 'personal' : 'case:' + doc.caseId) : $('#sgTarget', dlg).value;
      if (target) {
        const id = uid();
        await DB.put('files', { id, blob: outBlob });
        const [scope, caseId = ''] = target.split(':');
        await save('docs', {
          id, scope, caseId, name: outName, fileName: outFile, mime: 'application/pdf', size: signed.length,
          category: doc?.category || (scope === 'personal' ? 'Altele' : 'Altele'), expiry: doc?.expiry || '',
          note: `Semnat la ${when} (semnătură olografă aplicată electronic). SHA-256: ${hash}`, signedFrom: doc?.id || '',
        });
      }
      if (!doc) download(outFile, outBlob);
      dlg.close();
      rerender();
      toast(target ? 'Document semnat și salvat ca o copie nouă.' : 'Document semnat și descărcat.');
    } catch (err) {
      console.error(err);
      toast('Eroare la semnare: ' + (err.message || err));
      btn.disabled = false; btn.textContent = 'Semnează și salvează';
    }
  };

  dlg.showModal();
  await renderPage();
}

async function applySignature(bytes, pdfjsDoc, opts, stampUrl, aspect) {
  const { PDFDocument, degrees } = await pdflib();
  const doc = await PDFDocument.load(bytes.slice(), { updateMetadata: false });
  const png = await doc.embedPng(await (await fetch(stampUrl)).arrayBuffer());
  const pages = opts.allPages ? [...Array(doc.getPageCount()).keys()].map(i => i + 1) : [opts.page];
  for (const n of pages) {
    const jsPage = await pdfjsDoc.getPage(n);
    const vp = jsPage.getViewport({ scale: 1 }); // coordonate vizuale, cu rotația paginii
    const w = opts.fw * vp.width, hh = w / aspect;
    const x = Math.min(opts.fx * vp.width, vp.width - w), y = Math.min(opts.fy * vp.height, vp.height - hh);
    const [px, py] = vp.convertToPdfPoint(x, y + hh); // colțul stânga-jos, în coordonatele PDF
    doc.getPage(n - 1).drawImage(png, { x: px, y: py, width: w, height: hh, rotate: degrees(jsPage.rotate || 0) });
  }
  return new Uint8Array(await doc.save());
}

/* ================= Pagina „Semnătură electronică” ================= */
function viewSignature() {
  const sig = setting('signature');
  const stamp = setting('stamp');
  const preview = (src, emptyMsg) => src ? `<div class="sig-preview"><img src="${src}" alt=""></div>` : `<div class="sig-preview empty">${emptyMsg}</div>`;
  return `
  <div class="grid-2">
    <div>
      <div class="card">
        <div class="card-head"><h2>Semnătura mea</h2></div>
        ${preview(sig, 'Nu există încă o semnătură. Desenați-o sau importați-o dintr-o fotografie.')}
        <div class="actions">
          <button class="btn primary" data-act="sigDraw">✍ Desenează semnătura</button>
          <label class="btn">Importă din fotografie / scanare<input type="file" accept="image/*" data-sig-import="signature" hidden></label>
          ${sig ? `<button class="btn" data-act="sigDownload" data-k="signature">Descarcă PNG (pentru Word)</button><button class="btn danger" data-act="sigDelete" data-k="signature">Șterge</button>` : ''}
        </div>
        <p class="small muted">Sfat: pentru o semnătură cât mai fidelă, semnați „Stoica” pe o foaie albă cu pix albastru, fotografiați-o de aproape, cu lumină bună, și importați fotografia. Fundalul alb se elimină automat.</p>
      </div>
      <div class="card">
        <div class="card-head"><h2>Ștampilă / parafă (opțional)</h2></div>
        ${preview(stamp, 'Nicio ștampilă încărcată.')}
        <div class="actions">
          <label class="btn">Importă ștampila (imagine)<input type="file" accept="image/*" data-sig-import="stamp" hidden></label>
          ${stamp ? `<button class="btn danger" data-act="sigDelete" data-k="stamp">Șterge</button>` : ''}
        </div>
      </div>
      <div class="card">
        <h2>Preferințe implicite</h2>
        <form data-form="sigPrefs" style="display:grid;gap:10px;margin-top:10px">
          <label class="field"><span>Text sub semnătură</span><input name="sigText" value="${h(setting('sigText', 'Av. Ioana Stoica'))}"></label>
          <label class="field check"><input type="checkbox" name="sigDate" ${setting('sigDate', true) ? 'checked' : ''}><span>Adaugă data semnării</span></label>
          <label class="field check"><input type="checkbox" name="sigStamp" ${setting('sigStamp', true) ? 'checked' : ''}><span>Adaugă ștampila (dacă există)</span></label>
          <div><button class="btn primary">Salvează</button></div>
        </form>
      </div>
    </div>
    <div>
      <div class="card">
        <h2>Semnează un document</h2>
        <p class="small">Orice act încărcat în aplicație (la dosare sau în geamantan) are butonul <b>✍</b> pentru semnare. Puteți semna și un fișier direct de pe calculator:</p>
        <label class="btn primary">Alege un PDF sau o imagine…<input type="file" accept="application/pdf,image/*" data-sign-file hidden></label>
      </div>
      <div class="card"><div class="callout warn">
        <p><b>Ce valoare juridică are această semnătură?</b></p>
        <p>Aplicația pune pe document <b>imaginea semnăturii dumneavoastră olografe</b>. Din punct de vedere juridic, aceasta este o <b>semnătură electronică simplă</b> în sensul Regulamentului (UE) nr. 910/2014 (eIDAS): nu poate fi respinsă ca probă doar pentru că este electronică, dar <b>nu are efectul juridic echivalent semnăturii olografe</b> pe care art. 25 alin. (2) din regulament îl recunoaște numai <b>semnăturii electronice calificate</b>.</p>
        <p>Pentru actele care cer semnătură electronică calificată (de regulă, cereri și acte depuse electronic acolo unde legea sau instanța o impune) folosiți un <b>certificat calificat</b> emis de un prestator de încredere înscris în Lista de încredere a UE, aplicat cu programul furnizorului sau cu Adobe Acrobat.</p>
        <p>Vă rog să verificați și cerințele concrete ale instanței sau ale instituției destinatare; nu le pot confirma eu pentru fiecare caz.</p>
      </div></div>
    </div>
  </div>`;
}
