const { execFileSync } = require('child_process');

module.exports = function packages(args, { verbose } = {}) {
  const flags = args.filter(a => a.startsWith('-'));
  const filter = args.filter(a => !a.startsWith('-'))[0];

  const pmArgs = ['shell', 'pm', 'list', 'packages'];
  if (flags.includes('-3')) pmArgs.push('-3');
  if (flags.includes('-s')) pmArgs.push('-s');
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

  packages.sort().forEach(p => console.log(p));
  console.log(`\n${packages.length} package(s)${filter ? ` matching "${filter}"` : ''}`);
};
