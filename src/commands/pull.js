const { execFileSync, spawnSync } = require('child_process');
const { mkdirSync } = require('fs');

function ensureDestDir(dest) {
  try {
    mkdirSync(dest, { recursive: true });
  } catch {}
}

module.exports = function pull(args, { verbose } = {}) {
  if (args.length === 0) {
    console.error('Usage: adbex pull <source...> [dest]');
    process.exit(1);
  }

  const hasAnyGlob = args.some(hasGlob);

  if (!hasAnyGlob) {
    if (args.length <= 2) {
      if (args.length === 2) ensureDestDir(args[1]);
      if (verbose) console.error(`[adbex] adb pull ${args.join(' ')}`);
      const result = spawnSync('adb', ['pull', ...args], { stdio: 'inherit' });
      process.exit(result.status ?? 1);
    } else {
      const dest = args[args.length - 1];
      const sources = args.slice(0, -1);
      ensureDestDir(dest);
      for (const source of sources) {
        if (verbose) console.error(`[adbex] adb pull "${source}" "${dest}"`);
        const result = spawnSync('adb', ['pull', source, dest], { stdio: 'inherit' });
        if (result.status !== 0) process.exit(result.status);
      }
      return;
    }
  }

  const dest = args.length >= 2 ? args[args.length - 1] : '.';
  const sources = args.length >= 2 ? args.slice(0, -1) : args;

  ensureDestDir(dest);

  const expanded = [];

  for (const source of sources) {
    if (hasGlob(source)) {
      if (verbose) console.error(`[adbex] expanding: adb shell ls ${source}`);
      try {
        const out = execFileSync('adb', ['shell', 'ls', source], {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
        });
        const matches = out
          .trim()
          .split(/\r?\n/)
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('ls:'));

        if (!matches.length) {
          console.warn(`Warning: no matches for "${source}"`);
        } else {
          if (verbose) console.error(`[adbex] matched: ${matches.join(', ')}`);
          expanded.push(...matches);
        }
      } catch (err) {
        console.error(`Error expanding "${source}": ${err.message}`);
        process.exit(1);
      }
    } else {
      expanded.push(source);
    }
  }

  if (!expanded.length) {
    console.error('No files to pull.');
    process.exit(1);
  }

  console.log(`Pulling ${expanded.length} file(s) → ${dest}`);

  let failed = 0;
  for (const file of expanded) {
    if (verbose) console.error(`[adbex] adb pull "${file}" "${dest}"`);
    const result = spawnSync('adb', ['pull', file, dest], { stdio: 'inherit' });
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