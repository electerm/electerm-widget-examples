# Passbolt widget — 验证流程 / Verification walkthrough

两种验证方式：**A. 真实账号**（推荐，能证明你的服务器配置也通）和 **B. 离线 mock**（不需要服务器，只证明客户端逻辑）。按顺序勾一遍即可；最后的「故障对照表」用来判断卡在哪一步。

不要在任何 issue / 截图里贴私钥、口令或解密出来的密码。

---

## A. 真实 Passbolt 账号

### 0. 前置条件

- [ ] electerm 带 user widget 支持（未发布前：electerm 仓库里 `npm run compile && cp -r src/app/. work/app/ && npm run t`）
- [ ] 网页版能正常登录你的账号
- [ ] 服务器启用了 **JWT authentication plugin**（Passbolt 5.x 默认启用；自建老版本可能没有）
- [ ] 知道自己的 **user UUID**：Users / Manage Users & Groups → 点开自己 → 地址栏 `/app/users/view/<UUID>`
- [ ] 至少一条**带 URI**、**有密码**的条目（个人或共享都可以）

### 1. 准备私钥

```sh
gpg --list-secret-keys --keyid-format long          # 找到自己的 key
gpg --export-secret-keys --armor <邮箱或 key id> > /tmp/me.asc
```

- [ ] 文件开头是 `-----BEGIN PGP PRIVATE KEY BLOCK-----`
- [ ] 记得这个 key 有没有口令（升级过 Passbolt 的账号通常有）
- [ ] 如果你在 Passbolt 里换过设备/重过 key，确认导出的是**当前**那把（网页版设置里 "Download my key" 最稳）

### 2. 导入 widget

- [ ] Settings → Widgets → Import → 选本仓库的 `passbolt-search/`
- [ ] 列表里出现 **Passbolt Search**；点它，右侧是自动生成的表单（没有 iframe、没有 HTML）
- [ ] 顶部没有红色错误条（有的话说明 `package.json` 或 `main.js` 有问题，见对照表）

### 3. 第一次提交（信任服务器钥匙）

填表：Server URL、User ID、GPG key file（按钮选文件）、passphrase、Search 先留空 → 点 **Connect / search**。

- [ ] 出现黄色提示 + 一行 **Server key** 指纹（4 字符一组）
- [ ] 这个指纹和你管理员给的、或 `<server>/auth/verify.json` 里的一致
- [ ] 点 **Trust this key and connect** → 出现绿色「Connected to …」，并列出 **Server key** 和 **Your key** 两个指纹
- [ ] 同目录出现 `.state.json`，内容只有 `trustedFingerprint`：

```sh
cat "$(electerm data dir)/widgets/passbolt-search/.state.json"   # 或源目录，若你直接在源目录试
```

### 4. 搜索

- [ ] Search 里填一个**你在网页版确定存在**的关键词（主机名 / 用户名 / IP 都行）→ 再点提交
- [ ] 结果是一张表：Name / Username / URI / Type，行数与网页版对得上
- [ ] 提示行显示 `Scanned N entries, decrypted N. M match(es).`
- [ ] 如果显示 `skipped K`，说明有 K 条元数据解不开或签名不可信 —— 记下 K，第 8 步再看

### 5. Details（解密）

- [ ] 点某行的 **Details**
- [ ] 密码显示为 `••••••`，点眼睛能揭示，点复制能进剪贴板
- [ ] 用户名、URI 与网页版一致；自定义字段会平铺在后面

### 6. 打开连接

- [ ] 点某行的 **SSH** → 新标签打开，标题是条目名，用户名/密码已填
- [ ] 同一个连接**不出现在**「连接历史」里（tab 带 `from: widget:passbolt-search`）
- [ ] FTP / Telnet / RDP 同理（端口取 URI 里的，没写则用 22/21/23/3389）

### 7. Lock 与持久化

