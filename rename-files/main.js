/**
 * File Renamer — a config-mode electerm widget.
 *
 * Port of the built-in "File Renamer" widget (src/app/widgets/widget-rename.js)
 * with two changes that matter for a destructive operation:
 *
 *   1. `run` only builds a plan and shows it. Files are renamed by the
 *      "Rename N files" button, which calls `apply` with the same form values.
 *   2. A plan entry is skipped when the target already exists or when two
 *      entries would land on the same name (fs.rename overwrites silently).
 *
 * Everything is Node built-ins: no dependency to vendor.
 */

/* eslint-env node */
const fs = require('fs').promises
const path = require('path')

const DEFAULTS = {
  directory: '',
  template: '{name}-{n}.{ext}',
  includeSubfolders: false,
  fileTypes: '*',
  startNumber: 1,
  preserveCase: true
}

const PREVIEW_LIMIT = 200
const pathSeparatorPattern = /[\\/]/

function configOf (params = {}) {
  return { ...DEFAULTS, ...params }
}

async function listFiles (dir, fileTypes, includeSubfolders) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  let results = []
  const wanted = String(fileTypes || '*').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (includeSubfolders) {
        results = results.concat(await listFiles(full, fileTypes, includeSubfolders))
      }
      continue
    }
    if (!entry.isFile()) {
      continue
    }
    const ext = path.extname(entry.name).toLowerCase().slice(1)
    if (fileTypes === '*' || wanted.includes(ext)) {
      results.push(full)
    }
  }
  return results.sort()
}

async function expandTemplate (template, filePath, index, startNumber, preserveCase) {
  const stat = await fs.stat(filePath)
  const parsed = path.parse(filePath)
  const created = new Date(stat.birthtimeMs || stat.ctimeMs || Date.now())
  const tags = {
    n: padding => {
      const value = startNumber + index
      return padding ? String(value).padStart(parseInt(padding, 10) || 0, '0') : String(value)
    },
    name: () => preserveCase ? parsed.name : parsed.name.toLowerCase(),
    ext: () => parsed.ext.slice(1),
    date: () => created.toISOString().split('T')[0],
    time: () => created.toTimeString().split(' ')[0].replace(/:/g, '-'),
    random: () => Math.random().toString(36).slice(2, 8),
    parent: () => path.basename(parsed.dir)
  }
  let out = template
  Object.entries(tags).forEach(([tag, fn]) => {
    out = out.replace(new RegExp(`{${tag}(?::([^}]+))?}`, 'g'), (match, param) => fn(param))
  })
  return out
}

// A template is user input; it must never produce a path outside the folder.
function targetOf (dir, name) {
  const clean = String(name || '').trim()
  if (!clean || clean === '.' || clean === '..') {
    throw new Error('template produced an empty file name')
  }
  if (pathSeparatorPattern.test(clean)) {
    throw new Error('template must not contain path separators')
  }
  const target = path.resolve(dir, clean)
  const rel = path.relative(dir, target)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('template must stay inside the folder')
  }
  return target
}

function errorText (error) {
  return error && error.message ? error.message : String(error)
}

async function buildPlan (params) {
  const config = configOf(params)
  const directory = String(config.directory || '').trim()
  if (!directory) {
    throw new Error('Choose a folder first.')
  }
  let stat
  try {
    stat = await fs.stat(directory)
  } catch (e) {
    throw new Error(`Cannot read folder: ${directory}`)
  }
  if (!stat.isDirectory()) {
    throw new Error(`Not a folder: ${directory}`)
  }
  const files = await listFiles(directory, config.fileTypes, !!config.includeSubfolders)
  const plan = []
  const seenTargets = new Set()
  for (let i = 0; i < files.length; i++) {
    const source = files[i]
    const dir = path.dirname(source)
    const row = { source, dir, name: path.basename(source) }
    try {
      const wanted = await expandTemplate(
        String(config.template || DEFAULTS.template),
        source,
        i,
        Number(config.startNumber) || 1,
        config.preserveCase !== false
      )
      row.target = targetOf(dir, wanted)
      row.next = path.basename(row.target)
    } catch (error) {
      row.skip = errorText(error)
      plan.push(row)
      continue
    }
    if (row.target === source) {
      row.skip = 'name unchanged'
    } else if (seenTargets.has(row.target)) {
      row.skip = 'two files would get the same name'
    } else {
      try {
        await fs.access(row.target)
        row.skip = 'target already exists'
      } catch (e) {
        // free target, good
      }
    }
    if (!row.skip) {
      seenTargets.add(row.target)
    }
    plan.push(row)
  }
  return { config, directory, files, plan }
}

function planResult (params) {
  return buildPlan(params).then(({ plan, files }) => {
    const ready = plan.filter(row => !row.skip)
    const skipped = plan.length - ready.length
    if (!files.length) {
      return {
        message: 'No file matched. Check the folder and the file types.',
        messageType: 'warning'
      }
    }
    const rows = plan.slice(0, PREVIEW_LIMIT).map((row, index) => ({
      key: String(index),
      from: row.name,
      to: row.next || '',
      note: row.skip || ''
    }))
    const lines = [
      'Preview only — nothing has been renamed yet.',
      `${files.length} file(s) matched, ${ready.length} ready, ${skipped} skipped.`
    ]
    if (plan.length > PREVIEW_LIMIT) {
      lines.push(`Showing the first ${PREVIEW_LIMIT}.`)
    }
    return {
      message: lines.join(' '),
      messageType: skipped > 0 ? 'warning' : 'info',
      table: {
        columns: [
          { key: 'from', title: 'Current name' },
          { key: 'to', title: 'New name' },
          { key: 'note', title: 'Note' }
        ],
        rows
      },
      buttons: ready.length
        ? [{ label: `Rename ${ready.length} file(s)`, action: 'apply', primary: true }]
        : []
    }
  })
}

function applyResult (params) {
  return buildPlan(params).then(async ({ plan }) => {
    const done = []
    const failed = []
    for (const row of plan) {
      if (row.skip) {
        continue
      }
      try {
        await fs.rename(row.source, row.target)
        done.push({ key: String(done.length), from: row.name, to: row.next })
      } catch (error) {
        failed.push({ key: String(failed.length), from: row.name, to: row.next, error: errorText(error) })
      }
    }
    const rows = failed.length
      ? failed.map(row => ({ from: row.from, to: row.to, note: row.error }))
      : done.map(row => ({ from: row.from, to: row.to, note: 'renamed' }))
    return {
      message: failed.length
        ? `Renamed ${done.length} file(s), ${failed.length} failed.`
        : `Renamed ${done.length} file(s).`,
      messageType: failed.length ? 'warning' : 'success',
      table: rows.length
        ? {
            columns: [
              { key: 'from', title: 'Old name' },
              { key: 'to', title: 'New name' },
              { key: 'note', title: 'Result' }
            ],
            rows: rows.slice(0, PREVIEW_LIMIT)
          }
        : undefined
    }
  })
}

module.exports = {
  run: planResult,
  apply: applyResult
}
