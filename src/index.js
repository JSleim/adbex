#!/usr/bin/env node

const { spawnSync } = require('child_process');
const pull = require('./commands/pull');
const apkPull = require('./commands/apk-pull');
const screenshot = require('./commands/screenshot');
const backup = require('./commands/backup');
const devices = require('./commands/devices');
const packages = require('./commands/packages');
const select = require('./commands/select');
const logcat = require('./commands/logcat');
const restore = require('./commands/restore');
const install = require('./commands/install');
const push = require('./commands/push');
const launch = require('./commands/launch');
const exit = require('./commands/exit');
const alias = require('./commands/alias');

const COMMANDS = {
  'pull': pull,
  'push': push,
  'apk-pull': apkPull,
  'screenshot': screenshot,
  'backup': backup,
  'restore': restore,
  'install': install,
  'devices': devices,
  'packages': packages,
  'select': select,
  'logcat': logcat,
  'launch': launch,
  'exit': exit,
  'alias': alias,
};

const { load: loadConfig } = require('./config');
const config = loadConfig();
const { selectedDevice } = config;
if (selectedDevice) {
  process.env.ANDROID_SERIAL = selectedDevice;
}

let args = process.argv.slice(2);

const dIdx = args.indexOf('-d');
if (dIdx !== -1 && dIdx + 1 < args.length) {
  process.env.ANDROID_SERIAL = args[dIdx + 1];
  args.splice(dIdx, 2);
}

const cmd = args[0];
const verbose = args.includes('--verbose') || args.includes('-v');

const cleanArgs = args.filter(a => a !== '--verbose' && a !== '-v');

if (!cmd) {
  printHelp();
  process.exit(0);
}

if (cmd === '--help' || cmd === '-h') {
  printHelp();
  process.exit(0);
}

if (COMMANDS[cmd]) {
  COMMANDS[cmd](cleanArgs.slice(1), { verbose, commands: Object.keys(COMMANDS) });
} else if (config.aliases && Object.prototype.hasOwnProperty.call(config.aliases, cmd)) {
  const aliasArgs = config.aliases[cmd];
  if (!Array.isArray(aliasArgs) || aliasArgs.length === 0 || !aliasArgs.every(arg => typeof arg === 'string')) {
    console.error(`Alias "${cmd}" is invalid in ~/.adbex.json.`);
    process.exit(1);
  }
  const [aliasCommand, ...presetArgs] = aliasArgs;
  if (!COMMANDS[aliasCommand] || aliasCommand === 'alias') {
    console.error(`Alias "${cmd}" targets an unknown adbex command: "${aliasCommand}".`);
    process.exit(1);
  }
  COMMANDS[aliasCommand]([...presetArgs, ...cleanArgs.slice(1)], { verbose, commands: Object.keys(COMMANDS) });
} else {
  if (verbose) console.error(`[adbex] passing through to adb: adb ${args.join(' ')}`);
  const result = spawnSync('adb', args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`
adbex — a friendlier adb wrapper

ADBEX COMMANDS:
  pull <source...> [dest]       Pull files, globs like *.png are auto-expanded
  push <source...> <dest>       Push files, globs like *.mp4 are auto-expanded
  apk-pull <package>            Pull APK(s) for an installed package
  screenshot [dest]             Capture screen and save locally
  backup <package> [--data]     Backup APK and optionally sdcard data
  restore <dir> [--data]        Reinstall APKs and optionally push data back
  install <file|glob...>        Install APK(s), supports wildcards like *.apk
  devices                       List devices with friendly info
  select                        Select default device (saves to ~/.adbex.json)
  packages [filter] [-3] [-s] [--all] [-n]  List apps; -n includes names
  logcat [package]               Logcat for package (auto-resolves PID)
  launch <package|app name> [-s] [-n]  Resolve and start an app
  exit <package|app name>       Force-stop an app
  alias [list]                  List custom command aliases
  alias set <name> <command>    Create an alias for an adbex command
  alias delete <name>           Delete a custom alias

FLAGS:
  -v, --verbose                 Show what adbex is doing under the hood
  -d <serial>                   Target a specific device (overrides default)
  -h, --help                    Show this help

ANY OTHER COMMAND is passed straight through to adb:
  adbex shell, adbex logcat, adbex reboot, etc.
`);
}