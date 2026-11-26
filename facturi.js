'use strict';
/* Facturi e-Factura: registrul facturilor emise și primite, legat de SPV.
   - Import: fișierele descărcate din SPV (arhiva .zip a mesajului sau fișierul .xml UBL 2.1) se citesc automat:
     număr, dată, emitent, client, sume, TVA, linii. Emisă/primită se stabilește după CIF-ul cabinetului.
   - Emitere: factura se completează în aplicație; rezultă fișierul XML (UBL 2.1, profil CIUS-RO) de încărcat în SPV
     și varianta de tipărit/PDF, de semnat electronic.
   - Încasarea/plata unei facturi creează automat rândul din registrul de încasări și plăți.
   Preluarea direct din SPV, fără descărcare, cere înregistrarea unei aplicații la ANAF (OAuth, cu certificat digital
   calificat) – nu este făcută încă. */

const FACT_STARI = {
  ciorna: ['Ciornă', 'u4'],
  semnata: ['Semnată', 'u3'],
  trimisa: ['Încărcată în SPV', 'u2'],
  validata: ['Validată în SPV', 'ok'],
  respinsa: ['Respinsă de SPV', 'u1'],
  spv: ['Preluată din SPV', 'ok'],
};
const JUDETE = [['AB', 'Alba'], ['AR', 'Arad'], ['AG', 'Argeș'], ['BC', 'Bacău'], ['BH', 'Bihor'], ['BN', 'Bistrița-Năsăud'], ['BT', 'Botoșani'], ['BV', 'Brașov'], ['BR', 'Brăila'], ['B', 'București'], ['BZ', 'Buzău'], ['CS', 'Caraș-Severin'], ['CL', 'Călărași'], ['CJ', 'Cluj'], ['CT', 'Constanța'], ['CV', 'Covasna'], ['DB', 'Dâmbovița'], ['DJ', 'Dolj'], ['GL', 'Galați'], ['GR', 'Giurgiu'], ['GJ', 'Gorj'], ['HR', 'Harghita'], ['HD', 'Hunedoara'], ['IL', 'Ialomița'], ['IS', 'Iași'], ['IF', 'Ilfov'], ['MM', 'Maramureș'], ['MH', 'Mehedinți'], ['MS', 'Mureș'], ['NT', 'Neamț'], ['OT', 'Olt'], ['PH', 'Prahova'], ['SM', 'Satu Mare'], ['SJ', 'Sălaj'], ['SB', 'Sibiu'], ['SV', 'Suceava'], ['TR', 'Teleorman'], ['TM', 'Timiș'], ['TL', 'Tulcea'], ['VS', 'Vaslui'], ['VL', 'Vâlcea'], ['VN', 'Vrancea']];
const PLATA_COD = { transfer: ['42', 'Transfer bancar'], numerar: ['10', 'Numerar'], card: ['48', 'Card'] };

const cifCifre = s => String(s || '').replace(/\D/g, '');
const fnum = x => Number(String(x ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);

/* ---------- citirea fișierelor din SPV ---------- */
// Arhiva .zip din SPV conține factura (XML UBL) și semnătura ANAF; se extrag fișierele .xml.
async function zipXmluri(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), out = [];
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Arhiva nu poate fi citită.');
  let p = v.getUint32(eocd + 16, true);
  const n = v.getUint16(eocd + 10, true);
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metoda = v.getUint16(p + 10, true), comp = v.getUint32(p + 20, true);
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), loc = v.getUint32(p + 42, true);
    const nume = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + ln));
    p += 46 + ln + le + lc;
    if (!/\.xml$/i.test(nume)) continue;
    const start = loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true);
    const date = u8.subarray(start, start + comp);
    let text;
    if (metoda === 0) text = new TextDecoder().decode(date);
    else if (metoda === 8) text = await new Response(new Blob([date]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    else continue;
    out.push({ nume, text });
  }
  return out;
}

const xEl = (rad, ...cale) => {
  let el = rad;
  for (const nume of cale) {
    el = el && [...el.children].find(c => c.localName === nume);
    if (!el) return null;
  }
  return el;
};
const xTxt = (rad, ...cale) => xEl(rad, ...cale)?.textContent.trim() || '';

function parteDinXml(party) {
  if (!party) return {};
  return {
    nume: xTxt(party, 'PartyLegalEntity', 'RegistrationName') || xTxt(party, 'PartyName', 'Name'),
    cif: xTxt(party, 'PartyTaxScheme', 'CompanyID') || xTxt(party, 'PartyLegalEntity', 'CompanyID') || xTxt(party, 'PartyIdentification', 'ID'),
    adresa: [xTxt(party, 'PostalAddress', 'StreetName'), xTxt(party, 'PostalAddress', 'CityName')].filter(Boolean).join(', '),
    judet: xTxt(party, 'PostalAddress', 'CountrySubentity').replace(/^RO-/, ''),
  };
}

