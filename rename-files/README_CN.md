# File Renamer — electerm 自定义 widget

[English](README.md) | 中文

批量重命名一个文件夹里的文件，**先预览再执行**。config 模式（没有 HTML）：表单和结果表都由 electerm 画，`main.js` 只算名字。

这是内置 File Renamer（`src/app/widgets/widget-rename.js`）的用户 widget 版，多了两条安全措施：

1. 提交只生成计划并显示表格，文件不会动；要点结果区的 **Rename N file(s)** 才真正执行
2. 目标已存在、或两个文件会撞到同一个名字时，该行标为跳过（内置版直接 `fs.rename`，同名会被覆盖）

## 安装

Settings → Widgets → Import → 选这个文件夹。纯 Node 内置模块，没有依赖，文件夹只有 `package.json` + `main.js`。

## 用法

1. **Folder** 选目录（`directory` 类型会弹目录选择框）
2. **New name template** 写模板，提交前先看预览表
3. 确认 **Rename N file(s)**，执行完再给一张结果表

模板标签：

| 标签 | 结果 |
| --- | --- |
| `{name}` | 原文件名（不含扩展名），关掉 Keep original case 会转小写 |
| `{n}` / `{n:3}` | 序号 / 补零序号（001） |
| `{ext}` | 扩展名（不含点） |
| `{date}` / `{time}` | 创建日期 `YYYY-MM-DD` / `HH-mm-ss` |
| `{random}` | 6 位随机串 |
| `{parent}` | 上一级目录名 |

`File types` 用逗号分隔扩展名，`*` 表示全部；`Include subfolders` 会递归。

## 注意

- 模板里不允许出现路径分隔符，也不允许 `..`：改名不会跑出所选目录
- 执行时重新算一遍计划（同一份输入结果相同）；期间文件被外部改动的话，会以跳过/失败出现在结果表里
- 没有撤销：先用预览核对，尤其是 `{n}` 这种会整体重排的模板
