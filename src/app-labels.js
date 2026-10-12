const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LABELS_DEX = path.join(__dirname, '..', 'assets', 'android', 'labels.dex');
const DEVICE_LABELS_DEX = '/data/local/tmp/adbex-labels.dex';

function adb(args, verbose) {
  if (verbose) console.error(`[adbex] adb ${args.join(' ')}`);
  return execFileSync('adb', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listApps(verbose, all = false) {
  if (!fs.existsSync(LABELS_DEX)) {
    throw new Error('App-name lookup helper is missing. Run "npm run build:labels" and try again.');
  }

  adb(['push', LABELS_DEX, DEVICE_LABELS_DEX], verbose);
  const output = adb(
    [
      'shell',
      `CLASSPATH=${DEVICE_LABELS_DEX}`,
      'app_process',
      '/data/local/tmp',
      'Labels',
      '--list',
      ...(all ? ['all'] : []),
    ],
    verbose
  );

  return output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const tab = line.indexOf('\t');
      if (tab === -1) return null;
      return { name: line.slice(0, tab), packageName: line.slice(tab + 1) };
    })
    .filter(Boolean);
}

function listLauncherApps(verbose) {
  return listApps(verbose);
}

function listInstalledApps(verbose) {
  return listApps(verbose, true);
}

function resolveAppName(name, verbose) {
  const matches = listLauncherApps(verbose)
    .filter(app => app.name.toLowerCase() === name.toLowerCase());

  if (matches.length > 1) {
    throw new Error(
      `App name "${name}" is ambiguous. Use a package name instead: ${matches.map(app => app.packageName).join(', ')}`
    );
  }
  if (!matches.length) {
    throw new Error(`No installed launcher app found for "${name}".`);
  }

  return matches[0].packageName;
}

module.exports = { listInstalledApps, resolveAppName };
