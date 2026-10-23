# electerm widget examples

[English](README.md) | 中文

[electerm](https://github.com/electerm/electerm) 用户自定义 widget（user widget）的真实示例集合。每个目录都是一个能直接用的 widget，导入即用 —— 不是玩具 demo。

---

## 这是什么

electerm 的 widget 有两种：

- **内置 widget**：跟着应用发版，代码在 electerm 仓库里
- **用户 widget**：就是一个带 `package.json` 的普通文件夹，放在 `<data dir>/widgets/<id>/` 下。不用改应用、不用重新打包，删掉文件夹就卸载了

这个仓库放的是第二种，用来回答一个具体问题：**这套接口够不够写真实功能？** 结论是够，边界只在依赖上（见下面的移植对照）。

## 环境要求

需要带 user widget 支持的 electerm。这个能力还没进正式发布，目前从源码跑：

```sh
git clone https://github.com/electerm/electerm.git
cd electerm
npm i --legacy-peer-deps
npm run compile && cp -r src/app/. work/app/ && npm run t
```

（发布之后这一步就不需要了，装正式版即可。）

## 装一个试试

```sh
git clone https://github.com/electerm/electerm-widget-examples.git
cd electerm-widget-examples
./install-deps.sh     # 只有 passbolt-search / static-server / ftp-server 需要
```

然后 electerm 里 **Settings → Widgets → Import**，选上面任意一个目录。

导入是**复制**：整个文件夹（含 `node_modules`）被复制到 `<data dir>/widgets/<id>/`。所以

- 之后改这里的源码，不影响已安装的那份；要更新就再 Import 一次并确认覆盖
- 列表里 hover → 删除按钮会连同目录一起删掉，运行时状态（比如 `passbolt-search/.state.json` 里记住的密钥指纹）也一起走

## 目录

| 目录 | 类型 | 依赖 | 用来干什么 |
| --- | --- | --- | --- |
| [`passbolt-search/`](passbolt-search/) | config | openpgp | 搜 Passbolt 条目，直接开 SSH / FTP / Telnet / RDP |
| [`docker-cockpit/`](docker-cockpit/) | 自带 UI | 无（调 docker CLI） | 容器状态、启停、日志、复制 exec 命令 |
| [`rename-files/`](rename-files/) | config | 无 | 批量改名，先预览再执行 |
| [`static-server/`](static-server/) | instance | express | 把目录用 HTTP 分享出去 |
| [`ftp-server/`](ftp-server/) | instance | @electerm/ftp-srv | 把目录用 FTP 分享出去 |

每个目录都有英文的 `README.md` 和中文的 `README_CN.md`，写清了这个 widget 的配置项、实现要点和已知限制。`passbolt-search/` 另有 [`TESTING.md`](passbolt-search/TESTING.md)：一份可以用真实账号照着勾的验证流程 + 离线 mock 跑法。

`passbolt-search/` 基于 GitHub 用户 [@palsanyi](https://github.com/palsanyi) 的代码实现，在此致谢。

## 本地 Passbolt 测试服务器

不想拿生产实例试错，`scripts/` 里有一套 docker 脚本，起一台一次性的 Passbolt CE（mariadb + passbolt，端口 8088，不需要 docker compose）：

```sh
./scripts/passbolt-start.sh   # 建容器、跑迁移、等到 /auth/verify.json 有服务器公钥
./scripts/passbolt-init.sh    # 造一个可登录的测试账号，打印 widget 要填的五个值
./scripts/passbolt-stop.sh    # 停掉，数据留着；--purge 连容器和卷一起删
```

`passbolt-init.sh` 默认直接往数据库里写一个和「完成 setup」等价的账号（`users` / `profiles` / `gpgkeys` 三行 + 4096 位密钥），因为 Passbolt 5 的 setup 页面**强制要求装浏览器扩展**，没有扩展只显示一句 "Please install the browser extension"。想走真实页面就 `./scripts/passbolt-init.sh --browser`。

`passbolt-init.sh` 还会往账号里播种 8 条样例条目，每种资源类型一条：简单密码、密码+描述（https / ssh / ftp 各一条，ssh 那条带非标准端口）、v4 TOTP、v5 默认、v5+TOTP、v5 note。它们用账号自己的公钥加密、用自己的私钥签名，和网页版里手工新建的条目等价，所以 widget 的 Search 第一次就有真实数据可点。`--no-samples` 跳过。

结束时它打印 Server URL / User ID / GPG key file / Passphrase / 服务器指纹，并把私钥放在 `scripts/.passbolt/me.asc`（已 gitignore）。端口、账号、口令都可以用环境变量覆盖（`PASSBOLT_PORT`、`PASSBOLT_ADMIN_EMAIL`、`PASSBOLT_SEED_PASSPHRASE`…，全部见 `scripts/passbolt-lib.sh`）。Docker Hub 不通时加 `PASSBOLT_REGISTRY_MIRROR=docker.1panel.live`。

## 三种形态

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

## 内置 widget 移植对照

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

## 安全模型

- 自带 UI 的 widget 页面是**独立 origin 的 sandbox iframe**，宿主只回应 `evt.source === frame.contentWindow` 的消息，能用的方法就是上面那九个
- 但它的 `main.js` 跑在**主进程，是完整 Node 权限**。能调 docker CLI 就等价于能拿到 root；能读文件就能读你的私钥
- 所以：**装 widget = 信任它的作者**，和装 VS Code 扩展、装 npm 包是同一件事。只装你自己写的，或者把 `main.js` 读完的

`passbolt-search` 与 `docker-cockpit` 的 README 里各有一段针对它们自己的权限说明，值得先看。

## License

MIT
