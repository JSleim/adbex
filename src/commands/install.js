const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function install(args, { verbose } = {}) {
  if (!args.length) {
    console.error('Usage: adbex install <file|glob> [file|glob...]');
    console.error('Example: adbex install app.apk');
    console.error('Example: adbex install .\\backup\\*.apk');
    process.exit(1);
  }

  const apks = [];

  for (const arg of args) {
    if (hasGlob(arg)) {
      const dir = path.dirname(arg);
      const pattern = path.basename(arg);
      const regex = globToRegex(pattern);

      if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        process.exit(1);
      }

      const matches = fs.readdirSync(dir)
        .filter(f => regex.test(f) && f.endsWith('.apk'))
        .map(f => path.join(dir, f));

      if (!matches.length) {
        console.error(`No APKs matched: ${arg}`);
        process.exit(1);
      }

      if (verbose) console.error(`[adbex] expanded "${arg}" → ${matches.join(', ')}`);
      apks.push(...matches);
    } else {
      if (!fs.existsSync(arg)) {
        console.error(`File not found: ${arg}`);
        process.exit(1);
      }
      apks.push(arg);
    }
  }

  if (!apks.length) {
    console.error('No APKs to install.');
    process.exit(1);
  }

  const cmd = apks.length === 1 ? 'install' : 'install-multiple';
  console.log(`Installing ${apks.length} APK(s) via ${cmd}...`);
  if (verbose) console.error(`[adbex] adb ${cmd} ${apks.join(' ')}`);

  const result = spawnSync('adb', [cmd, ...apks], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
};

function hasGlob(s) {
  return /[*?[]/.test(s);
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}