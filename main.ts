#!/usr/bin/env node
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as http from 'http';
import * as path from 'path';
import * as yargs from 'yargs';
import * as glob from 'glob';

// The icons to generate
const ICON_SIZES: [number, number[]][] = [[64, [32, 48, 64]], [128, [72, 96, 128]], [192, [144, 168, 192]], [256, [256]], [512, [512]]];

const DEFAULT_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw1AUhU/TSlUqDi0i4pChOlkQFXHUKhShQqgVWnUweekfNGlIUlwcBdeCgz+LVQcXZ10dXAVB8AfE0clJ0UVKvK8ptIjxwuN9nHfP4b37AKFeZpoVGAc03TZTibiYya6KwVf40IMwAhiQmWXMSVISnvV1T91UdzGe5d33Z/WpOYsBPpF4lhmmTbxBPL1pG5z3iSOsKKvE58RjJl2Q+JHristvnAtNFnhmxEyn5okjxGKhg5UOZkVTI54ijqqaTvlCxmWV8xZnrVxlrXvyF4Zy+soy12kNI4FFLEGCCAVVlFCGjRjtOikWUnQe9/APNf0SuRRylcDIsYAKNMhNP/gf/J6tlZ+ccJNCcaDrxXE+RoDgLtCoOc73seM0TgD/M3Clt/2VOjDzSXqtrUWPgP5t4OK6rSl7wOUOMPhkyKbclPy0hHweeD+jb8oC4Vugd82dW+scpw9AmmaVvAEODoHRAmWve7y7u3Nu//a05vcD+ItydtB1d8wAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfmAQkTByAm7p8jAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAC5JREFUCNdjYMAD/v//////f+wSyNIQkgkux8jIiKwaKsHIyIhmGroOApbhcyoABB8j7ARV/woAAAAASUVORK5CYII=';

type ScreenOrientation = 'any' | 'portrait' | 'landscape';

function commonArrayPrefix<T>(values: T[][]): T[] {
    return values.length > 0 ? values.reduce((a, b) => {
        const acc = [];
        for (let i = 0; i < a.length; i++) {
            const vala = a[i];
            if (vala === undefined || vala !== b[i]) {
                break;
            }
            acc.push(vala);
        }
        return acc;
    }) : [];
}

async function applyGlobs(globs: string[]): Promise<string[]> {
    const results = await Promise.all(globs.map(g => new Promise<string[]>((resolve, reject) => glob(g, (err, matches) => err === null ? resolve(matches) : reject(err)))));
    return Array.from((new Set(results.flat())).values()).sort();
}

type ProjectConfig = {
    name: string,
    javascriptFiles: string[],
    audioFiles?: string[],
    audioScriptFile?: string,
    iconFile: string,
    screenOrientation: ScreenOrientation,
    androidPackageName?: string,
    androidVersionCode?: number,
    androidVersionName?: string,
    androidNetworkSecurityDomains?: string[],
};

const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
    name: "My Project",
    javascriptFiles: ["main.js"],
    iconFile: 'icon.png',
    screenOrientation: 'landscape',
    androidPackageName: 'com.example.my_project',
};

async function loadProjectConfig(): Promise<ProjectConfig> {
    let config: ProjectConfig = require(`${process.cwd()}/bwplay.json`);
    const jsf = await applyGlobs(config.javascriptFiles);
    config.javascriptFiles = jsf;
    let auf = config.audioFiles === undefined ? undefined : await applyGlobs(config.audioFiles);
    config.audioFiles = auf;
    return config;
}

function generateFileAndroidBuild(packageName: string, versionCode: number, versionName: string): string {
    return `plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    compileSdkVersion 30
    buildToolsVersion "30.0.3"

    defaultConfig {
        applicationId "${packageName}"
        minSdkVersion 16
        targetSdkVersion 30
        versionCode ${versionCode}
        versionName "${versionName}"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
    implementation 'androidx.core:core-ktx:1.3.1'
    implementation 'androidx.appcompat:appcompat:1.2.0'
    implementation 'com.google.android.material:material:1.2.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.0.1'
    implementation 'androidx.navigation:navigation-fragment-ktx:2.3.0'
    implementation 'androidx.navigation:navigation-ui-ktx:2.3.0'
    implementation "com.google.android.gms:play-services-instantapps:17.0.0"
    testImplementation 'junit:junit:4.+'
    androidTestImplementation 'androidx.test.ext:junit:1.1.2'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.3.0'
}
`;
}

