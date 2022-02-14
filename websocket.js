'use strict'

const EventEmitter = require('events')
const jwt = require('jsonwebtoken')
const socketIO = require('socket.io')
const config = require('./config')
const debug = require('debug')('gangesammen:websocket')

// On first connect from a student, if we have a current Bingo or
// Fraction task we need to send details. We must however take care not
// caching the task forever, leaking memory
const NodeCache = require('node-cache');
const taskCache = new NodeCache({ stdTTL: 60 * 60 * 8, useClones: true });

// Use an internal event emitter so we only have to open one connection
// to postgres to listen for notifications

class PGEmitter extends EventEmitter {}
const pgEvents = new PGEmitter()

function mount(server) {
  const wss = socketIO(server, { pingInterval: 1000, pingTimeout: 3000 })
  wss.on('connection', handleConnection)
  function pgConnect() {
    return config.getDatabaseClient().then((client) => {
      client.on('notification', (msg) => {
        let payload = JSON.parse(msg.payload)
        console.log('DB update notification', payload)
        pgEvents.emit('notification', payload)
      })

      client.query('LISTEN student_sessions_event', (err) => {
        if (err) {
          client.release()
          throw err
        }
      })
      // try to maintain the connection if it drops..
      client.on('error', () => setTimeout(pgConnect, 1000))
    })
  }
  return pgConnect()
}

function handleConnection(ws) {
  var token = ws.handshake.query.token
  debug('Token:', token)

  if (token) {
    var decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch (err) {
      return sendError(ws, 'Invalid token')
    }
    debug(`decoded: ${JSON.stringify(decoded)}`)
    // TODO: avoid double connections for same token - will cause double answers to be sent
    sendFirstData(decoded, ws)

    ws.on('correct-answer', (msg) => {
      console.log('correct-answer', msg)
      return config.getDatabaseClient().then((client) => {
        return Promise.resolve()
          .then(() => {
            client.query(
              `
            UPDATE student_sessions
            SET completed_tasks = completed_tasks + 1, level = $1::integer
            WHERE id = $2::integer
          `,
              [msg.level, decoded.id],
            )
          })
          .then(() => client.release())
          .then(() => {
            if (msg.cards) {
              // Bingo data!
              pgEvents.emit('bingo-card-update', {
                id: decoded.id,
                name: decoded.nick,
                cards: msg.cards,
              })
            } else if (msg.dataurl) {
              // image of something (fractions)
              pgEvents.emit('fractions-answer', {
                id: decoded.id,
                name: decoded.nick,
                dataurl: msg.dataurl,
              })
            } else if (msg.predef) {
              pgEvents.emit('correct-answer', {
                id: decoded.id,
                name: decoded.nick,
                problem: msg.problem,
                predef: true,
              })
            }
          })
      })
    })
    // Geometry-bingo-related data
    ws.on('new-bingo-answer', (msg) => {
      console.log(msg, decoded.classId === msg.classId)
      if (decoded.classId === msg.classId) {
        console.log('will emit new-bingo-answer')
        pgEvents.emit('new-bingo-answer', msg)
        taskCache.set(msg.classId, {evt: 'new-bingo-answer', data: msg});
      }
    })
    ws.on('bingo', (msg) => {
      console.log(msg)
      if (msg.classId !== decoded.classId) {
        return
      }
      return config.getDatabaseClient().then((client) => {
        return Promise.resolve()
          .then(() => {
            client.query(
              `
            UPDATE student_sessions
            SET level = $1::integer
            WHERE id = $2::integer
          `,
              [msg.level, decoded.id],
            )
          })
          .then(() => {
            pgEvents.emit('bingo', { id: decoded.id, nick: decoded.nick })
          })
          .finally(() => client.release())
      })
    })
    ws.on('new-fraction-task', (msg) => {
      console.log(msg, decoded.classId === msg.classId)
      if (decoded.classId === msg.classId) {
        console.log('will emit new-fraction-task', msg)
        taskCache.set(msg.classId, {evt: 'new-fraction-task', data: msg});
        pgEvents.emit('new-fraction-task', msg)
      }
    })

    ws.on('next-task-ready', (msg) => {
      console.log(msg, decoded.classId === msg.classId)
      if (decoded.classId === msg.classId) {
        console.log('will emit next-task-ready', msg)
        taskCache.set(msg.classId, {evt: 'next-task-ready', data: msg});
        pgEvents.emit('next-task-ready', msg)
      }
    })

  } else {
    debug(`no token provided`)
    sendError(ws, 'No token')
  }
}

