const { readFileSync, writeFileSync, existsSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');

const CONFIG_PATH = join(homedir(), '.adbex.json');

function load() {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2) + '\n');
}

module.exports = { load, save };
