/**
 * Static File Server — a user widget, `type: "instance"`.
 *
 * Port of the built-in Static File Server (src/app/widgets/widget-local-file-server.js).
 * The contract is the built-in one: `widgetRun(config, ctx)` returns
 * `{ instanceId, start, stop }`, `start()` resolves `{ serverInfo, msg }`, and
 * the app keeps the instance in its running list so the panel can stop it.
 *
 * The only dependency is express, vendored in ./node_modules so the folder is
 * self-contained when it is copied into <data dir>/widgets/.
 */

/* eslint-env node */
const os = require('os')
const crypto = require('crypto')
const express = require('express')

const DEFAULTS = {
  directory: '',
  host: '127.0.0.1',
  port: 3456,
  index: 'index.html',
  dotfiles: 'allow',
  maxAge: 0,
  autoRun: false
}

function configOf (params = {}) {
  const config = { ...DEFAULTS, ...params }
  config.directory = String(config.directory || '').trim() || os.homedir()
  config.port = Number(config.port) || DEFAULTS.port
  config.maxAge = Number(config.maxAge) || 0
  config.host = String(config.host || DEFAULTS.host).trim()
  return config
}

function widgetRun (instanceConfig, ctx = {}) {
  const config = configOf(instanceConfig)
  const log = typeof ctx.log === 'function' ? ctx.log : () => {}
  const event = typeof ctx.event === 'function' ? ctx.event : () => {}
  const instanceId = crypto.randomUUID()
  let server = null
  let app = null

  function buildApp () {
    const instance = express()
    // registered before express.static so 404s are reported too
    instance.use((req, res, next) => {
      const startedAt = Date.now()
      res.on('finish', () => {
        const ok = res.statusCode < 400
        event({
          type: req.method,
          ok,
          from: req.socket && req.socket.remoteAddress,
          msg: `${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
        })
        if (!ok) {
          log('warn', `${req.method} ${req.originalUrl} -> ${res.statusCode}`)
        }
      })
      next()
    })
    instance.use(express.static(config.directory, {
      index: config.index || false,
      dotfiles: config.dotfiles,
      maxAge: config.maxAge
    }))
    return instance
  }

  const start = () => new Promise((resolve, reject) => {
    if (server) {
      reject(new Error('Server is already running'))
      return
    }
    app = buildApp()
    server = app.listen(config.port, config.host, (error) => {
      if (error) {
        server = null
        log('error', `failed to listen on ${config.host}:${config.port}: ${error.message}`)
        reject(error)
        return
      }
      const serverInfo = {
        url: `http://${config.host}:${config.port}`,
        path: config.directory
      }
      log('info', `serving ${serverInfo.path} on ${serverInfo.url}`)
      resolve({
        success: true,
        serverInfo,
        msg: `Static File Server is running at ${serverInfo.url}`
      })
    })
    server.on('error', (error) => {
      log('error', `server error: ${error.message}`)
      reject(error)
    })
  })

  const stop = () => new Promise((resolve, reject) => {
    if (!server) {
      resolve()
      return
    }
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      server = null
      app = null
      resolve()
    })
  })

  return {
    instanceId,
    start,
    stop
  }
}

module.exports = {
  widgetRun
}
