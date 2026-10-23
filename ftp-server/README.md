# Local FTP Server — an electerm widget

English | [中文](README_CN.md)

Share a folder over FTP for the devices that only speak FTP (old routers, embedded boxes, legacy tooling).

This is the built-in Local FTP Server (`src/app/widgets/widget-local-ftp-server.js`) as a user widget. `type: "instance"`, same contract: `widgetRun(config, ctx)` → `{ instanceId, start, stop }`.

## Install

```sh
./install-deps.sh    # from the repo root; installs @electerm/ftp-srv
```

Settings → Widgets → Import → this folder. `@electerm/ftp-srv` is vendored in `node_modules` (~1MB).

## Use

1. **Folder to share** (empty = home)
2. **Bind address** defaults to `127.0.0.1`; use `0.0.0.0` for other machines
3. **Port** defaults to 2121 (21 needs root)
4. `Allow anonymous` gives passwordless access; otherwise use **Username** / **Password** (defaults `ftpuser` / `ftppass` — change them)
5. **Start widget** → the URL looks like `ftp://ftpuser:ftppass@127.0.0.1:2121`
6. The instance log shows connect / login / disconnect and a command-level trace (ftp-srv masks PASS arguments)

Passive data ports are pinned to **50000-51000** because the client opens them, so a firewall rule must cover that range. On a multi-homed or NATed machine put the client-reachable address into **PASV address** — otherwise login works but listings hang, which is the classic "connected but stuck" FTP failure.

## Verify

```sh
curl -s ftp://127.0.0.1:2121/          # with anonymous access enabled
curl -s ftp://ftpuser:ftppass@127.0.0.1:2121/
```

## Notes

- FTP is **plaintext**: credentials and file bodies are unencrypted. Trusted networks only; use SFTP on the internet
- Never combine `0.0.0.0`, the default password and anonymous access
- The passive range is fixed so a firewall rule is possible; change the two constants at the top of `main.js` if that range is taken
