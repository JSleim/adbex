# adbex

A friendlier `adb` wrapper. Adds glob expansion, device selection, backups, screenshots, and more — and passes anything it doesn't recognize straight through to `adb`.

## Install

```bash
npm install -g adbex
```

Requires `adb` to be installed and on your PATH (part of [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools)).

## Commands

| Command | Description |
|---|---|
| `adbex pull <source...> [dest]` | Pull files; globs like `*.png` are expanded on the device |
| `adbex push <source...> <dest>` | Push files; globs like `*.mp4` are expanded locally |
| `adbex apk-pull <package>` | Pull all APKs for an installed package |
| `adbex screenshot [dest]` | Capture the screen and save it locally |
| `adbex backup <package> [--data]` | Back up an APK and optionally its sdcard data |
| `adbex restore <dir> [--data]` | Reinstall APKs and optionally push data back |
| `adbex install <file\|glob...>` | Install one or more APKs; supports wildcards like `*.apk` |
| `adbex devices` | List connected devices with friendly info |
| `adbex select` | Pick a default device (saved to `~/.adbex.json`) |
| `adbex packages [filter]` | List packages; filter by name, `-3` for third-party, `-s` for system |
| `adbex logcat [package]` | Stream logcat for a package; auto-resolves its PID |

Any command adbex doesn't recognize is passed directly to `adb`:

```bash
adbex shell                  # same as: adb shell
adbex reboot bootloader      # same as: adb reboot bootloader
adbex forward tcp:8080 ...   # and so on
```

## Flags

| Flag | Description |
|---|---|
| `-d <serial>` | Target a specific device, overrides the saved default |
| `-v, --verbose` | Show what adbex is doing under the hood |
| `-h, --help` | Print help |

## Device selection

If you work with multiple devices, pick one as the default so you don't have to type `-d` every time:

```bash
adbex select
```

Your choice is saved to `~/.adbex.json`. Override it at any time with `-d <serial>`.

## Examples

```bash
# Pull all screenshots from the device
adbex pull /sdcard/DCIM/Screenshots/*.png ./screenshots

# Install every APK in the current directory
adbex install *.apk

# Back up an app and its data, then restore it to a new device
adbex backup com.example.app --data
adbex restore ./backup-com.example.app --data

# Pull the APK for an installed app
adbex apk-pull com.example.app

# Watch logs for a specific app
adbex logcat com.example.app

# Use a specific device for one command
adbex -d emulator-5554 screenshot
```

## License

MIT