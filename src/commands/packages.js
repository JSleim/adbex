const { execFileSync } = require('child_process');
const { listInstalledApps } = require('../app-labels');

module.exports = function packages(args, { verbose } = {}) {
  const flags = args.filter(a => a.startsWith('-'));
  const filter = args.filter(a => !a.startsWith('-'))[0];
  const showNames = flags.includes('-n') || flags.includes('--names');

  const pmArgs = ['shell', 'pm', 'list', 'packages', '--user', 'current'];
  if (!flags.includes('--all') && flags.includes('-s')) {
    pmArgs.push('-s');
  } else if (!flags.includes('--all')) {
    pmArgs.push('-3');
  }
  if (flags.includes('-e')) pmArgs.push('-e');

  if (verbose) console.error(`[adbex] adb ${pmArgs.join(' ')}`);

  let output;
  try {
    output = execFileSync('adb', pmArgs, { encoding: 'utf8' });
  } catch {
    console.error('Failed to list packages. Is a device connected?');
    process.exit(1);
  }

  let packages = output
    .trim()
    .split(/\r?\n/)
    .map(l => l.replace(/^package:/, '').trim())
    .filter(Boolean);

  if (filter) {
    packages = packages.filter(p => p.toLowerCase().includes(filter.toLowerCase()));
  }

  if (!packages.length) {
    console.log(filter ? `No packages matching "${filter}".` : 'No packages found.');
    return;
  }

  packages.sort();
  if (showNames) {
    let apps;
    try {
      apps = listInstalledApps(verbose);
    } catch (err) {
      const message = (err.stderr || err.message || '').toString().trim();
      console.error(`Failed to read app names: ${message || 'is a device connected?'}`);
      process.exit(1);
    }

    const labelsByPackage = new Map(apps.map(app => [app.packageName, app.name]));
    const nameWidth = packages.reduce(
      (width, pkg) => Math.max(width, (labelsByPackage.get(pkg) || '').length),
      'Name'.length
    );
    console.log(`${'Name'.padEnd(nameWidth)}  Package`);
    console.log(`${'-'.repeat(nameWidth)}  -------`);
    packages.forEach(pkg => {
      console.log(`${(labelsByPackage.get(pkg) || '').padEnd(nameWidth)}  ${pkg}`);
    });
  } else {
    packages.forEach(pkg => console.log(pkg));
  }
  console.log(`\n${packages.length} package(s)${filter ? ` matching "${filter}"` : ''}`);
};
