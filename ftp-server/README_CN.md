# Local FTP Server — electerm 自定义 widget

[English](README.md) | 中文

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
