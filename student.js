'use strict';

const express = require('express');
const router = express.Router({mergeParams: true});
const config = require('./config');
const jwt = require('jsonwebtoken');
const {decodeToken} = require('./utils');

router.get('/', main);
router.get('/navn', decodeToken, pickNick);
router.get('/klasserom', decodeToken, classroom);

function main(req, res, next) {
  return res.render('student_first_screen', {
    layout: 'main'
  });
}

function pickNick(req, res, next) {
  let token;
  if (res.locals.token) {
    return res.render('student_second_screen', Object.assign({
      layout: 'main'
    }, res.locals.token));
  } else {
    res.render('error', {
      layout: 'main',
      message: 'Beklager, det har oppstått en ukjent feil. Gå tilbake og prøv på nytt.'
    });
  }
}

function classroom(req, res, next) {
  let token;
  if (res.locals.token) {
    token = res.locals.token;
    return config.getDatabaseClient()
    .then(client => {
      return client.query(
        `SELECT * FROM school_classes sc
          JOIN student_sessions s ON s.class_id = sc.id
          WHERE s.id = $1::integer`,
        [token.id]
      )
      .then(results => {
        client.release()
        let socketConnectURL = '/?token=' + jwt.sign(res.locals.token, config.jwtSecret);
        return res.render('student_tasks_screen', Object.assign({
          layout: 'main',
          socketConnectURL,
        }, token, results.rows[0]));
      })
      .catch(err => {
        client.release();
        res.render('error', {layout: 'main', message: 'Ukjent feil'});
      });
    });

  } else {
    res.render('error', {layout: 'main', message: 'ikke gyldig tilgang, prøv å laste på nytt'});
  }
}

module.exports = {
  router: router
};
