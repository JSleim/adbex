const { execFileSync, spawnSync } = require('child_process');

module.exports = function logcat(args, { verbose } = {}) {
  const pkg = args[0];

  if (!pkg || pkg.startsWith('-')) {
    const result = spawnSync('adb', ['logcat', ...args], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
  }

  const rest = args.slice(1);

  let pid;
  try {
    pid = execFileSync('adb', ['shell', 'pidof', pkg], { encoding: 'utf8' }).trim();
  } catch {
    console.error(`Could not get PID for package "${pkg}"`);
    process.exit(1);
  }

  if (!pid) {
    console.error(`Package "${pkg}" is not running.`);
    process.exit(1);
  }

  if (verbose) console.error(`[adbex] adb logcat --pid=${pid} ${rest.join(' ')}`);
  const result = spawnSync('adb', ['logcat', '--pid=' + pid, ...rest], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
};