// Factura din XML-ul UBL (Invoice sau CreditNote)
function facturaDinXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const rad = doc.documentElement;
  if (!rad || !['Invoice', 'CreditNote'].includes(rad.localName)) return null;
  const storno = rad.localName === 'CreditNote';
  const emitent = parteDinXml(xEl(rad, 'AccountingSupplierParty', 'Party'));
  const client = parteDinXml(xEl(rad, 'AccountingCustomerParty', 'Party'));
  const tot = xEl(rad, 'LegalMonetaryTotal');
  const linii = [...rad.children].filter(c => c.localName === (storno ? 'CreditNoteLine' : 'InvoiceLine')).map(l => ({
    den: xTxt(l, 'Item', 'Name'),
    cant: fnum(xTxt(l, storno ? 'CreditedQuantity' : 'InvoicedQuantity')) || 1,
    pret: fnum(xTxt(l, 'Price', 'PriceAmount')),
    valoare: fnum(xTxt(l, 'LineExtensionAmount')),
  }));
  const semn = storno ? -1 : 1;
  return {
    numar: xTxt(rad, 'ID'),
    data: xTxt(rad, 'IssueDate'),
    scadenta: xTxt(rad, 'DueDate') || xTxt(rad, 'PaymentMeans', 'PaymentDueDate'),
    moneda: xTxt(rad, 'DocumentCurrencyCode') || 'RON',
    storno,
    emitent, client, linii,
    faraTva: semn * fnum(xTxt(tot, 'TaxExclusiveAmount')),
    tva: semn * fnum(xTxt(xEl(rad, 'TaxTotal'), 'TaxAmount')),
    total: semn * fnum(xTxt(tot, 'PayableAmount') || xTxt(tot, 'TaxInclusiveAmount')),
    descriere: linii.map(l => l.den).filter(Boolean).join('; ').slice(0, 300),
  };
}

async function importaFacturi(fisiere) {
  const cifCab = cifCifre(dateCabinet().cif);
  let noi = 0, actualizate = 0, ignorate = 0;
  for (const f of fisiere) {
    let xmluri = [];
    try {
      if (/\.zip$/i.test(f.name)) xmluri = await zipXmluri(await f.arrayBuffer());
      else xmluri = [{ nume: f.name, text: await f.text() }];
    } catch { ignorate++; continue; }
    for (const x of xmluri) {
      const fa = facturaDinXml(x.text);
      if (!fa) continue;
      const tip = cifCifre(fa.emitent.cif) === cifCab ? 'emisa' : 'primita';
      const partener = tip === 'emisa' ? fa.client : fa.emitent;
      const idSpv = (f.name.match(/\d{6,}/) || [''])[0];
      const exista = S.facturi.find(z => z.tip === tip && z.numar === fa.numar && cifCifre(z.partener?.cif) === cifCifre(partener.cif));
      const rec = { ...(exista || {}), tip, numar: fa.numar, data: fa.data, scadenta: fa.scadenta, moneda: fa.moneda, storno: fa.storno, partener, linii: fa.linii, faraTva: fa.faraTva, tva: fa.tva, total: fa.total, descriere: fa.descriere, xml: x.text, stare: tip === 'emisa' ? 'validata' : 'spv', idSpv: idSpv || exista?.idSpv || '' };
      await save('facturi', rec);
      if (exista) actualizate++; else noi++;
    }
  }
  toast(`Facturi preluate: ${noi} noi${actualizate ? `, ${actualizate} actualizate` : ''}${ignorate ? `, ${ignorate} fișiere necitite` : ''}.`);
  rerender();
}

/* ---------- emiterea facturii ---------- */
// Seria implicită a cabinetului și primul număr emis din aplicație (factura 0001 a fost emisă înainte)
const SERIE_IMPLICITA = 'AVIS', PRIMUL_NUMAR = 2;
function urmatorulNumar(serie) {
  const nr = S.facturi.filter(f => f.tip === 'emisa' && (f.serie || '') === serie).map(f => parseInt(String(f.nr || '').replace(/\D/g, ''), 10) || 0);
  const start = serie === SERIE_IMPLICITA ? Number(setting('facturaStart', PRIMUL_NUMAR)) || PRIMUL_NUMAR : 1;
  return String(Math.max(start, (nr.length ? Math.max(...nr) : 0) + 1)).padStart(4, '0');
}

