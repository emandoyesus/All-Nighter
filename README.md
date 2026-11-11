# All Nighter

> **Show up. Lock in till sunrise.**  
> A shared focus room with synchronized music, chat, and a countdown.  
> 🌐 **Live Production**: [https://all-nighter.pro.et](https://all-nighter.pro.et)

All Nighter is a real-time collaborative focus sanctuary for late-night developers, designers, and students. Built on a serverless peer synchronization architecture, everyone in a room shares one synchronized audio stream, one collaborative queue, real-time presence of who's awake, and an unbroken countdown to dawn.

---

## Key Features

### 🎧 Synchronized Live Audio Stream
- **Shared Room Playback**: The track queue and playback position stay locked in sync across all participants using MQTT over WebSockets with clock-drift compensation.
- **Continuous Stream**: Switching between Focus and Normal modes or navigating between pages never interrupts or seeks the music.
- **Persistent Audio Dock**: A bottom music dock keeps the stream and volume accessible wherever you navigate across the site.
- **Universal Local Mute**: Clicking the video canvas, the dock thumbnail, or pressing <kbd>Space</kbd> toggles local mute on your own device—so anyone can silence their audio without interrupting the room.
- **Admin Global Pause**: Room hosts and appointed admins can pause or resume playback room-wide with an explicit confirmation warning dialog.

### ⏱️ Focus Modes & Fullscreen Desk HUD
- **Focus & Normal Modes**: Set focus intervals with subtle audio chimes signaling mode transitions.
- **Fullscreen Desk HUD**: An ultra-clean, distraction-free dashboard featuring a live clock, countdown to dawn, music controls, and switchable midnight wallpapers (*Neon Horizon*, *Night Room*, *Lofi Night*, *Midnight Cafe*).

### 🎶 Queue & Dedications
- **Collaborative Queue**: Add songs via YouTube links with optional dedications or shoutouts to peers in the room.
- **Interactive Reactions**: React to the current track with ambient emoji reactions.

### 🌅 Sunrise Ritual & The Logbook
- **Dawn Ritual (06:00)**: When sunrise arrives, the room concludes with a celebratory dawn ritual.
- **Chronological Logbook**: Sessions are archived sequentially (`LOG #001`, `LOG #002`, ...), preserving the tracklist, roster of members awake, intentions, and chat highlights.
- **Archive Explorer**: Browse past all-nighters, inspect tracklists, and export setlists.

### 🛡️ Room Governance & Security
- **Public & Private Rooms**: Create open public rooms or private invite-only rooms protected by cryptographically secure passkeys and SHA-256 verification.
- **Knocking System**: Guests can knock to request entry into private rooms, approved in real-time by the host.
- **Role Management**: Hosts can appoint co-admins or transfer control seamlessly.

### 👤 Nocturnal Profiles & Badges
- **Callsign & Avatars**: Set your night callsign and choose between your Google account photo or 6 hand-drawn ink doodle avatars (*The Architect*, *The Wanderer*, *The Listener*, *The Stargazer*, *The Hacker*, *The Artist*) featuring diverse representation and bold solid color backgrounds (Blue, Red, Black, White).
- **Milestones & Badges**: Unlock tiered nocturnal achievements based on dawn rituals completed, tracks contributed, and minutes focused.
- **Peer Inspection**: Click any member in the room to view their profile, stats, and badges.

---

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with **Svelte 5** (runes mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Real-time Engine**: [MQTT](https://github.com/mqttjs/MQTT.js) over WebSockets (serverless room synchronization)
- **Persistence (Optional)**: [Supabase](https://supabase.com/) for optional cloud sync of rooms and user profiles
- **Audio / Media**: YouTube IFrame API with custom clock-drift correction + Web Audio synthesized chimes
- **Motion**: [GSAP](https://greensock.com/gsap/) for smooth reveals and split-text animations
- **Icons**: [@tabler/icons-svelte](https://tabler.io/icons)

---

## Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/your-username/All-Nighter.git
cd All-Nighter
npm install
```

### 2. Development Server
```bash
npm run dev -- --open
```

### 3. Build & Preview
```bash
npm run build
npm run preview
```

---

## Configuration

Core defaults can be adjusted in [`src/lib/config.ts`](src/lib/config.ts):
- `DEFAULT_ROOM`: Default room name when none is provided in the URL.
- `SUNSET`: Doors open hour and minute (defaults to 18:00 sunset, when rooms unlock and lock-in begins).
- `DAWN`: Target sunrise hour and minute (defaults to 06:00, when sessions conclude and archive).
- `MQTT_BROKERS`: List of WebSocket MQTT brokers for peer state broadcast.
- `DRIFT_TOLERANCE`: Playhead drift tolerance (in seconds) before synchronization adjustments occur.
- `TELEGRAM_URL`: Telegram community invite link.

---

## Deployment & Canonical URLs

The app is built with `@sveltejs/adapter-static` and compiles to zero-dependency static assets in `build/`.

### 🌐 Canonical Production Deployment
- **Canonical URL**: [https://all-nighter.pro.et](https://all-nighter.pro.et)
- **Hosting Provider**: Deployed via [Vercel](https://vercel.com/) with automated HTTPS, HTTP/2, and HSTS headers.
- **Social Graph Metadata**:
  - OpenGraph & Twitter Card URL: `https://all-nighter.pro.et`
  - OpenGraph & Twitter Card Image: `https://all-nighter.pro.et/og-image.png` (1200 × 630 px, pre-generated and verified live over HTTPS).

### 📦 Asset Paths & Subpath Portability
The project is built to run smoothly both on a custom root domain (`/`) and when hosted under a subpath (e.g. GitHub Pages `/<repo-name>`):
- **Favicon & Apple Touch Icon**: Referenced via SvelteKit's `%sveltekit.assets%/favicon.svg`, which computes the correct relative path across root and nested routes.
- **Web App Manifest**: Referenced via `%sveltekit.assets%/site.webmanifest`. Within `site.webmanifest`, relative entries (`"start_url": "./"`, `"src": "favicon.svg"`) prevent 404 path breakages under subpath hosting.
- **In-App Media & Wallpapers**: Loaded with SvelteKit's `asset(...)` helper from `$app/paths` to automatically prepend any configured base path.

### 🚀 Hosting Targets

#### 1. Vercel (Production)
Zero-configuration static deployment:
```bash
vercel --prod
```

#### 2. GitHub Pages (Subpath or Custom Domain)
A continuous deployment GitHub Actions workflow is provided in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
- When deploying under a repository subpath (e.g. `https://<owner>.github.io/<repo>/`), set `BASE_PATH=/<repo>` in the environment:
  ```bash
  BASE_PATH=/<repo> npm run build
  ```
- If configuring a custom domain in GitHub Pages settings, keep `BASE_PATH` empty.

#### 3. Cloudflare Pages & Netlify
Point the publish directory to `build/` with build command `npm run build`.

---

## License

MIT
