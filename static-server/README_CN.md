# Static File Server — electerm 自定义 widget

[English](README.md) | 中文

把本地一个目录用 HTTP 分享出去。`type: "instance"`：启动后是一个可停止的实例，面板里能看到地址、也能读访问日志。

内置 Static File Server（`src/app/widgets/widget-local-file-server.js`）的用户 widget 版，契约完全一致：`widgetRun(config, ctx)` 返回 `{ instanceId, start, stop }`，`start()` 返回 `{ serverInfo, msg }`。

## 安装

```sh
./install-deps.sh    # 在仓库根目录跑，装 express
```

Settings → Widgets → Import → 选这个文件夹。依赖 `express` 在 `node_modules`（约 4MB），导入时跟着文件夹一起复制。

## 用法

1. 选 **Folder to serve**（留空 = home 目录）
2. **Bind address** 默认 `127.0.0.1`，只本机可访问；要给别人用改 `0.0.0.0`（注意防火墙和 `.env` 之类的文件）
3. **Port** 默认 3456，被占用会直接报错在实例日志里
4. 点 **Start widget** → 实例出现在运行列表，`serverInfo.url` 就是地址
5. 停止：实例行上的停止按钮；访问日志写在实例日志里（每个请求一行，含状态码与耗时）

其余选项：`Index file`（默认 `index.html`）、`Dotfiles`（allow/deny/ignore）、`Cache max-age`（0 = 不设 Cache-Control）、`Auto run`（随 app 启动）。

## 注意

- 没有目录列表页（express.static 默认行为），访问目录需要 index 文件或直接给完整路径
- `0.0.0.0` + `Dotfiles: allow` 等于把目录里的 `.env`、`.git` 暴露给同网段，按需收紧
- 只是静态文件；要反向代理/改写请用 nginx
