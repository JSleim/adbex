const { execFileSync } = require('child_process');
const readline = require('readline');

module.exports = function select(args, { verbose } = {}) {
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
    })
    .filter(d => d.state === 'device');

  if (!serials.length) {
    console.error('No devices connected.');
    process.exit(1);
  }

  if (serials.length === 1) {
    const { serial } = serials[0];
    console.log(`Only one device: ${serial}`);
    saveSelection(serial);
    return;
  }

  console.log(`${serials.length} devices available. Choose one:\n`);

  for (let i = 0; i < serials.length; i++) {
    const { serial } = serials[i];
    try {
      const prop = (p) => {
        if (verbose) console.error(`[adbex] adb -s ${serial} shell getprop ${p}`);
        return execFileSync('adb', ['-s', serial, 'shell', 'getprop', p], { encoding: 'utf8' }).trim();
      };
      const model = prop('ro.product.model');
      const brand = prop('ro.product.brand');
      const ver = prop('ro.build.version.release');
      console.log(`  ${i + 1}) ${serial}`);
      console.log(`     ${brand} ${model} — Android ${ver}`);
    } catch {
      console.log(`  ${i + 1}) ${serial}`);
      console.log(`     (could not read device info) `);
    }
    console.log();
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('Enter number (1): ', (input) => {
    rl.close();
    const idx = parseInt(input, 10) - 1;

    if (isNaN(idx) || idx < 0 || idx >= serials.length) {
      console.error('Invalid selection.');
      process.exit(1);
    }

    const { serial } = serials[idx];
    saveSelection(serial);
  });
};

function saveSelection(serial) {
  const { load, save } = require('../config');
  save({ ...load(), selectedDevice: serial });
  console.log(`Default device set to: ${serial}`);
}
