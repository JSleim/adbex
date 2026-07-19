const { execFileSync } = require('child_process');

module.exports = function devices(args, { verbose } = {}) {
  let devicesOutput;
  try {
    devicesOutput = execFileSync('adb', ['devices'], { encoding: 'utf8' });
  } catch {
    console.error('Failed to run adb devices. Is adb in your PATH?');
    process.exit(1);
  }

  const lines = devicesOutput.trim().split(/\r?\n/).slice(1);
  const serials = lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('*'))
    .map(l => {
      const [serial, state] = l.split(/\s+/);
      return { serial, state };
    });

  if (!serials.length) {
    console.log('No devices connected.');
    return;
  }

  console.log(`${serials.length} device(s) connected:\n`);

  for (const { serial, state } of serials) {
    if (state !== 'device') {
      console.log(`  ${serial}  [${state}]`);
      continue;
    }

    try {
      const prop = (prop) => {
        if (verbose) console.error(`[adbex] adb -s ${serial} shell getprop ${prop}`);
        return execFileSync('adb', ['-s', serial, 'shell', 'getprop', prop], {
          encoding: 'utf8',
        }).trim();
      };

      const model = prop('ro.product.model');
      const brand = prop('ro.product.brand');
      const androidVer = prop('ro.build.version.release');
      const sdkVer = prop('ro.build.version.sdk');

      let battery = '?';
      try {
        const battOut = execFileSync(
          'adb', ['-s', serial, 'shell', 'dumpsys', 'battery'],
          { encoding: 'utf8' }
        );
        const match = battOut.match(/level:\s*(\d+)/);
        if (match) battery = `${match[1]}%`;
      } catch (_) {}

      console.log(`  ${serial}`);
      console.log(`    Device:  ${brand} ${model}`);
      console.log(`    Android: ${androidVer} (SDK ${sdkVer})`);
      console.log(`    Battery: ${battery}`);
      console.log();
    } catch (err) {
      console.log(`  ${serial}  (could not read device info)`);
      if (verbose) console.error(err.message);
    }
  }
};