function generateFileAndroidMainActivity(packageName: string): string {
    return `package ${packageName}

import android.app.Activity
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.Window
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebView
import java.io.BufferedReader
import java.io.InputStreamReader

// https://developer.android.com/guide/webapps
class MainActivity : Activity() { //AppCompatActivity() {
    private val flags = (View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)

    private fun updateUI() {
        window.decorView.systemUiVisibility = flags
        window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
            if ((visibility and View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                window.decorView.systemUiVisibility = flags
            }
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        newConfig.orientation = Configuration.ORIENTATION_LANDSCAPE
        super.onConfigurationChanged(newConfig)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.requestFeature(Window.FEATURE_NO_TITLE)
        updateUI()

        val resource = resources.openRawResource(R.raw.index)
        val reader = BufferedReader(InputStreamReader(resource, "UTF-8"))
        val stringBuilder = StringBuilder()
        while (true) {
            val line: String? = reader.readLine()
            stringBuilder.append(line.orEmpty())
            if (line == null) {
                break
            }
        }
        val data = stringBuilder.toString()

        val webView = WebView(applicationContext)
        webView.setBackgroundColor(Color.parseColor("#000000"))
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            webView.settings.mediaPlaybackRequiresUserGesture = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                Log.d("MyApplication", "\${message.sourceId()}:\${message.lineNumber()} \${message.message()}")
                return true
            }
        }
        setContentView(webView)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && packageManager.isInstantApp) {
            //Log.d("MyApplication", "INSTANT")
            webView.loadDataWithBaseURL(
                "file:///android_res/raw/index.html",
                data,
                "text/html",
                "UTF-8",
                null
            )
        } else {
            //Log.d("MyApplication", "NOT INSTANT")
            webView.loadDataWithBaseURL(
                "file:///android_res/raw/index.html",
                data,
                "text/html",
                "UTF-8",
                null
            )
        }
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }
}`;
}

function generateFileAndroidThemes(): string {
    return `<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.DefaultTheme" parent="Theme.MaterialComponents.DayNight.DarkActionBar">
        <item name="windowActionBar">false</item>
        <item name="android:windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowBackground">#FF000000</item>
        <item name="colorPrimary">#FF000000</item>
        <item name="colorOnPrimary">#FFFFFFFF</item>
    </style>
</resources>`;
}

function generateFileAndroidManifest(name: string, packageName: string, orientation: ScreenOrientation): string {
    const screenOrientation = orientation === 'any' ? 'unspecified' : orientation;
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    android:targetSandboxVersion="2"
    package="${packageName}"
    xmlns:dist="http://schemas.android.com/apk/distribution">
    <dist:module dist:instant="true" />
    <application
        android:allowBackup="true"
        android:label="${name}"
        android:icon="@mipmap/ic_launcher"
        android:screenOrientation="${screenOrientation}"
        android:supportsRtl="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.DefaultTheme">
        <activity
            android:name="${packageName}.MainActivity"
            android:label="${name}"
            android:screenOrientation="${screenOrientation}"
            android:theme="@style/Theme.DefaultTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
}

