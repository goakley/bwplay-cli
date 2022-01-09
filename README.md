# bwplay-cli

[![npm version](https://badge.fury.io/js/typescript.svg)](https://www.npmjs.com/package/typescript)
[![github pages workflow](https://github.com/goakley/bwplay-cli/workflows/github%20pages/badge.svg)

`bwplay-cli` is a set of tools for building javascript-based games.
The tooling is designed to be minimal and flexible.

Check out [the documentation](https://goakley.github.io/bwplay-cli/) for a full run-down of the features of this project.

## Features

* [Generate TypeScript code](https://goakley.github.io/bwplay-cli/docs/code-generator/) that handles loading external audio assets.
* [Run a development server](https://goakley.github.io/bwplay-cli/docs/development-server/) that automatically reloads your code and assets as they change.
* [Export your project](https://goakley.github.io/bwplay-cli/docs/exporting/) as an [Android project](https://developer.android.com/) or a [Progressive Web App (PAW)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

## Quick-Start

The quickest, smallest possible project can be set up as follows:

```bash
npm i bwplay-cli
npm exec -- bwplay-cli new
echo 'console.log("Hello, World!")' > main.js
npm exec -- bwplay-cli serve
```

See [the documentation's getting started guide](https://goakley.github.io/bwplay-cli/docs/getting-started) for a more practical introduction to the tooling.
