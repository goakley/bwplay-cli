---
title: Development Server
---

# Development Server

`bwplay-cli` has a built-in development server, with the goal of making it easier to iterate on your project.

```bash
bwplay-cli serve
```

This server takes care of a number of tasks on your behalf, including:

* Providing an HTML file at the root of the server that loads your project's JavaScript
* Limiting itself to only serving files that are part of your project
* Live re-generation of [asset code]({{< relref "code-generator.md" >}})

The HTML file at the root of the server is minimal - it has a body with no padding or margins that contains only `<script>` tags (which reference all the JavaScript files [configured in the project settings]({{< relref "configuration.md#javascriptfiles" >}})).
This HTML file is similar to the one used when [exporting your project]({{< relref "exporting.md" >}}), so if your project works on the development server's web page, it should work in the exports' too.

Files that are not referenced in the project settings (JavaScript, assets, etc) are not served by the development server.
This is on purpose - unreferenced files will not be part of an export, and if you were to accidentally forget to include certain files, it would be best to catch that as soon as possible while developing.
