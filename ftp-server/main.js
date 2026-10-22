/**
 * Local FTP Server — a user widget, `type: "instance"`.
 *
 * Port of the built-in Local FTP Server (src/app/widgets/widget-local-ftp-server.js).
 * Same contract as any instance widget: `widgetRun(config, ctx)` returns
 * `{ instanceId, start, stop }`.
 *
 * Passive data ports are pinned to 50000-51000: the client opens them, so
 * letting the library pick a random range makes a firewall rule impossible.
 * `@electerm/ftp-srv` is vendored in ./node_modules.
 */

/* eslint-env node */
const os = require('os')
const crypto = require('crypto')
const FtpSrv = require('@electerm/ftp-srv')

const PASV_MIN_PORT = 50000
const PASV_MAX_PORT = 51000

const DEFAULTS = {
  directory: '',
  host: '127.0.0.1',
  port: 2121,
  anonymous: false,
  username: 'ftpuser',
  password: 'ftppass',
  pasvUrl: '',
  autoRun: false
}

function configOf (params = {}) {
  const config = { ...DEFAULTS, ...params }
  config.directory = String(config.directory || '').trim() || os.homedir()
  config.port = Number(config.port) || DEFAULTS.port
  return config
}

// ftp-srv wants a pino-shaped logger. Feeding it the instance log gives a
// command-level trace (PASV/PORT/login) in the widget panel, which is exactly
// what is missing when a client cannot connect although the port is open.
function ftpLogger (log) {
  const levels = {
    trace: 'debug',
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    error: 'error',
    fatal: 'error'
  }
  const describe = (obj, msg) => {
    if (obj instanceof Error) {
      return [msg, obj.message].filter(Boolean).join(' ')
    }
    if (typeof obj === 'string') {
      return [msg, obj].filter(Boolean).join(' ')
    }
    if (obj && typeof obj === 'object') {
      return [msg, JSON.stringify(obj)].filter(Boolean).join(' ')
    }
    return msg || 'event'
  }
  const make = bindings => {
    const logger = { child: extra => make({ ...bindings, ...extra }) }
    Object.keys(levels).forEach(name => {
      logger[name] = (obj, msg) => {
        const from = bindings.ip ? `[${bindings.ip}] ` : ''
        log(levels[name], from + describe(obj, msg))
      }
    })
    return logger
  }
  return make({})
}

function widgetRun (instanceConfig, ctx = {}) {
  const config = configOf(instanceConfig)
  const log = typeof ctx.log === 'function' ? ctx.log : () => {}
  const event = typeof ctx.event === 'function' ? ctx.event : () => {}
  const instanceId = crypto.randomUUID()
  let server = null

  const start = async () => {
    if (server) {
      throw new Error('Server is already running')
    }
    server = new FtpSrv({
      url: `ftp://${config.host}:${config.port}`,
      anonymous: !!config.anonymous,
      root: config.directory,
      pasv_url: config.pasvUrl || undefined,
      pasv_min: PASV_MIN_PORT,
      pasv_max: PASV_MAX_PORT,
      log: ftpLogger(log)
    })

    if (!config.anonymous) {
      server.on('login', ({ username, password, connection }, resolve, reject) => {
        const from = connection && connection.ip
        if (username === config.username && password === config.password) {
          event({ type: 'login', ok: true, from, msg: `user ${username} accepted` })
          resolve({ root: config.directory })
          return
        }
        event({ type: 'login', ok: false, from, msg: `user ${username} rejected` })
        reject(new Error('Invalid username or password'))
      })
    }

    server.on('connect', ({ connection, newConnectionCount }) => {
      event({
        type: 'connect',
        ok: true,
        from: connection && connection.ip,
        msg: `control connection opened, ${newConnectionCount} active`
      })
    })

    server.on('disconnect', ({ connection, newConnectionCount }) => {
      event({
        type: 'disconnect',
        from: connection && connection.ip,
        msg: `control connection closed, ${newConnectionCount} active`
      })
    })

    server.on('client-error', ({ connection, context, error }) => {
      event({
        type: 'client-error',
        ok: false,
        from: connection && connection.ip,
        msg: `${context}: ${error.message}`
      })
    })

    server.on('server-error', ({ error }) => {
      log('error', `server error: ${error && error.message ? error.message : error}`)
    })

    await server.listen()
    const credentials = config.anonymous
      ? ''
      : `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
    const serverInfo = {
      url: `ftp://${credentials}${config.host}:${config.port}`,
      path: config.directory
    }
    log('info', `passive ports ${PASV_MIN_PORT}-${PASV_MAX_PORT}, PASV address ${config.pasvUrl || 'auto'}`)
    return {
      success: true,
      serverInfo,
      msg: `Local FTP Server is running at ${serverInfo.url}`
    }
  }

  const stop = async () => {
    if (!server) {
      return
    }
    await server.close()
    server = null
  }

  return {
    instanceId,
    start,
    stop
  }
}

module.exports = {
  widgetRun
}
