---
title: Getting Started
weight: 10
---

# Getting Started

You can quickly start working with `bwplay-cli` by installing the package from [npm](https://www.npmjs.com/) and creating a sample project config:

```bash
npm i bwplay-cli
npm exec -- bwplay-cli new
```

Create a simple `main.js` file in the same directory:

```javascript
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
canvas.style.display = 'block';
canvas.style.margin = '0px';
canvas.style.padding = '0px';
canvas.style.width = '100%';
canvas.style.height = '100%';
const draw = () => {
  window.requestAnimationFrame(draw);
  const c = Math.round(Math.abs(Math.sin(Date.now() / 1000) * 255));
  ctx.fillStyle = `rgb(${c},${c},${c})`;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};
draw();
```

{{< hint warning >}}
**JavaScript vs TypeScript**

`bwplay-cli` expects projects to be written in TypeScript, but JavaScript will work for simple use cases (like this example).
{{< /hint >}}

Run the development server to see your code in action:

```bash
npm exec -- bwplay-cli serve
```

You can export this project to get a self-contained version of your "game" as well:

```bash
npm exec -- bwplay-cli export
open ./export/web/index.html
```

To learn more about how `bwplay-cli` works, and to take advantage of its more advanced functionality, check out the page on [configuring `bwplay-cli`]({{< relref configuration.md >}}).
