# electerm widget examples

[English](README.md) | 中文

[electerm](https://github.com/electerm/electerm) 用户自定义 widget（user widget）的真实示例。每个
widget 一个独立仓库，直接用仓库地址就能装 —— 不是玩具 demo。

**Settings → Widgets → Import**，粘贴 `electerm/electerm-widget-rename-files`，就完了。electerm 会
下载仓库、找到 `package.json` 里带 `electerm` 字段的那个目录、校验通过后复制到
`<data dir>/widgets/<id>/`。

| 仓库 | 形态 | 用来干什么 |
| --- | --- | --- |
| [`electerm-widget-passbolt-search`](https://github.com/electerm/electerm-widget-passbolt-search) | config | 搜 Passbolt，用本地解密的凭据直接开 SSH / FTP / Telnet / RDP |
| [`electerm-widget-docker-cockpit`](https://github.com/electerm/electerm-widget-docker-cockpit) | 自带 UI | 容器状态、启停、日志、复制 exec 命令 |
| [`electerm-widget-rename-files`](https://github.com/electerm/electerm-widget-rename-files) | config | 批量改名，先预览再执行 |
| [`electerm-widget-static-server`](https://github.com/electerm/electerm-widget-static-server) | instance | 把目录用 HTTP 分享出去 |
| [`electerm-widget-ftp-server`](https://github.com/electerm/electerm-widget-ftp-server) | instance | 把目录用 FTP 分享出去 |

每个仓库都有英文 `README.md` 和中文 `README_CN.md`，写清了配置项、实现要点和已知限制。
`electerm-widget-passbolt-search` 另有 `TESTING.md`：一份可以用真实账号照着勾的验证流程 + 离线 mock。

## 装一个

**Settings → Widgets → Import**，粘贴仓库地址：

```text
electerm/electerm-widget-rename-files
https://github.com/electerm/electerm-widget-rename-files
electerm/electerm-widget-passbolt-search#main
```

认的写法：`owner/repo`、仓库页面链接、仓库里某个目录的链接（`/tree/<ref>/<folder>`）、
`owner/repo#branch`，以及仓库名后面跟目录（`owner/repo/widgets/foo`）。支持 GitHub 和 AtomGit。
需要 electerm **v5.8.0** 或更新版本；对话框里那个 **Import folder** 按钮则是装本地目录。

导入是**复制**：整个目录（含 `node_modules`）被复制到 `<data dir>/widgets/<id>/`。之后改你 clone
下来的那份，不影响已安装的 widget —— 要更新就重新导入并确认覆盖。在列表里删掉 widget 会连目录一起
删，包括它写在 `main.js` 旁边的状态（`passbolt-search/.state.json` 里只存一个已确认的密钥指纹）。

## 为什么一个 widget 一个仓库

装一个 widget 的过程是「下载仓库、从里面复制一个目录出来」，中间**没有** `npm install` 这一步。所以
仓库就是分发单位：

- **依赖必须提交进仓库。** `express`、`@electerm/ftp-srv`、`openpgp` 都躺在各自仓库的 `node_modules/`
  里，这是有意的 —— 也是 `static-server` clone 下来约 4MB 的原因
- **一个仓库 = 一次下载很小。** 反过来做（monorepo）就是每次装都要拉所有 widget 的依赖，拆分之前这个
  仓库正是这个样子
- **各自的 issue、release、blame。** Passbolt 客户端的 bug 和 FTP 服务器没有关系

要改某个 widget：clone 它的仓库，用 **Import folder** 装本地目录，改完再导入一次就是。

## 文档在哪

接口本身 —— 清单字段、config 模式、instance 生命周期、`window.electerm` 桥、安全模型 —— 只写一遍，
在 **[User widget guide](https://github.com/electerm/electerm/wiki/User-widget-guide)**。这个仓库是
索引，那一页是手册。

## 内置 widget 移植对照

这份对照是照着内置实现逐个复刻后得出的，用来量这套接口的边界：

| 内置 widget | 用户 widget 版 | 说明 |
| --- | --- | --- |
| File Renamer | ✅ `electerm-widget-rename-files` | 逻辑照搬，另加「先预览」和目标冲突检查 |
| Static File Server | ✅ `electerm-widget-static-server` | 契约完全一致，只有 express 需要 vendor |
| Local FTP Server | ✅ `electerm-widget-ftp-server` | 同上，`@electerm/ftp-srv` vendor |
| Batch Operation | ⚠️ 未移植 | 它没有真表单，内置版是一个 React 编辑器（`batch-op-editor.jsx`）。做成用户 widget 等于重写那个编辑器，属于 UI 工作量，不是接口限制 |
| SSH Server | ⚠️ 未移植 | 需要 `@electerm/ssh2` + `node-pty`；两者都能 vendor，但 `node-pty` 带 27MB 预编译二进制，且必须与 Electron ABI 匹配 |
| MCP Server | ❌ 不能 | 它 `require` 的是应用内部模块 |

用户 widget 只能拿到 **Node 内置模块 + 自己目录下的 `node_modules`**。这既是限制也是边界：一个 widget
不会因为住进数据目录就获得应用内部代码的访问权。

## 安全模型

- 自带 UI 的 widget 页面是**独立 origin 的 sandbox iframe**，宿主只回应 `evt.source ===
  frame.contentWindow` 的消息，能用的方法就那固定几个
- 但它的 `main.js` 跑在**主进程，是完整 Node 权限**。能调 docker CLI 就等价于能拿到 root；能读文件
  就能读你的私钥
- **从 URL 导入并不会更安全。** 仓库只是被下载、复制，没有人检查 `main.js`。所以：**装 widget = 信任
  它的作者**，和装 VS Code 扩展、装 npm 包是同一件事。只装你自己写的，或者把 `main.js` 读完的

## License

MIT
