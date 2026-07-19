const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function push(args, { verbose } = {}) {
  if (args.length < 2) {
    console.error('Usage: adbex push <source...> <dest>');
    console.error('Example: adbex push *.mp4 /sdcard/Movies/');
    console.error('Example: adbex push ./photos/*.jpg /sdcard/DCIM/');
    process.exit(1);
  }

  const dest = args[args.length - 1];
  const sources = args.slice(0, -1);
  const hasAnyGlob = sources.some(hasGlob);

  if (!hasAnyGlob) {
    if (verbose) console.error(`[adbex] adb push ${args.join(' ')}`);
    const result = spawnSync('adb', ['push', ...args], { stdio: 'inherit' });
    process.exit(result.status ?? 1);
  }

  const expanded = [];

  for (const source of sources) {
    if (hasGlob(source)) {
      const dir = path.dirname(source);
      const pattern = path.basename(source);
      const regex = globToRegex(pattern);
      const resolvedDir = dir === '.' ? process.cwd() : path.resolve(dir);

      if (!fs.existsSync(resolvedDir)) {
        console.error(`Directory not found: ${resolvedDir}`);
        process.exit(1);
      }

      const matches = fs.readdirSync(resolvedDir)
        .filter(f => regex.test(f))
        .map(f => path.join(resolvedDir, f));

      if (!matches.length) {
        console.warn(`Warning: no matches for "${source}"`);
      } else {
        if (verbose) console.error(`[adbex] expanded "${source}" → ${matches.join(', ')}`);
        expanded.push(...matches);
      }
    } else {
      if (!fs.existsSync(source)) {
        console.error(`File not found: ${source}`);
        process.exit(1);
      }
      expanded.push(source);
    }
  }

  if (!expanded.length) {
    console.error('No files to push.');
    process.exit(1);
  }

  console.log(`Pushing ${expanded.length} file(s) → ${dest}`);

  let failed = 0;
  for (const file of expanded) {
    if (verbose) console.error(`[adbex] adb push "${file}" "${dest}"`);
    const result = spawnSync('adb', ['push', file, dest], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`Failed: ${file}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} file(s) failed.`);
    process.exit(1);
  }
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