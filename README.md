# All Nighter

A shared "all-nighter" hub for your crew. One countdown to sunrise, one shared YouTube queue with synced playback, presence of who's awake, and a crate of cozy 24/7 radios.

## Vibe
- Dark, warm lo-fi night-desk aesthetic
- Single lamp-accent, grain overlay, one corner-radius system, strict pre-flight
- One locked theme (dark)

## Tech
- SvelteKit + `@sveltejs/adapter-static` (prerendered, deploys anywhere)
- Tailwind v4, TypeScript, runes mode
- MQTT (WebSocket) for room state (no backend required)
- YouTube IFrame API with clock-drift correction

## Quick start
```sh
npm i
npm run dev -- --open
```

## Build & preview
```sh
npm run build
npm run preview
```

## Room sharing
The room comes from `?room=<name>`. Anyone joining the same room shares the queue, playback, and presence. Edit defaults in `src/lib/config.ts` (Telegram invite, dawn time, brokers, TTLs).

## Deploy to GitHub Pages
This repo includes `.github/workflows/deploy.yml`. For a project page, set `BASE_PATH` automatically (works for `/repo-name`). For a user site (`<user>.github.io`) you may want to set `BASE_PATH` to empty in that repo's workflow. Build produces static files in `build/`.

> Note: YouTube playback works when the page is served over HTTPS or localhost. Some embeds may be restricted by the video owner.

## Adding real nights to the archive
Edit `src/lib/data/archive.ts`. Each card uses `picsum.photos/seed/...` (easy to replace with your own images).

## The crate
Curated 24/7 picks live in `src/lib/data/crate.ts`. Replace IDs/titles with your crew's go-tos.
