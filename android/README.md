# PinAI for Android

An installable Android app with the existing PinAI React terminal bundled inside the APK. It does not load a hosted website or require the web backend to be deployed.

## What works

- Public scans, headers, technology detection and API-path observations run through Android's native HTTP client.
- Shared TypeScript generates the same reports, policy observations, timings, repeat-read comparisons, session search and notes as the web app.
- The interface and saved sessions are available offline. Reading public sites and using Grok require an internet connection.
- Report and session exports open Android's system file picker. No storage permission is required.
- **Grok key** opens a native settings dialog. Your optional xAI key is encrypted with Android Keystore and never exposed to JavaScript or bundled in the APK. Chat sends messages directly to xAI and can consume paid API credits.
- Android Back closes an open sheet/search, then asks before closing the app. The keyboard, status bar and navigation bar have dedicated inset handling.

Requires Android 8.0 or newer and an up-to-date Android System WebView. The generated artifact is a debug-signed testing APK for direct installation, not a Play Store release. Release signing and physical-device QA are separate release steps.

## Build

Use Node 24, JDK 17, Gradle 8.9 and Android SDK 35:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run typecheck:android
npm test
npm run build:android:web
cd android
gradle testDebugUnitTest lintDebug assembleDebug
```

The GitHub Actions workflow is configured to build and verify `PinAI-Android-v1.0.0.apk` on the Android branch and relevant main-branch updates. Successful artifacts include the SHA-256 checksum. The bundle is generated from source during each build; generated assets, build output and signing keys are not committed.

## Isolation

Only bundled assets load inside the WebView, from `https://appassets.androidplatform.net`. File/content access, mixed content, popups and external navigation are disabled. A resource interceptor rejects every non-asset request. The content security policy blocks frames and connections from page scripts. Target HTML is parsed as data and rendered as escaped React text, never executed.

Native requests reject private/local/reserved destinations, credentials and unusual ports. DNS results and redirect destinations are checked, and each page request has a 12-second budget. Public NAT64 destinations are supported for mobile networks. The application permits cleartext HTTP only so its native public reader can inspect HTTP sites; the WebView itself cannot load remote HTTP content. DNS validation is not connection pinning.

No hosted accounts, database or backend credentials are required. Local notes/session data remain in WebView storage. API-key backup is disabled together with app backup.
