'use strict';

const express = require('express');
const router = express.Router({mergeParams: true});
const config = require('./config');
const jwt = require('jsonwebtoken');
const {decodeToken} = require('./utils');

router.get('/', main);
router.get('/fasit', decodeToken, defineAnswers);
router.get('/status', decodeToken, status);
router.get('/statistikk', decodeToken, stats);

function main(req, res, next) {
  let token;
  if (req.cookies.token) {
    try {
      token = jwt.verify(req.cookies.token, config.jwtSecret);
      console.log(`decoded admin token: ${JSON.stringify(token)}`);
      // Valid token, just enter "classroom"
      return res.redirect(301, '/adm/status');
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  } else {
    return res.render('admin_first_screen', {
      layout: 'main',
      types: config.types,
    });
  }
}

function defineAnswers(req, res, next) {
  res.render('admin_define_answers');
}

function status(req, res, next) {
  if (res.locals.token) {
    let token = res.locals.token;
    return config.getDatabaseClient()
    .then(client => {
      return client.query(
        `SELECT * FROM school_classes sc
          LEFT JOIN student_sessions s ON s.class_id = sc.id
          WHERE sc.id = $1::integer`,
        [token.classId]
      )
      .then(results => {
        console.log(results)
        return res.render('admin_school_screen', {
          layout: 'main',
          school: token.school,
          className: token.className,
          classId: token.classId,
          details: results.rows[0],
          socketConnectURL: '/?token=' + jwt.sign(res.locals.token, config.jwtSecret),
          tokenStr: jwt.sign(res.locals.token, config.jwtSecret),
          bingo: results.rows[0].session_type === 'geobingo',
          fractions: results.rows[0].session_type === 'fractions',
          predef: results.rows[0].session_type === 'predefined-answers',
          shapeTypes: JSON.stringify(config.SHAPE_DESCS),
        });
      })
      .finally(() => {
        client.release();
      });
    })
    .catch(next)
  } else {
    res.send('ikke gyldig tilgang, prøv å laste på nytt')
  }
}

function stats(req, res, next) {
  if (res.locals.token) {
    let token = res.locals.token;
    return config.getDatabaseClient()
    .then(client => {
      return Promise.all([client.query(
        `
        SELECT name, completed_tasks
        FROM student_sessions
        WHERE class_id = $1::integer
        ORDER BY completed_tasks;
        `,
        [token.classId]
      ),
      client.query(
        `
        SELECT MAX(completed_tasks) as max
        FROM student_sessions
        WHERE class_id = $1::integer
        `,
        [token.classId]
      ),
    ])
      .then(results => {
        console.log(results[0].rows, results[1].rows);
        const max = results[1].rows[0].max;
        console.log(max)
        results[0].rows.forEach(row => {
          if (row.completed_tasks === 0) {
            row.category = 'needshelp';
          } else {
            if (row.completed_tasks >= Math.floor(max / 3) * 2) {
              row.category = 'top-third'
            } else if (row.completed_tasks >= Math.floor(max / 3 )) {
              row.category = 'middle-third';
            } else {
              row.category = 'bottom-third';
            }
          }
        });
        return res.render('admin_stats_screen', {
          layout: 'main',
          school: token.school,
          className: token.className,
          classId: token.classId,
          details: results[0].rows,
          socketConnectURL: '/?token=' + jwt.sign(res.locals.token, config.jwtSecret),
        });
      })
      .finally(() => {
        client.release();
      });
    })
    .catch(next)
  } else {
    res.send('ikke gyldig tilgang, prøv å laste på nytt')
  }
}

module.exports = {
  router: router
};
