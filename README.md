# Neon Dockyard Dash

A neon top-down browser game: drive a forklift between a docked ship, cargo
plane, and detailed delivery truck, racing the clock to route containers
before time runs out.

## Run it

```
npm install
npm start
```

This starts an Express server on `PORT` (default `3000`) that serves the
game page and its high-score API from the same origin. Open
`http://localhost:3000/` to play. The start command runs in the foreground
and keeps serving until killed — that's the intended way to run it.

To use a different port: `PORT=8080 npm start`.

## How to play

- **Move**: WASD or the arrow keys, 8-directional, clamped to the canvas.
- **SPACE** near a container on the ship picks it up (you can only carry
  one at a time — it rides visibly on top of the forklift).
- Each container is marked **AIR ▲** (cyan) or **ROAD ■** (magenta).
- **SPACE** again while overlapping the matching plane or truck depot delivers
  it. A wrong depot rejects the cargo without scoring or removing it.
- You have 60 seconds. Each delivery adds time back (+3s normal, +1s for
  an express container) — the clock turns red under 10 seconds, and
  freezes the forklift and shows "TIME UP" at zero.

## How score is earned

Every point comes from an actual delivery — nothing else awards score:

- A normal delivery is worth `100 × multiplier`.
- An **express** container has a yellow outline and `X2` label. It is worth `200 × multiplier`,
  but only adds 1 second to the clock, and vanishes — breaking your combo —
  if it isn't delivered within 8 seconds of being picked up (or spawning,
  if never picked up). Roughly 1 in 3 spawned containers are express.
- The **combo multiplier** climbs by 1 (capped at x5) every time a delivery
  lands within 5 seconds of the previous one, and resets to x1 if more than
  5 seconds pass between deliveries. It's shown as large text under the
  score and pops bigger on each increase.
- Game feel: screen shake on delivery (bigger for express), a scale "pop"
  and particle burst on pickup/delivery, a score flash, and a soft/high
  beep pair on pickup/delivery (small generated tones, no audio files).

At zero time, a game-over panel shows your final score, your best combo,
and the all-time high score, with a name field to save your run and a
"Press R to restart" that instantly resets score, timer, multiplier, and
containers for another attempt.

## Persistence

High scores are **not** stored in the browser (no `localStorage`,
`sessionStorage`, or cookies). They are saved by the server to
`scores.json` on disk, so the leaderboard survives a server restart.
The game page talks to it with two relative, same-origin routes so this
works whether it's loaded directly or behind a reverse-proxy path prefix:

- `GET /scores` — returns the top saved runs, highest score first.
- `POST /scores` — body `{ "name": string, "score": integer, "comboHigh"?: integer }`.
  Validates `name` (non-empty, trimmed to 20 chars), `score` (integer,
  0–1,000,000), and `comboHigh` (integer, 1–5) and returns `400` with a
  message on invalid input (e.g. missing/empty name, non-integer score).
  On success returns `201` with the saved entry, its rank, the current
  all-time high, and the current leaderboard.

The save form uses `fetch` with `event.preventDefault()` (no native page
navigation), disables its button while a save is in-flight, and
re-enables it on failure so a retry can't create duplicate entries from a
double-click, while still allowing a deliberate resubmission.

## Implementation notes

- Single `index.html`: the game, rendering, input, juice, and HTML
  overlay (game-over panel, name form, leaderboard) in one file, using
  the locally installed [Kaplay](https://kaplayjs.com/) browser bundle.
  The environment and vehicle art are assembled from lightweight canvas shapes,
  so there are no image/audio assets to download.
- `server.js`: a small Express app that serves this static directory and
  exposes the `/scores` API described above, backed by `scores.json`.
- Reserved for a later optional change: additional stages/levels, new
  game modes, and richer audio beyond the current generated beeps.

## Scope note on CORS / hosted environments

This build runs as a single local service (page + API, same origin), so
no cross-origin requests are made in the default setup. If this game is
later embedded behind a different origin/proxy, the same two `/scores`
routes already use relative URLs and the server already enables permissive
CORS so a sandboxed/cross-origin page can call them.
