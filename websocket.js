"use strict";

const EventEmitter = require("events");
const jwt = require("jsonwebtoken");
const socketIO = require("socket.io");
const config = require("./config");
const debug = require("debug")("gangesammen:websocket");

// Use an internal event emitter so we only have to open one connection
// to postgres to listen for notifications

class PGEmitter extends EventEmitter {}
const pgEvents = new PGEmitter();

function mount(server) {
  const wss = socketIO(server, { pingInterval: 1000, pingTimeout: 3000 });
  wss.on("connection", handleConnection);
  return config.getDatabaseClient().then(client => {
    client.on("notification", msg => {
      let payload = JSON.parse(msg.payload);
      console.log("DB update notification", payload);
      pgEvents.emit("notification", payload);
    });

    client.query("LISTEN student_sessions_event", err => {
      if (err) {
        client.release();
        throw err;
      }
    });
  });
}

function handleConnection(ws) {
  var token = ws.handshake.query.token;
  debug("Token:", token);

  if (token) {
    var decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return sendError(ws, "Invalid token");
    }
    debug(`decoded: ${JSON.stringify(decoded)}`);

    sendFirstData(decoded, ws);

    ws.on("correct-answer", msg => {
      console.log('correct-answer', msg);
      return config.getDatabaseClient().then(client => {
        return Promise.resolve()
        .then(() => {
          client.query(
            `
            UPDATE student_sessions
            SET completed_tasks = completed_tasks + 1, level = $1::integer
            WHERE id = $2::integer
          `,
            [msg.level, decoded.id]
          );
        })
        .then(() => client.release())
        .then(() => {
          if (msg.cards) { // Bingo data!
            pgEvents.emit('bingo-card-update', {
              id: decoded.id,
              name: decoded.nick,
              cards: msg.cards
            });
          }
        });
      });
    });
    // Geometry-bingo-related data
    ws.on("new-bingo-answer", msg => {
      console.log(msg, decoded.classId === msg.classId);
      if (decoded.classId === msg.classId) {
        console.log('will emit new-bingo-answer')
        pgEvents.emit('new-bingo-answer', msg);
      }
    });
    ws.on("bingo", msg => {
      console.log(msg);
      if (msg.classId !== decoded.classId) {
        return;
      }
      return config.getDatabaseClient().then(client => {
        return Promise.resolve()
        .then(() => {
          client.query(
            `
            UPDATE student_sessions
            SET level = $1::integer
            WHERE id = $2::integer
          `,
            [msg.level, decoded.id]
          );
        })
        .then(() => client.release());
      });
      pgEvents.emit("bingo", {id: decoded.id, nick: decoded.nick});
    })
  } else {
    debug(`no token provided`);
    sendError(ws, "No token");
  }
}

function getState(tokenData) {
  console.log(tokenData)
  return config.getDatabaseClient().then(client => {
    return client
      .query(
        `SELECT SUM(completed_tasks) as "sumTotal"
      FROM student_sessions
      WHERE class_id = $1::integer AND session_date::date = $2::date`,
        [tokenData.classId, new Date]
      )
      .then(res1 => {
        return client
          .query(
            `SELECT name, completed_tasks, level
        FROM student_sessions
        WHERE class_id = $1::integer
          AND session_date::date = $2::date
        `,
            [tokenData.classId, new Date]
          )
          .then(res2 => {
            console.log({res1: res1.rows, res2: res2.rows})
            client.release();
            return {
              totals: res1.rows[0].sumTotal,
              students: res2.rows.map(row => ({
                name: row.name,
                count: row.completed_tasks,
                level: row.level
              }))
            };
          });
      });
  });
}

function sendFirstData(tokenData, ws) {
  debug(`Sending first state`);

  getState(tokenData)
    .then(data => {
      console.log("will send first state", data);
      let state = JSON.stringify({ type: "state", data: data, first: true });
      debug(`First Snapshot: ${state}`);
      ws.emit("state", state);
      listenForDbUpdates(tokenData, ws);
    })
    .catch(err => {
      console.log(err);
      sendError(ws, "Error sending first state");
    });
}

function listenForDbUpdates(tokenData, ws) {
  debug(`listenForDbUpdates`);

  var updateState = msg => {
    debug(`pg notification received: ${JSON.stringify(msg, null, 2)}`);

    // Ignore events for other schools/classes' sessions
    if (
      msg.table === "student_sessions" &&
      msg.row.class_id !== tokenData.classId
    ) {
      return;
    }

    getState(tokenData)
      .then(data => {
        console.log("will send state", data);
        let state = JSON.stringify({ type: "state", data: data });
        debug(`State: ${state}`);
        ws.emit("state", Object.assign(state, msg));
      })
      .catch(err => {
        console.log(err);
        sendError(ws, "Error sending state state");
      });
  };

  pgEvents.on("notification", updateState);
  pgEvents.on("new-bingo-answer", msg => ws.emit('new-bingo-answer', msg));
  pgEvents.on('bingo-card-update', msg => ws.emit('bingo-card-update', msg));

  ws.on("disconnect", () => {
    pgEvents.removeListener("notification", updateState);
  });
}

function sendError(ws, msg) {
  let err = { type: "error", data: msg };
  ws.emit("server_error", JSON.stringify(err));
}

module.exports = {
  mount,
  pgEvents
};
