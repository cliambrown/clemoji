# Clemoji

A simple emoji picker application for copying emojis to the clipboard.

Uses [the complete v17.0 emoji list](https://unicode.org/emoji/charts/full-emoji-list.html)

Made by [C. Liam Brown](https://cliambrown.com/)

<p align="center">
    <a href="https://ko-fi.com/cliambrown" alt="Buy me a coffee"><img width="181" src="https://raw.githubusercontent.com/cliambrown/clemoji/master/kofi.png"></a>
</p>

## Features

- Fast & pretty lightweight (not an Electron app)
- Search and copy emojis, including any available variant (skin tones, hair colour, etc)
- Pin your favourite emojis to the start of the list
- Quick access to some of your recently-used emojis
- Customizable
- Dark / Light themes

## Privacy & Permissions

All settings are stored locally. This app does not connect to the internet and does not send any of your information to anyone. Emoji history can be disabled and cleared at any time.

## Screenshots

<a href="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-1.png"><img src="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-1.png" width="200px" alt="Screenshot 1"></a> <a href="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-2.png"><img src="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-2.png" width="200px" alt="Screenshot 2"></a> <a href="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-3.png"><img src="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-3.png" width="200px" alt="Screenshot 3"></a> <a href="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-4.png"><img src="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-4.png" width="200px" alt="Screenshot 4"></a> <a href="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-5.png"><img src="https://raw.githubusercontent.com/cliambrown/clemoji/master/clemoji-screenshot-5.png" width="200px" alt="Screenshot 5"></a>

## Installation

**Linux (Debian/Ubuntu):** Download and install the latest .deb file from [the Releases page](https://github.com/cliambrown/clemoji/releases).
- The .deb was built on the Linux Mint 22.2 with Linux kernel 6.14 -- other setups may require custom-build installers
- I recommend a custom keybinding to launch the app (like `Win` + `.` on Windows)

**Windows, MacOS, iOS, Android, other Linux distributions:** Clone the repo and follow the instructions at https://v2.tauri.app/distribute/#distributing to build an installer for your device.

## Usage

- Type an emoji name to filter the list of emojis
- Click an emoji (or hit Enter) to copy it to your clipboard and close the app
- Shift + click an emoji to copy multiple emojis without closing the app
- Click a copied emoji (in the list at the bottom) to remove it from your currently copied emojis
- Tab = go to the next emoji
- Shift + Tab = go to the previous emoji
- Alt + click/Enter = show alternate versions
- Ctrl + W = close the app
- Esc = Clear the filter input
- Ctrl + Shift + click/Enter to remove an emoji from your history

## Built With

- [Tauri](https://tauri.app/)
- [Tailwind](https://tailwindcss.com/)

## Disclaimer

This software is provided as-is. Its developer makes no other warranties, express or implied, and hereby disclaims all implied warranties, including any warranty of merchantability and warranty of fitness for a particular purpose.
