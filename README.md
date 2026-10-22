# electerm widget examples

[electerm](https://github.com/electerm/electerm) 用户自定义 widget（user widget）的真实示例集合。每个目录都是一个能直接用的 widget，导入即用 —— 不是玩具 demo。

Real, working [electerm](https://github.com/electerm/electerm) user widgets. Each folder is a widget you can import and actually use.

---

## 中文

### 这是什么

electerm 的 widget 有两种：

- **内置 widget**：跟着应用发版，代码在 electerm 仓库里
- **用户 widget**：就是一个带 `package.json` 的普通文件夹，放在 `<data dir>/widgets/<id>/` 下。不用改应用、不用重新打包，删掉文件夹就卸载了

这个仓库放的是第二种，用来回答一个具体问题：**这套接口够不够写真实功能？** 结论是够，边界只在依赖上（见下面的移植对照）。

### 环境要求

需要带 user widget 支持的 electerm。这个能力还没进正式发布，目前从源码跑：

```sh
git clone https://github.com/electerm/electerm.git
cd electerm
npm i --legacy-peer-deps
npm run compile && cp -r src/app/. work/app/ && npm run t
```

（发布之后这一步就不需要了，装正式版即可。）

### 装一个试试

```sh
git clone https://github.com/electerm/electerm-widget-examples.git
cd electerm-widget-examples
./install-deps.sh     # 只有 passbolt-search / static-server / ftp-server 需要
```

然后 electerm 里 **Settings → Widgets → Import**，选上面任意一个目录。

导入是**复制**：整个文件夹（含 `node_modules`）被复制到 `<data dir>/widgets/<id>/`。所以

- 之后改这里的源码，不影响已安装的那份；要更新就再 Import 一次并确认覆盖
- 列表里 hover → 删除按钮会连同目录一起删掉，运行时状态（比如 `passbolt-search/.state.json` 里记住的密钥指纹）也一起走

### 目录

| 目录 | 类型 | 依赖 | 用来干什么 |
| --- | --- | --- | --- |
| [`passbolt-search/`](passbolt-search/) | config | openpgp | 搜 Passbolt 条目，直接开 SSH / FTP / Telnet / RDP |
| [`docker-cockpit/`](docker-cockpit/) | 自带 UI | 无（调 docker CLI） | 容器状态、启停、日志、复制 exec 命令 |
| [`rename-files/`](rename-files/) | config | 无 | 批量改名，先预览再执行 |
| [`static-server/`](static-server/) | instance | express | 把目录用 HTTP 分享出去 |
| [`ftp-server/`](ftp-server/) | instance | @electerm/ftp-srv | 把目录用 FTP 分享出去 |

每个目录里都有中英双语的 `README.md`，写清了这个 widget 的配置项、实现要点和已知限制。`passbolt-search/` 另有 [`TESTING.md`](passbolt-search/TESTING.md)：一份可以用真实账号照着勾的验证流程 + 离线 mock 跑法。

### 三种形态

`package.json` 里 `electerm` 字段决定 widget 长什么样：

**1. config 模式（没有 `ui`）** —— 表单由宿主根据 `electerm.configs` 生成，提交时调用主进程里的 `electerm.action`（默认 `run`）。字段类型支持 `string` / `textarea` / `number` / `boolean` / `password` / `file` / `directory` / `select`。

```json
{
  "main": "main.js",
  "electerm": {
    "id": "rename-files",
    "name": "File Renamer",
    "type": "frontend",
    "submitLabel": "Preview",
    "persist": true,
    "configs": [
      { "name": "directory", "label": "Folder", "type": "directory", "required": true }
    ]
  }
}
```

`main.js` 导出 `widgetRun(config, ctx)`，返回一个结果对象：

```js
{
  message: '3 files renamed',
  messageType: 'success',                    // success | error | warning | info
  details: [{ label: 'Folder', value: '/tmp/x', copy: true, secret: false }],
  table: { columns: [...], rows: [...], rowButtons: [{ label, action, params }] },
  buttons: [{ label, action }],              // 普通按钮会替换当前结果
  openTab: { type: 'ssh', ... }              // 打开连接，from 会被强制成 widget:<id>
}
```

`rowButtons` / `buttons` 的 `action` 是 `main.js` 里**另一个导出的函数名**，宿主通过 `electerm.call(name, ...args)` 调它，结果压进一个结果栈（带返回箭头）。这就是为什么 `rename-files` 能做到「先预览、再确认执行」。

**2. instance 模式（没有 `ui`，`type: "instance"`）** —— 有开始/停止的生命周期，`widgetRun` 返回 `{ instanceId, start, stop }`，`start()` 解析出 `{ serverInfo, msg }`。两个 server widget 都是这种。

**3. 自带 UI（`electerm.ui` 指向一个 html）** —— 页面跑在 `electerm-widget://<id>/` 的 sandbox iframe 里，是**独立 origin**，只能通过 `window.electerm` 跟主进程说话：`call` / `getConfig` / `updateConfig` / `openDialog` / `saveDialog` / `copy` / `openExternal` / `openTab` / `log`。表单表达不了的东西（轮询、日志面板、行内动作）才值得走这条路 —— `docker-cockpit` 就是。

### 内置 widget 移植对照

这份对照是照着内置实现逐个复刻后得出的，用来量这套接口的边界：

| 内置 widget | 用户 widget 版 | 说明 |
| --- | --- | --- |
| File Renamer | ✅ `rename-files/` | 逻辑照搬，另加「先预览」和目标冲突检查 |
| Static File Server | ✅ `static-server/` | 契约完全一致，只有 express 需要 vendor |
| Local FTP Server | ✅ `ftp-server/` | 同上，`@electerm/ftp-srv` vendor |
| Batch Operation | ⚠️ 未移植 | 它没有真表单，内置版是一个 React 编辑器（`batch-op-editor.jsx`）。做成用户 widget 等于重写那个编辑器，属于 UI 工作量，不是接口限制 |
| SSH Server | ⚠️ 未移植 | 需要 `@electerm/ssh2` + `node-pty`；两者都能 vendor，但 `node-pty` 带 27MB 预编译二进制，且必须与 Electron ABI 匹配 |
| MCP Server | ❌ 不能 | 它 `require` 的是应用内部模块 |

MCP Server 为什么不行，不是猜的：

```text
# 从 <data dir>/widgets/mcp-server/main.js 出发
require('../mcp/server/mcp.js')   -> <data dir>/widgets/mcp/server/mcp.js   MODULE_NOT_FOUND
require('../lib/zod')             -> <data dir>/widgets/lib/zod              MODULE_NOT_FOUND
```

用户 widget 只能拿到 **Node 内置模块 + 自己目录下的 `node_modules`**。这既是限制也是边界：一个 widget 不会因为住进数据目录就获得应用内部代码的访问权。真要用内部模块只有两条路，都不推荐 —— 把模块复制进 widget（等于分叉应用代码，升级即失配），或用 `app.getAppPath()` 拼绝对路径（打包成 asar 后行为不同，内部模块也没有稳定接口）。

### 安全模型

- 自带 UI 的 widget 页面是**独立 origin 的 sandbox iframe**，宿主只回应 `evt.source === frame.contentWindow` 的消息，能用的方法就是上面那九个
- 但它的 `main.js` 跑在**主进程，是完整 Node 权限**。能调 docker CLI 就等价于能拿到 root；能读文件就能读你的私钥
- 所以：**装 widget = 信任它的作者**，和装 VS Code 扩展、装 npm 包是同一件事。只装你自己写的，或者把 `main.js` 读完的

`passbolt-search` 与 `docker-cockpit` 的 README 里各有一段针对它们自己的权限说明，值得先看。

### License

MIT

---

## English

### What this is

electerm has two kinds of widgets:

- **Built-in widgets** ship with the app, code lives in the electerm repo
- **User widgets** are plain folders with a `package.json`, dropped into `<data dir>/widgets/<id>/`. No app changes, no rebuild, and deleting the folder uninstalls it

This repo holds the second kind, and exists to answer one question: **can this API carry real functionality?** It can — the only real boundary is dependencies (see the porting table below).

### Requirements

An electerm build with user-widget support. That feature is not in a release yet, so for now run it from source:

```sh
git clone https://github.com/electerm/electerm.git
cd electerm
npm i --legacy-peer-deps
npm run compile && cp -r src/app/. work/app/ && npm run t
```

(Once it ships, any release build works.)

### Try one

```sh
git clone https://github.com/electerm/electerm-widget-examples.git
cd electerm-widget-examples
./install-deps.sh     # only passbolt-search / static-server / ftp-server need it
```

Then in electerm: **Settings → Widgets → Import**, pick any folder.

Import **copies** the whole folder (including `node_modules`) to `<data dir>/widgets/<id>/`, so editing the source here does not change an installed copy, and deleting a widget from the list also removes its runtime state (`passbolt-search/.state.json` keeps a pinned key fingerprint).

### Folders

| Folder | Type | Dependency | What it does |
| --- | --- | --- | --- |
| [`passbolt-search/`](passbolt-search/) | config | openpgp | Search Passbolt, open SSH / FTP / Telnet / RDP |
| [`docker-cockpit/`](docker-cockpit/) | own UI | none (docker CLI) | Container state, start/stop, logs, copy exec |
| [`rename-files/`](rename-files/) | config | none | Batch rename with a preview step |
| [`static-server/`](static-server/) | instance | express | Serve a folder over HTTP |
| [`ftp-server/`](ftp-server/) | instance | @electerm/ftp-srv | Serve a folder over FTP |

Every folder has a bilingual `README.md` covering its config fields, implementation notes and known limits. `passbolt-search/` also has [`TESTING.md`](passbolt-search/TESTING.md): a checklist you can walk through with a real account, plus an offline mock.

### Three shapes

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

### Porting the built-ins

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

### Security model

- The own-UI page is a **sandboxed iframe on its own origin**; the host only answers messages where `evt.source === frame.contentWindow`, and only the nine methods above are reachable
- Its `main.js` runs in the **main process with full Node privileges**. Being able to call the docker CLI means effectively root; being able to read files means your private keys
- So: **installing a widget means trusting its author**, the same deal as a VS Code extension or an npm package. Install only what you wrote or read

### License

MIT
