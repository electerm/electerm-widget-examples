# File Renamer — electerm 自定义 widget

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

---

# File Renamer — English

Batch rename the files of a folder, **preview first**. Config mode (no HTML): electerm draws the form and the result table; `main.js` only computes names.

This is the built-in File Renamer (`src/app/widgets/widget-rename.js`) as a user widget, with two safety changes:

1. Submitting only builds a plan and shows a table — nothing moves until you press **Rename N file(s)**
2. A row is skipped when the target already exists or two files would land on the same name (the built-in calls `fs.rename` directly and would silently overwrite)

## Install

Settings → Widgets → Import → this folder. Node built-ins only, no dependency: the folder is `package.json` + `main.js`.

## Use

1. **Folder** opens a directory picker (`directory` field type)
2. Write the **template**, look at the preview table
3. Confirm **Rename N file(s)**, then read the result table

Template tags: `{name}` original base name (lowercased when "Keep original case" is off), `{n}` / `{n:3}` counter / padded counter, `{ext}` extension without the dot, `{date}` / `{time}` creation date/time, `{random}` six characters, `{parent}` parent folder name.

`File types` is a comma separated extension list (`*` for everything); `Include subfolders` walks recursively.

## Notes

- A template may not contain path separators or `..` — renames cannot leave the chosen folder
- The plan is recomputed on apply (same input, same plan); files changed meanwhile show up as skipped/failed
- There is no undo: check the preview, especially for `{n}`, which renumbers everything
