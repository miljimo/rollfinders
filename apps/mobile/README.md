# RollFinders Mobile Native Shell

This app is a Capacitor WebView shell for the production mobile web app:

```text
https://rollfinders.com/mobile
```

The native shell must stay thin. Product UI, auth, registration, discovery, bookings, and profile behavior live in `apps/portal/src/app/mobile`.

## Prerequisites

### macOS

Install:

```bash
brew install node@22 openjdk@21
brew install --cask android-studio
brew install cocoapods
```

Then open Android Studio once and install:

- Android SDK Platform 35 or newer
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator, if local emulator testing is needed

Set environment variables in your shell profile:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

For iOS/macOS builds, also install Xcode from the App Store and run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### Linux / WSL

Install JDK 21 and Android command-line tools or use Android Studio on Windows/macOS.

## First-Time Setup

From the repository root:

```bash
npm install
npm run mobile:sync
```

## Android Debug APK

```bash
npm run mobile:android:apk
```

Expected output:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Android Release Bundle

```bash
npm run mobile:android:aab
```

Expected output:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

Release signing is intentionally not hard-coded. Add signing configuration through Android Studio or CI secrets before Play Store submission.

## Google Play Testing Release

The automated release scripts target the Google Play internal testing track by default. They require explicit version arguments and environment-provided secrets.

Required release signing environment:

```bash
export ANDROID_KEYSTORE_PATH="/absolute/path/to/release.keystore"
export ANDROID_KEYSTORE_PASSWORD="..."
export ANDROID_KEY_ALIAS="..."
export ANDROID_KEY_PASSWORD="..."
```

Required Google Play upload environment:

```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="/absolute/path/to/google-play-service-account.json"
export GOOGLE_PLAY_PACKAGE_NAME="oepe.rollfinders"
export GOOGLE_PLAY_TRACK="internal"
export GOOGLE_PLAY_UPLOAD_APPROVED="true"
```

Build a signed bundle without uploading:

```bash
npm run mobile:android:release:build -- --versionCode 2 --versionName 1.0.1
```

Expected output:

```text
bin/android/rollfinders-1.0.1-2.aab
```

Upload to Google Play internal testing:

```bash
npm run mobile:android:release:publish -- --versionCode 2 --versionName 1.0.1
```

The upload script refuses non-internal tracks unless `GOOGLE_PLAY_NON_INTERNAL_APPROVED=true` is also set.

For an app that is still in the Google Play draft-app state, create the first
production-track release as a draft:

```bash
GOOGLE_PLAY_TRACK=production \
GOOGLE_PLAY_NON_INTERNAL_APPROVED=true \
npm run mobile:android:release:publish -- \
  --versionCode 3 \
  --versionName 1.0.2 \
  --track production \
  --status draft
```

After the Play Console store listing and app-content requirements are complete,
promote the production release through Play Console review. A draft app cannot
accept a completed release through the Android Publisher API.

## Open Native Projects

```bash
npm run mobile:android:open
```

## iOS / macOS Project

On a Mac with Xcode:

```bash
npm run mobile:ios:sync
npm run mobile:ios:open
```

Create an `.ipa` from Xcode using Product > Archive, then Distribute App. Signing must be configured with an Apple Developer account.

## Runtime URL

The shell loads the hosted mobile app:

```text
https://rollfinders.com/mobile
```

For local WebView testing, temporarily set `server.url` in `capacitor.config.ts` to a reachable HTTPS tunnel or LAN URL. Android emulators cannot reach the host app through `localhost`.

## Release Boundaries

- Do not add CRM, admin, subscription, access-key, or platform-management screens to this app.
- External payment pages must open through the system browser or approved browser tabs.
- Native code should only handle app shell concerns: splash screen, back button, offline state, version metadata, and safe external-link routing.
