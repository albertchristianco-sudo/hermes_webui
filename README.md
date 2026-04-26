# Uther's Hand

A World-of-Warcraft-themed web UI for the [Hermes](https://github.com/NousResearch/hermes) agent — built so you can talk to your Hermes profiles from any device on your Tailscale network.

Holy Light gold, parchment, Stormwind blue. Streaming chat, conversation history, multiple champions, optional Paladin voice clips.

> "By the Light, my watch begins."

---

## What it is

A single Node + React app that runs on the same machine as the `hermes` CLI. The backend spawns `hermes` as a child process per message, streams stdout to the browser as Server-Sent Events, and persists conversations to SQLite at `~/.uther_webui/`.

- **Frontend:** Vite + React + TypeScript with a tasteful Paladin theme (Cinzel + IBM Plex Sans, parchment texture, Holy Light palette).
- **Backend:** Express, `better-sqlite3`, no Hermes server / gateway — just `child_process.spawn`.
- **Auth:** optional shared password via `HERMES_WEBUI_PASSWORD`. Skip it if you trust your Tailscale boundary; set it if you ever expose the port more broadly.
- **Networking:** binds to `0.0.0.0:18888` so any Tailscale device can hit it. No HTTPS needed inside Tailscale.

## Prerequisites

- macOS (any reasonably recent version) — also runs on Linux/Windows
- Node 20+ (`brew install node` on macOS)
- The `hermes` binary in `$PATH`, with at least one configured profile

## Quick start

```bash
git clone <this repo> hermes_webui
cd hermes_webui
npm install
npm run build
npm start
```

The first time you load the UI it asks you to summon a champion. Fill in:

| Field | Example |
|-------|---------|
| Name | `Uther Lightbringer` |
| Hermes profile | the `hermes profile:` slug shown under your agent in the existing UI (e.g. `uther`) |
| Command template | `hermes -p {profile} chat -Q -q {message}` (default; edit if your CLI differs) |
| Tagline | `Paladin of the Silver Hand` |
| Accent | `#d4a23a` |
| Portrait | drop in any image |

The two tokens — `{profile}` and `{message}` — are substituted at run time. Quoting in the template uses normal shell-style single/double quotes; arguments are not passed through a shell, so injection is not a concern.

## Development

```bash
npm install
npm run dev
```

Runs the Vite dev server on **5173** (with `/api` proxied to **18888**) and the backend on **18888**, with file watching.

## Configuration

Environment variables read by the server:

| Var | Default | Purpose |
|-----|---------|---------|
| `HERMES_WEBUI_PORT` | `18888` | HTTP port |
| `HERMES_WEBUI_HOST` | `0.0.0.0` | Bind address |
| `HERMES_WEBUI_PASSWORD` | unset | Shared password. If set, all `/api` routes require it. |
| `UTHERS_HAND_HOME` | `~/.uther_webui` | State directory (DB, voice clips, portraits) |

## Voice clips

The Paladin voice lines from World of Warcraft are owned by Blizzard and are **not** shipped with this repo. The UI plays whatever audio you drop into:

```
~/.uther_webui/voice/
├── ready.mp3      # plays once on load
├── send.mp3       # plays when you submit a message
├── receive.mp3    # plays when the first chunk arrives
└── error.mp3      # plays on a Hermes error
```

`.ogg`, `.wav`, and `.m4a` work too. Toggle voice on/off in **Settings**. The Settings panel shows which clips it found.

## Run it as a launch agent on the Mac

A starter `launchd` plist lives at `scripts/com.uthershand.plist`. Edit the two paths and (optionally) the password, then:

```bash
mkdir -p ~/Library/LaunchAgents
cp scripts/com.uthershand.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.uthershand.plist
```

Logs go to `/tmp/uthers-hand.{out,err}.log`. To stop it:

```bash
launchctl unload ~/Library/LaunchAgents/com.uthershand.plist
```

## Reaching it from anywhere (Tailscale)

1. Install Tailscale on the Mac and on your phone/laptop.
2. Note the Mac's MagicDNS name (something like `bigmac.tailnet-name.ts.net`).
3. From any Tailscale device: `http://bigmac.tailnet-name.ts.net:18888`.

If you also want a password gate (recommended), set `HERMES_WEBUI_PASSWORD` in the plist.

## Architecture

```
┌─ client/  Vite + React + TS  (built into client/dist)
│
└─ server/  Express
   ├─ /api/agents          CRUD + portrait upload
   ├─ /api/conversations   CRUD + messages
   ├─ /api/chat/:id/messages   SSE: spawns hermes, streams stdout
   ├─ /api/voice/:event    serves drop-in audio
   ├─ /api/auth/status     whether a password is required
   └─ static               serves client/dist in production
```

State lives in `~/.uther_webui/data.db` (SQLite, WAL). Foreign keys cascade — deleting a champion deletes their chronicles and messages.

## Why it looks this way

- **Cinzel** for headers and the brand mark — a free-as-in-beer alternative to Friz Quadrata, the WoW UI font.
- **Parchment + gold filigree** for panels, **Stormwind blue** for the user's bubbles.
- The send button is a glowing ability icon. `send.mp3` plays. `receive.mp3` plays on first chunk. `error.mp3` plays when the Light falters.

## License

MIT.
