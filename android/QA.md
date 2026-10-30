# Android validation — 30 October 2026

The delivered `PinAI-Android-v1.0.0.apk` is an installable, debug-signed testing build. It has not been certified as a fully device-verified or Play Store release.

## Passed

- Original fresh SDK 35 build: 47 tasks executed successfully.
- Android lint: no issues in the delivered app.
- Five native URL-validation tests and 281 shared-code tests.
- Web and Android TypeScript checks, ESLint, standalone UI build and existing production web build.
- Standalone UI rendering at 390×844 and 1280×800, with no horizontal overflow, console errors, page exceptions or external requests.
- APK v2 signature and alignment verification; package metadata and bundled assets inspected.
- The new instrumentation test APK compiles successfully. Compilation does not prove the runtime assertions pass.

## Runtime checks still pending

The host has no usable VMX/SVM hardware acceleration. An AOSP API 35 x86_64 emulator was started with software acceleration, but Android did not reach `sys.boot_completed=1` within 360 seconds. The controller terminated that isolated emulator after the timeout. The app was not installed or launched on that emulator, so none of the instrumentation assertions are recorded as passed.

The test host also failed to resolve `example.com` with `EAI_AGAIN`. This limits public-host network testing in this environment and is not evidence of a defect on an Android phone.

The compiled runtime harness covers:

- Initial bundled UI launch.
- JavaScript-to-Android request/reply transport and large Unicode chunking.
- Private-address rejection and missing-key Grok fallback.
- Android Keystore encryption with a disposable fixture key.
- Notes, session search, Back handling and persisted history after Activity recreation.
- Export bytes written to a real system content URI using an intercepted document-picker result. Actual file-picker navigation remains a device check.

Physical-device checks, successful instrumentation execution, live public HTTPS reads, real keyboard behavior, and paid Grok requests remain unverified. No real API key or paid Grok request was used during testing.

## Artifact identity

- Application ID: `com.pincodeit.pinai`
- Version: `1.0.0` / version code `1`
- Minimum Android: 8.0 / API 26; target and compile API 35.
- Size: 1,312,233 bytes.
- SHA-256: `b096aa05d023e019aabf538ebb6923c05cd59d475b1a955a641b61472f8be5c7`.

The production app source was not changed by this verification follow-up. The original APK remains the current download; no replacement APK was issued merely for added test code.
