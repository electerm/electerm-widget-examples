# Passbolt Search — electerm 自定义 widget

在 electerm 里搜索 Passbolt 条目，直接开 SSH / FTP / Telnet / RDP 连接。

**没有自带界面**：`package.json` 的 `electerm.configs` 描述表单，electerm 渲染它、提交时调 `run(config)`、再把返回的对象画成结果区。`main.js` 只提供函数，所以这个 widget 不需要改 electerm 核心、不需要新的 IPC、不需要构建。

```
passbolt-search/
  package.json     元数据 + 表单定义
  main.js          Passbolt 客户端（OpenPGP + JWT）+ 动作
  node_modules/    openpgp 6.2.2，随 widget 一起复制
  README.md        本文件
  TESTING.md       真实账号 / 离线 mock 的验证流程
```

## 安装

```sh
./install-deps.sh    # 在本仓库根目录跑，装 openpgp
```

设置 → Widgets → **Import** → 选这个目录。整个文件夹（含 `node_modules`，约 16MB）被复制到 `<data dir>/widgets/passbolt-search/`，所以导入之后不需要联网。

导入是复制不是链接：之后改本仓库里的 `main.js` 不影响已安装的那份；要更新就重新 Import 并确认覆盖。

## 表单字段

| 字段 | 类型 | 会被保存吗 |
| --- | --- | --- |
| Server URL | `string`，必填 | 会（本地存储，加密） |
| User ID | `string`，必填 | 会 |
| GPG key file | `file`，必填 | 只存路径 |
| Key passphrase | `password` | **永不** |
| Search | `string` | 会 |

`User ID` 是 UUID：网页版 Users / Manage Users & Groups → 点开自己 → 地址栏 `/app/users/view/<UUID>`。
私钥导出：`gpg --export-secret-keys --armor <你的邮箱> > me.asc`，或 Passbolt 设置里的 "Download my key"。

因为 `"persist": true`，非 password 字段下次会自动回填。password 类型在保存时被排除，口令不可能落到本地存储。

## 动作

| 导出 | 谁调用 | 参数 | 返回 |
| --- | --- | --- | --- |
| `run` | 提交按钮 | `(config)` | 信任提示 / 已连接信息 / 搜索结果 |
| `trust` | “Trust this key and connect” | `(config)` | 已连接信息或搜索结果 |
| `details` | 行按钮 | `(row, config)` | 打码的密码 + 条目字段 |
| `openSsh` / `openFtp` / `openTelnet` / `openRdp` | 行按钮 | `(row, config)` | 带解密凭据的 `{ openTab }` |
| `lock` | “Lock and disconnect” | `(config)` | 状态信息 |

`openTab` 由 electerm 开成普通终端标签，并强制带 `from: widget:passbolt-search`；`tab.js` 对该前缀不写连接历史，所以解密出来的凭据不会进同步数据。

## 安全边界

- 私钥文件只在主进程读取，私钥与口令既不发给 Passbolt 也不发给任何第三方
- 口令不落盘：不在表单存储里（按类型排除），也不在 `.state.json` 里
- `.state.json`（与 `main.js` 同目录，权限 600）**只**保存已接受的服务器公钥指纹；删掉它就会重新要求确认
- 元数据与密码都是本地解密，只存在于内存，`lock` 和退出应用会清掉
- 解密失败只上报计数与阶段，不上报 armor、响应体或异常文本
- 首次连接要求你带外比对服务器指纹；指纹变了就拒绝连接，直到你重新确认

## 已知限制

- 服务器必须启用 JWT 认证插件；UUID 需要手填（未实现 recovery-email 新设备流程）
- **不支持 MFA 账号**（登录时会明确报错）
- 搜索范围是资源元数据（名称、用户名、描述、URI、自定义字段），不搜索密码字段
- 共享条目（`metadata_key_type: shared_key`）需要你对那条的 metadata key 有读权限，否则计入 skipped
- FTP / Telnet 是明文协议，只在可信网络用
- 重新导入会用源目录的 `.state.json` 覆盖，指纹要再确认一次

## 离线自检（不需要 Passbolt）

```sh
node scripts/passbolt-mock-and-run.js
```

