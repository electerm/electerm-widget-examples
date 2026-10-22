# Local FTP Server — electerm 自定义 widget

把一个目录通过 FTP 分享出去，方便老设备、路由器、嵌入式机器（只认 FTP 的那种）传文件。

内置 Local FTP Server（`src/app/widgets/widget-local-ftp-server.js`）的用户 widget 版。`type: "instance"`，契约一致：`widgetRun(config, ctx)` → `{ instanceId, start, stop }`。

## 安装

```sh
./install-deps.sh    # 在仓库根目录跑，装 @electerm/ftp-srv
```

Settings → Widgets → Import → 选这个文件夹。依赖 `@electerm/ftp-srv` 在 `node_modules`（约 1MB），导入时跟着文件夹一起复制。

## 用法

1. **Folder to share** 选目录（留空 = home）
2. **Bind address** 默认 `127.0.0.1`；要给别的机器用改 `0.0.0.0`
3. **Port** 默认 2121（21 需要 root）
4. `Allow anonymous` 打开就是无密码访问；关掉则用 **Username** / **Password**（默认 `ftpuser` / `ftppass`，一定要改）
5. **Start widget** → 地址形如 `ftp://ftpuser:ftppass@127.0.0.1:2121`
6. 实例日志里能看到 connect / login / disconnect 和命令级 trace（ftp-srv 自己会把 PASS 参数打码）

被动模式数据端口固定 **50000-51000**：客户端主动连这些端口，所以防火墙要放行这一段。机器有多网卡或在 NAT 后面时，把 **PASV address** 填成客户端能访问到的那个地址，否则能登录但列不出目录（这正是最常见的「连上了但卡住」）。

## 验证

```sh
curl -s ftp://127.0.0.1:2121/          # anonymous 开着时
curl -s ftp://ftpuser:ftppass@127.0.0.1:2121/
```

## 注意

- FTP 是**明文**协议：用户名、密码、文件内容都不加密，只在可信网络用；公网请走 SFTP
- 别用 `0.0.0.0` + 默认密码 + anonymous 的组合
- 被动端口段固定是为了能配防火墙；如果 50000-51000 被占用，改 `main.js` 顶部两个常量

---

# Local FTP Server — English

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
curl -s ftp://127.0.0.1:2121/
curl -s ftp://ftpuser:ftppass@127.0.0.1:2121/
```

## Notes

- FTP is **plaintext**: credentials and file bodies are unencrypted. Trusted networks only; use SFTP on the internet
- Never combine `0.0.0.0`, the default password and anonymous access
- The passive range is fixed so a firewall rule is possible; change the two constants at the top of `main.js` if that range is taken