function facturaForm(f = {}) {
  const cab = dateCabinet();
  const serie = f.serie ?? setting('facturaSerie', SERIE_IMPLICITA);
  const linie = f.linii?.[0] || {};
  openForm({
    title: f.id ? `Factura ${f.numar}` : 'Factură nouă',
    intro: 'Cabinet neplătitor de TVA. Din factură rezultă fișierul XML pentru SPV (e-Factura) și varianta de tipărit, de semnat electronic. Verificați fișierul cu validatorul ANAF înainte de încărcare. Termenul de transmitere: 5 zile lucrătoare de la emitere.',
    values: {
      tip: f.tip || 'emisa', serie, nr: f.nr || urmatorulNumar(serie), data: f.data || today(), scadenta: f.scadenta || '',
      pNume: f.partener?.nume || '', pCif: f.partener?.cif || '', pAdresa: f.partener?.adresa || '', pOras: f.partener?.oras || '', pJudet: f.partener?.judet || 'AG',
      den: linie.den || 'Onorariu asistență juridică', cant: linie.cant || 1, pret: linie.pret ?? '', tvaRegim: 'O',
      plata: f.plata || 'transfer', clientId: f.clientId || '', caseId: f.caseId || '', obs: f.obs || '', stare: f.stare || 'ciorna', idSpv: f.idSpv || '',
    },
    fields: [
      { name: 'tip', label: 'Tip', type: 'select', options: [['emisa', 'Emisă de cabinet'], ['primita', 'Primită (cheltuială)']] },
      { name: 'stare', label: 'Stare', type: 'select', options: Object.entries(FACT_STARI).map(([k, v]) => [k, v[0]]) },
      { name: 'serie', label: 'Serie', placeholder: 'ex. AIS' },
      { name: 'nr', label: 'Număr', required: true },
      { name: 'data', label: 'Data emiterii', type: 'date', required: true },
      { name: 'scadenta', label: 'Scadența', type: 'date' },
      { name: 'pNume', label: 'Client / furnizor', required: true, wide: true },
      { name: 'pCif', label: 'CIF sau CNP', hint: 'Persoană fizică fără CNP comunicat: 0000000000000 (13 zerouri).' },
      { name: 'pJudet', label: 'Județ', type: 'select', options: JUDETE.map(([c, n]) => [c, n]) },
      { name: 'pOras', label: 'Localitatea', required: true, hint: 'În București: SECTOR1 … SECTOR6.' },
      { name: 'pAdresa', label: 'Adresa (strada, numărul)', required: true },
      { name: 'den', label: 'Serviciul facturat', wide: true, required: true },
      { name: 'cant', label: 'Cantitate', type: 'number', min: 0 },
      { name: 'pret', label: 'Preț unitar (lei)', type: 'number', min: 0, required: true },
      { name: 'plata', label: 'Modalitatea de plată', type: 'select', options: Object.entries(PLATA_COD).map(([k, v]) => [k, v[1]]) },
      { name: 'clientId', label: 'Client din aplicație', type: 'select', options: [['', '—'], ...S.clients.map(c => [c.id, c.name])] },
      { name: 'caseId', label: 'Dosar', type: 'select', options: [['', '—'], ...S.cases.map(c => [c.id, c.number || c.object || 'dosar'])] },
      { name: 'idSpv', label: 'Index de încărcare / ID descărcare SPV' },
      { name: 'obs', label: 'Mențiuni', type: 'textarea', wide: true, rows: 2 },
    ],
    onSave: async v => {
      const cant = Number(v.cant) || 1, pret = Number(v.pret) || 0, faraTva = Math.round(cant * pret * 100) / 100;
      const cota = 0, tva = 0;
      const rec = {
        ...f, tip: v.tip, stare: v.stare, serie: v.serie, nr: v.nr, numar: [v.serie, v.nr].filter(Boolean).join(' '), data: v.data, scadenta: v.scadenta, moneda: 'RON',
        partener: { nume: v.pNume, cif: v.pCif, adresa: v.pAdresa, oras: v.pOras, judet: v.pJudet },
        linii: [{ den: v.den, cant, pret, valoare: faraTva }], tvaRegim: 'O', cota, faraTva, tva, total: faraTva + tva,
        descriere: v.den, plata: v.plata, clientId: v.clientId, caseId: v.caseId, idSpv: v.idSpv, obs: v.obs,
      };
      if (v.serie) await setSetting('facturaSerie', v.serie);
      if (rec.tip === 'emisa') rec.xml = facturaXml(rec, cab);
      await save('facturi', rec);
      await sincronizeazaRegistru(rec);
    },
    onDelete: f.id ? async () => { if (f.ledgerId) await remove('ledger', f.ledgerId); await remove('facturi', f.id); } : null,
  });
}