起一个 127.0.0.1 的假服务器、现场生成一次性密钥，把 widget 走一遍 connect → trust → search → details → openSsh → lock（资源元数据按 Passbolt 5 的 `user_key` 加密形式）。它打印 `PASS` 并删掉自己产生的 `.state.json`，之后你仍然可以正常导入这个文件夹。这只证明客户端逻辑，不证明你的服务器配置。

---

# Passbolt Search — English

Search Passbolt entries from electerm and open SSH / FTP / Telnet / RDP sessions straight from the result.

There is **no UI in this folder**. `electerm.configs` in `package.json` describes the form; electerm renders it, calls `run(config)` on submit, and draws the returned object as the result area. `main.js` only exports functions, so this widget needs no core changes, no new IPC channel and no build step.

## Install

```sh
./install-deps.sh    # from the repo root; installs openpgp
```

Settings → Widgets → **Import** → this folder. The whole folder (including `node_modules`, ~16MB) is copied to `<data dir>/widgets/passbolt-search/`, so nothing has to be installed over the network afterwards.

Importing copies, it does not link: editing `main.js` in this repo afterwards does not change the installed copy. Re-import and confirm the overwrite to update.

## Form fields

| Field | Type | Stored? |
| --- | --- | --- |
| Server URL | `string`, required | yes (encrypted local storage) |
| User ID | `string`, required | yes |
| GPG key file | `file`, required | path only |
| Key passphrase | `password` | **never** |
| Search | `string` | yes |

`User ID` is your UUID: in the web UI open Users / Manage Users & Groups → yourself → the UUID in `/app/users/view/<UUID>`.
Export the key with `gpg --export-secret-keys --armor <you@example.com> > me.asc`, or use "Download my key" in Passbolt settings.

`"persist": true` restores the non-password values next time. The `password` type is excluded when saving, so a passphrase cannot reach local storage.

## Actions

| Export | Called by | Arguments | Returns |
| --- | --- | --- | --- |
| `run` | submit | `(config)` | trust prompt / connected info / search result |
| `trust` | "Trust this key and connect" | `(config)` | connected info or search result |
| `details` | row button | `(row, config)` | masked password + entry fields |
| `openSsh` / `openFtp` / `openTelnet` / `openRdp` | row button | `(row, config)` | `{ openTab }` with decrypted credentials |
| `lock` | "Lock and disconnect" | `(config)` | status message |

`openTab` is opened by electerm as a normal terminal tab, tagged `from: widget:passbolt-search`; `tab.js` skips connection history for that prefix, so decrypted credentials never reach synced history.

## Security notes

- The private key file is read in the main process only; neither the key nor the passphrase is sent to Passbolt or anyone else
- The passphrase is never persisted, neither in the form store (excluded by type) nor in `.state.json`
- `.state.json` (next to `main.js`, mode 600) holds **only** the accepted server key fingerprint; delete it to be asked again
- Metadata and secrets are decrypted locally, stay in memory, and are cleared by `lock` and on exit
- Failures are reported as counts and stages, never as armor, response bodies or exception text
- The first connection asks you to compare the server fingerprint out of band; a changed fingerprint is refused until you verify the server again

## Known limitations

- The server must have the JWT authentication plugin enabled; the UUID has to be typed (the recovery-email new-device flow is not implemented)
- **No MFA support** (fails with an explicit message)
- Search covers resource metadata (name, username, description, URIs, custom fields), never secret fields
- Shared entries (`metadata_key_type: shared_key`) are skipped unless your user has a readable metadata key for them
- FTP and Telnet are plaintext protocols; use them on trusted networks only
- Re-importing overwrites `.state.json` with the source copy, so the fingerprint is confirmed once more

## Offline check (no Passbolt needed)

```sh
node scripts/passbolt-mock-and-run.js
```

Starts a throwaway server on 127.0.0.1 with throwaway keys and runs the widget through connect → trust → search → details → openSsh → lock, against a Passbolt 5 style (`user_key`) encrypted resource. It prints `PASS` and removes the `.state.json` it created, so the folder stays importable. This proves the client logic, not your server's configuration.
