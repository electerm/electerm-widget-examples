# electerm widget examples

English | [中文](README_CN.md)

Real, working [electerm](https://github.com/electerm/electerm) user widgets. Each one lives in its own
repository and installs straight from its URL — these are things people actually use, not toy demos.

**Settings → Widgets → Import**, paste `electerm/electerm-widget-rename-files`, done. electerm
downloads the repository, finds the folder whose `package.json` has an `electerm` field, validates it,
and copies it to `<data dir>/widgets/<id>/`.

| Repository | Shape | What it does |
| --- | --- | --- |
| [`electerm-widget-passbolt-search`](https://github.com/electerm/electerm-widget-passbolt-search) | config | Search Passbolt, open SSH / FTP / Telnet / RDP with locally decrypted credentials |
| [`electerm-widget-docker-cockpit`](https://github.com/electerm/electerm-widget-docker-cockpit) | own UI | Container state, start/stop, logs, copy-ready exec command |
| [`electerm-widget-rename-files`](https://github.com/electerm/electerm-widget-rename-files) | config | Batch rename with a preview step |
| [`electerm-widget-static-server`](https://github.com/electerm/electerm-widget-static-server) | instance | Serve a folder over HTTP |
| [`electerm-widget-ftp-server`](https://github.com/electerm/electerm-widget-ftp-server) | instance | Serve a folder over FTP |

Every repository has `README.md` in English and `README_CN.md` in Chinese, covering its config fields,
implementation notes and known limits. `electerm-widget-passbolt-search` also has `TESTING.md`: a
checklist you can walk through with a real account, plus an offline mock.

## Import one

**Settings → Widgets → Import**, then paste a repository:

```text
electerm/electerm-widget-rename-files
https://github.com/electerm/electerm-widget-rename-files
electerm/electerm-widget-passbolt-search#main
```

Accepted forms: `owner/repo`, the link to the repository page, a link to a folder inside a repository
(`/tree/<ref>/<folder>`), `owner/repo#branch`, or a folder path after the repository name
(`owner/repo/widgets/foo`). GitHub and AtomGit are the supported hosts. Import needs electerm
**v5.8.0** or newer; the import dialog also has an **Import folder** button for a local clone.

Importing **copies**: the folder, including `node_modules`, is copied to `<data dir>/widgets/<id>/`.
Editing a clone afterwards does not change the installed widget — re-import and confirm the overwrite.
Deleting the widget from the list removes the folder and whatever state it kept next to `main.js`
(`passbolt-search/.state.json` holds only an accepted key fingerprint).

## Why one repository per widget

A widget is installed by downloading a repository and copying one folder out of it, with no
`npm install` step anywhere. That makes the repository the distribution unit:

- **Dependencies have to be committed.** `express`, `@electerm/ftp-srv` and `openpgp` sit in
  `node_modules/` in their repositories on purpose. That is why `static-server` clones at ~4MB.
- **One repository keeps each download small.** The alternative — a monorepo — would make every
  install pull every widget's dependencies, and this repository was exactly that before the split.
- **Each widget gets its own issues, releases and blame.** A bug in the Passbolt client has nothing to
  do with the FTP server.

Working on a widget: clone its repository and use **Import folder** instead of the URL, so an edit is
one re-import away.

## The reference

The API — manifest fields, config mode, instance lifecycle, the `window.electerm` bridge, the security
model — is documented once, in the
**[User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)**. This repository is
the index; that page is the manual.

## Porting the built-ins

Measured by actually porting them, to find the edge of the API:

| Built-in | User-widget port | Note |
| --- | --- | --- |
| File Renamer | ✅ `electerm-widget-rename-files` | Same logic plus preview and target-collision checks |
| Static File Server | ✅ `electerm-widget-static-server` | Identical contract, express vendored |
| Local FTP Server | ✅ `electerm-widget-ftp-server` | Same, `@electerm/ftp-srv` vendored |
| Batch Operation | ⚠️ not ported | It has no form: the built-in is a React editor (`batch-op-editor.jsx`). Porting means rewriting that editor — UI work, not an API limit |
| SSH Server | ⚠️ not ported | Needs `@electerm/ssh2` + `node-pty`; both are vendorable, but node-pty carries 27MB of prebuilt binaries that must match the Electron ABI |
| MCP Server | ❌ impossible as-is | It requires app-internal modules |

A user widget gets **Node built-ins plus its own `node_modules`** — that is both the limit and the
boundary: moving into the data directory does not grant access to application code.

## Security model

- The own-UI page is a **sandboxed iframe on its own origin**; the host only answers messages where
  `evt.source === frame.contentWindow`, and only a fixed method list is reachable
- Its `main.js` runs in the **main process with full Node privileges**. Being able to call the docker
  CLI means effectively root; being able to read files means your private keys
- **Importing from a URL does not make that safer.** The repository is downloaded and copied; nothing
  inspects `main.js`. So: **installing a widget means trusting its author**, the same deal as a VS Code
  extension or an npm package. Install only what you wrote or read

## License

MIT