- [ ] 点 **Lock and disconnect** → 提示 tokens/keys 已清空
- [ ] 再点行上的 Details → 报「session is closed. Connect again.」
- [ ] 关掉设置面板再打开：非 password 字段被回填，**passphrase 是空的**
- [ ] 重启 electerm → 再提交一次，**不再问指纹**（走 `.state.json`）

### 8. 边界情况（可选，但能证明限制是真的）

- [ ] 把 Server URL 改成 `http://` 的公网地址 → 报「must use HTTPS」
- [ ] 把 User ID 改成一个乱写的字符串 → 报 UUID 格式错
- [ ] 换个没权限的 key 文件 → 报「Could not unlock the selected GPG private key」
- [ ] 如果账号开了 MFA → 报「requires MFA (…), which this widget does not support yet.」这是已知限制，不是 bug
- [ ] 共享条目如果没读 metadata key 的权限 → 该条被计入 skipped，其它条目照常

### 9. 卸载

- [ ] 列表里 hover 该 widget → 删除按钮 → 确认
- [ ] `<data dir>/widgets/passbolt` 消失

---

## B. 离线 mock（不需要服务器）

```sh
node scripts/passbolt-mock-and-run.js
```

- [ ] 输出 `PASS: connect -> trust -> search -> details -> openSsh -> lock`
- [ ] 脚本结束时删掉了自己生成的 `.state.json`（所以文件夹还能正常导入）

它起一个 127.0.0.1 的假服务器、现场生成一次性密钥，覆盖 connect（指纹信任）、search（Passbolt 5 的 `user_key` 加密元数据）、details、openSsh、lock。**不能**证明你服务器的 shared_key 条目、真实 MFA 行为或网络策略。

---

## 故障对照表

| 看到的提示 | 大概率原因 |
| --- | --- |
| `The Passbolt server URL must use HTTPS` | 用了 http 且不是 localhost |
| `Add your Passbolt user ID (UUID) …` | UUID 没填/填错（注意要带连字符） |
| `did not return a JSON response` | URL 指到了网页而不是 API，或被反代拦截 |
| `did not return a JWT login challenge` | 服务器没启用 JWT 插件 |
| `This Passbolt account requires MFA` | 账号开了 MFA，当前不支持 |
| `The selected file is not a readable OpenPGP private key` | 导出的是公钥，或文件是 keygrip/二进制格式不对 |
| `Could not unlock the selected GPG private key` | 口令错，或这个 key 不是服务器上那把的私钥 |
| `The Passbolt server key fingerprint changed` | 服务器换过 key / 中间人；先确认服务器再删 `.state.json` |
| 搜索结果 `skipped K` 且 K=全部 | 你的 key 与账号不匹配，或账号在等 key 更新（Passbolt 里完成 setup） |
| `Does the widget list show a red error` | `package.json` 不合规（id 与目录名不一致、entry 不存在、JSON 语法错） |

---

# English

Two ways to verify: **A. real account** (recommended — it also proves your server config) and **B. offline mock** (no server; proves the client logic only). Work through it top to bottom; the troubleshooting table at the end tells you where you stopped.

Never paste keys, passphrases or decrypted passwords into an issue or screenshot.

## A. Real Passbolt account

### 0. Before you start

- [ ] an electerm build with user-widget support (before release: `npm run compile && cp -r src/app/. work/app/ && npm run t` in the electerm repo)
- [ ] your account works in the web UI
- [ ] the server has the **JWT authentication plugin** enabled (default in Passbolt 5.x; old self-hosted installs may not)
- [ ] you know your **user UUID**: Users / Manage Users & Groups → yourself → `/app/users/view/<UUID>`
- [ ] at least one entry with a **URI** and a **password**

### 1. Export the key

```sh
gpg --list-secret-keys --keyid-format long
gpg --export-secret-keys --armor <email or key id> > /tmp/me.asc
```

