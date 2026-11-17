/*
  Datele cabinetului: singurul loc în care se completează informațiile de contact.
  Un câmp gol apare pe site ca „[de completat]”, marcat cu galben, ca să nu scape nimic.
*/
window.CABINET = {
  denumire: 'Cabinet individual de avocat Ioana Stoica',
  avocat: 'Ioana Stoica',
  barou: 'Baroul Argeș',
  aniExperienta: 15,

  telefon: '0775 137 882',
  email: 'ioanasaghel@gmail.com',   // aici ajung formularele și actele trimise de clienți
  adresa: 'Albeștii de Argeș, județ Argeș',
  cif: '29605442',
  program: 'Luni–Vineri, 08:30–17:30',

  barouLink: 'https://barouarges.ro/avocat/ioana-stoica',   // pagina avocatului pe site-ul Baroului Argeș
  unbrLink: 'https://www.unbr.ro',

  taxaAnaliza: 300,     // lei, pentru analiza actelor și consultație
  taxaStrainatateEuro: 70,   // euro, consultația pentru probleme juridice din afara țării

  // Adresa care primește formularul cu actele și le trimite pe e-mail, cu actele atașate.
  // De regulă: adresa „/exec” a scriptului Google din trimitere/trimitere.gs (vezi trimitere/INSTRUCTIUNI.md).
  // Merge și un alt serviciu care acceptă POST multipart/form-data.
  // Gol: formularul propune clientului să trimită singur e-mailul, cu actele atașate de mână.
  trimitereAdresa: '',
  // Adresa site-ului publicat (de exemplu, 'https://www.exemplu.ro/'). Din ea se fac linkurile de semnare
  // trimise clienților de pe pagina avocat.html. Goală: se folosește adresa la care e deschisă pagina.
  adresaSite: 'https://www.avocatioanastoica.ro/',
  // Linkul de plată cu cardul, de la procesatorul de plăți (de exemplu, un link de plată de 300 lei).
  // La procesator, adresa de întoarcere după plată reușită se setează la: .../trimite-actele.html?plata=reusita
  plataLink: '',
  plataLinkEuro: '',    // linkul de plată de 70 €, pentru consultațiile privind probleme din afara țării
  // Datele pentru transferul bancar
  beneficiar: 'Av. Stoica Ioana – Cabinet de avocat',
  iban: 'RO87BRDE030SV54798270300',
  banca: 'BRD – Groupe Société Générale, Agenția Curtea de Argeș',

  // Pentru contract
  denumireOficiala: 'Av. Stoica Ioana – Cabinet de avocat',
  decizieInfiintare: 'nr. 66 din 25.10.2022 a Consiliului Baroului Argeș',
  sediuComplet: 'Albeștii de Argeș, județ Argeș',

  marimeMaximaMB: 20    // totalul fișierelor PDF dintr-o trimitere
};
