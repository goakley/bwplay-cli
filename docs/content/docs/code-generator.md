---
title: Code Generator
weight: 30
---

# Code Generator

`bwplay-cli` can generate bits of code to ease the development process.

## Audio

If your project has audio assets (specified by the [`audioFiles`]({{< relref "configuration.md#audiofiles" >}}) setting), `bwplay-cli` can generate code that exports an `Audio` object, which exposes all your audio assets as strictly-typed `HTMLAudioElement`s.

```bash
bwplay-cli generate-audio [--stdout] [--unpacked]
```

Each audio element is named after its location in your project directory.
Since assets are often stored in a common subdirectory, the common directory prefix is removed from the names of the members of the `Audio` object.

For example, assuming the following directory structure:

```shell
my-project/
├─ bwplay.json
├─ assets
│  ├─ music
│  │  ├─ song.wav
│  ├─ sounds
│  │  ├─ thud.wav
```

And the following config setting:

``` javascript
"audioFiles": ["assets/**/*.wav"],
```

The generated `Audio` code would look something like:

```typescript
export type Audio = {
  music_song: HTMLAudioElement,
  sounds_thud: HTMLAudioElement,
};
export const loadAudio = (): Promise<Audio> => { ... };
```

To reference this generated code in your project, you could write something like:

```typescript
import { Audio, loadAudio } from 'audio';
let AUDIO: Audio | null = null;
loadAudio().then(v => { AUDIO = v; }).catch(e => handleAudioError);
```

By default, generated audio code is written to the filesystem as specified by the [`audioScriptFile`]({{< relref "configuration.md#audiofiles" >}}) project setting.
However, you can pass `--stdout` to instead print the generated code to your terminal.

When the audio code is generated, the audio itself will be packed into the code as [data urls](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs).
This is meant to simplify the process of building and distributing your game.
If you want to avoid this behaviour, you can pass the `--unpacked` flag to the command, which will cause the audio in the code to be referenced by its filesystem path (relative to the project root).

{{< hint danger >}}
**Unpacked audio code**

`bwplay-cli` will not re-generate the audio code when you [export your project]({{< relref "exporting.md" >}}).
If you use `--unpacked` and then export your project, the exported apps may not be able to load your audio.
{{< /hint >}}