- [ ] the file starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`
- [ ] you know whether it has a passphrase
- [ ] it is the **current** key for that account ("Download my key" in Passbolt settings is the safe source)

### 2. Import

- [ ] Settings → Widgets → Import → `passbolt-search/`
- [ ] **Passbolt Search** appears; selecting it shows a generated form (no iframe, no HTML)
- [ ] no red error block (if there is one, see the table)

### 3. First submit (trust the server key)

Fill Server URL, User ID, GPG key file, passphrase; leave Search empty → **Connect / search**.

- [ ] a warning block shows **Server key** as a grouped fingerprint
- [ ] it matches what your administrator published / what `<server>/auth/verify.json` returns
- [ ] **Trust this key and connect** → green "Connected to …" with both **Server key** and **Your key**
- [ ] `.state.json` appears next to `main.js`, containing only `trustedFingerprint`

### 4. Search

- [ ] enter a keyword you know exists in the web UI → submit
- [ ] a table appears: Name / Username / URI / Type, same rows as the web UI
- [ ] the message reads `Scanned N entries, decrypted N. M match(es).`
- [ ] `skipped K` means K entries could not be decrypted or had an untrusted signature

### 5. Details

- [ ] **Details** shows the password masked; the eye reveals it, copy puts it on the clipboard
- [ ] username and URI match the web UI; custom fields are listed after them

### 6. Open a connection

- [ ] **SSH** opens a tab titled with the entry name, username/password prefilled
- [ ] the connection does **not** appear in connection history (`from: widget:passbolt-search`)
- [ ] FTP / Telnet / RDP behave the same (port from the URI, else 22/21/23/3389)

### 7. Lock and persistence

- [ ] **Lock and disconnect** reports that tokens and keys were cleared
- [ ] pressing Details again says "session is closed. Connect again."
- [ ] reopening the panel restores the non-password fields; **passphrase is empty**
- [ ] after an app restart, submitting again does **not** ask for the fingerprint

### 8. Edge cases (optional, they prove the limits are real)

- [ ] `http://` on a public host → "must use HTTPS"
- [ ] a malformed User ID → UUID format error
- [ ] an unrelated key file → "Could not unlock the selected GPG private key"
- [ ] an MFA account → "requires MFA (…), which this widget does not support yet." (known limit)
- [ ] a shared entry without metadata key access → counted as skipped, the rest still works

### 9. Uninstall

- [ ] hover the widget in the list → delete → confirm
- [ ] `<data dir>/widgets/passbolt` is gone

## B. Offline mock

```sh
node scripts/passbolt-mock-and-run.js
```

- [ ] prints `PASS: connect -> trust -> search -> details -> openSsh -> lock`
- [ ] removes the `.state.json` it created, so the folder stays importable

It starts a throwaway server on 127.0.0.1 with throwaway keys and covers connect (fingerprint trust), search (Passbolt 5 `user_key` encrypted metadata), details, openSsh and lock. It does **not** prove shared_key entries, real MFA behaviour or your network setup.

## Troubleshooting

| Message | Likely cause |
| --- | --- |
| `The Passbolt server URL must use HTTPS` | plain http on a non-localhost host |
| `Add your Passbolt user ID (UUID) …` | UUID missing or malformed (hyphens required) |
| `did not return a JSON response` | the URL points at the web page, or a proxy intercepted the API |
| `did not return a JWT login challenge` | JWT plugin disabled on the server |
| `This Passbolt account requires MFA` | MFA account; not supported yet |
| `The selected file is not a readable OpenPGP private key` | you exported the public key, or the file is not a key |
| `Could not unlock the selected GPG private key` | wrong passphrase, or the key is not the one on the server |
| `The Passbolt server key fingerprint changed` | the server key changed (or MITM); verify the server, then delete `.state.json` |
| every entry `skipped` | your key does not match the account, or the account is awaiting setup |
| red error block in the widget list | invalid `package.json` (id ≠ folder name, missing entry, JSON syntax) |
