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
brew install node@22 openjdk@17
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
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

For iOS/macOS builds, also install Xcode from the App Store and run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### Linux / WSL

Install JDK 17 and Android command-line tools or use Android Studio on Windows/macOS. This current workspace is WSL and does not have Java installed, so APK builds cannot run here until those prerequisites exist.

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
