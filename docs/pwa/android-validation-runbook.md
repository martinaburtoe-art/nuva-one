# Nüva One — Android PWA validation runbook

**Status:** ready for device validation; no physical Android/iOS result is claimed by this document.
**Preview builds:** use the latest READY Vercel deployment attached to PR #316 or the combined PR #318 preview. Do not use a QUEUED/BUILDING deployment.

## Preconditions

- Android device with a current Chrome browser.
- Device online; open the HTTPS preview URL in Chrome (not an embedded browser).
- Test account and demo business with synthetic data only.
- Ensure the preview commit includes `public/manifest.webmanifest`, `public/sw.js`, and the latest PWA lifecycle code.

## Install test

1. Open the preview URL in Chrome.
2. Sign in to the test account and confirm the dashboard loads.
3. Wait for the Nüva One install prompt or open Chrome's ⋮ menu and choose **Install app** / **Add to Home screen**.
4. Confirm the app icon and name are Nüva One.
5. Launch it from the home screen; confirm it opens in standalone display and routes to the dashboard/authentication flow correctly.
6. Navigate to Resumen, Caja, Ventas and Inventario; verify the bottom navigation does not cover content or the AI assistant.
7. Open Más, search for “finanzas” and “personas”, open a permitted module and return to Resumen.
8. Sign out and confirm private business data is not visible from a new unauthenticated launch.

## Update test

1. Keep the installed PWA open and record the current release/commit shown by the preview.
2. Publish a new preview build that changes a harmless visible release marker and the service-worker script.
3. Reopen the PWA or bring it to the foreground while online.
4. Confirm the update notification appears only after the new worker is installed and waiting.
5. Tap **Actualizar**; confirm the new worker takes control and the app reloads once.
6. Confirm the updated release marker is visible and the dashboard still loads.
7. Repeat after closing/reopening the PWA to ensure the old worker does not reappear.

## Security and cache assertions

- `/dashboard`, HTML navigation, API calls, Supabase responses, user documents and authentication/session data must never be served from Cache Storage.
- Only same-origin, content-hashed files under `/assets/` may be cached.
- Confirm cache size stays at or below 120 asset entries after loading multiple builds.
- Confirm a new service worker clears the previous `nuva-static-*` cache namespace.
- Confirm offline mode does not show stale authenticated data. The app may display its offline state; private business data must not be replayed from cache.

## Evidence to record

- Device model, Android version and Chrome version.
- Exact preview URL and commit SHA.
- Install method and whether standalone mode was detected.
- Screenshot of the app icon/home-screen launch.
- Screenshot of the Resumen mobile viewport and Más search.
- Old/new commit SHA and observed update prompt/action.
- Browser console errors and service-worker registration state.
- Result for every security/cache assertion.

## Release decision

- **PASS:** all install, navigation, update and cache/security assertions pass on a physical device.
- **WARN:** install works but an OS/browser-specific behavior remains inconsistent; do not claim full mobile certification.
- **FAIL:** stale authenticated data is replayed, update does not apply, the app cannot launch, or navigation blocks core tasks.
- A Vercel READY deployment or a passing CI run is not a substitute for physical-device validation.