function generateFileAndroidNetworkSecurity(networkSecurityDomains: string[]): string {
    const nsds = networkSecurityDomains.map(nsd => `        <domain includeSubdomains="false">${nsd}</domain>`).join('\n')
    return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
${nsds}
    </domain-config>
</network-security-config>`;
}

function generateFileHTML(name: string, themeColor: string, javascripts: string[], embed: boolean): Promise<string> {
    const icons = ICON_SIZES.flatMap(([val, vals]) => {
        const sizes = vals.map(v => `${v}x${v}`).join(' ');
        return [
            `  <link rel="icon" type="image/png" sizes="${sizes}" href="icon.${val}.png">`,
            `  <link rel="apple-touch-icon" type="image/png" sizes="${sizes}" href="icon.${val}.png">`,
        ];
    }).join('\n');
    return Promise.all(javascripts.map(jst => embed ? fs.readFile(jst).then(c => `    <script>${c}</script>`) : Promise.resolve(`    <script src="${jst}"></script>`))).then(jstags => {
        const jstag = jstags.join("\n");
        // TODO: meta color-scheme and media=prefers-color-scheme ? https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name/theme-color
        return `<!DOCTYPE html>
<head>
  <title>${name}</title>
  <link rel="manifest" href="manifest.json">
${icons}
  <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
  <meta content="utf-8" http-equiv="encoding">
  <meta name="theme-color" content="${themeColor}">
</head>
<html lang="en" style="display:block;margin:0;padding:0;width:100%;height:100%;background-color:#000000;">
  <body style="display:block;margin:0;padding:0;width:100%;height:100%;background-color:#000000;">
${jstag}
  </body>
</html>`;
    });
}

function imagemagickResize(input: string, output: string, size: number): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path.dirname(output), { recursive: true }).then(_ => {
            exec(`convert ${input} -resize ${size}x${size} ${output}`, (err, stdout, stderr) => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }).catch(reject);
    });
}

function generateAudio(audioFiles: string[], pack: boolean): Promise<string> {
    const prelen = commonArrayPrefix(audioFiles.map(filename => path.parse(filename).dir.split(path.sep).filter(x => x))).length;
    const items: [string, string][] = audioFiles.map(filename => {
        const pathdata = path.parse(filename);
        const elements = pathdata.dir.split(path.sep).filter(x => x).slice(prelen);
        elements.push(pathdata.name);
        const item = elements.join('_');
        return [filename, item];
    });
    const decls = items.map(([_, item]) => `${item}: HTMLAudioElement`);
    const defs = items.map(([_, item]) => `${item}: new Audio()`);
    const loads = items.map(([_, item]) => `        result.${item}.addEventListener('canplaythrough', next);`);
    const aborts = items.map(([_, item]) => `        result.${item}.addEventListener('abort', reject);`);
    const errors = items.map(([_, item]) => `        result.${item}.addEventListener('error', reject);`);
    return Promise.all(items.map(async ([filename, item]) => {
        const pathdata = path.parse(filename);
        const dataPromise = pack ? fs.readFile(filename).then(b => `data:audio/wav;base64,${b.toString('base64')}`) : new Promise((res, _) => res(filename));
        const data = await dataPromise;
        return `        result.${item}.src = '${data}';`;
    })).then(srcs => {
        return `export type Audio = { ${decls.join(', ')} };
export const loadAudio = (): Promise<Audio> => {
    return new Promise((resolve, reject) => {
        const result = { ${defs.join(', ')} };
        let remaining = ${items.length + 1};
        const next = () => {
            remaining -= 1;
            if (remaining === 0) {
                resolve(result);
            }
        };
        next();
${loads.join('\n')}
${aborts.join('\n')}
${errors.join('\n')}
${srcs.join('\n')}
    });
};`;
    });
}

async function exportAndroid(output: string, name: string, packageName: string, iconFile: string, javascripts: string[], orientation: ScreenOrientation, versionCode: number, versionName: string, networkSecurityDomains: string[]): Promise<void> {
    const sizes: [string, number][] = [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]];
    // TODO: make this flexible
    const themeColor = "#666666";
    const manifest = generateFileAndroidManifest(name, packageName, orientation);
    const networkSecurity = generateFileAndroidNetworkSecurity(networkSecurityDomains);
    const mainActivity = generateFileAndroidMainActivity(packageName);
    const themes = generateFileAndroidThemes();
    const icLauncher = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`;
    const html = await generateFileHTML(name, themeColor, javascripts, true);
    const files: [string, string][] = [
        ['app/src/main/AndroidManifest.xml', manifest],
        [`app/src/main/java/${packageName.replace('.', '/')}/MainActivity.kt`, mainActivity],
        ['app/src/main/res/drawable/ic_launcher_background.xml', ''],
        ['app/src/main/res/drawable-v24/ic_launcher_foreground.xml', ''],
        ['app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', icLauncher],
        ['app/src/main/res/raw/index.html', html],
        ['app/src/main/res/values/themes.xml', themes],
        ['app/src/main/res/xml/network_security_config.xml', networkSecurity],
        ['app/build.gradle', generateFileAndroidBuild(packageName, versionCode, versionName)],
        ['app/proguard-rules.pro', ''],
    ];
    await Promise.all(sizes.map(([name, size]) => imagemagickResize(iconFile, `${output}/app/src/main/res/mipmap-${name}/ic_launcher.png`, size)));
    await Promise.all(files.map(([filename, content]) => fs.mkdir(path.dirname(`${output}/${filename}`), { recursive: true }).then(_ => fs.writeFile(`${output}/${filename}`, content))));
}

async function exportWeb(output: string, name: string, iconFile: string, javascripts: string[], orientation: ScreenOrientation): Promise<void> {
    // TODO: make this flexible
    const themeColor = "#666666";
    let manifest = {
        "background_color": "black",
        "display": "fullscreen",
        "icons": ICON_SIZES.map(([val, vals]) => {
            return {
                "src": `/icon.${val}.png`,
                "sizes": vals.map(v => `${v}x${v}`).join(' '),
                "type": "image/png",
                "purpose": "maskable",
            }
        }),
        "name": name,
        "short_name": name,
        "orientation": orientation,
        "start_url": "/",
        "theme_color": themeColor,
    };
    const html = await generateFileHTML(name, themeColor, javascripts, true);
    const sizes = ICON_SIZES.map(([v, _]) => v);
    await Promise.all(sizes.map(size => imagemagickResize(iconFile, `${output}/icon.${size}.png`, size))).then(_ => {
        const manifestString = JSON.stringify(manifest, null, 4);
        fs.writeFile(`${output}/manifest.json`, manifestString).then(_ => fs.writeFile(`${output}/index.html`, html));
    });
}

