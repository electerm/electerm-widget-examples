# Static File Server — an electerm widget

English | [中文](README_CN.md)

Share a local folder over HTTP. `type: "instance"`: starting it yields a stoppable instance, the panel shows its URL, and access logs land in the instance log.

This is the built-in Static File Server (`src/app/widgets/widget-local-file-server.js`) as a user widget, same contract: `widgetRun(config, ctx)` returns `{ instanceId, start, stop }` and `start()` resolves `{ serverInfo, msg }`.

## Install

```sh
./install-deps.sh    # from the repo root; installs express
```

Settings → Widgets → Import → this folder. `express` is vendored in `node_modules` (~4MB) and is copied with the folder.

## Use

1. Pick **Folder to serve** (empty = your home directory)
2. **Bind address** defaults to `127.0.0.1` (local only); use `0.0.0.0` to expose it (mind the firewall and files like `.env`)
3. **Port** defaults to 3456; a busy port shows up as an error in the instance log
4. **Start widget** → the instance appears in the running list, its `serverInfo.url` is the address
5. Stop it from the instance row; every request is logged with status and duration

Other options: `Index file`, `Dotfiles` (allow/deny/ignore), `Cache max-age` (0 disables the header), `Auto run`.

## Notes

- No directory listing (plain `express.static` behaviour): a directory needs an index file or an exact path
- `0.0.0.0` with `Dotfiles: allow` exposes `.env` and `.git` to the whole network — tighten as needed
- Static files only; use nginx for rewriting or proxying
