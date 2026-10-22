/* eslint-env browser */
/* global electerm */

const $ = id => document.getElementById(id)

const state = {
  containers: [],
  filter: '',
  logsFor: '',
  logsTimer: null,
  refreshTimer: null,
  busy: {}
}

function setStatus (text, kind) {
  const el = $('status')
  el.textContent = text || ''
  el.className = kind || 'muted'
}

function setBanner (text) {
  const el = $('banner')
  if (!text) {
    el.hidden = true
    el.textContent = ''
    return
  }
  el.hidden = false
  el.textContent = text
}

function visible () {
  const needle = state.filter.trim().toLowerCase()
  if (!needle) {
    return state.containers
  }
  return state.containers.filter(row =>
    [row.name, row.image, row.ports, row.status].join(' ').toLowerCase().includes(needle)
  )
}

function button (label, onClick, className) {
  const el = document.createElement('button')
  el.textContent = label
  if (className) {
    el.className = className
  }
  el.addEventListener('click', evt => {
    evt.stopPropagation()
    onClick()
  })
  return el
}

function render () {
  const list = $('list')
  const rows = visible()
  list.textContent = ''
  if (!rows.length) {
    const empty = document.createElement('p')
    empty.className = 'empty'
    empty.textContent = state.containers.length
      ? 'No container matches the filter.'
      : 'No container. Start one and press refresh.'
    list.appendChild(empty)
    return
  }
  rows.forEach(row => {
    const el = document.createElement('div')
    el.className = 'row' + (row.id === state.logsFor ? ' active' : '')
    el.dataset.id = row.id

    const dot = document.createElement('span')
    dot.className = 'dot ' + row.state
    el.appendChild(dot)

    const who = document.createElement('div')
    who.className = 'who'

    const name = document.createElement('div')
    name.className = 'name'
    const title = document.createElement('b')
    title.textContent = row.name
    const image = document.createElement('span')
    image.className = 'img'
    image.textContent = row.image
    name.appendChild(title)
    name.appendChild(image)

    const sub = document.createElement('div')
    sub.className = 'sub'
    const status = document.createElement('span')
    status.textContent = row.status
    sub.appendChild(status)
    if (row.ports) {
      const ports = document.createElement('span')
      ports.className = 'ports'
      ports.textContent = ' · ' + row.ports
      sub.appendChild(ports)
    }

    who.appendChild(name)
    who.appendChild(sub)
    el.appendChild(who)

    const actions = document.createElement('div')
    actions.className = 'actions'
    const isRunning = row.state === 'running'
    const isPaused = row.state === 'paused'

    if (isPaused) {
      actions.appendChild(button('stop', () => runAction(row, 'stop', true), 'danger'))
      actions.appendChild(button('resume', () => runAction(row, 'unpause')))
      actions.appendChild(button('restart', () => runAction(row, 'restart', true)))
    } else if (isRunning) {
      actions.appendChild(button('stop', () => runAction(row, 'stop', true), 'danger'))
      actions.appendChild(button('pause', () => runAction(row, 'pause')))
      actions.appendChild(button('restart', () => runAction(row, 'restart', true)))
    } else {
      actions.appendChild(button('start', () => runAction(row, 'start'), 'primary'))
    }
    actions.appendChild(button('logs', () => openLogs(row)))
    actions.appendChild(button('exec', () => copyExec(row)))

    el.appendChild(actions)
    el.addEventListener('click', () => openLogs(row))
    list.appendChild(el)
  })
}

function renderMeta (data) {
  const parts = []
  if (data.total != null) {
    parts.push(`${data.running} running / ${data.total}`)
  }
  if (data.serverVersion) {
    parts.push('engine ' + data.serverVersion)
  }
  $('meta').textContent = parts.join(' · ')
}

async function refresh ({ quiet } = {}) {
  if (!quiet) {
    setStatus('loading…')
  }
  try {
    const data = await electerm.call('list')
    state.containers = data.containers || []
    renderMeta(data)
    setBanner('')
    render()
    if (!quiet) {
      setStatus('updated ' + new Date().toLocaleTimeString(), 'ok')
    }
  } catch (error) {
    setBanner(error.message)
    state.containers = []
    renderMeta({})
    render()
    setStatus('', '')
  }
}

function setBusy (id, busy) {
  state.busy[id] = busy
  document.querySelectorAll('.row').forEach(el => {
    if (el.dataset.id === id) {
      el.querySelectorAll('button').forEach(btn => {
        btn.disabled = busy
      })
    }
  })
}

async function runAction (row, action, needsConfirm) {
  if (needsConfirm && !window.confirm(`${action} ${row.name}?`)) {
    return
  }
  setBusy(row.id, true)
  setStatus(`${action} ${row.name}…`)
  try {
    const result = await electerm.call('act', row.id, action)
    setStatus((result && result.message) || `${action} done`, 'ok')
    await refresh({ quiet: true })
    if (state.logsFor === row.id) {
      await loadLogs(row)
    }
  } catch (error) {
    setStatus(`${action} failed: ${error.message}`, 'error')
    await refresh({ quiet: true })
  } finally {
    setBusy(row.id, false)
  }
}

async function copyExec (row) {
  try {
    const result = await electerm.call('execCommand', row.id)
    await electerm.copy(result.command)
    setStatus('exec command copied — paste it into a terminal tab', 'ok')
  } catch (error) {
    setStatus(error.message, 'error')
  }
}

async function loadLogs (row) {
  $('logs-title').textContent = row.name
  $('logs-title').title = row.name
  try {
    const result = await electerm.call('logs', row.id, 300)
    const body = $('logs-body')
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 24
    body.textContent = result.text || '(no output yet)'
    if (atBottom) {
      body.scrollTop = body.scrollHeight
    }
    $('logs-time').textContent = new Date().toLocaleTimeString()
  } catch (error) {
    $('logs-body').textContent = 'failed to read logs: ' + error.message
  }
}

function openLogs (row) {
  state.logsFor = row.id
  $('logs').hidden = false
  render()
  loadLogs(row)
  if (state.logsTimer) {
    clearInterval(state.logsTimer)
  }
  // polling instead of streaming: the bridge is request/response only
  state.logsTimer = setInterval(() => {
    const current = state.containers.find(item => item.id === state.logsFor)
    if (!current) {
      closeLogs()
      return
    }
    loadLogs(current)
  }, 2000)
}

function closeLogs () {
  state.logsFor = ''
  $('logs').hidden = true
  if (state.logsTimer) {
    clearInterval(state.logsTimer)
    state.logsTimer = null
  }
  render()
}

$('filter').addEventListener('input', evt => {
  state.filter = evt.target.value
  render()
})

$('refresh').addEventListener('click', () => refresh())

$('auto').addEventListener('change', evt => {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer)
    state.refreshTimer = null
  }
  if (evt.target.checked) {
    state.refreshTimer = setInterval(() => refresh({ quiet: true }), 3000)
    refresh({ quiet: true })
  }
})

$('logs-close').addEventListener('click', closeLogs)

// the panel can outlive the widget document (tab switch, theme change)
window.addEventListener('beforeunload', () => {
  if (state.logsTimer) clearInterval(state.logsTimer)
  if (state.refreshTimer) clearInterval(state.refreshTimer)
})

electerm.ready.then(() => {
  refresh()
})
