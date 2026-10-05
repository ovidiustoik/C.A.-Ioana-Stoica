'use strict';
/* Pune iconița și detaliile programului în Cabinet Stoica.exe fără Wine
   (folosit când installer-ul de Windows se construiește pe Linux sau macOS). */
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const PE = await import('pe-library');
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const exe = PE.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = PE.NtExecutableResource.from(exe);

  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0] || { id: 1, lang: 1033 };
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, ico.icons.map(i => i.data));

  const version = context.packager.appInfo.version;
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    const lang = vi.getAllLanguagesForStringValues()[0] || { lang: 1033, codepage: 1200 };
    vi.setStringValues(lang, {
      ProductName: 'Cabinet Stoica',
      FileDescription: 'Cabinet Stoica',
      CompanyName: 'Cabinet de avocat Stoica Ioana',
      LegalCopyright: 'Cabinet de avocat Stoica Ioana',
      OriginalFilename: 'Cabinet Stoica.exe',
      InternalName: 'Cabinet Stoica',
    });
    const [a, b, c] = version.split('.').map(Number);
    vi.setFileVersion(a, b, c, 0, lang.lang);
    vi.setProductVersion(a, b, c, 0, lang.lang);
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log('  • iconița și detaliile au fost puse în', path.basename(exePath));
};
