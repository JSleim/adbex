const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function restore(args, { verbose } = {}) {
  const dataFlagIndex = args.indexOf('--data');
  const hasData = dataFlagIndex !== -1;

  let explicitDataDir = null;
  const cleanArgs = [...args];
  if (hasData) {
    cleanArgs.splice(dataFlagIndex, 1);
    const next = cleanArgs[dataFlagIndex];
    if (next && !next.startsWith('-')) {
      explicitDataDir = next;
      cleanArgs.splice(dataFlagIndex, 1);
    }
  }

  const dir = cleanArgs[0];

  if (!dir) {
    console.error('Usage: adbex restore <dir> [--data [data-dir]]');
    console.error('Example: adbex restore .\\com.example.app --data');
    console.error('Example: adbex restore .\\com.example.app --data .\\mydata\\');
    process.exit(1);
  }

  const resolvedDir = path.resolve(dir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const apks = fs.readdirSync(resolvedDir)
    .filter(f => f.endsWith('.apk'))
    .map(f => path.join(resolvedDir, f));

  if (!apks.length) {
    console.error(`No APKs found in ${resolvedDir}`);
    process.exit(1);
  }

  const steps = hasData ? 2 : 1;
  let step = 0;

  console.log(`Restoring from ${resolvedDir}\n`);

  console.log(`[${++step}/${steps}] Installing ${apks.length} APK(s)...`);

  const installCmd = apks.length === 1 ? 'install' : 'install-multiple';
  if (verbose) console.error(`[adbex] adb ${installCmd} ${apks.join(' ')}`);

  const installResult = spawnSync('adb', [installCmd, ...apks], { stdio: 'inherit' });
  if (installResult.status !== 0) {
    console.error('Install failed.');
    process.exit(1);
  }

  console.log('Installed.');

  if (hasData) {
    console.log(`\n[${++step}/${steps}] Pushing data...`);

    const dataDir = explicitDataDir
      ? path.resolve(explicitDataDir)
      : path.join(resolvedDir, 'data');

    if (!fs.existsSync(dataDir)) {
      console.error(`Data folder not found: ${dataDir}`);
      console.error('Tip: specify it explicitly with --data <path>');
      process.exit(1);
    }

    const entries = fs.readdirSync(dataDir);
    if (!entries.length) {
      console.error(`Data folder is empty: ${dataDir}`);
      process.exit(1);
    }

    const remoteDest = '/sdcard/Android/data/';
    let pushFailed = false;
    for (const entry of entries) {
      const entryPath = path.join(dataDir, entry);
      if (verbose) console.error(`[adbex] adb push "${entryPath}" "${remoteDest}"`);
      const pushResult = spawnSync('adb', ['push', entryPath, remoteDest], { stdio: 'inherit' });
      if (pushResult.status !== 0) pushFailed = true;
    }

    if (pushFailed) {
      console.error(`
Data push completed with errors. Possible reasons:
  - App has restricted its data folder (common on Android 11+)
  - Insufficient storage on device
  - File path too long for the device filesystem`);
    } else {
      console.log('Data restored.');
    }
  }

  console.log('\nRestore complete.');
};