function getState(tokenData) {
  console.log(tokenData)
  return config.getDatabaseClient().then((client) => {
    return client
      .query(
        `SELECT SUM(completed_tasks) as "sumTotal"
      FROM student_sessions
      WHERE class_id = $1::integer AND session_date::date = $2::date`,
        [tokenData.classId, new Date()],
      )
      .then((res1) => {
        return client
          .query(
            `SELECT name, completed_tasks, level
        FROM student_sessions
        WHERE class_id = $1::integer
          AND session_date::date = $2::date
        `,
            [tokenData.classId, new Date()],
          )
          .then((res2) => {
            console.log({ res1: res1.rows, res2: res2.rows })
            client.release()
            return {
              totals: res1.rows[0].sumTotal,
              students: res2.rows.map((row) => ({
                name: row.name,
                count: row.completed_tasks,
                level: row.level,
              })),
            }
          })
      })
  })
}

function sendFirstData(tokenData, ws) {
  debug(`Sending first state`)

  getState(tokenData)
    .then((data) => {
      console.log('will send first state', data)
      let state = JSON.stringify({ type: 'state', data: data, first: true })
      debug(`First Snapshot: ${state}`)
      ws.emit('state', state)
      let savedTask = taskCache.get(tokenData.classId)
      if (savedTask) {
        ws.emit(savedTask.evt, savedTask.data);
      }
      listenForDbUpdates(tokenData, ws)
    })
    .catch((err) => {
      console.log(err)
      sendError(ws, 'Error sending first state')
    })
}

function listenForDbUpdates(tokenData, ws) {
  debug(`listenForDbUpdates`)

  var updateState = (msg) => {
    debug(`pg notification received: ${JSON.stringify(msg, null, 2)}`)

    // Ignore events for other schools/classes' sessions
    if (
      msg.table === 'student_sessions' &&
      msg.row.class_id !== tokenData.classId
    ) {
      return
    }

    getState(tokenData)
      .then((data) => {
        console.log('will send state', data)
        let state = JSON.stringify({ type: 'state', data: data })
        debug(`State: ${state}`)
        ws.emit('state', Object.assign(state, msg))
      })
      .catch((err) => {
        console.log(err)
        sendError(ws, 'Error sending state state')
      })
  }

  pgEvents.on('notification', updateState)
  pgEvents.on('new-bingo-answer', (msg) => ws.emit('new-bingo-answer', msg))
  pgEvents.on('bingo-card-update', (msg) => ws.emit('bingo-card-update', msg))
  pgEvents.on('fractions-answer', (msg) => ws.emit('fractions-answer', msg))
  pgEvents.on('new-fraction-task', (msg) => ws.emit('new-fraction-task', msg))
  pgEvents.on('next-task-ready', (msg) => ws.emit('next-task-ready', msg))
  pgEvents.on('correct-answer', (msg) => ws.emit('correct-answer', msg))
  pgEvents.on('bingo', (msg) => ws.emit('bingo', msg))

  ws.on('disconnect', () => {
    pgEvents.removeListener('notification', updateState)
  })
}

function sendError(ws, msg) {
  let err = { type: 'error', data: msg }
  ws.emit('server_error', JSON.stringify(err))
}

module.exports = {
  mount,
  pgEvents,
}
