# Launch review

Reviewed the updated repository at commit 3b66c1f: page metadata, routing/layout, navigation, modal components, room authentication gate, playback shortcuts, dock layout, configuration, and deployment workflow. This is a source review plus compiler/build validation, not an exhaustive live service audit.

Baseline: svelte-check returned 0 errors and 6 dialog accessibility warnings. The first polish check returned 0 errors and 0 warnings. Production build passed.

Social preview: `static/og-image.png` is 1200 × 630. Regenerate with `python3 scripts/social-preview.py` (Pillow required). The generated image was visually inspected. The canonical production deployment URL is **https://all-nighter.pro.et** (served over HTTPS with HTTP/2 and HSTS via Vercel), confirmed loading both the live application and `https://all-nighter.pro.et/og-image.png`. The favicon and manifest use `%sveltekit.assets%` and relative manifest targets (`./favicon.svg`, `./site.webmanifest`), ensuring correct asset resolution under both the canonical domain root and GitHub Pages subpaths (`/${{ github.event.repository.name }}`).

Interaction changes: modal focus containment and restoration, topmost Escape handling, Space shortcut guards for interactive controls, visible focus outlines, larger touch controls, a two-row mobile navigation and music dock, and mobile dialog scrolling.

Remaining verification: browser access host was unavailable, so mobile viewport behavior, keyboard interaction in a real browser, two-account playback, deployed metadata, and the 24-second recording have not been verified/captured. See demo-recording.md for the shot plan.

Existing architecture observation: private-room passkey hashing is implemented in the client and messaging still uses public MQTT brokers. This is not a server-enforced authorization review or change; avoid treating the present review as a security sign-off.
