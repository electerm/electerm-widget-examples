# electerm widget examples

English | [中文](README_CN.md)

Real, working [electerm](https://github.com/electerm/electerm) user widgets. Each folder is a widget you can import and actually use, not a toy demo.

---

## What this is

electerm has two kinds of widgets:

- **Built-in widgets** ship with the app, code lives in the electerm repo
- **User widgets** are plain folders with a `package.json`, dropped into `<data dir>/widgets/<id>/`. No app changes, no rebuild, and deleting the folder uninstalls it

This repo holds the second kind, and exists to answer one question: **can this API carry real functionality?** It can — the only real boundary is dependencies (see the porting table below).

## Requirements

An electerm build with user-widget support. That feature is not in a release yet, so for now run it from source:

```sh
git clone https://github.com/electerm/electerm.git
cd electerm
npm i --legacy-peer-deps
npm run compile && cp -r src/app/. work/app/ && npm run t
```

(Once it ships, any release build works.)

## Try one

```sh
git clone https://github.com/electerm/electerm-widget-examples.git
cd electerm-widget-examples
./install-deps.sh     # only passbolt-search / static-server / ftp-server need it
```

Then in electerm: **Settings → Widgets → Import**, pick any folder.

Import **copies** the whole folder (including `node_modules`) to `<data dir>/widgets/<id>/`, so editing the source here does not change an installed copy, and deleting a widget from the list also removes its runtime state (`passbolt-search/.state.json` keeps a pinned key fingerprint).

## Folders

| Folder | Type | Dependency | What it does |
| --- | --- | --- | --- |
| [`passbolt-search/`](passbolt-search/) | config | openpgp | Search Passbolt, open SSH / FTP / Telnet / RDP |
| [`docker-cockpit/`](docker-cockpit/) | own UI | none (docker CLI) | Container state, start/stop, logs, copy exec |
| [`rename-files/`](rename-files/) | config | none | Batch rename with a preview step |
| [`static-server/`](static-server/) | instance | express | Serve a folder over HTTP |
| [`ftp-server/`](ftp-server/) | instance | @electerm/ftp-srv | Serve a folder over FTP |

Every folder has `README.md` in English and `README_CN.md` in Chinese, covering its config fields, implementation notes and known limits. `passbolt-search/` also has [`TESTING.md`](passbolt-search/TESTING.md): a checklist you can walk through with a real account, plus an offline mock.

`passbolt-search/` is based on code by GitHub user [@palsanyi](https://github.com/palsanyi). Credit and thanks to them.

## Local Passbolt test server

To avoid experimenting against a production instance, `scripts/` can bring up a throwaway Passbolt CE (mariadb + passbolt on port 8088, no docker compose needed):

```sh
./scripts/passbolt-start.sh   # containers, migrations, wait for a server key in /auth/verify.json
./scripts/passbolt-init.sh    # create a login-capable test account, print the five widget values
./scripts/passbolt-stop.sh    # stop, keep data; --purge removes containers and volumes
```

`passbolt-init.sh` seeds the account straight into the database — the same three rows a finished setup would leave (`users` / `profiles` / `gpgkeys`) plus a 4096-bit key — because Passbolt 5's setup page refuses to run without the Passbolt browser extension. Add `--browser` to go through the real page instead.

`passbolt-init.sh` also seeds eight sample entries, one per resource type: a simple password, a password with description (https / ssh / ftp, the ssh one on a non-standard port), a v4 TOTP entry, a v5 default entry, v5 with TOTP, and a v5 note. They are encrypted to the account's own key and signed with it — the same thing creating them by hand in the web UI would produce — so the widget's first Search has real data. `--no-samples` skips them.

It finishes by printing Server URL / User ID / GPG key file / Passphrase / server fingerprint and leaves the private key at `scripts/.passbolt/me.asc` (gitignored). Port, account and passphrase are overridable through the environment (`PASSBOLT_PORT`, `PASSBOLT_ADMIN_EMAIL`, `PASSBOLT_SEED_PASSPHRASE`, … — all in `scripts/passbolt-lib.sh`). Blocked Docker Hub? `PASSBOLT_REGISTRY_MIRROR=docker.1panel.live`.

## Three shapes

The `electerm` field in `package.json` decides what the widget looks like:

**1. Config mode (no `ui`)** — the host renders the form from `electerm.configs` and calls `electerm.action` (default `run`) in the main process on submit. Field types: `string` / `textarea` / `number` / `boolean` / `password` / `file` / `directory` / `select`.

`main.js` exports `widgetRun(config, ctx)` and returns a result object:

```js
{
  message: '3 files renamed',
  messageType: 'success',
  details: [{ label: 'Folder', value: '/tmp/x', copy: true, secret: false }],
  table: { columns: [...], rows: [...], rowButtons: [{ label, action, params }] },
  buttons: [{ label, action }],
  openTab: { type: 'ssh', ... }
}
```

The `action` of a row/plain button is **the name of another export** in `main.js`; the host calls it through `electerm.call(name, ...args)` and pushes the result onto a stack with a back arrow. That is how `rename-files` gets a preview-then-confirm flow.

**2. Instance mode (no `ui`, `type: "instance"`)** — has a start/stop lifecycle: `widgetRun` returns `{ instanceId, start, stop }` and `start()` resolves `{ serverInfo, msg }`. Both server widgets are this shape.

**3. Own UI (`electerm.ui` points at an html file)** — the page runs inside a sandboxed iframe on `electerm-widget://<id>/`, i.e. **its own origin**, and can only talk to the main process through `window.electerm`: `call` / `getConfig` / `updateConfig` / `openDialog` / `saveDialog` / `copy` / `openExternal` / `openTab` / `log`. Worth it only for what a form cannot express — polling, a log pane, inline row actions (`docker-cockpit`).

## Porting the built-ins

Measured by actually porting them, to find the edge of the API:

| Built-in | User-widget port | Note |
| --- | --- | --- |
| File Renamer | ✅ `rename-files/` | Same logic plus preview and target-collision checks |
| Static File Server | ✅ `static-server/` | Identical contract, express vendored |
| Local FTP Server | ✅ `ftp-server/` | Same, `@electerm/ftp-srv` vendored |
| Batch Operation | ⚠️ not ported | It has no form: the built-in is a React editor (`batch-op-editor.jsx`). Porting means rewriting that editor — UI work, not an API limit |
| SSH Server | ⚠️ not ported | Needs `@electerm/ssh2` + `node-pty`; both are vendorable, but node-pty carries 27MB of prebuilt binaries that must match the Electron ABI |
| MCP Server | ❌ impossible as-is | It requires app-internal modules |

A user widget gets **Node built-ins plus its own `node_modules`** — that is both the limit and the boundary: moving into the data directory does not grant access to application code.

## Security model

- The own-UI page is a **sandboxed iframe on its own origin**; the host only answers messages where `evt.source === frame.contentWindow`, and only the nine methods above are reachable
- Its `main.js` runs in the **main process with full Node privileges**. Being able to call the docker CLI means effectively root; being able to read files means your private keys
- So: **installing a widget means trusting its author**, the same deal as a VS Code extension or an npm package. Install only what you wrote or read

## License

MIT
