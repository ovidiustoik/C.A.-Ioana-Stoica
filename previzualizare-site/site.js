(function () {
  'use strict';
  var C = window.CABINET || {};
  var pagina = document.body.getAttribute('data-pagina') || '';
  var MATERII = [
    ['drept-civil', 'Drept civil'],
    ['dreptul-familiei', 'Dreptul familiei'],
    ['executari-silite', 'Executări silite'],
    ['drept-bancar', 'Drept bancar'],
    ['contencios-administrativ', 'Contencios administrativ'],
    ['dreptul-muncii', 'Dreptul muncii'],
    ['dreptul-transporturilor', 'Dreptul transporturilor'],
    ['contraventii', 'Contravenții'],
    ['cedo', 'Drepturile Omului (CEDO)'],
    ['alte-materii', 'Alte materii']
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Trimiterea directă la cabinet. campuri: [[nume, valoare]]; atasamente: [[nume_camp, Blob, nume_fisier]].
  // Cu adresa unui Google Apps Script (trimitere/trimitere.gs), fișierele pleacă în JSON, ca text base64,
  // iar scriptul le trimite pe e-mail avocatului. Cu altă adresă, pleacă un formular multipart obișnuit.
  function eGoogle(adresa) { return /^https:\/\/script\.google(usercontent)?\.com\//.test(adresa); }
  function base64(blob) {
    return new Promise(function (ok, rau) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); ok(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { rau(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function trimiteLaCabinet(subiect, text, campuri, atasamente, raspundeLa, extra) {
    var adresa = C.trimitereAdresa;
    if (!eGoogle(adresa)) {
      var d = new FormData();
      d.append('_subject', subiect);
      campuri.forEach(function (c) { d.append(c[0], c[1]); });
      atasamente.forEach(function (a) { d.append(a[0], a[1], a[2]); });
      return fetch(adresa, { method: 'POST', body: d, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('Răspuns ' + r.status); });
    }
    return Promise.all(atasamente.map(function (a) {
      return base64(a[1]).then(function (b) { return { nume: a[2], tip: a[1].type || 'application/octet-stream', date: b }; });
    })).then(function (fisiere) {
      // text/plain: cerere „simplă”, fără verificarea prealabilă CORS, pe care Apps Script n-o acceptă.
      return fetch(adresa, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ subiect: subiect, text: text, raspundeLa: raspundeLa || '', campuri: campuri, fisiere: fisiere }, extra || {}))
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('Răspuns ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || !j.ok) { var e = new Error((j && j.eroare) || 'Trimiterea a eșuat'); e.dinScript = !!(j && j.eroare); throw e; }
      return j;
    });
  }
  // Citirea unui contract de la scriptul Google, după cod (pagina de semnare).
  function cereContract(cod) {
    return fetch(C.trimitereAdresa + '?actiune=contract&cod=' + encodeURIComponent(cod), { redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('Răspuns ' + r.status); return r.json(); });
  }
  function lipsa(ce) { return '<em class="lipsa">[de completat' + (ce ? ': ' + esc(ce) : '') + ']</em>'; }
  function valoare(camp) {
    var v = C[camp];
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  }

  // Cum se afișează fiecare câmp din date-cabinet.js
  var afisare = {
    telefon: function (v) { return '<a href="tel:' + esc(v.replace(/[^\d+]/g, '')) + '">' + esc(v) + '</a>'; },
    email: function (v) { return '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>'; },
    barou: function (v) { return C.barouLink ? '<a href="' + esc(C.barouLink) + '" target="_blank" rel="noopener">' + esc(v) + '</a>' : esc(v); },
    taxaAnaliza: function (v) { return esc(v) + ' lei'; },
    taxaStrainatateEuro: function (v) { return esc(v) + ' €'; }
  };
  var descriere = { telefon: 'telefon', email: 'e-mail', adresa: 'adresa', cif: 'CIF', program: 'program', beneficiar: 'beneficiar', iban: 'IBAN', banca: 'banca' };

  function camp(nume) {
    var v = valoare(nume);
    if (!v) return lipsa(descriere[nume] || nume);
    return afisare[nume] ? afisare[nume](v) : esc(v);
  }

  // Iconițe desenate ca linii, în culoarea textului din jur
  var ICON = {
    pdf: '<path d="M13 4h16l9 9v29a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M29 4v9h9"/><rect x="5" y="23" width="27" height="12" rx="2" fill="currentColor" stroke="none"/><text x="18.5" y="32.6" text-anchor="middle" font-family="Arial, sans-serif" font-size="9.5" font-weight="700" fill="#fff" stroke="none">PDF</text>',
    word: '<path d="M13 4h16l9 9v29a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M29 4v9h9"/><rect x="5" y="17" width="20" height="20" rx="2" fill="currentColor" stroke="none"/><path d="M9 22l2.6 10 2.4-7 2.4 7L19 22" stroke="#fff" stroke-width="2"/><path d="M29 22h5M29 27h5M29 32h5M16 40h18"/>',
    semnatura: '<path d="M5 33c3-7 6-12 8.5-11s-1.5 9 1 10 4.5-10 7.5-10-0.5 9 2.5 9 4-5 7-5"/><path d="M5 40h30"/><circle cx="37" cy="12" r="7.5"/><path d="M33.6 12l2.4 2.4 4.4-4.8"/>',
    online: '<rect x="8" y="10" width="32" height="22" rx="2"/><path d="M4 36h40l-3 4H7z"/><path d="M16.5 21.5a11 11 0 0 1 15 0M19.8 25a6.2 6.2 0 0 1 8.4 0"/><circle cx="24" cy="28.4" r="1.4" fill="currentColor" stroke="none"/>',
    redactare: '<path d="M24 44L14 27l4-16h12l4 16z"/><path d="M24 44V30"/><circle cx="24" cy="27" r="2.6"/><path d="M18 11V5h12v6"/><path d="M4 44h12"/>',
    balanta: '<path d="M24 8v32M16 41h16M9 14h30"/><circle cx="24" cy="8" r="2.2"/><path d="M9 14l-5 13M9 14l5 13M39 14l-5 13M39 14l5 13"/><path d="M3 27h12a6 6 0 0 1-12 0zM33 27h12a6 6 0 0 1-12 0z"/>',
    sabie: '<path d="M24 3l3 6v22h-6V9z"/><path d="M15 31h18M24 31v9"/><circle cx="24" cy="42.5" r="2.4"/>',
    roba: '<path d="M19 7q5 3.4 10 0"/><path d="M19 7l-8 4-7 17 6 2 3-11M29 7l8 4 7 17-6 2-3-11"/><path d="M13 19l-3 25q14 2.6 28 0l-3-25"/><path d="M19 7l3.4 17M29 7l-3.4 17M24 13v32M16.5 26l-1.6 18M31.5 26l1.6 18"/><path d="M21.7 8.8h2v7h-2zM24.3 8.8h2v7h-2z" fill="#fff" stroke-width="1.2"/>',
    card: '<rect x="5" y="11" width="38" height="26" rx="3"/><path d="M5 18h38" stroke-width="4"/><path d="M11 30h9M24 30h5"/>',
    banca: '<path d="M6 18L24 7l18 11z"/><path d="M10 22v13M18 22v13M30 22v13M38 22v13M6 39h36"/>',
    incarca: '<path d="M24 32V14M16.5 21.5L24 14l7.5 7.5"/><path d="M9 30v7a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3v-7"/>'
  };
  function icon(nume) {
    return ICON[nume] ? '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[nume] + '</svg>' : '';
  }

  // Sigiliul cu motto-ul: balanța și sabia, în cerc
  var nrSigiliu = 0;
  function sigiliu(culoare) {
    var id = 'cerc-motto-' + (++nrSigiliu);
    var c = culoare;
    return '<svg viewBox="0 0 200 200" role="img" aria-label="Qualitas et fiducia">' +
      '<defs><path id="' + id + '" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>' +
      '<circle cx="100" cy="100" r="96" fill="none" stroke="' + c + '" stroke-width="2.2"/>' +
      '<circle cx="100" cy="100" r="91" fill="none" stroke="' + c + '" stroke-width=".8"/>' +
      '<circle cx="100" cy="100" r="62" fill="none" stroke="' + c + '" stroke-width="1"/>' +
      '<text font-family="EB Garamond, Georgia, serif" font-size="18" font-weight="600" fill="' + c + '"><textPath href="#' + id + '" textLength="484" lengthAdjust="spacing">QUALITAS ✦ ET ✦ FIDUCIA ✦ IOANA STOICA ✦</textPath></text>' +
      '<g fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M97 128h6V62l-3-10-3 10z" fill="' + c + '" fill-opacity=".18"/>' +
        '<path d="M87 129.5h26M100 131v13"/><circle cx="100" cy="148" r="3.5"/>' +
        '<path d="M62 75Q100 68 138 75"/><circle cx="100" cy="71.5" r="3.2" fill="' + c + '"/>' +
        '<path d="M64 75L53 104M64 75L75 104M136 75L125 104M136 75L147 104"/>' +
        '<path d="M49 104q15 14 30 0z" fill="' + c + '" fill-opacity=".18"/><path d="M121 104q15 14 30 0z" fill="' + c + '" fill-opacity=".18"/>' +
      '</g></svg>';
  }
  var DURATA_SCRISOARE = 4500;

  var culoriSigiliu = { auriu: '#a68a55', stilou: '#8f1d2c', alb: '#ece4d3' };


  // Antet: meniul principal, cu „Cum lucrăm” desfăcut în cinci subpagini
  var CUM_LUCRAM = [
    ['concept.html', 'Concept', 'concept'],
    ['pasii.html', 'Mandatul digital', 'pasii'],
    ['materii.html', 'Domenii', 'materii'],
    ['servicii.html', 'Onorarii', 'servicii'],
    ['intrebari.html', 'Întrebări', 'intrebari']
  ];
  var linkuri = [
    ['despre.html', 'Despre mine', 'despre'],
    ['concept.html', 'Cum lucrăm', 'cum', CUM_LUCRAM],
    ['diaspora.html', 'Diaspora', 'diaspora'],
    ['calculatoare.html', 'Calculatoare', 'calculatoare'],
    ['contact.html', 'Contact', 'contact']
  ];
  var inCumLucram = CUM_LUCRAM.some(function (l) { return l[2] === pagina; });
  var antet = document.getElementById('antet');
  if (antet) {
    var meniu = linkuri.map(function (l) {
      var activ = pagina === l[2] || (l[3] && inCumLucram);
      if (!l[3]) return '<a href="' + l[0] + '"' + (activ ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
      return '<div class="meniu-grup"><a href="' + l[0] + '"' + (activ ? ' aria-current="page"' : '') + ' aria-haspopup="true">' + l[1] + '<span class="sageata-mica" aria-hidden="true"></span></a>' +
        '<div class="submeniu">' + l[3].map(function (x) { return '<a href="' + x[0] + '"' + (pagina === x[2] ? ' class="activ"' : '') + '>' + x[1] + '</a>'; }).join('') + '</div></div>';
    }).join('');
    if (pagina !== 'formular') meniu += '<a class="spre-formular" href="trimite-actele.html">Cere consultație</a>';
    antet.className = 'antet';
    antet.innerHTML =
      '<div class="continut">' +
        '<a class="marca" href="index.html"><img src="imagini/balanta.png" alt=""><span><b>Ioana Stoica</b><small>Avocat · Baroul Argeș</small></span></a>' +
        '<button class="buton-meniu" type="button" aria-expanded="false" aria-controls="meniu">Meniu</button>' +
        '<nav class="meniu" id="meniu" aria-label="Meniu principal">' + meniu + '</nav>' +
      '</div>';
    var btn = antet.querySelector('.buton-meniu'), nav = antet.querySelector('.meniu');
    btn.addEventListener('click', function () {
      var deschis = nav.classList.toggle('deschis');
      btn.setAttribute('aria-expanded', deschis ? 'true' : 'false');
    });
  }
  // Subnavigația din paginile „Cum lucrăm”
  Array.prototype.forEach.call(document.querySelectorAll('[data-subnav]'), function (el) {
    el.className = 'subnav';
    el.innerHTML = '<div class="continut">' + CUM_LUCRAM.map(function (x) {
      return '<a href="' + x[0] + '"' + (pagina === x[2] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>';
    }).join('') + '</div>';
  });

  // Subsol: datele de identificare, obligatorii
  var subsol = document.getElementById('subsol');
  if (subsol) {
    var unbr = C.unbrLink ? '<li><a href="' + esc(C.unbrLink) + '" target="_blank" rel="noopener">Uniunea Națională a Barourilor din România</a></li>' : '';
    subsol.className = 'subsol';
    subsol.innerHTML =
      '<div class="continut">' +
        '<div class="coloane">' +
          '<div><div class="motto">Qualitas et fiducia</div><h4>' + esc(C.denumire || '') + '</h4><ul>' +
            '<li>Av. ' + esc(C.avocat || '') + ', ' + camp('barou') + '</li>' +
            '<li>Sediu: ' + camp('adresa') + '</li>' +
            '<li>CIF: ' + camp('cif') + '</li>' +
          '</ul></div>' +
          '<div><h4>Contact</h4><ul>' +
            '<li>Telefon: ' + camp('telefon') + '</li>' +
            '<li>E-mail: ' + camp('email') + '</li>' +
            '<li>Program: ' + camp('program') + '</li>' +
          '</ul></div>' +
          '<div><h4>Informații</h4><ul>' +
            '<li><a href="materii.html">Materii de drept</a></li>' +
            '<li><a href="confidentialitate.html">Politica de confidențialitate</a></li>' +
            '<li><a href="termeni.html">Termeni și condiții</a></li>' +
            '<li>' + (C.barouLink ? '<a href="' + esc(C.barouLink) + '" target="_blank" rel="noopener">Pagina mea pe site-ul ' + esc(C.barou.replace('Baroul', 'Baroului')) + '</a>' : esc(C.barou || '') + ': ' + lipsa('link')) + '</li>' +
            unbr +
          '</ul></div>' +
        '</div>' +
        '<div class="distribuie"><span>Distribuie</span>' +
          '<a class="d-wa" target="_blank" rel="noopener" data-share="wa" href="#">WhatsApp</a>' +
          '<a class="d-fb" target="_blank" rel="noopener" data-share="fb" href="#">Facebook</a>' +
          '<button type="button" class="d-ig" data-share="ig">Instagram</button>' +
          '<button type="button" class="d-link" data-share="link">Copiază linkul</button>' +
          '<span class="d-stare" aria-live="polite"></span>' +
        '</div>' +
        '<div class="jos">© ' + new Date().getFullYear() + ' ' + esc(C.denumire || '') +
        '. Informațiile de pe acest site au caracter general și nu constituie consultanță juridică.</div>' +
      '</div>';
  }

  // Legăturile oficiale: <a data-link="barou">
  Array.prototype.forEach.call(document.querySelectorAll('[data-link]'), function (el) {
    var v = C[el.getAttribute('data-link') + 'Link'];
    if (v) el.href = v; else el.removeAttribute('href');
  });

  // Distribuirea paginii: WhatsApp și Facebook au adrese de distribuire; Instagram nu are,
  // așa că pe telefon se deschide meniul de distribuire al telefonului, iar altfel se copiază linkul.
  (function () {
    var url = location.href.split('#')[0], titlu = document.title;
    var text = 'Av. Ioana Stoica · cabinet de avocat, consultanță și reprezentare de la distanță: ' + url;
    Array.prototype.forEach.call(document.querySelectorAll('[data-share=wa]'), function (a) { a.href = 'https://wa.me/?text=' + encodeURIComponent(text); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-share=fb]'), function (a) { a.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url); });
    var stare = null;
    function copiaza() {
      function gata(t) { if (stare) { stare.textContent = t; setTimeout(function () { stare.textContent = ''; }, 3500); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { gata('Linkul a fost copiat.'); }, function () { gata(url); });
      else gata(url);
    }
    Array.prototype.forEach.call(document.querySelectorAll('button[data-share]'), function (b) {
      b.addEventListener('click', function () {
        stare = b.parentNode.querySelector('.d-stare');
        if (b.getAttribute('data-share') === 'ig' && navigator.share) { navigator.share({ title: titlu, text: text, url: url }).catch(function () {}); return; }
        copiaza();
        if (b.getAttribute('data-share') === 'ig' && stare) setTimeout(function () { stare.textContent = 'Linkul a fost copiat: lipește-l în Instagram (poveste sau mesaj).'; }, 50);
      });
    });
  })();

  // Câmpurile din pagini: <span data-camp="telefon"></span>
  Array.prototype.forEach.call(document.querySelectorAll('[data-camp]'), function (el) {
    el.innerHTML = camp(el.getAttribute('data-camp'));
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-icon]'), function (el) {
    el.innerHTML = icon(el.getAttribute('data-icon'));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-sigiliu]'), function (el) {
    el.innerHTML = sigiliu(culoriSigiliu[el.getAttribute('data-sigiliu')] || culoriSigiliu.auriu);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-portret]'), function (el) {
    el.outerHTML = '<div class="portret"><img src="imagini/portret.png" alt="Av. Ioana Stoica, portret în creion"></div>';
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-carte]'), function (el) {
    var carte = document.createElement('div');
    carte.className = 'carte';
    carte.tabIndex = 0;
    carte.setAttribute('role', 'button');
    carte.setAttribute('aria-label', 'Cartea de vizită. Atinge pentru a o întoarce.');
    carte.innerHTML = '<div class="carte-interior">' +
      '<div class="carte-fata"><img src="imagini/carte-de-vizita.jpg" alt="Cartea de vizită: cabinet de avocat Ioana Stoica' + (C.telefon ? ', telefon ' + esc(C.telefon) : '') + '"></div>' +
      '<div class="carte-spate"><div><img src="imagini/balanta-alba.png" alt=""><div class="motto">Qualitas et fiducia</div><small>Cabinet de avocat Ioana Stoica</small></div></div>' +
      '</div>';
    function intoarce() { carte.classList.toggle('intoarsa'); }
    carte.addEventListener('click', intoarce);
    carte.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); intoarce(); } });
    el.parentNode.replaceChild(carte, el);
  });

  if (document.querySelector('.roata-materii')) roata();
  if (document.querySelector('.scrisoare')) scrisoare();
  // Prima pagină, jos: numărul de telefon apare cifră cu cifră (ca niște picături, cam una pe secundă),
  // apoi, la fel de lent, domeniile. Totul se face din date-cabinet.js (telefonul) și din lista de mai jos.
  var PAS_PICATURA = 1;   // secunde între două cifre
  function picaturi() {
    var el = document.querySelector('[data-picaturi]');
    if (!el) return;
    var tel = String(C.telefon || '').trim();
    var t = 0.8, cifre = '';
    Array.prototype.forEach.call(tel, function (c) {
      if (c === ' ') { cifre += '<span class="p-gol" aria-hidden="true"></span>'; return; }
      cifre += '<span class="p-cifra" aria-hidden="true" style="animation-delay:' + t.toFixed(1) + 's">' + esc(c) + '</span>';
      t += PAS_PICATURA;
    });
    el.innerHTML = tel ? '<a class="p-telefon" href="tel:' + esc(tel.replace(/[^\d+]/g, '')) + '" aria-label="Telefon ' + esc(tel) + '">' + cifre + '</a>' : '';
  }
  picaturi();

  // Prima pagină: în bandă, trei mesaje care se schimbă pe rând (titlu scurt și o frază), cu punctele dedesubt,
  // după modelul primei pagini a site-ului Stoica & Asociații.
  var PAS_MESAJ = 6000;   // milisecunde între două mesaje
  function mesajeAcasa() {
    var mesaje = document.querySelectorAll('.mesaj-acasa');
    var puncte = document.querySelector('.puncte-mesaje');
    if (mesaje.length < 2 || !puncte) return;
    var curent = 0, ceas = null;
    var butoane = Array.prototype.map.call(mesaje, function (m, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Mesajul ' + (i + 1));
      b.addEventListener('click', function () { arata(i); porneste(); });
      puncte.appendChild(b);
      return b;
    });
    function arata(i) {
      curent = (i + mesaje.length) % mesaje.length;
      Array.prototype.forEach.call(mesaje, function (m, j) { m.classList.toggle('activ', j === curent); m.setAttribute('aria-hidden', j === curent ? 'false' : 'true'); });
      butoane.forEach(function (b, j) { b.classList.toggle('activ', j === curent); });
    }
    function porneste() { clearInterval(ceas); ceas = setInterval(function () { arata(curent + 1); }, PAS_MESAJ); }
    var banda = document.querySelector('.banda-acasa');
    if (banda) {
      banda.addEventListener('mouseenter', function () { clearInterval(ceas); });
      banda.addEventListener('mouseleave', porneste);
    }
    arata(0); porneste();
  }
  mesajeAcasa();

  if (document.getElementById('diapozitive')) diapozitive();
  else apar();
  if (document.getElementById('formular')) formular();
  if (document.getElementById('semnare')) semnare();

  // Scrisoarea (pagina Concept) se așterne singură, lin și repede: toată în aproximativ 5 secunde.
  // Fără pană, iar pagina nu se mișcă: cititorul derulează singur, când vrea.
  function scrisoare() {
    var s = document.querySelector('.scrisoare');
    var bucati = Array.prototype.slice.call(s.querySelectorAll('[data-scris]'));
    var liniste = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (liniste || !bucati.length || !window.requestAnimationFrame) { s.classList.add('scrisa'); return; }

    var texte = bucati.map(function (el) { return el.textContent; });
    var total = texte.reduce(function (n, t) { return n + t.length; }, 0);
    s.style.minHeight = s.offsetHeight + 'px'; // pagina nu sare în timp ce se scrie
    bucati.forEach(function (el) { el.textContent = ''; });
    s.classList.add('se-scrie');
    var i = 0, j = 0, scrise = 0, start = 0;

    // La fiecare cadru se scriu literele care „i se cuvin” timpului trecut, câteva într-un singur span.
    function cadru(t) {
      if (!start) start = t;
      var tinta = Math.min(total, Math.ceil(total * Math.min(1, (t - start) / DURATA_SCRISOARE)));
      while (scrise < tinta && i < bucati.length) {
        var bucata = texte[i].slice(j, j + (tinta - scrise));
        if (bucata) {
          var lit = document.createElement('span');
          lit.className = 'lit';
          lit.textContent = bucata;
          bucati[i].appendChild(lit);
          j += bucata.length; scrise += bucata.length;
        }
        if (j >= texte[i].length) { i++; j = 0; }
      }
      if (scrise < total) requestAnimationFrame(cadru); else setTimeout(gata, 700);
    }
    function gata() {
      bucati.forEach(function (el, k) { el.textContent = texte[k]; });
      s.classList.remove('se-scrie');
      s.classList.add('scrisa');
      s.style.minHeight = '';
    }
    function incepe() { setTimeout(function () { requestAnimationFrame(cadru); }, 400); }
    // fontul caligrafic trebuie să fie încărcat, ca rândurile să nu se reașeze în timpul scrisului
    if (document.fonts && document.fonts.load) document.fonts.load('400 1em "Petit Formal Script"').then(incepe, incepe);
    else incepe();
  }

  // Materiile de drept, așezate pe loc, în cerc, în jurul balanței
  function roata() {
    var cont = document.querySelector('.roata-materii');
    var orbita = cont.querySelector('.orbita');
    var balanta = cont.querySelector('.balanta-butoane');
    var elipsa = document.createElement('div');
    elipsa.className = 'elipsa';
    cont.insertBefore(elipsa, cont.firstChild);
    var el = MATERII.map(function (m) {
      var a = document.createElement('a');
      a.className = 'materie';
      a.href = 'materii.html#' + m[0];
      a.textContent = m[1];
      orbita.appendChild(a);
      return a;
    });
    var n = el.length, rx = 0, ry = 0, w = 0, h = 0;

    function masoara() {
      w = cont.clientWidth; h = cont.clientHeight;
      var lat = 0, inalt = 0;
      el.forEach(function (e) { lat = Math.max(lat, e.offsetWidth); inalt = Math.max(inalt, e.offsetHeight); });
      // prea puțin loc pentru o roată lizibilă: materiile trec în listă, sub balanță
      var lista = w < 560;
      cont.classList.toggle('roata-lista', lista);
      if (lista) { balanta.style.removeProperty('--sb'); return; }
      rx = Math.max(60, w / 2 - lat / 2 - 4);
      ry = Math.max(60, h / 2 - inalt / 2 - 4);
      elipsa.style.cssText = 'left:' + (w / 2 - rx) + 'px;top:' + (h / 2 - ry) + 'px;width:' + 2 * rx + 'px;height:' + 2 * ry + 'px';
      aseaza();
      // balanța ocupă spațiul liber dintre cele două șiruri de materii
      var st = 0, dr = w;
      el.forEach(function (e) {
        var x = e._x, lat2 = e.offsetWidth;
        if (x + lat2 / 2 < w / 2) st = Math.max(st, x + lat2); else dr = Math.min(dr, x);
      });
      var sc = Math.min(1, (dr - st - 24) / 340, (h - 20) / 252);
      balanta.style.setProperty('--sb', Math.max(0.42, sc).toFixed(3));
    }
    // materiile stau pe loc, pe cele două laturi ale cercului: patru în stânga, trei în dreapta
    function unghiuri() {
      var stg = Math.ceil(n / 2), drp = n - stg, u = [], k;
      for (k = 0; k < stg; k++) u.push(Math.PI * (235 - 110 * k / (stg - 1)) / 180);      // de jos în sus, în stânga
      for (k = 0; k < drp; k++) u.push(Math.PI * (-45 + 90 * k / Math.max(1, drp - 1)) / 180); // de sus în jos, în dreapta
      return u;
    }
    function aseaza() {
      if (cont.classList.contains('roata-lista')) return;
      var u = unghiuri();
      el.forEach(function (e, i) {
        var x = w / 2 + rx * Math.cos(u[i]) - e.offsetWidth / 2;
        var y = h / 2 + ry * Math.sin(u[i]) - e.offsetHeight / 2;
        e._x = x;
        e.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
    }
    window.addEventListener('resize', masoara);
    if (window.ResizeObserver) new ResizeObserver(masoara).observe(cont);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(masoara);
    masoara();
  }

  // Semnarea contractului de la distanță: date, buletin, contract citit până la capăt, acorduri, semnătură desenată
  function semnare() {
    var f = document.getElementById('semnare');
    var buton = f.querySelector('button[type=submit]');
    var lacat = document.getElementById('lacat-semnare');
    var mesaj = document.getElementById('mesaj-semnare');
    var contract = document.getElementById('contract-text');
    var stareCitire = document.getElementById('stare-citire');
    var pad = document.getElementById('semnatura-pad');
    var ctx = pad.getContext('2d');
    var cerneala = false, citit = false;
    var v = function (n) { return (f.elements[n] && f.elements[n].value || '').trim(); };

    var m = /[?&]contract=([^&]+)/.exec(location.search);
    if (m) f.elements.contract.value = decodeURIComponent(m[1]);
    // Onorariul convenit vine din linkul trimis de avocat: semneaza-contractul.html?contract=12/2026&onorariu=900
    var mo = /[?&]onorariu=([^&]+)/.exec(location.search);
    var onorariu = mo ? decodeURIComponent(mo[1]).replace(/[^\d.,]/g, '') : '';
    // Contractul creat de avocat pe pagina avocat.html: semneaza-contractul.html?c=<cod>
    var mc = /[?&]c=([0-9a-f]{32})\b/.exec(location.search);
    var cod = mc && eGoogle(C.trimitereAdresa) ? mc[1] : '';
    var deLaAvocat = {}, incarcat = !cod;
    var stareLink = document.getElementById('stare-link');
    // Datele clientului apar în textul contractului pe măsură ce le scrie
    function inContract() {
      Array.prototype.forEach.call(contract.querySelectorAll('[data-client]'), function (el) {
        var n = el.getAttribute('data-client');
        var v = n === 'onorariu' ? (onorariu ? onorariu + ' lei' : '') : n === 'data' ? new Date().toLocaleDateString('ro-RO') :
          (n === 'obiect' || n === 'mentiuni') ? (deLaAvocat[n] || '') : v2(n);
        if (!el.hasAttribute('data-gol')) el.setAttribute('data-gol', el.textContent);
        el.textContent = v || el.getAttribute('data-gol');
        el.classList.toggle('necompletat', !v);
      });
      contract.querySelector('[data-obiect]').hidden = !deLaAvocat.obiect;
      contract.querySelector('[data-mentiuni]').hidden = !deLaAvocat.mentiuni;
    }
    if (cod) {
      f.querySelectorAll('input, button').forEach(function (x) { x.disabled = true; });
      stareLink.className = 'mesaj vizibil'; stareLink.textContent = 'Se încarcă contractul…';
      cereContract(cod).then(function (j) {
        if (!j.ok) throw Object.assign(new Error(j.eroare), { dinScript: true });
        var k = j.contract;
        if (k.stare === 'semnat') {
          stareLink.className = 'mesaj vizibil bun';
          stareLink.innerHTML = '<b>Contractul nr. ' + esc(k.nr) + ' este deja semnat.</b> Exemplarul dumneavoastră a plecat pe e-mail la semnare. Mulțumesc!';
          f.hidden = true; return;
        }
        deLaAvocat = k; onorariu = String(k.onorariu || ''); incarcat = true;
        f.querySelectorAll('input, button').forEach(function (x) { x.disabled = false; });
        f.elements.citit.disabled = !citit;
        // Ce a completat avocatul rămâne fix; clientul completează doar ce lipsește.
        [['contract', k.nr], ['nume', k.nume], ['email', k.email], ['telefon', k.telefon], ['cnp', k.cnp], ['domiciliu', k.domiciliu]].forEach(function (p) {
          if (p[1]) { f.elements[p[0]].value = p[1]; f.elements[p[0]].readOnly = true; f.elements[p[0]].classList.add('completat-avocat'); }
        });
        stareLink.className = 'mesaj vizibil bun';
        stareLink.innerHTML = '<b>Contractul nr. ' + esc(k.nr) + ' este pregătit.</b> Datele completate de avocat sunt fixe. Completează ce lipsește, citește contractul și semnează.';
        inContract(); stare();
      }).catch(function (e) {
        stareLink.className = 'mesaj vizibil rau';
        stareLink.innerHTML = e.dinScript ? '<b>' + esc(e.message) + '</b>' : '<b>Contractul nu a putut fi încărcat.</b> Verifică legătura la internet și reîncarcă pagina.';
      });
    } else if (!onorariu) {
      // Fără linkul trimis de avocat nu e nimic de semnat: vizitatorul e trimis spre consultație.
      var av = document.createElement('div');
      av.className = 'fara-link';
      av.innerHTML = '<p><b>Contractul se semnează numai din linkul pe care ți-l trimit după consultație</b>, pe e-mail sau pe WhatsApp. ' +
        'În link, contractul are deja completate numărul, obiectul și onorariul.</p>' +
        '<p>Dacă nu ai avut încă o consultație, începe de aici:</p>' +
        '<p><a class="buton buton-principal" href="trimite-actele.html">Cere consultație</a></p>';
      f.parentNode.insertBefore(av, f);
      f.hidden = true;
      var cap = document.querySelector('.cap-pagina'); if (cap) cap.hidden = true;
      return;
    }
    function v2(n) { return (f.elements[n] && f.elements[n].value || '').trim(); }

    // Chenarul pentru semnătură, la rezoluția ecranului
    function potriveste() {
      var r = pad.getBoundingClientRect(), k = window.devicePixelRatio || 1;
      var vechi = cerneala ? pad.toDataURL() : null;
      pad.width = Math.round(r.width * k); pad.height = Math.round(r.height * k);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1d1b18'; ctx.lineWidth = 2.2;
      if (vechi) { var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, r.width, r.height); }; im.src = vechi; }
    }
    potriveste();
    window.addEventListener('resize', potriveste);
    var ultim = null;
    function punct(e) { var r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pad.setPointerCapture(e.pointerId); ultim = punct(e); ctx.beginPath(); ctx.arc(ultim.x, ultim.y, 1, 0, 6.3); ctx.fillStyle = '#1d1b18'; ctx.fill(); });
    pad.addEventListener('pointermove', function (e) {
      if (!ultim) return;
      var p = punct(e), mij = { x: (ultim.x + p.x) / 2, y: (ultim.y + p.y) / 2 };
      ctx.beginPath(); ctx.moveTo(ultim.x, ultim.y); ctx.quadraticCurveTo(ultim.x, ultim.y, mij.x, mij.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ultim = p; cerneala = true;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { pad.addEventListener(t, function () { if (ultim) { ultim = null; stare(); } }); });
    document.getElementById('sterge-semnatura').addEventListener('click', function () {
      ctx.clearRect(0, 0, pad.width, pad.height); cerneala = false; stare();
    });

    // Contractul se citește până la capăt
    function verificaCitirea() {
      if (citit) return;
      if (contract.scrollTop + contract.clientHeight >= contract.scrollHeight - 8) {
        citit = true;
        f.elements.citit.disabled = false;
        stareCitire.textContent = '✓ Ai ajuns la capătul contractului.';
        stareCitire.classList.add('confirmata');
        stare();
      }
    }
    contract.addEventListener('scroll', verificaCitirea);
    setTimeout(verificaCitirea, 300);

    function cnpBun(c) {
      if (!/^\d{13}$/.test(c)) return false;
      var w = '279146358279', s = 0;
      for (var i = 0; i < 12; i++) s += Number(c[i]) * Number(w[i]);
      var r = s % 11; if (r === 10) r = 1;
      return r === Number(c[12]);
    }
    function fisierBun(inp, obligatoriu) {
      var x = inp.files && inp.files[0];
      if (!x) return !obligatoriu;
      return /\.(pdf|jpe?g|png)$/i.test(x.name) && x.size <= 10 * 1024 * 1024;
    }
    function fara(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }

    var reguli = [
      ['onorariu', function () { return incarcat && !!onorariu; }, ''],
      ['nume', function () { return v('nume').split(' ').length >= 2; }, 'Scrie numele și prenumele, ca în buletin.'],
      ['cnp', function () { return cnpBun(v('cnp')); }, 'CNP-ul nu pare corect: are 13 cifre, iar ultima este cifra de control.'],
      ['contract', function () { return v('contract').length > 0; }, 'Scrie numărul contractului, din e-mailul cu oferta.'],
      ['domiciliu', function () { return v('domiciliu').length >= 8; }, 'Scrie domiciliul, ca în buletin.'],
      ['email', function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')); }, 'Scrie o adresă de e-mail validă.'],
      ['telefon', function () { return /^[+\d][\d\s().-]{8,}$/.test(v('telefon')); }, 'Scrie un număr de telefon valid.'],
      ['ci', function () { return fisierBun(f.querySelector('#s-ci'), true); }, 'Încarcă fața buletinului (JPG, PNG sau PDF, cel mult 10 MB).'],
      ['ci2', function () { return fisierBun(f.querySelector('#s-ci2'), false); }, 'Versoul trebuie să fie JPG, PNG sau PDF, de cel mult 10 MB.'],
      ['acorduri', function () { return citit && f.elements.citit.checked && f.elements.identitate.checked && f.elements.electronic.checked && f.elements.gdpr.checked; }, 'Citește contractul până la capăt și bifează toate acordurile.'],
      ['semnatura', function () { return cerneala; }, 'Semnează în chenar.'],
      ['confirmare', function () { return v('nume') && fara(v('confirmare')) === fara(v('nume')); }, 'Scrie numele complet exact ca mai sus.']
    ];
    function seteaza(nume, text) {
      var c = f.querySelector('[data-pentru="' + nume + '"]');
      if (!c) return;
      c.classList.toggle('gresit', !!text);
      var e = c.querySelector('.eroare'); if (e && text) e.textContent = text;
    }
    function stare() {
      var lipsa = reguli.filter(function (r) { return !r[1](); });
      buton.disabled = lipsa.length > 0;
      lacat.textContent = lipsa.length ? (lipsa.length === 1 ? 'Mai ai de completat o rubrică.' : 'Mai ai de completat ' + lipsa.length + ' rubrici.') : 'Totul este în regulă. Poți semna.';
      lacat.classList.toggle('deblocat', !lipsa.length);
      // progresul de sus
      var pasi = { 1: ['nume', 'cnp', 'contract', 'domiciliu', 'email', 'telefon'], 2: ['ci', 'ci2'], 3: [], 4: ['acorduri'], 5: ['semnatura', 'confirmare'] };
      Array.prototype.forEach.call(f.querySelectorAll('.progres-semnare li'), function (li) {
        var k = li.getAttribute('data-pas');
        var gata = k === '3' ? citit : pasi[k].every(function (n) { return reguli.filter(function (r) { return r[0] === n; })[0][1](); });
        li.classList.toggle('gata', gata);
      });
    }
    f.addEventListener('input', function () { inContract(); stare(); });
    inContract();
    f.addEventListener('change', function (e) {
      if (e.target.type === 'file') {
        var n = e.target.id === 's-ci' ? 'ci' : 'ci2';
        var r = reguli.filter(function (x) { return x[0] === n; })[0];
        seteaza(n, r[1]() ? '' : r[2]);
      }
      stare();
    });
    Array.prototype.forEach.call(f.querySelectorAll('input[type=text], input[type=email], input[type=tel]'), function (inp) {
      inp.addEventListener('blur', function () {
        var r = reguli.filter(function (x) { return x[0] === inp.name; })[0];
        if (r && inp.value.trim()) seteaza(r[0], r[1]() ? '' : r[2]);
      });
    });
    stare();

    function amprenta(text) {
      try {
        if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve('');
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (h) {
          return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        }, function () { return ''; });
      } catch (e) { return Promise.resolve(''); }
    }
    // Contractul, ca HTML simplu, din care scriptul Google face PDF-ul. Pe PDF, avocatul pune apoi
    // semnătura electronică calificată, cu aplicația furnizorului (de exemplu, Certsign).
    function contractPentruPdf(semnatura, cand, h) {
      var c = contract.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('[hidden]'), function (x) { x.parentNode.removeChild(x); });
      Array.prototype.forEach.call(c.querySelectorAll('.necompletat'), function (x) { x.classList.remove('necompletat'); });
      var client = c.querySelector('.semnaturi-contract > div:last-child small');
      if (client) client.outerHTML = '<img class="semnatura-client" src="' + semnatura + '" alt="Semnătura clientului">' +
        '<small>semnătură electronică simplă, pe site, la ' + esc(cand.toLocaleString('ro-RO')) + '</small>';
      var a = document.createElement('p');
      a.className = 'amprenta';
      a.textContent = 'Semnat de client pe pagina de semnare a site-ului cabinetului, la ' + cand.toLocaleString('ro-RO') +
        ' (' + cand.toISOString() + '). Amprenta SHA-256 a textului contractului: ' + (h || 'indisponibilă') + '.';
      c.appendChild(a);
      var img = c.querySelector('.antet-contract img');
      var sigla = img ? fetch(img.src).then(function (r) { if (!r.ok) throw new Error(); return r.blob(); }).then(base64)
        .then(function (b) { img.setAttribute('src', 'data:image/png;base64,' + b); }) : Promise.resolve();
      return sigla.catch(function () { if (img) img.parentNode.removeChild(img); }).then(function () { return c.innerHTML; });
    }
    function afiseaza(fel, html) { mesaj.className = 'mesaj vizibil ' + fel; mesaj.innerHTML = html; mesaj.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements.site && f.elements.site.value) return;
      var gresite = reguli.filter(function (r) { var ok = r[1](); seteaza(r[0], ok ? '' : r[2]); return !ok; });
      if (gresite.length) { var c = f.querySelector('[data-pentru="' + gresite[0][0] + '"]'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      var cand = new Date();
      amprenta(contract.innerText).then(function (h) {
        var rezumat = [
          'Contract de asistență juridică nr. ' + v('contract'),
          'Client: ' + v('nume') + ', CNP ' + v('cnp'),
          deLaAvocat.obiect ? 'Obiectul cauzei: ' + deLaAvocat.obiect : '',
          'Onorariu convenit: ' + (onorariu ? onorariu + ' lei' : '-') + (deLaAvocat.mentiuni ? ' (' + deLaAvocat.mentiuni + ')' : ''),
          'Domiciliul: ' + v('domiciliu'),
          'E-mail: ' + v('email') + ', telefon: ' + v('telefon'),
          'Semnat electronic pe site la: ' + cand.toLocaleString('ro-RO') + ' (' + cand.toISOString() + ')',
          'Amprenta SHA-256 a textului contractului: ' + (h || 'indisponibilă în acest browser'),
          'Acorduri bifate: contract citit integral și acceptat; datele și actul de identitate îmi aparțin; semnare electronică; politica de confidențialitate.',
          'Nume scris ca semn al acordului: ' + v('confirmare')
        ].filter(Boolean).join('\n');
        if (!C.trimitereAdresa) {
          if (!C.email) { afiseaza('atentie', '<b>Semnarea nu este încă activă.</b> Lipsește adresa de e-mail a cabinetului din <code>date-cabinet.js</code>.'); return; }
          var img = pad.toDataURL('image/png');
          var link = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Contract semnat: ' + v('nume')) + '&body=' + encodeURIComponent(rezumat);
          afiseaza('atentie', '<b>Mai ai un pas.</b> Descarcă semnătura, apoi deschide e-mailul, cu datele deja scrise, și atașează la el semnătura și buletinul.' +
            '<br><a class="buton buton-discret" style="margin-top:12px" download="semnatura.png" href="' + img + '">Descarcă semnătura</a> ' +
            '<a class="buton buton-principal" style="margin-top:12px" href="' + esc(link) + '">Deschide e-mailul</a>');
          return;
        }
        var semnatura = pad.toDataURL('image/png');
        contractPentruPdf(semnatura, cand, h).then(function (html) { pad.toBlob(function (blob) {
          var campuri = [];
          ['nume', 'cnp', 'contract', 'domiciliu', 'email', 'telefon', 'confirmare'].forEach(function (n) { campuri.push([n, v(n)]); });
          campuri.push(['onorariu', onorariu]);
          campuri.push(['semnat_la', cand.toISOString()]);
          campuri.push(['amprenta_contract_sha256', h]);
          campuri.push(['browser', navigator.userAgent]);
          var fata = f.querySelector('#s-ci').files[0], verso = f.querySelector('#s-ci2').files[0];
          var atasamente = [['buletin_fata', fata, 'Buletin față - ' + fata.name]];
          if (verso) atasamente.push(['buletin_verso', verso, 'Buletin verso - ' + verso.name]);
          atasamente.push(['semnatura', blob, 'semnatura.png']);
          atasamente.push(['contract_text', new Blob([contract.innerText], { type: 'text/plain;charset=utf-8' }), 'Contractul semnat (text).txt']);
          buton.disabled = true; buton.textContent = 'Se trimite…';
          var extra = cod ? { actiune: 'semneaza', cod: cod, amprenta: h,
            client: { nume: v('nume'), email: v('email'), telefon: v('telefon'), cnp: v('cnp'), domiciliu: v('domiciliu') } } : {};
          extra.htmlContract = html;
          trimiteLaCabinet('Contract semnat: ' + v('nume'), rezumat, campuri, atasamente, v('email'), extra)
            .then(function () {
              afiseaza('bun', cod ? '<b>Contractul a fost semnat. Mulțumesc!</b> Ți-am trimis confirmarea pe e-mail, la ' + esc(v('email')) +
                '. După ce semnez și eu contractul, cu semnătură electronică calificată, îți trimit exemplarul final.'
                : '<b>Contractul a fost semnat și trimis. Mulțumesc!</b> Îți confirm pe e-mail primirea lui.');
              f.querySelectorAll('input, button').forEach(function (x) { x.disabled = true; });
            })
            .catch(function (e) {
              buton.disabled = false; buton.textContent = 'Semnez contractul';
              afiseaza('rau', e && e.dinScript ? '<b>' + esc(e.message) + '</b>' : '<b>Contractul nu a putut fi trimis.</b> Verifică legătura la internet și încearcă din nou.');
            });
        }, 'image/png'); });
      });
    });
  }

  // Prima pagină: diapozitive pe tot ecranul. Săgeata, rotița, tastele și glisarea trec la următorul.
  // Pe ecranele mici, pagina curge normal, iar textele intră când ajung pe ecran.
  function diapozitive() {
    var cont = document.getElementById('diapozitive');
    var pista = cont.querySelector('.pista');
    var slide = Array.prototype.slice.call(cont.querySelectorAll('.diapozitiv'));
    var n = slide.length;
    var puncte = document.querySelector('.puncte');
    var contor = document.querySelector('.contor');
    var sageata = document.querySelector('.sageata');
    var mare = window.matchMedia('(min-width: 961px) and (min-height: 600px)');
    var idx = 0, blocat = false, pornit = false, observator = null;
    function doua(k) { return (k < 9 ? '0' : '') + (k + 1); }

    slide.forEach(function (sl, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', sl.getAttribute('data-nume'));
      b.innerHTML = '<span>' + esc(sl.getAttribute('data-nume')) + '</span>';
      b.addEventListener('click', function () { arata(k); });
      puncte.appendChild(b);
    });
    contor.querySelector('i').textContent = doua(n - 1);

    function arata(k) {
      k = Math.max(0, Math.min(n - 1, k));
      idx = k;
      pista.style.transform = 'translateY(' + (-k * 100) + '%)';
      slide.forEach(function (sl, j) { sl.classList.toggle('activ', j === k); sl.setAttribute('aria-hidden', j === k ? 'false' : 'true'); });
      Array.prototype.forEach.call(puncte.children, function (b, j) { b.classList.toggle('activ', j === k); });
      contor.querySelector('b').textContent = doua(k);
      contor.style.setProperty('--progres', (k + 1) / n);
      sageata.classList.toggle('sus', k === n - 1);
      document.documentElement.classList.toggle('pe-final', k === n - 1);
      document.documentElement.classList.toggle('pe-acasa', k === 0);
      sageata.setAttribute('aria-label', k === n - 1 ? 'Înapoi la început' : 'Mai departe');
      blocat = true;
      setTimeout(function () { blocat = false; }, 1200);
    }

    function poateDerula(el, dy) {
      var f = el && el.closest && el.closest('.foaie');
      if (!f || f.scrollHeight <= f.clientHeight + 2) return false;
      return dy > 0 ? f.scrollTop + f.clientHeight < f.scrollHeight - 1 : f.scrollTop > 0;
    }
    function activ() { return document.documentElement.classList.contains('cu-diapozitive'); }

    cont.addEventListener('wheel', function (e) {
      if (!activ() || poateDerula(e.target, e.deltaY)) return;
      e.preventDefault();
      if (blocat || Math.abs(e.deltaY) < 6) return;
      arata(idx + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });
    var y0 = null;
    cont.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    cont.addEventListener('touchend', function (e) {
      if (!activ() || y0 === null) return;
      var dy = y0 - e.changedTouches[0].clientY; y0 = null;
      if (Math.abs(dy) < 50 || poateDerula(e.target, dy) || blocat) return;
      arata(idx + (dy > 0 ? 1 : -1));
    });
    document.addEventListener('keydown', function (e) {
      if (!activ() || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var k = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); arata(0); return; }
      if (e.key === 'End') { e.preventDefault(); arata(n - 1); return; }
      if (!k || (e.key === ' ' && e.target.closest('a,button'))) return;
      e.preventDefault();
      if (!blocat) arata(idx + k);
    });
    sageata.addEventListener('click', function () { arata(idx === n - 1 ? 0 : idx + 1); });
    // Tab spre o legătură din alt diapozitiv: se trece la diapozitivul ei
    cont.addEventListener('focusin', function (e) {
      if (!activ()) return;
      var k = slide.indexOf(e.target.closest('.diapozitiv'));
      cont.scrollTop = 0;
      if (k >= 0 && k !== idx) arata(k);
    });
    cont.addEventListener('scroll', function () { if (activ()) cont.scrollTop = 0; });

    function aplica() {
      var da = mare.matches;
      document.documentElement.classList.toggle('cu-diapozitive', da);
      if (da) {
        if (observator) { observator.disconnect(); observator = null; }
        arata(idx);
      } else {
        pista.style.transform = '';
        slide.forEach(function (sl) { sl.removeAttribute('aria-hidden'); });
        if (!('IntersectionObserver' in window)) { slide.forEach(function (sl) { sl.classList.add('activ'); }); return; }
        observator = new IntersectionObserver(function (intrari) {
          intrari.forEach(function (x) { if (x.isIntersecting) x.target.classList.add('activ'); });
        }, { threshold: 0.12 });
        slide.forEach(function (sl) { observator.observe(sl); });
      }
      pornit = true;
    }
    if (mare.addEventListener) mare.addEventListener('change', aplica); else mare.addListener(aplica);
    aplica();
  }

  // Paginile interioare: elementele apar lin, pe măsură ce ajung pe ecran
  function apar() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var el = document.querySelectorAll('.cap-pagina > *, .materie-detaliu, .cronologie li, .poveste > li, .poveste-final, .poveste-limbi, .card, .scara li, .intrebari details, .fapte > div, .profil > div > *, .contact > div, .text-juridic > *, .doua-coloane > *, .final-pagina .buton, .formular fieldset');
    var o = new IntersectionObserver(function (intrari) {
      intrari.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('vizibil'); o.unobserve(x.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    Array.prototype.forEach.call(el, function (e, k) {
      e.classList.add('apare');
      e.style.transitionDelay = (Array.prototype.indexOf.call(e.parentNode.children, e) % 6) * 90 + 'ms';
      o.observe(e);
    });
  }

  function formular() {
    var f = document.getElementById('formular');
    var maxOcteti = (Number(C.marimeMaximaMB) || 20) * 1024 * 1024;
    var fisiere = [];
    var zona = f.querySelector('.zona-fisiere');
    var intrare = f.querySelector('#fisiere');
    var lista = f.querySelector('.lista-fisiere');
    var total = f.querySelector('.total-fisiere');
    var mesaj = document.getElementById('mesaj');

    f.querySelector('[data-max-mb]').textContent = (Number(C.marimeMaximaMB) || 20) + ' MB';

    function marime(o) { return o < 1024 * 1024 ? Math.max(1, Math.round(o / 1024)) + ' KB' : (o / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }
    function suma() { return fisiere.reduce(function (s, x) { return s + x.size; }, 0); }

    function arata() {
      lista.innerHTML = '';
      fisiere.forEach(function (x, i) {
        var li = document.createElement('li');
        li.innerHTML = '<span>📄 ' + esc(x.name) + ' · ' + marime(x.size) + '</span><button type="button">Elimină</button>';
        li.querySelector('button').addEventListener('click', function () { fisiere.splice(i, 1); arata(); });
        lista.appendChild(li);
      });
      total.textContent = fisiere.length ? fisiere.length + (fisiere.length === 1 ? ' fișier' : ' fișiere') + ', ' + marime(suma()) + ' din ' + marime(maxOcteti) : '';
    }

    function adauga(noi) {
      var respinse = [];
      Array.prototype.forEach.call(noi, function (x) {
        var ePdf = /\.pdf$/i.test(x.name) || x.type === 'application/pdf';
        if (!ePdf) { respinse.push(x.name + ' (nu este PDF)'); return; }
        if (fisiere.some(function (y) { return y.name === x.name && y.size === x.size; })) return;
        if (suma() + x.size > maxOcteti) { respinse.push(x.name + ' (se depășește limita totală)'); return; }
        fisiere.push(x);
      });
      arata();
      seteazaEroare('fisiere', respinse.length ? 'Nu am adăugat: ' + respinse.join('; ') + '.' : '');
    }

    zona.addEventListener('click', function () { intrare.click(); });
    zona.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); intrare.click(); } });
    intrare.addEventListener('change', function () { adauga(intrare.files); intrare.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.add('peste'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.remove('peste'); }); });
    zona.addEventListener('drop', function (e) { if (e.dataTransfer) adauga(e.dataTransfer.files); });

    function seteazaEroare(nume, text) {
      var c = f.querySelector('[data-pentru="' + nume + '"]');
      if (!c) return;
      c.classList.toggle('gresit', !!text);
      var e = c.querySelector(':scope > .eroare') || c.querySelector('.eroare');
      if (e && text) e.textContent = text;
    }

    // Plata: cu cardul (confirmată la întoarcerea de pe pagina procesatorului) sau prin transfer (cu dovada plății)
    var CHEIE_PLATA = 'mandat-digital-plata-card';
    var buton = f.querySelector('button[type=submit]');
    var lacat = document.getElementById('lacat');
    var dovada = f.querySelector('#dovada');
    var linkCard = document.getElementById('plateste-card');
    function citeste(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function scrie(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* fără memorie locală */ } }
    if (/[?&]plata=reusita\b/.test(location.search)) {
      scrie(CHEIE_PLATA, String(Date.now()));
      afiseazaSus('<b>Plata cu cardul a fost înregistrată.</b> Dacă formularul este deschis în altă fereastră, revino la ea: butonul „Trimite actele” s-a deblocat.');
    }
    function cardPlatit() {
      var t = Number(citeste(CHEIE_PLATA));
      return t > 0 && Date.now() - t < 12 * 3600 * 1000;
    }
    // Onorariul de consultație: 300 lei; pentru probleme juridice din afara țării, 70 €
    function strainatate() { return /afara țării/.test(f.elements.domeniu.value); }
    function taxaText() { return strainatate() ? C.taxaStrainatateEuro + ' €' : C.taxaAnaliza + ' lei'; }
    function actualizeazaTaxa() {
      Array.prototype.forEach.call(document.querySelectorAll('[data-taxa]'), function (el) { el.textContent = taxaText(); });
      var link = strainatate() ? C.plataLinkEuro : C.plataLink;
      if (link) { linkCard.href = link; linkCard.innerHTML = 'Achită <span data-taxa>' + esc(taxaText()) + '</span> online'; }
      else { linkCard.removeAttribute('href'); linkCard.innerHTML = 'Achitarea online: ' + lipsa('link de plată NETOPIA'); }
      // Fără link de plată, opțiunea online nu se arată; rămâne transferul, ales direct.
      var card = f.querySelector('input[name=metoda][value=card]'), transfer = f.querySelector('input[name=metoda][value=transfer]');
      card.closest('.metoda').hidden = !link;
      if (!link) { if (card.checked) card.checked = false; transfer.checked = true; }
      if (typeof stare === 'function') stare();
    }
    f.elements.domeniu.addEventListener('change', actualizeazaTaxa);
    actualizeazaTaxa();
    function metoda() { var m = f.querySelector('input[name=metoda]:checked'); return m ? m.value : ''; }
    function dovadaBuna() {
      var x = dovada.files && dovada.files[0];
      return !!x && /\.(pdf|jpe?g|png)$/i.test(x.name) && x.size <= 10 * 1024 * 1024;
    }
    function platit() {
      var m = metoda();
      return (m === 'card' && cardPlatit()) || (m === 'transfer' && dovadaBuna());
    }
    function stare() {
      var m = metoda();
      Array.prototype.forEach.call(f.querySelectorAll('[data-pentru-metoda]'), function (d) { d.hidden = d.getAttribute('data-pentru-metoda') !== m; });
      Array.prototype.forEach.call(f.querySelectorAll('.metoda'), function (l) { l.classList.toggle('aleasa', l.querySelector('input').checked); });
      var sc = document.getElementById('stare-card');
      sc.textContent = cardPlatit() ? '✓ Plata cu cardul este confirmată.' : 'Plata nu este încă confirmată.';
      sc.classList.toggle('confirmata', cardPlatit());
      var ok = platit();
      buton.disabled = !ok;
      lacat.textContent = ok ? 'Plata este în regulă. Poți trimite actele.' : (m === 'transfer' ? 'Încarcă dovada plății ca să poți trimite.' : m === 'card' ? 'Plătește cu cardul ca să poți trimite.' : 'Alege modul de plată. Butonul se activează după plată.');
      lacat.classList.toggle('deblocat', ok);
      var nume = (f.elements.nume.value || '').trim();
      document.getElementById('detalii-nume').textContent = nume || 'numele tău';
    }
    Array.prototype.forEach.call(f.querySelectorAll('input[name=metoda]'), function (r) { r.addEventListener('change', stare); });
    dovada.addEventListener('change', function () {
      seteazaEroare('dovada', dovada.files[0] && !dovadaBuna() ? 'Dovada trebuie să fie PDF, JPG sau PNG, de cel mult 10 MB.' : '');
      stare();
    });
    f.elements.nume.addEventListener('input', stare);
    window.addEventListener('storage', function (e) { if (e.key === CHEIE_PLATA) stare(); });
    window.addEventListener('focus', stare);
    stare();

    function afiseazaSus(html) {
      var d = document.createElement('div');
      d.className = 'mesaj vizibil bun';
      d.innerHTML = html;
      f.parentNode.insertBefore(d, f);
    }

    function bifate(nume) {
      return Array.prototype.map.call(f.querySelectorAll('input[name=' + nume + ']:checked'), function (x) { return x.value; });
    }

    function verifica() {
      var bune = true, primul = null;
      function regula(nume, conditie, text) {
        if (!conditie) { seteazaEroare(nume, text); bune = false; primul = primul || f.querySelector('[data-pentru="' + nume + '"]'); }
        else seteazaEroare(nume, '');
      }
      var v = function (n) { return (f.elements[n] && f.elements[n].value || '').trim(); };
      regula('nume', v('nume').length >= 3, 'Scrie numele și prenumele.');
      regula('telefon', /^[+\d][\d\s().-]{8,}$/.test(v('telefon')), 'Scrie un număr de telefon valid.');
      regula('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')), 'Scrie o adresă de e-mail validă.');
      regula('comunicare', !!f.querySelector('input[name=comunicare]:checked'), 'Alege cum putem comunica.');
      regula('domeniu', !!v('domeniu'), 'Alege domeniul (sau „Nu știu”).');
      regula('descriere', v('descriere').length >= 30, 'Descrie problema în câteva fraze (cel puțin 30 de caractere).');
      regula('zile', bifate('zile').length > 0, 'Alege cel puțin o zi în care te pot suna.');
      regula('ore', bifate('ore').length > 0, 'Alege cel puțin un interval orar.');
      regula('fisiere', fisiere.length > 0, 'Adaugă cel puțin un act în format PDF.');
      regula('acorduri', f.elements.gdpr.checked && f.elements.termeni.checked, 'Pentru a trimite actele, bifează ambele acorduri.');
      regula('plata', platit(), 'Achită onorariul de consultație (' + taxaText() + ') înainte de trimitere.');
      if (primul) primul.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return bune;
    }

    function afiseaza(fel, html) {
      mesaj.className = 'mesaj vizibil ' + fel;
      mesaj.innerHTML = html;
      mesaj.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function disponibil() {
      var alte = (f.elements.disponibilitate.value || '').trim();
      return bifate('zile').join(', ') + '; ' + bifate('ore').join(', ') + (alte ? '; ' + alte : '');
    }
    function textPlata() {
      return metoda() === 'card' ? 'card bancar, online (confirmată pe site la ' + new Date(Number(citeste(CHEIE_PLATA))).toLocaleString('ro-RO') + ')' : 'transfer bancar (dovada atașată: ' + (dovada.files[0] ? dovada.files[0].name : '-') + ')';
    }

    function textEmail() {
      var v = function (n) { return (f.elements[n] && f.elements[n].value || '').trim(); };
      var com = f.querySelector('input[name=comunicare]:checked');
      return [
        'Nume: ' + v('nume'),
        'Telefon: ' + v('telefon'),
        'E-mail: ' + v('email'),
        'Localitatea / județul: ' + v('localitate'),
        'Comunicare: ' + (com ? com.value : ''),
        'Disponibilitate: ' + disponibil(),
        'Domeniul: ' + v('domeniu'),
        'Dosar existent: ' + (v('dosar') || '-'),
        'Termen care curge sau dată importantă: ' + (v('termen') || '-'),
        '',
        'Descrierea problemei:',
        v('descriere'),
        '',
        'Acte (le atașez la acest e-mail): ' + fisiere.map(function (x) { return x.name; }).join(', '),
        'Onorariul de consultație (' + taxaText() + '): ' + textPlata(),
        '',
        'Am citit Politica de confidențialitate și sunt de acord cu Termenii și condițiile.'
      ].join('\n');
    }

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements.site && f.elements.site.value) return; // capcană pentru roboți
      if (!verifica()) return;

      if (!C.trimitereAdresa) {
        // Fără serviciu de trimitere: datele pleacă prin e-mailul clientului, iar actele se atașează de mână.
        if (!C.email) {
          afiseaza('atentie', '<b>Formularul nu este încă activ.</b> Lipsește adresa de e-mail a cabinetului din <code>date-cabinet.js</code>.');
          return;
        }
        var link = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Mandat digital: ' + f.elements.nume.value.trim()) + '&body=' + encodeURIComponent(textEmail());
        afiseaza('atentie',
          '<b>Mai ai un singur pas.</b> Se deschide e-mailul tău, cu datele deja scrise. ' +
          '<b>Atașează la el actele PDF</b> (' + fisiere.length + ')' + (metoda() === 'transfer' ? ' <b>și dovada plății</b>' : '') + ', apoi apasă „Trimite”.' +
          '<br><a class="buton buton-principal" style="margin-top:14px" href="' + esc(link) + '">Deschide e-mailul</a>');
        window.location.href = link;
        return;
      }

      var campuri = [];
      ['nume', 'telefon', 'email', 'localitate', 'domeniu', 'dosar', 'termen', 'descriere'].forEach(function (n) { campuri.push([n, f.elements[n].value.trim()]); });
      campuri.push(['comunicare', f.querySelector('input[name=comunicare]:checked').value]);
      campuri.push(['disponibilitate', disponibil()]);
      campuri.push(['plata', taxaText() + ', ' + textPlata()]);
      campuri.push(['acorduri', 'confidentialitate + termeni, ' + new Date().toISOString()]);
      var atasamente = fisiere.map(function (x) { return ['acte', x, x.name]; });
      if (metoda() === 'transfer' && dovada.files[0]) atasamente.push(['dovada_platii', dovada.files[0], 'Dovada plății - ' + dovada.files[0].name]);

      buton.disabled = true; buton.textContent = 'Se trimit actele…';
      trimiteLaCabinet('Mandat digital: ' + f.elements.nume.value.trim(), textEmail().replace('(le atașez la acest e-mail)', '(atașate)'), campuri, atasamente, f.elements.email.value.trim())
        .then(function () {
          f.reset(); fisiere = []; arata();
          try { window.localStorage.removeItem(CHEIE_PLATA); } catch (er) { /* nimic */ }
          afiseaza('bun', '<b>Am primit actele, prin e-mail. Mulțumesc!</b> Le studiez și iau legătura cu tine în timp util.');
        })
        .catch(function () {
          afiseaza('rau', '<b>Actele nu au putut fi trimise.</b> Verifică legătura la internet și încearcă din nou' +
            (C.email ? ', sau scrie-mi la <a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a>.' : '.'));
        })
        .then(function () { buton.textContent = 'Trimite actele'; stare(); });
    });
  }
})();
