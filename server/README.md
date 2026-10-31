# Multiplayer server

This small server lets everyone visiting the island see each other walking around, and chat.
The website itself stays on GitHub Pages; only this relay needs to run somewhere that supports
WebSockets (Render, Railway, Fly.io, a VPS…).

Without it the game still works: it's simply a solo adventure, and the HUD says so.

## Run it locally

```bash
cd server
npm install
npm start            # ws://localhost:8787
```

Then, from the project root, start the game pointed at it:

```bash
VITE_MULTIPLAYER_URL=ws://localhost:8787 npm run dev
```

Open the game in two browser windows to see both adventurers.

## Put it online (example: Render, free tier)

1. On render.com, create a **Web Service** from this GitHub repo.
2. Set **Root Directory** to `server`, **Build Command** to `npm install`, **Start Command** to `npm start`.
3. Add an environment variable `ALLOWED_ORIGINS` = `https://imraymarttroy.online`
   (so only your site can connect).
4. When it's deployed you get a URL like `https://portfolio-game-xyz.onrender.com`.
5. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**,
   name `MULTIPLAYER_URL`, value `wss://portfolio-game-xyz.onrender.com` (note **wss://**).
6. Re-run the "Deploy to GitHub Pages" workflow (or push to `main`). The HUD now shows
   "N adventurers online".

Free hosting tiers usually sleep when idle, so the first visitor may wait ~30–60 seconds while it
wakes up; the game keeps retrying in the background meanwhile.

## Settings

| Variable | Default | What it does |
| --- | --- | --- |
| `PORT` | `8787` | Port to listen on (most hosts set this for you). |
| `ALLOWED_ORIGINS` | *(empty = anyone)* | Comma-separated sites allowed to connect. |
| `MAX_PLAYERS` | `100` | Connection cap. |

## What it does and doesn't keep

Nothing is stored: names, positions and chat exist only while people are connected. Each
player's level and quest progress are saved in their own browser. Names are cleaned to letters,
numbers and `_ . -`, chat is capped at 140 characters and rate-limited, and movement updates are
limited to ~20 per second per player.