const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Fișierul XML UBL 2.1, profil CIUS-RO
function facturaXml(f, cab) {
  const cur = f.moneda || 'RON', am = n => `currencyID="${cur}">${f2(n)}`;
  const cat = f.tvaRegim === 'S' ? 'S' : 'O';
  const taxCat = inner => `<cac:TaxCategory><cbc:ID>${cat}</cbc:ID>${inner}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>`;
  const adresa = (strada, oras, judet) => `<cac:PostalAddress>${strada ? `<cbc:StreetName>${xe(strada)}</cbc:StreetName>` : ''}<cbc:CityName>${xe(oras || '-')}</cbc:CityName><cbc:CountrySubentity>RO-${xe(judet || 'AG')}</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>RO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`;
  const cifCab = cifCifre(cab.cif);
  const vanzatorTva = cat === 'S' ? `<cac:PartyTaxScheme><cbc:CompanyID>RO${cifCab}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : '';
  const l = f.linii?.[0] || {};
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
<cbc:ID>${xe(f.numar)}</cbc:ID>
<cbc:IssueDate>${xe(f.data)}</cbc:IssueDate>
${f.scadenta ? `<cbc:DueDate>${xe(f.scadenta)}</cbc:DueDate>\n` : ''}<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
${f.obs ? `<cbc:Note>${xe(f.obs)}</cbc:Note>\n` : ''}<cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty><cac:Party>${adresa(cab.strada || cab.sediu, cab.localitate || 'Albeștii de Argeș', cab.judet || 'AG')}${vanzatorTva}<cac:PartyLegalEntity><cbc:RegistrationName>${xe(cab.denumireOficiala || cab.denumire)}</cbc:RegistrationName><cbc:CompanyID>${xe(cifCab)}</cbc:CompanyID></cac:PartyLegalEntity>${cab.email || cab.telefon ? `<cac:Contact>${cab.telefon ? `<cbc:Telephone>${xe(cab.telefon)}</cbc:Telephone>` : ''}${cab.email ? `<cbc:ElectronicMail>${xe(cab.email)}</cbc:ElectronicMail>` : ''}</cac:Contact>` : ''}</cac:Party></cac:AccountingSupplierParty>
<cac:AccountingCustomerParty><cac:Party>${adresa(f.partener.adresa, f.partener.oras, f.partener.judet)}<cac:PartyLegalEntity><cbc:RegistrationName>${xe(f.partener.nume)}</cbc:RegistrationName>${f.partener.cif ? `<cbc:CompanyID>${xe(f.partener.cif)}</cbc:CompanyID>` : ''}</cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
<cac:PaymentMeans><cbc:PaymentMeansCode>${(PLATA_COD[f.plata] || PLATA_COD.transfer)[0]}</cbc:PaymentMeansCode>${f.plata === 'transfer' && cab.iban ? `<cac:PayeeFinancialAccount><cbc:ID>${xe(cab.iban.replace(/\s/g, ''))}</cbc:ID></cac:PayeeFinancialAccount>` : ''}</cac:PaymentMeans>
<cac:TaxTotal><cbc:TaxAmount ${am(f.tva)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount ${am(f.faraTva)}</cbc:TaxableAmount><cbc:TaxAmount ${am(f.tva)}</cbc:TaxAmount>${taxCat(cat === 'S' ? `<cbc:Percent>${f2(f.cota)}</cbc:Percent>` : '<cbc:TaxExemptionReasonCode>VATEX-EU-O</cbc:TaxExemptionReasonCode>')}</cac:TaxSubtotal></cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount ${am(f.faraTva)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount ${am(f.faraTva)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount ${am(f.total)}</cbc:TaxInclusiveAmount><cbc:PayableAmount ${am(f.total)}</cbc:PayableAmount></cac:LegalMonetaryTotal>
<cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">${xe(l.cant || 1)}</cbc:InvoicedQuantity><cbc:LineExtensionAmount ${am(f.faraTva)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${xe(l.den)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${cat}</cbc:ID>${cat === 'S' ? `<cbc:Percent>${f2(f.cota)}</cbc:Percent>` : ''}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount ${am(l.pret)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>
`;
}

