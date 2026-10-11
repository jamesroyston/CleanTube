# CleanTube iOS shell

A thin native iOS app (SwiftUI + one full-screen `WKWebView`) around the **live HTTPS site**. There's no local bundle. YouTube embeds need a real HTTPS origin/Referer, otherwise they fail with error 153.

Its purpose is to test whether a native shell keeps app state alive in the background longer than the home-screen PWA.

- **Start URL:** `AppConfig.startURL` in `CleanTube/AppConfig.swift` (`https://cleantubething.vercel.app/`). Change it if production moves to a custom domain.
- **Bundle id:** `com.example.cleantube` is a placeholder. Sideloadly and AltStore re-sign the app with your own id anyway.
- **Minimum iOS:** 17. Supports iPhone only.

## What the shell does

- It loads the site edge-to-edge (`ignoresSafeArea`, `contentInsetAdjustmentBehavior = .never`), so the web app's `env(safe-area-inset-*)` rules work the way they do in the PWA.
- It allows inline, autoplaying, and picture-in-picture media.
- It uses the persistent `WKWebsiteDataStore.default()`, so Supabase cookies, localStorage, and IndexedDB survive relaunches.
- `isInspectable = true` lets you attach Safari's Web Inspector from a Mac: open Safari, then the Develop menu, then your iPhone, then CleanTube.
- It saves the last same-origin URL on every URL change, including client-side `pushState` navigations, and when the app goes inactive or to the background. On a cold launch it restores that URL if it was saved less than 12 hours ago. Otherwise it loads the start URL.
- If iOS kills the web page's process while the app itself stays alive (`webViewWebContentProcessDidTerminate`), the shell reloads the last saved URL right away. It also reloads if the web view comes back blank when you reopen the app.
- **Link routing:** links to the site itself and to YouTube, ytimg, googlevideo, accounts.google.com, and supabase.co stay in the app. Other full-page links open in Safari. Embedded frames (iframes) are never blocked. Links that try to open a new window (`window.open` or `target=_blank`) load in the app if they point to the site or YouTube, and open in Safari otherwise.
- Swiping from the screen edge goes back or forward. That way you're never stuck on a full YouTube page with no way back.
- There's no pull-to-refresh. `scrollView.bounces = false` turns off the rubber-band effect on the page as a whole. Scrolling still works, and scrollable areas inside the page still bounce. If that feels wrong, delete that one line in `WebViewStore.swift`.
- Dark styling: the background is #141816 for the launch screen, the window, and the web view, and the status bar uses light text.
- There's no `UIBackgroundModes` entry, so the app doesn't get extra background time for audio.

### Debug counters

**Tap with three fingers anywhere** to show or hide an overlay with:

- Cold launches.
- Times iOS killed the web page's process (WebContent terminations), and when that last happened.
- How long the last background stretch lasted, and how many of those terminations happened during it.
- Whether the previous session was killed while in the background. The app can't tell this apart from you swiping it away in the app switcher.

The same events are logged with `os.Logger` (subsystem `com.example.cleantube`, category `Shell`). You can watch them in Console.app with the phone connected.

## Generate the Xcode project

`CleanTube.xcodeproj` is checked in and builds as-is. `project.yml` is the XcodeGen version of the same project, if you'd rather generate it:

```sh
brew install xcodegen
cd ios && xcodegen generate
```

## Build an unsigned IPA for Sideloadly or AltStore

From the command line (no Apple account needed):

```sh
cd ios
xcodebuild -project CleanTube.xcodeproj -scheme CleanTube -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO build
rm -rf build/ipa && mkdir -p build/ipa/Payload
cp -R build/DerivedData/Build/Products/Release-iphoneos/CleanTube.app build/ipa/Payload/
(cd build/ipa && zip -qry CleanTube.ipa Payload)
# Result: ios/build/ipa/CleanTube.ipa
```

Alternatively, archive it:

```sh
xcodebuild -project CleanTube.xcodeproj -scheme CleanTube -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/CleanTube.xcarchive \
  CODE_SIGNING_ALLOWED=NO archive
mkdir -p build/ipa/Payload && cp -R build/CleanTube.xcarchive/Products/Applications/CleanTube.app build/ipa/Payload/
(cd build/ipa && zip -qry CleanTube.ipa Payload)
```

In the Xcode app, you can use Product → Archive. Then right-click the archive in the Organizer, choose Show in Finder, and Show Package Contents. Copy `Products/Applications/CleanTube.app` into a folder named `Payload`, zip that folder, and rename the zip to `.ipa`.

## Install

**Sideloadly** (Mac or Windows):

1. Connect the iPhone by USB and trust the computer.
2. Drag `CleanTube.ipa` into Sideloadly.
3. Enter your Apple ID and press Start.
4. On the phone, go to Settings → General → VPN & Device Management and trust your Apple ID's developer profile.
5. On iOS 16 and later, also turn on Settings → Privacy & Security → Developer Mode and restart the phone.

**AltStore:**

1. Install AltServer on the Mac or PC, then install AltStore on the phone through it.
2. Copy the IPA to the phone using AirDrop or the Files app.
3. In AltStore, go to My Apps, tap +, and pick the IPA.
4. Keep AltServer running on the same Wi-Fi network so AltStore can refresh the signature automatically.

**Free Apple ID limits:**

- Signatures expire after **7 days**. Re-sign with Sideloadly, or refresh in AltStore, before then. An expired app won't open, but its data is kept.
- At most **3 sideloaded apps** at once (AltStore itself counts as one).
- At most 10 new app IDs per 7 days.

## Passkeys won't work in the shell

To use WebAuthn or passkeys for the site's domain, a native app needs an **Associated Domains** entitlement (`webcredentials:<domain>`). That requires a paid Apple Developer account and an `apple-app-site-association` file on the site. **Sign in with email and password inside the shell.**

Google sign-in through Supabase (accounts.google.com) may also be refused inside an embedded web view with a `disallowed_useragent` error. If that happens, use password sign-in.

## Test protocol

Run each step in the shell **and** in the home-screen PWA on the same phone, under similar conditions.

1. Sign in, open a video, and play it to a memorable timestamp. Then pause, or leave it playing, and note what you did.
2. Background the app, then use the phone normally: camera, a game, a couple of heavy apps, Safari tabs. Use three durations:
   - **5 minutes**
   - **30 minutes**
   - **120 minutes**
3. Reopen the app and record:
   - **Survived?** Same page with no reload, no flash, no spinner.
   - **Restored to the video?** If the page reloaded, did it come back to the same video URL?
   - **Resumed at the right second?** Compare against the timestamp from step 1.
   - For the shell, open the debug overlay with a three-finger tap. Note the termination count and the last background duration, and whether the previous session was killed while backgrounded (that means it was a cold launch).
4. Repeat each duration at least twice. Compare the shell's and the PWA's survival rates.

In the overlay, "terminations during" greater than 0 with no cold launch means iOS killed only the web page and the shell reloaded it. A new cold launch means iOS killed the whole app.
