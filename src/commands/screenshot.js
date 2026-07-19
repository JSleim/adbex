const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function screenshot(args, { verbose } = {}) {
  const dest = args[0] || '.';

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `screenshot-${timestamp}.png`;
  const remotePath = `/sdcard/${fileName}`;

  let localPath;
  if (dest === '.' || (fs.existsSync(dest) && fs.statSync(dest).isDirectory())) {
    localPath = path.join(dest, fileName);
  } else {
    localPath = dest.endsWith('.png') ? dest : `${dest}.png`;
  }

  console.log('Capturing screenshot...');

  try {
    if (verbose) console.error(`[adbex] adb shell screencap -p ${remotePath}`);
    execFileSync('adb', ['shell', 'screencap', '-p', remotePath]);

    if (verbose) console.error(`[adbex] adb pull ${remotePath} ${localPath}`);
    spawnSync('adb', ['pull', remotePath, localPath], { stdio: 'inherit' });

    if (verbose) console.error(`[adbex] adb shell rm ${remotePath}`);
    execFileSync('adb', ['shell', 'rm', remotePath]);

    console.log(`Saved to ${localPath}`);
  } catch (err) {
    console.error(`Screenshot failed: ${err.message}`);
    try { execFileSync('adb', ['shell', 'rm', remotePath]); } catch (_) {}
    process.exit(1);
  }
};
