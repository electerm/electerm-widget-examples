# File Renamer — an electerm widget

English | [中文](README_CN.md)

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

Template tags:

| Tag | Result |
| --- | --- |
| `{name}` | original base name (lowercased when "Keep original case" is off) |
| `{n}` / `{n:3}` | counter / padded counter (001) |
| `{ext}` | extension without the dot |
| `{date}` / `{time}` | creation date `YYYY-MM-DD` / `HH-mm-ss` |
| `{random}` | six random characters |
| `{parent}` | parent folder name |

`File types` is a comma separated extension list (`*` for everything); `Include subfolders` walks recursively.

## Notes

- A template may not contain path separators or `..` — renames cannot leave the chosen folder
- The plan is recomputed on apply (same input, same plan); files changed meanwhile show up as skipped/failed
- There is no undo: check the preview, especially for `{n}`, which renumbers everything
