'use strict';
/* Când aplicația e pornită cu Porneste.cmd (server.ps1 pe http://localhost:8766), legătura cu
   calculatorul trece prin programul local: portal.just.ro, deschiderea actelor, copia zilnică.
   În aplicația desktop (Electron), window.desktop e deja definit de aceasta. */
if (!window.desktop && ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '8766') {
  const H = { 'X-App': 'cabinet' };
  window.desktop = {
    local: true,
    async openFile(name, data) {
      const r = await fetch('/api/deschide', { method: 'POST', headers: { ...H, 'X-Nume': encodeURIComponent(name) }, body: data });
      return r.ok ? await r.text() : 'Programul local nu răspunde (este pornit Porneste.cmd?).';
    },
    async portal(op, body) {
      const r = await fetch('/api/soap', { method: 'POST', headers: { ...H, 'X-SOAPAction': op, 'Content-Type': 'text/xml; charset=utf-8' }, body });
      const t = await r.text();
      if (!r.ok) throw new Error('Portalul nu a răspuns: ' + (t || r.status));
      return t;
    },
    async backup(json) {
      const r = await fetch('/api/backup', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json; charset=utf-8' }, body: json });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()).fisier;
    },
  };
}
