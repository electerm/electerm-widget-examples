# Docker Cockpit — electerm 自定义 widget（自带界面）

把本机 docker 容器的状态摊在设置面板里：启停、重启、看日志、复制 exec 命令。

这是**自带 UI** 的那种 widget（`electerm.ui` → `ui/index.html`），页面跑在 `electerm-widget://docker-cockpit/` 的 iframe 里，通过 `window.electerm` 和主进程说话。用 config 模式做不了的部分，正是它存在的理由：

- 列表要**定时轮询**（只有运行的容器状态会变，`exited` 的也要能一键起来）
- 日志要**边看边刷新**，还能随时关闭
- 行内动作（start/stop/pause/restart/logs/exec）和过滤框，config 模式的表格行按钮支撑不了

## 安装

Settings → Widgets → Import → 选这个文件夹。**没有依赖**（直接调 docker CLI，不用 docker SDK），文件夹只有三个文件 + 一个 main.js。

## 界面

- 顶部：`N running / M`、engine 版本、过滤框（名字/镜像/端口/状态）、`auto`（3 秒轮询）、`refresh`
- 每行：状态点（绿=运行、黄=paused、红=退出）、容器名、镜像、状态与端口
- 行按钮：`start` / `stop` / `pause` / `resume` / `restart` / `logs` / `exec`
  - `stop`、`restart` 会弹确认框
- 点一行 = 打开下方日志面板（300 行，2 秒刷新，自动滚到底部，除非你往上翻了）
- `exec` **复制**一条命令到剪贴板，不是直接开终端：widget 没有「往终端里打字」的 API，粘贴到你自己的标签页里执行

## 实现要点

- `/opt/homebrew/bin/docker`、`/usr/local/bin/docker`、`/usr/bin/docker`、Docker Desktop / OrbStack 内置路径，一个个试；GUI 启动的 Electron 拿不到你终端里的 PATH，这是必须的
- `docker ps -a --format '{{json .}}'` 一行一个 JSON，字段名跨版本做防御性读取
- `docker logs --tail N --timestamps`，stdout 和 stderr 合并显示
- 错误（没装 docker、daemon 没起、socket 权限）直接显示在顶部红条里，不会静默

## 安全提示

能调 docker CLI 就等价于能拿到 **root**（`docker run -v /:/host` 这种）。这个 widget 只调用 `ps / start / stop / restart / pause / unpause / logs / version`，动作白名单在主进程里写死，但**安装一个 widget 本身就是授权它跑任意 Node 代码**。只装你自己写的或读过 `main.js` 的 widget。

## 已知限制

- 不支持 compose 项目分组，只列容器
- 不能 `docker exec` 进去，只能复制命令
- 日志是轮询不是流式：bridge 目前只有请求/响应，没有 host→widget 的推送通道
- 容器极多（几百个）时 `docker ps` 每次全量拉取，轮询建议关掉

---

# Docker Cockpit — English (a widget with its own UI)

Your local containers in the settings panel: state, ports, logs, start/stop/restart, and a ready-to-paste `docker exec`.

This is the **own-UI** kind of widget (`electerm.ui` → `ui/index.html`): the page runs inside an iframe on `electerm-widget://docker-cockpit/` and talks to the main process through `window.electerm`. The reasons config mode cannot do this:

- the list has to **poll** (container state changes while you look at it)
- the log pane stays open and refreshes while you read it
- per-row actions and a filter box are beyond what a generated result table offers

## Install

Settings → Widgets → Import → this folder. **No dependency**: it shells out to the docker CLI instead of using a docker SDK.

## UI

- Header: `N running / M`, engine version, filter (name/image/port/state), `auto` (3s polling), `refresh`
- Row: state dot (green running, amber paused, red exited), name, image, status, ports
- Actions: `start` / `stop` / `pause` / `resume` / `restart` / `logs` / `exec`
  - `stop` and `restart` ask for confirmation
- Clicking a row opens the log pane (300 lines, 2s refresh, sticks to the bottom unless you scrolled up)
- `exec` **copies** a command: a widget cannot type into a terminal, so paste it into your own tab

## Implementation notes

- Docker binary is looked up explicitly (`/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, Docker Desktop, OrbStack): a GUI-launched Electron does not inherit the PATH of your shell
- `docker ps -a --format '{{json .}}'`, one JSON per line, read defensively across versions
- `docker logs --tail N --timestamps`, stdout and stderr merged
- Failures (no docker, daemon down, socket permission) surface in a red banner instead of failing silently

## Security

Docker CLI access is **root-equivalent** (`docker run -v /:/host`). This widget only calls `ps / start / stop / restart / pause / unpause / logs / version` and the action list is hard-coded in the main process — but installing any widget is trusting it to run arbitrary Node code. Only install widgets you wrote or whose `main.js` you read.

## Limits

- Containers only (no compose grouping)
- No interactive `docker exec`, only a copied command
- Logs are polled, not streamed: the bridge is request/response, there is no host→widget push channel yet
- With hundreds of containers every poll is a full `docker ps`; leave auto-refresh off
