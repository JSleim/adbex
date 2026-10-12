const { load, save } = require('../config');

const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

module.exports = function alias(args, { commands = [] } = {}) {
  const [action, name, target, ...presetArgs] = args;
  const config = load();
  const aliases = config.aliases && typeof config.aliases === 'object' && !Array.isArray(config.aliases)
    ? config.aliases
    : {};

  if (!action || action === 'list') {
    const names = Object.keys(aliases).sort();
    if (!names.length) {
      console.log('No aliases configured.');
      return;
    }
    names.forEach(aliasName => {
      const command = aliases[aliasName];
      if (Array.isArray(command) && command.every(part => typeof part === 'string')) {
        console.log(`${aliasName} -> ${command.join(' ')}`);
      }
    });
    return;
  }

  if (action === 'set') {
    if (!name || !target || !NAME_PATTERN.test(name)) {
      console.error('Usage: adbex alias set <name> <command> [preset arguments...]');
      process.exit(1);
    }
    if (commands.includes(name) || name === 'alias' || name.startsWith('-')) {
      console.error(`"${name}" is reserved and cannot be used as an alias.`);
      process.exit(1);
    }
    if (!commands.includes(target) || target === 'alias') {
      console.error(`"${target}" is not an aliasable adbex command.`);
      process.exit(1);
    }

    aliases[name] = [target, ...presetArgs];
    save({ ...config, aliases });
    console.log(`Alias set: ${name} -> ${aliases[name].join(' ')}`);
    return;
  }

  if (action === 'delete') {
    if (!name) {
      console.error('Usage: adbex alias delete <name>');
      process.exit(1);
    }
    if (!Object.prototype.hasOwnProperty.call(aliases, name)) {
      console.error(`Alias "${name}" does not exist.`);
      process.exit(1);
    }

    delete aliases[name];
    save({ ...config, aliases });
    console.log(`Alias deleted: ${name}`);
    return;
  }

  console.error('Usage: adbex alias [list] | set <name> <command> [preset arguments...] | delete <name>');
  process.exit(1);
};