async function spawnJavascriptWatcher(): Promise<() => string[]> {
    let javascriptFiles: string[] = [];
    const recurse = async () => {
        const config = await loadProjectConfig();
        javascriptFiles = config.javascriptFiles;
        setTimeout(recurse, 1000);
    }
    await recurse();
    return () => javascriptFiles;
}

async function spawnAudioWatcher(): Promise<() => string[]> {
    const writeAudio = (files: string[], path: string | undefined) => generateAudio(files, true).then(d => fs.writeFile(path || 'audio.ts', d));
    let lastAudioFiles: string[] | undefined = [];
    const recurse = async () => {
        const config = await loadProjectConfig();
        const audioFiles = config.audioFiles || [];
        if (audioFiles !== lastAudioFiles) {
            if (audioFiles !== undefined) {
                await writeAudio(audioFiles, config.audioScriptFile);
            }
            lastAudioFiles = audioFiles;
        }
        setTimeout(recurse, 1000);
    };
    await recurse();
    return () => lastAudioFiles || [];
}

async function serve(name: string): Promise<void> {
    // TODO: make this flexible
    const themeColor = "#666666";
    const getJavascriptFiles = await spawnJavascriptWatcher();
    const getAudioFiles = await spawnAudioWatcher();
    const html = await generateFileHTML(name, themeColor, getJavascriptFiles(), false);
    http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        if (url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(html);
            return;
        }
        const filename = url.pathname.substr(1);
        fs.readFile(`.${url.pathname}`).then(b => {
            if (getJavascriptFiles().includes(filename)) {
                res.writeHead(200, { 'Content-Type': 'text/javascript; charset=UTF-8' })
            } else if (getAudioFiles().includes(filename)) {
                res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            } else {
                res.writeHead(403);
                b = Buffer.from('Forbidden (file is not included in project settings)');
            }
            res.end(b);
        }).catch(err => {
            res.writeHead(err.code === 'ENOENT' ? 404 : 500);
            res.end(err.code === 'ENOENT' ? 'Not Found (file does not exist)' : JSON.stringify(err));
        });
    }).listen(8080);
}

yargs.command(
    'new',
    'Generate a new bwplay.json config file',
    (yargs) => { },
    (argv) => {
        fs.access('bwplay.json').then(_ => {
            console.log('The file `bwplay.json` already exists in this directory.');
            console.log('If you want to generate a new config file, please remove the old one first.');
        }).catch(_ => {
            fs.writeFile('bwplay.json', JSON.stringify(DEFAULT_PROJECT_CONFIG, undefined, 2));
        });
        fs.access('icon.png').then(_ => {
            console.log('The file `icon.png` already exists and will not be overwritten.');
        }).catch(_ => {
            fs.writeFile('icon.png', Buffer.from(DEFAULT_ICON_BASE64, 'base64'));
        });
    }
).command(
    'export',
    'Export a project to different targets',
    (yargs) => { },
    (argv) => loadProjectConfig().then(config => {
        let promises = [exportWeb(
            'export/web',
            config.name,
            config.iconFile,
            config.javascriptFiles,
            config.screenOrientation,
        )];
        if (config.androidPackageName !== undefined) {
            promises.push(exportAndroid(
                'export/android',
                config.name,
                config.androidPackageName,
                config.iconFile,
                config.javascriptFiles,
                config.screenOrientation,
                config.androidVersionCode || 10001,
                config.androidVersionName || "0.1",
                config.androidNetworkSecurityDomains || [],
            ));
        }
        Promise.all(promises);
    }),
).command(
    'generate-audio',
    'generate audio',
    (yargs) => yargs.options({
        unpacked: {
            describe: 'do not pack the audio into the code as data urls',
            type: 'boolean',
            default: false,
        },
        stdout: {
            describe: 'write the code to stdout instead of to the filesystem',
            type: 'boolean',
            default: false,
        }
    }),
    (argv) => loadProjectConfig().then(config => {
        generateAudio(config.audioFiles || [], !argv.unpacked).then((output) => argv.stdout ? console.log(output) : fs.writeFile(config.audioScriptFile || 'audio.ts', output));
    }),
).command(
    'serve',
    'serve',
    (yargs) => { },
    (argv) => loadProjectConfig().then(config => {
        serve(config.name);
    }),
).demandCommand().strict().argv;