const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = function apkPull(args, { verbose } = {}) {
  const pkg = args[0];
  const dest = args[1] || '.';

  if (!pkg) {
    console.error('Usage: adbex apk-pull <package> [dest]');
    console.error('Example: adbex apk-pull com.example.app ./apks');
    process.exit(1);
  }

  if (verbose) console.error(`[adbex] adb shell pm path ${pkg}`);

  let pmOutput;
  try {
    pmOutput = execFileSync('adb', ['shell', 'pm', 'path', pkg], {
      encoding: 'utf8',
    });
  } catch (err) {
    console.error(`Failed to find package "${pkg}". Is it installed?`);
    process.exit(1);
  }

  const paths = pmOutput
    .trim()
    .split(/\r?\n/)
    .map(line => line.replace(/^package:/, '').trim())
    .filter(Boolean);

  if (!paths.length) {
    console.error(`No APKs found for "${pkg}".`);
    process.exit(1);
  }

  if (dest !== '.') {
    fs.mkdirSync(dest, { recursive: true });
  }

  console.log(`Found ${paths.length} APK(s) for ${pkg}`);

  let failed = 0;
  for (const apkPath of paths) {
    const fileName = path.basename(apkPath);
    console.log(`Pulling ${fileName}...`);
    if (verbose) console.error(`[adbex] adb pull "${apkPath}" "${dest}"`);

    const result = spawnSync('adb', ['pull', apkPath, dest], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`Failed: ${apkPath}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} APK(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nDone. ${paths.length} APK(s) saved to ${dest}`);
  }
};
