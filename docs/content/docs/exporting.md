---
title: "Exporting"
---

# Exporting

`bwplay-cli` allows you to export your project to different platforms.
This makes it easy to distribute your game to other (non-technical) people.

```bash
bwplay-cli export
```

There is no cross-compilation - different targets will runs your JavaScript as-is, just in different contexts.
Your code in the exports is the same as it was in your project.

## Before Exporting

The export process will include the assets and JavaScript specified in your [project settings]({{< relref "configuration.md" >}}).
It is up to you to convert your TypeScript into JavaScript, bundle your code together, minify your code, etc.
The export process performs no modifications to your JavaScript code.

A very simple build-and-export process may look something like:

```bash
# compile your TypeScript
tsc main.ts
# minify the resulting JavaScript
babel-minify main.js
# export the project
bwplay-cli export
```

## Export Environment

The export process creates its own `index.html` file that contains all of your project's JavaScript in-line.
The `index.html` has a body with no padding or margins that contains only `<script>` tags containing your JavaScript.
This HTML file is similar to the one used by the [development server]({{< relref "development-server.md" >}}).

## Types of Exports

Exports are located in the `export/` directory in the root of your project.
Each type of export will be in its own subdirectory (e.g. `export/web/`).

### Web (PWA)

Exporting will always create a [Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) - an HTML file along with a [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) and some metadata.
Outputting the project with this structure makes it easy to distribute your game as a simple website that can be "installed" on a mobile device.

Since all of your JavaScript is inlined into the `index.html`, you could even distribute your game as a single `.html` file.
However, this is not recommended if you're serving your game over a network, as it limits how users can interact with your game.

### Android

If the [`androidApplicationId`]({{< relref "configuration.md#androidapplicationid" >}}) setting is specified, exporting will generate an Android [app module](https://developer.android.com/studio/projects#ApplicationModules).

A module is only part of the file structure necessary to build a complete Android app - to use the exported module, place it inside a new or existing Android Studio project.

{{< hint info >}}
**Why export a module and not a project?**

Due to differences between development environments (SDK versions, installation paths, etc), `bwplay-cli` does not know enough about your specific setup to generate an entire Android Studio project.
{{< /hint >}}

Under the hood, the Android module renders the generated `index.html` file in an Android WebView.
By using this strategy, the Android module stays simple while still supporting browser JavaScript features (`localStorage`, `fetch`, etc).
