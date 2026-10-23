# Docker Cockpit — an electerm widget with its own UI

English | [中文](README_CN.md)

Your local containers in the settings panel: state, ports, logs, start/stop/restart, and a ready-to-paste `docker exec`.

This is the **own-UI** kind of widget (`electerm.ui` → `ui/index.html`): the page runs inside an iframe on `electerm-widget://docker-cockpit/` and talks to the main process through `window.electerm`. The reasons config mode cannot do this:

- the list has to **poll** (container state changes while you look at it)
- the log pane stays open and refreshes while you read it
- per-row actions and a filter box are beyond what a generated result table offers

## Install

Settings → Widgets → Import → this folder. **No dependency**: it shells out to the docker CLI instead of using a docker SDK.

## UI

- Header: `N running / M`, engine version, filter (name/image/port/state), `auto` (3s polling), `refresh`
- Row: state dot (green running, amber paused, red exited), name, image, status, ports
- Actions: `start` / `stop` / `pause` / `resume` / `restart` / `logs` / `exec`
  - `stop` and `restart` ask for confirmation
- Clicking a row opens the log pane (300 lines, 2s refresh, sticks to the bottom unless you scrolled up)
- `exec` **copies** a command: a widget cannot type into a terminal, so paste it into your own tab

## Implementation notes

- Docker binary is looked up explicitly (`/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, Docker Desktop, OrbStack): a GUI-launched Electron does not inherit the PATH of your shell
- `docker ps -a --format '{{json .}}'`, one JSON per line, read defensively across versions
- `docker logs --tail N --timestamps`, stdout and stderr merged
- Failures (no docker, daemon down, socket permission) surface in a red banner instead of failing silently

## Security

Docker CLI access is **root-equivalent** (`docker run -v /:/host`). This widget only calls `ps / start / stop / restart / pause / unpause / logs / version` and the action list is hard-coded in the main process — but installing any widget is trusting it to run arbitrary Node code. Only install widgets you wrote or whose `main.js` you read.

## Limits

- Containers only (no compose grouping)
- No interactive `docker exec`, only a copied command
- Logs are polled, not streamed: the bridge is request/response, there is no host→widget push channel yet
- With hundreds of containers every poll is a full `docker ps`; leave auto-refresh off
