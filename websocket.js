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
      console.log(msg);
      return config.getDatabaseClient().then(client => {
        return client.query(
          `
          UPDATE student_sessions
          SET completed_tasks = completed_tasks + 1, level = $1::integer
          WHERE id = $2::integer
        `,
          [msg.level, decoded.id]
        );
      });
    });
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
          AND completed_tasks > 0
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
        ws.emit("state", state);
      })
      .catch(err => {
        console.log(err);
        sendError(ws, "Error sending state state");
      });
  };

  pgEvents.on("notification", updateState);

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
