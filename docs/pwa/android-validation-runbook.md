# Nüva One — Android PWA validation runbook

**Status:** ready for device validation; no physical Android/iOS result is claimed by this document.
**Production install baseline (verified 2026-11-13):** https://nuva-one.vercel.app is aliased to a Vercel READY production deployment at commit `d435d081291e026a8e98746a84c35ff681fdf175`. This main commit includes the PWA manifest, service worker and lifecycle code. For testing unmerged UI changes, use only the latest READY Vercel preview for the corresponding PR; never use a QUEUED/BUILDING deployment.

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


## Contextual sales workflow — Estribo / Pastilla

For PR #334, use its latest READY Vercel preview after CI has completed; do not test unmerged UI changes against production.

1. Open `/sales` and start a sale using only the synthetic demo business.
2. Focus the customer, product and quantity fields. Confirm the contextual dock retracts while the keyboard is open and returns after the keyboard closes.
3. Scroll down within the sale form. Confirm the dock compacts to accessible icon actions; scroll upward and confirm it expands again.
4. Confirm the dock remains above the global bottom navigation and Android safe-area inset, with no overlap over the final input or submit action.
5. Save one synthetic sale. Confirm the action shows pending state, prevents repeated taps, then shows the real success confirmation. Trigger a deliberate validation error and confirm it never shows success.
6. Repeat with reduced motion enabled. The dock must remain understandable without relying on animation.
7. Capture a screenshot of expanded, compact and keyboard-hidden states, plus the resulting sale ID. Do not use real customer or payment data.

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
