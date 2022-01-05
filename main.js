#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");
const yargs = require("yargs");
const glob = require("glob");
// The icons to generate
const ICON_SIZES = [[64, [32, 48, 64]], [128, [72, 96, 128]], [192, [144, 168, 192]], [256, [256]], [512, [512]]];
function commonArrayPrefix(values) {
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
function applyGlobs(globs) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield Promise.all(globs.map(g => new Promise((resolve, reject) => glob(g, (err, matches) => err === null ? resolve(matches) : reject(err)))));
        return Array.from((new Set(results.flat())).values()).sort();
    });
}
function loadProjectConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        let config = require(`${process.cwd()}/bwplay.json`);
        const jsf = yield applyGlobs(config.javascriptFiles);
        config.javascriptFiles = jsf;
        let auf = config.audioFiles === undefined ? undefined : yield applyGlobs(config.audioFiles);
        config.audioFiles = auf;
        return config;
    });
}
function generateFileAndroidBuild(packageName, versionCode, versionName) {
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
function generateFileAndroidMainActivity(packageName) {
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
function generateFileAndroidThemes() {
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
function generateFileAndroidManifest(name, packageName, orientation) {
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
function generateFileAndroidNetworkSecurity(networkSecurityDomains) {
    const nsds = networkSecurityDomains.map(nsd => `        <domain includeSubdomains="false">${nsd}</domain>`).join('\n');
    return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
${nsds}
    </domain-config>
</network-security-config>`;
}
function generateFileHTML(name, themeColor, javascripts, embed) {
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
function imagemagickResize(input, output, size) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path.dirname(output), { recursive: true }).then(_ => {
            (0, child_process_1.exec)(`convert ${input} -resize ${size}x${size} ${output}`, (err, stdout, stderr) => {
                if (err != null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        }).catch(reject);
    });
}
function generateAudio(audioFiles, pack) {
    const prelen = commonArrayPrefix(audioFiles.map(filename => path.parse(filename).dir.split(path.sep).filter(x => x))).length;
    const items = audioFiles.map(filename => {
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
    return Promise.all(items.map(([filename, item]) => __awaiter(this, void 0, void 0, function* () {
        const pathdata = path.parse(filename);
        const dataPromise = pack ? fs.readFile(filename).then(b => `data:audio/wav;base64,${b.toString('base64')}`) : new Promise((res, _) => res(filename));
        const data = yield dataPromise;
        return `        result.${item}.src = '${data}';`;
    }))).then(srcs => {
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
function buildAndroid(output, name, packageName, iconFile, javascripts, orientation, versionCode, versionName, networkSecurityDomains) {
    return __awaiter(this, void 0, void 0, function* () {
        const sizes = [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]];
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
        const html = yield generateFileHTML(name, themeColor, javascripts, true);
        const files = [
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
        yield Promise.all(sizes.map(([name, size]) => imagemagickResize(iconFile, `${output}/app/src/main/res/mipmap-${name}/ic_launcher.png`, size)));
        yield Promise.all(files.map(([filename, content]) => fs.mkdir(path.dirname(`${output}/${filename}`), { recursive: true }).then(_ => fs.writeFile(`${output}/${filename}`, content))));
    });
}
function buildWeb(output, name, iconFile, javascripts, orientation) {
    return __awaiter(this, void 0, void 0, function* () {
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
                };
            }),
            "name": name,
            "short_name": name,
            "orientation": orientation,
            "start_url": "/",
            "theme_color": themeColor,
        };
        const html = yield generateFileHTML(name, themeColor, javascripts, true);
        const sizes = ICON_SIZES.map(([v, _]) => v);
        yield Promise.all(sizes.map(size => imagemagickResize(iconFile, `${output}/icon.${size}.png`, size))).then(_ => {
            const manifestString = JSON.stringify(manifest, null, 4);
            fs.writeFile(`${output}/manifest.json`, manifestString).then(_ => fs.writeFile(`${output}/index.html`, html));
        });
    });
}
function spawnJavascriptWatcher() {
    return __awaiter(this, void 0, void 0, function* () {
        let javascriptFiles = [];
        const recurse = () => __awaiter(this, void 0, void 0, function* () {
            const config = yield loadProjectConfig();
            javascriptFiles = config.javascriptFiles;
            setTimeout(recurse, 1000);
        });
        yield recurse();
        return () => javascriptFiles;
    });
}
function spawnAudioWatcher() {
    return __awaiter(this, void 0, void 0, function* () {
        const writeAudio = (files, path) => generateAudio(files, true).then(d => fs.writeFile(path || 'audio.ts', d));
        let lastAudioFiles = [];
        const recurse = () => __awaiter(this, void 0, void 0, function* () {
            const config = yield loadProjectConfig();
            const audioFiles = config.audioFiles || [];
            if (audioFiles !== lastAudioFiles) {
                if (audioFiles !== undefined) {
                    yield writeAudio(audioFiles, config.audioScriptFile);
                }
                lastAudioFiles = audioFiles;
            }
            setTimeout(recurse, 1000);
        });
        yield recurse();
        return () => lastAudioFiles || [];
    });
}
function serve(name) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: make this flexible
        const themeColor = "#666666";
        const getJavascriptFiles = yield spawnJavascriptWatcher();
        const getAudioFiles = yield spawnAudioWatcher();
        const html = yield generateFileHTML(name, themeColor, getJavascriptFiles(), false);
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
                    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=UTF-8' });
                }
                else if (getAudioFiles().includes(filename)) {
                    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                }
                else {
                    res.writeHead(403);
                    b = Buffer.from('Forbidden (file is not included in project settings)');
                }
                res.end(b);
            }).catch(err => {
                res.writeHead(err.code === 'ENOENT' ? 404 : 500);
                res.end(err.code === 'ENOENT' ? 'Not Found (file does not exist)' : JSON.stringify(err));
            });
        }).listen(8080);
    });
}
yargs.command('build', 'build', (yargs) => { }, (argv) => loadProjectConfig().then(config => {
    let promises = [buildWeb('build/web', config.name, config.iconFile, config.javascriptFiles, config.screenOrientation)];
    if (config.androidPackageName !== undefined) {
        promises.push(buildAndroid('build/android', config.name, config.androidPackageName, config.iconFile, config.javascriptFiles, config.screenOrientation, config.androidVersionCode || 10001, config.androidVersionName || "0.1", config.androidNetworkSecurityDomains || []));
    }
    Promise.all(promises);
})).command('generate-audio', 'generate audio', (yargs) => yargs.options({
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
}), (argv) => loadProjectConfig().then(config => {
    generateAudio(config.audioFiles || [], !argv.unpacked).then((output) => argv.stdout ? console.log(output) : fs.writeFile(config.audioScriptFile || 'audio.ts', output));
})).command('serve', 'serve', (yargs) => { }, (argv) => loadProjectConfig().then(config => {
    serve(config.name);
})).demandCommand().strict().argv;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsaURBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQyw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFLN0Isd0JBQXdCO0FBQ3hCLE1BQU0sVUFBVSxHQUF5QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUl4SSxTQUFTLGlCQUFpQixDQUFJLE1BQWE7SUFDdkMsT0FBTyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM5QyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JDLE1BQU07YUFDVDtZQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbEI7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