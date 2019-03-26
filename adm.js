'use strict';

const express = require('express');
const router = express.Router({mergeParams: true});
const config = require('./config');
const jwt = require('jsonwebtoken');
const {decodeToken} = require('./utils');


router.get('/', main);
router.get('/status', decodeToken, status);

function main(req, res, next) {
  let token;
  if (req.cookies.token) {
    try {
      token = jwt.verify(req.cookies.token, config.jwtSecret);
      // Valid token, just enter "classroom"
      res.redirect(301, '/adm/status');
    } catch (err) {
      return next(new Error('Invalid token'));
    }
    console.log(`decoded: ${JSON.stringify(token)}`);

  } else {
    return res.render('admin_first_screen', {
      layout: 'main',
      types: config.types,
    });
  }
  return config.getDatabaseClient()
  .then(client => {
    return client.query(
      `SELECT * FROM school_classes WHERE id = $1::integer`,
      [token.id]
    )
    .then(result => {
      client.release();
      if (result.length) {
        return res.render('admin_school_screen', {
          layout: 'main',
          details: result[0],
        });
      } else {
        res.cookie('token', '', {
          expires: new Date(-100000)
        });
        res.send('ikke gyldig tilgang, prøv å laste på nytt')
      }
    });
  });
}

function status(req, res, next) {
  if (res.locals.token) {
    let token = res.locals.token;
    return config.getDatabaseClient()
    .then(client => {
      return client.query(
        `SELECT * FROM school_classes sc
          JOIN student_sessions s ON s.class_id = sc.id
          WHERE sc.id = $1::integer`,
        [token.classId]
      )
      .then(results => {
        client.release();
        return res.render('admin_school_screen', {
          layout: 'main',
          school: token.school,
          className: token.className,
          classId: token.classId,
          details: results.rows[0],
          socketConnectURL: '/?token=' + jwt.sign(res.locals.token, config.jwtSecret),
          bingo: results.rows[0].session_type === 'geobingo',
          shapeTypes: JSON.stringify(config.SHAPE_DESCS),
        });
      });
    });
  } else {
    res.send('ikke gyldig tilgang, prøv å laste på nytt')
  }
}

module.exports = {
  router: router
};
