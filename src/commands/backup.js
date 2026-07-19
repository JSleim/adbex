const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function backup(args, { verbose } = {}) {
  const flags = args.filter(a => a.startsWith('-'));
  const positional = args.filter(a => !a.startsWith('-'));

  const pkg = positional[0];
  const dest = positional[1] || '.';
  const includeData = flags.includes('--data') || flags.includes('--full');

  if (!pkg) {
    console.error('Usage: adbex backup <package> [dest] [--data]');
    console.error('Example: adbex backup com.example.app ./backups --data');
    process.exit(1);
  }

  const resolvedDest = require('path').resolve(dest);
  const backupDir = path.join(resolvedDest, pkg);
  fs.mkdirSync(backupDir, { recursive: true });

  const steps = includeData ? 2 : 1;
  let step = 0;
  console.log(`Backing up ${pkg} → ${backupDir}`);

  console.log(`\n[${++step}/${steps}] Pulling APK(s)...`);
  let pmOutput;
  try {
    if (verbose) console.error(`[adbex] adb shell pm path ${pkg}`);
    pmOutput = execFileSync('adb', ['shell', 'pm', 'path', pkg], { encoding: 'utf8' });
  } catch {
    console.error(`Package "${pkg}" not found on device.`);
    process.exit(1);
  }

  const apkPaths = pmOutput
    .trim()
    .split(/\r?\n/)
    .map(l => l.replace(/^package:/, '').trim())
    .filter(Boolean);

  let apkFailed = 0;
  for (const apkPath of apkPaths) {
    if (verbose) console.error(`[adbex] adb pull "${apkPath}" "${backupDir}"`);
    const result = spawnSync('adb', ['pull', apkPath, backupDir], { stdio: 'inherit' });
    if (result.status !== 0) apkFailed++;
  }

  if (apkFailed) {
    console.error(`Warning: ${apkFailed} APK(s) failed to pull.`);
  } else {
    console.log(`APK(s) saved (${apkPaths.length} file(s))`);
  }

  if (includeData) {
    console.log(`\n[${++step}/${steps}] Pulling sdcard data...`);
    const remoteDat = `/sdcard/Android/data/${pkg}`;
    const dataDir = path.join(backupDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    try {
      if (verbose) console.error(`[adbex] adb shell ls ${remoteDat}`);
      execFileSync('adb', ['shell', 'ls', remoteDat], { encoding: 'utf8' });
    } catch {
      console.warn(`No sdcard data found at ${remoteDat} — app may store data internally only.`);
      summarize(backupDir, pkg);
      return;
    }

    if (verbose) console.error(`[adbex] adb pull "${remoteDat}" "${dataDir}"`);
    const result = spawnSync('adb', ['pull', remoteDat, dataDir], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error('Warning: data pull completed with errors.');
    } else {
      console.log('Data saved.');
    }
  } else {
    console.log('\nTip: use --data to also backup /sdcard/Android/data');
  }

  summarize(backupDir, pkg);
};

function summarize(backupDir, pkg) {
  console.log(`\nBackup complete → ${backupDir}`);
  console.log(`Restore with:  adbex restore "${backupDir}"`);
  console.log(`With data:     adbex restore "${backupDir}" --data`);
}