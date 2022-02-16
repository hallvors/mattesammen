'use strict';

const express = require('express');
const router = express.Router({mergeParams: true});
const config = require('./config');
const jwt = require('jsonwebtoken');
const {decodeToken} = require('./utils');
const res = require('express/lib/response');

router.post('/schools/create', createClassSession);
router.post('/schools/set-answers', decodeToken, setAnswers);
router.get('/redirect', redirect);
router.post('/quit', endSession);
router.post('/student/pin', studentPreInit);
router.post('/student/access', decodeToken, studentInit);

function createClassSession(req, res, next) {
  return config.getDatabaseClient()
  .then(client => {
    return Promise.resolve()
    .then(() => {
      return client.query(
        `SELECT * FROM school_classes
        WHERE school = $1::text AND class_name = $2::text AND session_type = $3::text`,
        [req.body.school, req.body.className, req.body.session_type]
      )
      .then(result => {
        console.log('createClassSession - exists?', result, req.body)
        if (result.rows.length) {
          return result;
        }

        return client.query(
          `INSERT INTO school_classes (school, class_name, session_type)
            VALUES ($1::text, $2::text, $3::text)
            RETURNING *
          `, [req.body.school, req.body.className, req.body.session_type]
        )
      });
    })
    .then(result => {
      console.log('created or selected.. ' + result.rows[0].id)
      res.cookie('token', jwt.sign({
        classId: result.rows[0].id,
        admin: true,
        school: req.body.school,
        className: req.body.className,
      }, config.jwtSecret));
      client.release();
      if (req.body.session_type === 'predefined-answers') {
        return res.redirect(301, '/adm/fasit');
      }
      res.redirect(301, '/adm/status');
    });
  });
}
// If we get predefined answers (for 'fasit' type sessions),
// save them and redirect to status screen
function setAnswers(req, res, next) {
  console.log(req.body.data)
  if (res.locals.token && res.locals.token.admin) {
    return config.getDatabaseClient()
    .then(client => {
      client.query(`
        UPDATE school_classes SET data = $1::jsonb
        WHERE id = $2::integer
      `,
      [JSON.stringify(req.body.data), res.locals.token.classId]
      )
      .then(result => {
        res.redirect(301, '/adm/status');
      })
      .catch(next)
      .finally(() => {
        client.release();
      });
    });
  }
}

function studentPreInit(req, res, next) {
  return config.getDatabaseClient()
  .then(client => {
    return client.query(`
      SELECT * FROM school_classes
      WHERE id = $1::integer
    `, [req.body.classId])
    .then(res1 => {
      if (!res1.rows.length) {
        return res.render('error',
        {
          layout: 'main',
          message: 'Du har sannsynligvis brukt feil PIN-kode. Gå tilbake og prøv på nytt.'
        });
      }
      res.cookie('token', jwt.sign({
        classId: res1.rows[0].id,
        school: res1.rows[0].school,
        className: res1.rows[0].class_name,
        sessionType: res1.rows[0].session_type,
      }, config.jwtSecret));
      client.release();
      res.redirect(301, '/student/navn');
    });
  });
}

function studentInit(req, res, next) {
  if (!res.locals.token) {
    return res.render('error',
      {layout: 'main', message: 'Ukjent feil, gå tilbake og prøv på nytt'});
  }
  return config.getDatabaseClient()
  .then(client => {
    return client.query(`
      INSERT INTO student_sessions (name, session_date, completed_tasks, level, class_id)
      VALUES ($1::text, NOW(), 0, $2::integer, $3::integer)
      RETURNING *
    `, [req.body.nick, req.body.level, res.locals.token.classId])
    .then(res1 => {
      res.cookie('token', jwt.sign(Object.assign(res.locals.token,
      {
        id: res1.rows[0].id,
        nick: req.body.nick,
        level: req.body.level
      }), config.jwtSecret));
      client.release();
      res.redirect(302, '/student/klasserom');
    });
  })
  .catch(err => {
    console.log(err);
    res.render('error', {layout: 'main', message: 'Ukjent feil'});
  });
}

function endSession(req, res, next) {
  res.cookie('token', '', {expires: new Date(-1000)});
  res.redirect(302, '/adm');
}

function redirect(req, res, next) {
  if (!req.query.token) {
    return next(new Error('redirect requires token'));
  }
  if (!req.query.destination || !/^\//.test(req.query.destination)) {
    return next(new Error('redirect requires valid destination'));
  }
  res.cookie('token', req.query.token);
  res.redirect(req.query.destination);
}

module.exports = {
  router: router
};