// Varianta de tipărit (se salvează ca PDF din fereastra de tipărire, apoi se semnează electronic)
function facturaTiparire(f) {
  const cab = dateCabinet();
  const emitent = f.tip === 'emisa' ? { nume: cab.denumireOficiala || cab.denumire, cif: cab.cif, adresa: cab.sediu } : f.partener;
  const client = f.tip === 'emisa' ? f.partener : { nume: cab.denumireOficiala || cab.denumire, cif: cab.cif, adresa: cab.sediu };
  const w = window.open('', '_blank');
  if (!w) return toast('Permiteți ferestrele noi (pop-up) pentru a tipări factura.');
  w.document.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Factura ${h(f.numar)}</title>
  <style>body{font:14px/1.5 Georgia,serif;color:#111;margin:40px}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #999;padding:6px 8px;text-align:left}td.n,th.n{text-align:right}.cols{display:flex;gap:40px}.cols div{flex:1}.mic{font-size:12px;color:#444}</style></head><body>
  <h1>FACTURĂ${f.storno ? ' (STORNO)' : ''} nr. ${h(f.numar)}</h1><div>Data: ${h(fmtDate(f.data))}${f.scadenta ? ' · Scadența: ' + h(fmtDate(f.scadenta)) : ''}</div>
  <div class="cols" style="margin-top:18px"><div><b>Furnizor</b><br>${h(emitent.nume)}<br>CIF: ${h(emitent.cif || '')}<br>${h(emitent.adresa || '')}${f.tip === 'emisa' && cab.iban ? `<br>IBAN: ${h(cab.iban)}<br>${h(cab.banca || '')}` : ''}</div>
  <div><b>Client</b><br>${h(client.nume)}<br>CIF/CNP: ${h(client.cif || '')}<br>${h([client.adresa, client.oras].filter(Boolean).join(', '))}</div></div>
  <table><thead><tr><th>Nr.</th><th>Denumire</th><th class="n">Cant.</th><th class="n">Preț unitar</th><th class="n">Valoare</th></tr></thead><tbody>
  ${(f.linii || []).map((l, i) => `<tr><td>${i + 1}</td><td>${h(l.den)}</td><td class="n">${h(l.cant)}</td><td class="n">${f2(l.pret)}</td><td class="n">${f2(l.valoare ?? l.cant * l.pret)}</td></tr>`).join('')}
  </tbody></table>
  <div style="text-align:right">Total fără TVA: <b>${f2(f.faraTva)} ${h(f.moneda || 'RON')}</b><br>TVA: <b>${f2(f.tva)}</b>${f.tvaRegim === 'O' ? ' (neplătitor de TVA)' : ''}<br>Total de plată: <b>${f2(f.total)} ${h(f.moneda || 'RON')}</b></div>
  ${f.obs ? `<p class="mic">${h(f.obs)}</p>` : ''}
  <p class="mic">Factura electronică este transmisă prin sistemul RO e-Factura.</p>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

/* ---------- legătura cu registrul de încasări și plăți ---------- */
async function sincronizeazaRegistru(f) {
  const achitata = !!f.achitata;
  const leg = f.ledgerId ? byId('ledger', f.ledgerId) : null;
  if (!achitata) {
    if (leg) { await remove('ledger', leg.id); delete f.ledgerId; await save('facturi', f); }
    return;
  }
  const mod = f.modalitateAchitare || (f.plata === 'numerar' ? 'numerar' : 'banca');
  const rand = {
    ...(leg || {}), type: f.tip === 'emisa' ? 'incasare' : 'plata', date: f.dataAchitare || f.data, amount: Math.abs(f.total),
    modalitate: mod, method: mod === 'numerar' ? 'Numerar' : 'Bancă', docFel: 'Factură', docNo: f.numar,
    description: `${f.tip === 'emisa' ? 'Încasare' : 'Plată'} factura ${f.numar} – ${f.partener?.nume || ''}`.trim(),
    clientId: f.clientId || '', caseId: f.caseId || '', facturaId: f.id,
  };
  if (rand.type === 'plata') rand.deductibil = leg?.deductibil || 'da';
  const s = await save('ledger', rand);
  if (f.ledgerId !== s.id) { f.ledgerId = s.id; await save('facturi', f); }
}

// „Încasată?” / „Plătită?”: se alege data și modalitatea, apoi factura intră în registrul-jurnal
async function marcheazaAchitata(id) {
  const f = byId('facturi', id);
  if (!f) return;
  if (f.achitata) {
    if (!confirm(`Scoateți ${f.tip === 'emisa' ? 'încasarea' : 'plata'} facturii ${f.numar} din registrul-jurnal?`)) return;
    f.achitata = false; f.dataAchitare = '';
    await save('facturi', f);
    await sincronizeazaRegistru(f);
    toast('Scoasă din registru.');
    return rerender();
  }
  openForm({
    title: `${f.tip === 'emisa' ? 'Încasare' : 'Plată'} factura ${f.numar}`,
    intro: `Se adaugă în registrul-jurnal ${f.tip === 'emisa' ? 'o încasare' : 'o plată'} de ${money(Math.abs(f.total))}.`,
    values: { data: today(), modalitate: f.plata === 'numerar' ? 'numerar' : 'banca' },
    fields: [
      { name: 'data', label: f.tip === 'emisa' ? 'Data încasării' : 'Data plății', type: 'date', required: true },
      { name: 'modalitate', label: 'Numerar sau bancă', type: 'select', options: [['banca', 'Bancă'], ['numerar', 'Numerar']] },
    ],
    submit: 'Trece în registru',
    onSave: async v => {
      Object.assign(f, { achitata: true, dataAchitare: v.data, modalitateAchitare: v.modalitate });
      await save('facturi', f);
      await sincronizeazaRegistru(f);
    },
  });
}

/* ---------- pagina ---------- */
function viewFacturi() {
  const y = String(UI.factAn || new Date().getFullYear());
  const ani = [...new Set([new Date().getFullYear(), ...S.facturi.map(f => Number((f.data || '').slice(0, 4)) || new Date().getFullYear())])].sort((a, b) => b - a);
  const lista = S.facturi.filter(f => (f.data || '').startsWith(y) && (!UI.factTip || f.tip === UI.factTip)).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const an = S.facturi.filter(f => (f.data || '').startsWith(y));
  const sum = (arr, k = 'total') => arr.reduce((s, f) => s + (Number(f[k]) || 0), 0);
  const emise = an.filter(f => f.tip === 'emisa'), primite = an.filter(f => f.tip === 'primita');
  const deIncasat = emise.filter(f => !f.achitata), dePlatit = primite.filter(f => !f.achitata);
  const restante = [...deIncasat, ...dePlatit].filter(f => f.scadenta && f.scadenta < today());
  return `
  <div class="toolbar">
    <select data-filter="factAn">${ani.map(v => `<option value="${v}" ${String(v) === y ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <select data-filter="factTip"><option value="">Toate facturile</option><option value="emisa" ${UI.factTip === 'emisa' ? 'selected' : ''}>Emise</option><option value="primita" ${UI.factTip === 'primita' ? 'selected' : ''}>Primite</option></select>
    <span class="spacer"></span>
    <label class="btn">⇪ Preia din SPV (.zip / .xml)<input type="file" accept=".zip,.xml" multiple data-xml-import hidden></label>
    <button class="btn primary" data-act="newFactura">＋ Factură nouă</button>
  </div>
  <div class="stats">
    <div class="stat"><b>${money(sum(emise))}</b><span>facturat ${y} (${plural(emise.length, 'factură emisă', 'facturi emise')})</span></div>
    <div class="stat"><b>${money(sum(emise.filter(f => f.achitata)))}</b><span>încasat din facturi</span></div>
    <div class="stat ${deIncasat.length ? 'alert' : ''}"><b>${money(sum(deIncasat))}</b><span>de încasat (${deIncasat.length})</span></div>
    <div class="stat"><b>${money(sum(primite))}</b><span>facturi primite ${y} (${primite.length})</span></div>
    <div class="stat ${dePlatit.length ? 'alert' : ''}"><b>${money(sum(dePlatit))}</b><span>de plătit (${dePlatit.length})</span></div>
    ${sum(an, 'tva') ? `<div class="stat"><b>${money(sum(emise, 'tva'))} / ${money(sum(primite, 'tva'))}</b><span>TVA colectată / deductibilă</span></div>` : ''}
  </div>
  ${restante.length ? `<div class="callout danger" style="margin-bottom:14px"><b>${plural(restante.length, 'factură', 'facturi')} cu scadența depășită:</b> ${restante.map(f => h(f.numar + ' – ' + (f.partener?.nume || ''))).join('; ')}</div>` : ''}
  <div class="card table-wrap">
    ${lista.length ? `<table><thead><tr><th>Data</th><th>Factura</th><th>Client / furnizor</th><th>Stare SPV</th><th class="num">Total</th><th>Achitată</th><th></th></tr></thead><tbody>
      ${lista.map(f => `<tr><td class="nowrap">${fmtDate(f.data, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
        <td><a href="#" data-act="editFactura" data-id="${f.id}"><b>${h(f.numar)}</b></a><br><span class="muted small">${f.tip === 'emisa' ? 'emisă' : 'primită'}${f.storno ? ' · storno' : ''}${f.idSpv ? ' · SPV ' + h(f.idSpv) : ''}</span></td>
        <td>${h(f.partener?.nume || '')}<br><span class="muted small">${h(f.partener?.cif || '')}${f.descriere ? ' · ' + h(f.descriere.slice(0, 60)) : ''}</span></td>
        <td><span class="pill ${(FACT_STARI[f.stare] || FACT_STARI.ciorna)[1]}">${(FACT_STARI[f.stare] || FACT_STARI.ciorna)[0]}</span>${f.tip === 'emisa' && ['ciorna', 'semnata'].includes(f.stare || 'ciorna') && f.data ? (() => { const t = adaugaZileLucratoare(f.data, 5), z = diffDays(today(), t); return `<br><span class="small ${z < 0 ? 'red' : 'muted'}">de trimis până la ${fmtDate(t, { day: 'numeric', month: 'short' })}${z < 0 ? ' – termen depășit' : ''}</span>`; })() : ''}</td>
        <td class="num">${money(f.total)}${f.tva ? `<br><span class="muted small">TVA ${money(f.tva)}</span>` : ''}</td>
        <td><button class="btn sm ${f.achitata ? '' : 'ghost'}" data-act="achitaFactura" data-id="${f.id}" title="Trece factura în registrul de încasări și plăți">${f.achitata ? '✓ ' + fmtShort(f.dataAchitare || f.data) : (f.tip === 'emisa' ? 'Încasată?' : 'Plătită?')}</button></td>
        <td class="nowrap"><button class="btn sm ghost" data-act="tiparesteFactura" data-id="${f.id}" title="Tipărire / PDF">PDF</button>${f.xml ? `<button class="btn sm ghost" data-act="xmlFactura" data-id="${f.id}" title="Descarcă fișierul XML e-Factura">XML</button>` : ''}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">Total ${y}${UI.factTip ? (UI.factTip === 'emisa' ? ' – emise' : ' – primite') : ''}</td><td class="num">${money(sum(lista))}</td><td colspan="2"></td></tr></tfoot></table>`
    : empty('Nicio factură în ' + y + '. Preluați facturile descărcate din SPV sau emiteți una nouă.')}
  </div>
  <div class="card">
    <h2>Cum lucrați cu SPV</h2>
    <ol class="steps">
      <li><b>Facturi primite și trimise:</b> în SPV, la e-Factura, descărcați mesajele (arhive .zip); apoi „Preia din SPV” și selectați-le pe toate odată. Aplicația citește automat numărul, data, partenerul, sumele și TVA și stabilește dacă factura e emisă sau primită (după CIF-ul cabinetului din Geamantan).</li>
      <li><b>Factură nouă:</b> „Factură nouă” → „PDF” pentru varianta de tipărit, pe care o semnați electronic (butonul websign de mai sus) → „XML” pentru fișierul e-Factura, pe care îl încărcați în SPV. Treceți apoi starea „Încărcată în SPV” și indexul de încărcare.</li>
      <li><b>Încasare / plată:</b> butonul „Încasată?” / „Plătită?” trece factura automat în registrul de încasări și plăți.</li>
    </ol>
    <div class="callout warn" style="margin-top:10px"><span class="pill u2">de verificat</span> Fișierul XML este generat după specificația UBL 2.1 / CIUS-RO; validați-l cu instrumentele ANAF înainte de încărcare. Pentru neplătitorii de TVA se folosește categoria „O” (în afara sferei TVA). Dacă trebuie emisă factură și transmisă în e-Factura pentru fiecare client depinde de regimul fiscal al cabinetului – confirmați cu contabilul. Preluarea automată direct din SPV, fără descărcare, cere înregistrarea unei aplicații la ANAF, cu certificatul digital calificat.</div>
  </div>`;
}

/* ---------- datele cabinetului (Geamantan) ---------- */
// Date publice ale cabinetului (aceleași ca pe www.avocatioanastoica.ro); se pot modifica din Geamantan.
const DATE_CABINET_IMPLICIT = {
  denumire: 'Cabinet individual de avocat Ioana Stoica',
  denumireOficiala: 'Av. Stoica Ioana – Cabinet de avocat',
  avocat: 'Ioana Stoica',
  barou: 'Baroul Argeș',
  decizie: 'nr. 66 din 25.10.2022 a Consiliului Baroului Argeș',
  cif: '29605442',
  sediu: 'comuna Albeștii de Argeș, sat Doblea nr. 12, județ Argeș',
  localitate: 'Albeștii de Argeș',
  judet: 'AG',
  telefon: '0775 137 882',
  email: 'ioanasaghel@gmail.com',
  site: 'www.avocatioanastoica.ro',
  iban: 'RO87BRDE030SV54798270300',
  banca: 'BRD – Groupe Société Générale, Agenția Curtea de Argeș',
  beneficiar: 'Av. Stoica Ioana – Cabinet de avocat',
  program: 'Luni–Vineri, 08:30–17:30',
  barouLink: 'https://barouarges.ro/avocat/ioana-stoica',
};
// Datele afișate în Geamantan, cu „Copiază”
const CAMPURI_CABINET = [
  ['denumireOficiala', 'Denumire oficială (contracte, facturi)'], ['decizie', 'Decizia de înființare'], ['cif', 'CIF'], ['sediu', 'Sediu'],
  ['telefon', 'Telefon'], ['email', 'E-mail'], ['site', 'Site'], ['iban', 'IBAN'],
];
const dateCabinet = () => ({ ...DATE_CABINET_IMPLICIT, ...(setting('cabinet', {}) || {}) });

function cabinetHtml() {
  const c = dateCabinet();
  return `<div class="card">
    <div class="card-head"><h2>Datele cabinetului</h2><button class="btn sm" data-act="copiazaCabinet">Copiază tot</button><button class="btn sm" data-act="editCabinet">Modifică</button></div>
    <div class="date-cabinet">${CAMPURI_CABINET.filter(([k]) => c[k]).map(([k, l]) => `<div class="dc-rand"><span class="muted small">${h(l)}</span><b>${h(c[k])}</b><button class="btn sm ghost" data-act="copiaza" data-text="${h(c[k])}" title="Copiază">⧉ Copiază</button></div>`).join('')}</div>
  </div>`;
}

function cabinetForm() {
  const c = dateCabinet();
  openForm({
    title: 'Datele cabinetului',
    values: c,
    fields: [...CAMPURI_CABINET.map(([k, l]) => ({ name: k, label: l, wide: ['denumireOficiala', 'decizie', 'sediu'].includes(k) })),
      { name: 'localitate', label: 'Localitatea (pentru e-Factura)' }, { name: 'judet', label: 'Județ', type: 'select', options: JUDETE }],
    onSave: v => setSetting('cabinet', v),
  });
}

function textCabinet() {
  const c = dateCabinet();
  return CAMPURI_CABINET.filter(([k]) => c[k]).map(([k, l]) => `${l}: ${c[k]}`).join('\n');
}

/* ---------- semnare electronică (websign) ---------- */
// Linkul, utilizatorul și parola se păstrează doar în aplicație, pe calculator (depozitul de cod este public).
const acces = () => setting('acces', {}) || {};

function accesHtml() {
  const a = acces();
  return `<div class="card">
    <div class="card-head"><h2>Semnare electronică – websign</h2><button class="btn sm" data-act="editAcces">Modifică</button></div>
    ${a.websignUrl ? `<div class="actions" style="margin-top:0"><a class="btn primary" href="${h(a.websignUrl)}" target="_blank" rel="noopener">Încarcă documente la semnat ↗</a></div>` : '<p class="muted small">Adăugați linkul sesiunii de semnare cu „Modifică”.</p>'}
    <div class="date-cabinet" style="margin-top:10px">
      ${a.websignEmail ? `<div class="dc-rand"><span class="muted small">Utilizator</span><b>${h(a.websignEmail)}</b><button class="btn sm ghost" data-act="copiaza" data-text="${h(a.websignEmail)}">⧉ Copiază</button></div>` : ''}
      ${a.websignParola ? `<div class="dc-rand"><span class="muted small">Parola</span><b>${UI.arataParola ? h(a.websignParola) : '••••••••••'}</b><span class="nowrap"><button class="btn sm ghost" data-act="arataParola">${UI.arataParola ? 'Ascunde' : 'Arată'}</button><button class="btn sm ghost" data-act="copiaza" data-text="${h(a.websignParola)}">⧉ Copiază</button></span></div>` : ''}
    </div>
  </div>`;
}

function accesForm() {
  const a = acces();
  openForm({
    title: 'Date de acces websign',
    intro: 'Datele se păstrează doar în aplicație, pe acest calculator (și în copiile de siguranță locale) – nu ajung pe GitHub.',
    values: a,
    fields: [{ name: 'websignUrl', label: 'Linkul sesiunii de semnare', wide: true }, { name: 'websignEmail', label: 'Utilizator (e-mail)' }, { name: 'websignParola', label: 'Parola' }],
    onSave: v => setSetting('acces', v),
  });
}
