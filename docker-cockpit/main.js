/**
 * Docker Cockpit — a free-UI user widget.
 *
 * The UI is ui/index.html, served from electerm-widget://docker-cockpit/ and
 * talking to this file through window.electerm. Everything here is plain
 * Node: the docker CLI over child_process, no docker SDK, no dependency.
 *
 * This is the case config mode cannot express: the panel polls, filters and
 * renders state as it changes, and a log pane that has to stay open while the
 * user reads it.
 */

/* eslint-env node */
const { execFile } = require('child_process')
const fs = require('fs')

// A GUI-launched Electron does not get the shell PATH of a terminal, so the
// docker binary is looked up explicitly after `docker` itself fails.
const FALLBACK_BINS = [
  '/opt/homebrew/bin/docker',
  '/usr/local/bin/docker',
  '/usr/bin/docker',
  '/Applications/Docker.app/Contents/Resources/bin/docker',
  '/Applications/OrbStack.app/Contents/MacOS/xbin/docker'
]

const MAX_BUFFER = 8 * 1024 * 1024
const TIMEOUT = 15000

let cachedBin = ''

function firstExisting (candidates) {
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      return candidate
    } catch (e) {}
  }
  return ''
}

// `docker` from PATH first: execFile inherits the app's PATH, which is correct
// when the app was started from a shell (dev) and when docker is in /usr/bin.
function dockerBin () {
  if (cachedBin) {
    return cachedBin
  }
  cachedBin = firstExisting(FALLBACK_BINS) || 'docker'
  return cachedBin
}

function runDocker (args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      dockerBin(),
      args,
      {
        maxBuffer: MAX_BUFFER,
        timeout: options.timeout || TIMEOUT,
        env: { ...process.env, DOCKER_CLI_HINTS: 'false' }
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ENOENT') {
            error.message = 'The docker CLI was not found. Install Docker Desktop / OrbStack, or put docker on the PATH the app sees.'
          } else if (error.killed) {
            error.message = `docker ${args[0]} timed out after ${options.timeout || TIMEOUT}ms`
          } else if (!error.message && stderr) {
            error.message = String(stderr).trim()
          }
          error.stderr = String(stderr || '')
          reject(error)
          return
        }
        resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') })
      }
    )
  })
}

function jsonLines (text) {
  return String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line)
      } catch (e) {
        return null
      }
    })
    .filter(Boolean)
}

function shortImage (image) {
  const value = String(image || '')
  // registry:port/path:tag — keep the last path segment and the tag
  const parts = value.split('/')
  return parts.length > 1 ? parts[parts.length - 1] : value
}

// docker ps --format '{{json .}}' field names differ slightly between
// versions, so every read is defensive.
function normalize (row) {
  const name = row.Names || row.Name || row.ID || ''
  return {
    id: String(row.ID || '').slice(0, 12),
    name: name.split(',')[0],
    image: shortImage(row.Image),
    imageFull: row.Image || '',
    state: String(row.State || '').toLowerCase(),
    status: row.Status || '',
    ports: row.Ports || '',
    runningFor: row.RunningFor || '',
    command: row.Command || ''
  }
}

async function list () {
  const { stdout } = await runDocker([
    'ps', '-a',
    '--format', '{{json .}}'
  ])
  const containers = jsonLines(stdout)
    .map(normalize)
    .filter(row => row.id)
    .sort((a, b) => {
      const aw = a.state === 'running' ? 0 : 1
      const bw = b.state === 'running' ? 0 : 1
      if (aw !== bw) {
        return aw - bw
      }
      return a.name.localeCompare(b.name)
    })
  const running = containers.filter(row => row.state === 'running').length
  const version = await runDocker(['version', '--format', '{{.Server.Version}}'])
    .then(res => res.stdout.trim())
    .catch(() => '')
  return {
    containers,
    running,
    total: containers.length,
    serverVersion: version,
    bin: dockerBin()
  }
}

const ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'pause', 'unpause']

async function act (id, action) {
  const target = String(id || '')
  if (!target) {
    throw new Error('No container selected.')
  }
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new Error(`Unsupported action: ${action}`)
  }
  const { stdout, stderr } = await runDocker([action, target], { timeout: 60000 })
  return {
    message: (stdout || stderr || `${action} ${target}`).trim(),
    action,
    id: target
  }
}

async function logs (id, tail) {
  const target = String(id || '')
  if (!target) {
    throw new Error('No container selected.')
  }
  const lines = Math.min(Math.max(Number(tail) || 200, 20), 2000)
  const result = await runDocker(
    ['logs', '--tail', String(lines), '--timestamps', target],
    { timeout: 20000 }
  )
  // docker sends the container's stderr to our stderr; both belong in the pane
  const text = [result.stdout, result.stderr].filter(Boolean).join('\n')
  return { text, tail: lines }
}

// One line that works whether the container has bash or only sh. Pasted into
// an electerm local tab by the user (a widget cannot type into a terminal).
function execCommand (id) {
  const target = String(id || '')
  if (!target) {
    throw new Error('No container selected.')
  }
  return {
    command: `docker exec -it ${target} sh -c 'command -v bash >/dev/null 2>&1 && exec bash || exec sh'`
  }
}

module.exports = {
  list,
  act,
  logs,
  execCommand
}
