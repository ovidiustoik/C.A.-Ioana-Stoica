'use strict';
/* Aplicația desktop: o fereastră proprie care încarcă aplicația publicată pe GitHub Pages. */
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
// Programul se încarcă de pe GitHub Pages: fiecare modificare publicată ajunge automat
// la următoarea pornire. Fără internet se folosește ultima versiune păstrată (service worker).
const APP_URL = process.env.CABINET_URL || 'https://ovidiustoik.github.io/C.A.-Ioana-Stoica/';
const isApp = url => url.toLowerCase().startsWith(APP_URL.toLowerCase());
const TMP = path.join(app.getPath('temp'), 'cabinet-stoica-acte');
let win = null;

if (!app.requestSingleInstanceLock()) app.quit();

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

// Copiile temporare ale actelor deschise se șterg la pornire și la închidere (secret profesional).
function cleanTemp() {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* fișier încă deschis */ }
}

const isExternal = url => /^(https?:|mailto:|tel:)/i.test(url);

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    title: 'Cabinet Stoica',
    icon: path.join(ROOT, 'build', 'icon.png'),
    backgroundColor: '#f5f3ee',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadURL(APP_URL);
  // Prima pornire fără internet: pagina locală cu buton de reîncercare.
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && isApp(url)) win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: APP_URL } });
  });

  // Linkurile externe (legislatie.just.ro, ANAF etc.) se deschid în browserul obișnuit.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (isApp(url) || url.startsWith('file:')) return;
    e.preventDefault();
    if (isExternal(url)) shell.openExternal(url);
  });
  win.webContents.session.setSpellCheckerLanguages(['ro', 'en-US']);
  win.on('closed', () => { win = null; });
}

ipcMain.handle('open-file', async (e, name, data) => {
  if (!isApp(e.senderFrame?.url || '')) throw new Error('Cerere respinsă.');
  const dir = path.join(TMP, String(Date.now()));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, String(name || 'act').replace(/[\\/:*?"<>|]/g, '_'));
  fs.writeFileSync(file, Buffer.from(data));
  return shell.openPath(file);
});

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const go = hash => () => win && win.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
  const template = [
    ...(isMac ? [{ label: 'Cabinet Stoica', submenu: [{ role: 'about', label: 'Despre' }, { type: 'separator' }, { role: 'hide', label: 'Ascunde' }, { role: 'quit', label: 'Ieșire' }] }] : []),
    {
      label: 'Fișier',
      submenu: [
        { label: 'Setări și backup', accelerator: 'CmdOrCtrl+,', click: go('#/setari') },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Închide fereastra' } : { role: 'quit', label: 'Ieșire' },
      ],
    },
    {
      label: 'Editare',
      submenu: [
        { role: 'undo', label: 'Anulează' }, { role: 'redo', label: 'Refă' }, { type: 'separator' },
        { role: 'cut', label: 'Taie' }, { role: 'copy', label: 'Copiază' }, { role: 'paste', label: 'Lipește' },
        { role: 'selectAll', label: 'Selectează tot' },
      ],
    },
    {
      label: 'Mergi la',
      submenu: [
        { label: 'Acasă – 7 zile', accelerator: 'CmdOrCtrl+1', click: go('#/acasa') },
        { label: 'TO DO', accelerator: 'CmdOrCtrl+2', click: go('#/sarcini') },
        { label: 'Dosare în lucru', accelerator: 'CmdOrCtrl+3', click: go('#/dosare') },
        { label: 'Calendar', accelerator: 'CmdOrCtrl+4', click: go('#/calendar') },
        { label: 'Contabilitate & ANAF', accelerator: 'CmdOrCtrl+5', click: go('#/contabilitate') },
        { label: 'Calcul termene', accelerator: 'CmdOrCtrl+6', click: go('#/termene') },
      ],
    },
    {
      label: 'Vizualizare',
      submenu: [
        { label: 'Reîncarcă (preia ultima versiune)', accelerator: 'CmdOrCtrl+R', click: () => win && win.loadURL(APP_URL) },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Mărește' }, { role: 'zoomOut', label: 'Micșorează' }, { role: 'resetZoom', label: 'Mărime normală' },
        { type: 'separator' }, { role: 'togglefullscreen', label: 'Ecran complet' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  cleanTemp();
  buildMenu();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', cleanTemp);
