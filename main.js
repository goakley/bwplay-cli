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
const DEFAULT_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw1AUhU/TSlUqDi0i4pChOlkQFXHUKhShQqgVWnUweekfNGlIUlwcBdeCgz+LVQcXZ10dXAVB8AfE0clJ0UVKvK8ptIjxwuN9nHfP4b37AKFeZpoVGAc03TZTibiYya6KwVf40IMwAhiQmWXMSVISnvV1T91UdzGe5d33Z/WpOYsBPpF4lhmmTbxBPL1pG5z3iSOsKKvE58RjJl2Q+JHristvnAtNFnhmxEyn5okjxGKhg5UOZkVTI54ijqqaTvlCxmWV8xZnrVxlrXvyF4Zy+soy12kNI4FFLEGCCAVVlFCGjRjtOikWUnQe9/APNf0SuRRylcDIsYAKNMhNP/gf/J6tlZ+ccJNCcaDrxXE+RoDgLtCoOc73seM0TgD/M3Clt/2VOjDzSXqtrUWPgP5t4OK6rSl7wOUOMPhkyKbclPy0hHweeD+jb8oC4Vugd82dW+scpw9AmmaVvAEODoHRAmWve7y7u3Nu//a05vcD+ItydtB1d8wAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfmAQkTByAm7p8jAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAC5JREFUCNdjYMAD/v//////f+wSyNIQkgkux8jIiKwaKsHIyIhmGroOApbhcyoABB8j7ARV/woAAAAASUVORK5CYII=';
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
const DEFAULT_PROJECT_CONFIG = {
    name: "My Project",
    javascriptFiles: ["main.js"],
    iconFile: 'icon.png',
    screenOrientation: 'landscape',
    androidPackageName: 'com.example.my_project',
};
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
function exportAndroid(output, name, packageName, iconFile, javascripts, orientation, versionCode, versionName, networkSecurityDomains) {
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
function exportWeb(output, name, iconFile, javascripts, orientation) {
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
yargs.command('new', 'Generate a new bwplay.json config file', (yargs) => { }, (argv) => {
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
}).command('export', 'Export a project to different targets', (yargs) => { }, (argv) => loadProjectConfig().then(config => {
    let promises = [exportWeb('export/web', config.name, config.iconFile, config.javascriptFiles, config.screenOrientation)];
    if (config.androidPackageName !== undefined) {
        promises.push(exportAndroid('export/android', config.name, config.androidPackageName, config.iconFile, config.javascriptFiles, config.screenOrientation, config.androidVersionCode || 10001, config.androidVersionName || "0.1", config.androidNetworkSecurityDomains || []));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQ0EsaURBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQyw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFFN0Isd0JBQXdCO0FBQ3hCLE1BQU0sVUFBVSxHQUF5QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUV4SSxNQUFNLG1CQUFtQixHQUFHLDB3QkFBMHdCLENBQUM7QUFJdnlCLFNBQVMsaUJBQWlCLENBQUksTUFBYTtJQUN2QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzlDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixJQUFJLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDckMsTUFBTTthQUNUO1lBQ0QsR0FB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