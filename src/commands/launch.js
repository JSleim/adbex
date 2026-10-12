const { execFileSync } = require('child_process');
const { resolveAppName } = require('../app-labels');

function adb(args, verbose) {
  if (verbose) console.error(`[adbex] adb ${args.join(' ')}`);
  return execFileSync('adb', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveActivity(pkg, verbose) {
  const attempts = [
    ['shell', 'cmd', 'package', 'resolve-activity', '--brief', pkg],
    ['shell', 'pm', 'resolve-activity', '--brief', pkg],
  ];

  for (const cmd of attempts) {
    try {
      const out = adb(cmd, verbose);
      const component = out
        .trim()
        .split(/\r?\n/)
        .map(l => l.trim())
        .reverse()
        .find(l => /^[\w.$]+\/[\w.$]+$/.test(l));
      if (component) return component;
    } catch {
    }
  }
  return null;
}

function errorText(err) {
  return (err.stderr || err.message || '').toString().trim();
}

module.exports = function launch(args, { verbose } = {}) {
  const flags = args.filter(a => a.startsWith('-'));
  const target = args.filter(a => !a.startsWith('-')).join(' ');

  if (!target) {
    console.error('Usage: adbex launch <package|app name...> [-s] [-n]');
    console.error('  -s  force-stop the app before launching');
    console.error('  -n  only print the resolved activity, do not launch');
    console.error('Example: adbex launch com.zy.wqmt.global');
    process.exit(1);
  }

  let pkg = target;
  let component = resolveActivity(pkg, verbose);

  if (!component && !/^[\w$]+(?:\.[\w$]+)+$/.test(target)) {
    try {
      pkg = resolveAppName(target, verbose);
    } catch (err) {
      console.error(`Failed to look up app name "${target}": ${errorText(err) || 'is a device connected?'}`);
      process.exit(1);
    }
    component = resolveActivity(pkg, verbose);
  }

  if (flags.includes('-n')) {
    if (!component) {
      console.error(`No launcher activity found for "${pkg}".`);
      process.exit(1);
    }
    console.log(component);
    return;
  }

  if (flags.includes('-s')) {
    try {
      adb(['shell', 'am', 'force-stop', pkg], verbose);
    } catch {
      console.error(`Warning: could not force-stop ${pkg}`);
    }
  }

  try {
    let output;
    if (component) {
      console.log(`Launching ${component}`);
      output = adb(['shell', 'am', 'start', '-n', component], verbose);
    } else {
      console.log(`No activity resolved, falling back to monkey for ${pkg}`);
      output = adb(
        ['shell', 'monkey', '-p', pkg, '-c', 'android.intent.category.LAUNCHER', '1'],
        verbose
      );
      if (/No activities found/i.test(output)) {
        console.error(`"${pkg}" has no launchable activity (or isn't installed).`);
        process.exit(1);
      }
    }

    if (/Error|Exception|does not exist/i.test(output)) {
      console.error(output.trim());
      process.exit(1);
    }
    console.log('Started.');
  } catch (err) {
    const msg = errorText(err);
    console.error(`Failed to launch "${pkg}": ${msg || 'is a device connected?'}`);
    process.exit(1);
  }
};