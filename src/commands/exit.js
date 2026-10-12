const { execFileSync } = require('child_process');
const { resolveAppName } = require('../app-labels');

function adb(args, verbose) {
  if (verbose) console.error(`[adbex] adb ${args.join(' ')}`);
  return execFileSync('adb', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

module.exports = function exit(args, { verbose } = {}) {
  const target = args.filter(arg => !arg.startsWith('-')).join(' ');

  if (!target) {
    console.error('Usage: adbex exit <package|app name...>');
    console.error('Example: adbex exit "YouTube"');
    process.exit(1);
  }

  let pkg = target;
  if (!/^[\w$]+(?:\.[\w$]+)+$/.test(target)) {
    try {
      pkg = resolveAppName(target, verbose);
    } catch (err) {
      console.error(`Failed to look up app name "${target}": ${err.message}`);
      process.exit(1);
    }
  }

  try {
    adb(['shell', 'am', 'force-stop', pkg], verbose);
    console.log(`Force-stopped ${pkg}.`);
  } catch (err) {
    const message = (err.stderr || err.message || '').toString().trim();
    console.error(`Failed to force-stop "${pkg}": ${message || 'is a device connected?'}`);
    process.exit(1);
  }
};
