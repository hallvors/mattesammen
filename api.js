'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const config = require('./config');
const jwt = require('jsonwebtoken');
const { decodeToken } = require('./utils');
const res = require('express/lib/response');
var QRCode = require('qrcode');
const multer = require('multer');
const { savePollAndQuizData } = require('./lib/queries');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 1048576 } }); // 1MB limit

router.post('/schools/create', createClassSession);
router.post(
  '/schools/set-answers',
  decodeToken,
  upload.single('poll_image'),
  setAnswers
);
router.get('/redirect', redirect);
router.post('/quit', decodeToken, endSession);
router.post('/student/pin', studentPreInit);
router.get('/student/pin', studentPreInit);
router.post('/student/access', decodeToken, studentInit);
router.get('/poll/data/:pollToken', getPollResults);

router.get('/image/qr', function (req, res, next) {
  const classId = req.query.classId;
  try {
    qrCode(classId, res);
  } catch (e) {
    next(e);
  }
});

function createClassSession(req, res, next) {
  return config.getDatabaseClient().then((client) => {
    return Promise.resolve()
      .then(() => {
        return client
          .query(
            `SELECT * FROM school_classes
        WHERE school = $1::text AND class_name = $2::text AND session_type = $3::text AND data IS NULL`,
            [req.body.school, req.body.className, req.body.session_type]
          )
          .then((result) => {
            console.log('createClassSession - exists?', result, req.body);
            if (result.rows.length) {
              return result;
            }

            return client.query(
              `INSERT INTO school_classes (school, class_name, session_type)
            VALUES ($1::text, $2::text, $3::text)
            RETURNING *
          `,
              [req.body.school, req.body.className, req.body.session_type]
            );
          });
      })
      .then((result) => {
        console.log('created or selected.. ' + result.rows[0].id);
        res.cookie(
          'token',
          jwt.sign(
            {
              classId: result.rows[0].id,
              admin: true,
              school: req.body.school,
              className: req.body.className,
              sessionType: req.body.session_type,
            },
            config.jwtSecret
          )
        );
        client.release();
        if (
          req.body.session_type === 'predefined-answers' ||
          req.body.session_type === 'proofing' ||
          req.body.session_type === 'wordbingo' ||
          req.body.session_type === 'quiz' ||
          req.body.session_type === 'poll'
        ) {
          return res.redirect(301, '/adm/fasit');
        } else if (req.body.session_type === 'wordcloud') {
          return res.redirect(301, '/adm/ordsverm');
        }
        res.redirect(301, '/adm/status');
      });
  });
}
// If we get predefined answers (for 'fasit' type sessions),
// save them and redirect to status screen
function setAnswers(req, res, next) {
  if (res.locals.token && res.locals.token.admin) {
    var data = req.body.data;
    if (res.locals.token.sessionType === 'proofing') {
      // massage data slightly
      data = data.map((item) => {
        const parts = item.split(/\t/g);
        return {
          q: parts[0],
          alt: parts.slice(1),
        };
      });
    }
    return config.getDatabaseClient().then((client) => {
      const promises = [];
      if (['quiz', 'poll'].includes(res.locals.token.sessionType)) {
        const preparedData = {
          poll_title: req.body.title,
          poll_image: req.file?.buffer || null,
          class_id: res.locals.token.classId,
          questions: data.map((item, idx) => {
            const parts = item.split(/\t/g);
            const question = {
              q_order: idx,
              question: parts[0],
              question_image: null,
              answers: [],
            };
            for (const [aidx, answerTxt] of parts.slice(1).entries()) {
              question.answers.push({
                answer: answerTxt,
                answer_image: null,
                is_correct:
                  res.locals.token.sessionType === 'poll' ? null : aidx === 0,
              });
            }
            return question;
          }),
        };
        promises.push(savePollAndQuizData(client, preparedData));
      } else {
        promises.push(
          client.query(
            `
          UPDATE school_classes SET data = $1::jsonb
          WHERE id = $2::integer
        `,
            [JSON.stringify(data), res.locals.token.classId]
          )
        );
      }
      Promise.all(promises)
        .then((result) => {
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
  const requestedClassId =
    req.body && req.body.classId ? req.body.classId : req.query.classId;
  if (requestedClassId == null) {
    return res.render('error', {
      layout: 'main',
      message: 'Klassekode mangler. Gå tilbake og prøv på nytt.',
    });
  }
  return config.getDatabaseClient().then((client) => {
    return client
      .query(
        `
      SELECT * FROM school_classes
      WHERE id = $1::integer
    `,
        [requestedClassId]
      )
      .then((res1) => {
        if (!res1.rows.length) {
          return res.render('error', {
            layout: 'main',
            message:
              'Du har sannsynligvis brukt feil klassekode. Gå tilbake og prøv på nytt.',
          });
        }
        res.cookie(
          'token',
          jwt.sign(
            {
              classId: res1.rows[0].id,
              school: res1.rows[0].school,
              className: res1.rows[0].class_name,
              sessionType: res1.rows[0].session_type,
            },
            config.jwtSecret
          )
        );
        client.release();
        res.redirect(301, '/student/navn');
      });
  });
}

function studentInit(req, res, next) {
  if (!res.locals.token) {
    return res.render('error', {
      layout: 'main',
      message: 'Ukjent feil, gå tilbake og prøv på nytt',
    });
  }
  return config
    .getDatabaseClient()
    .then((client) => {
      // did this person already submit a nick / create a session?
      const hasSession =
        res.locals.token && res.locals.token.nick && res.locals.token.id;
      const promises = [];
      if (hasSession) {
        promises.push(
          client.query(
            `
      UPDATE student_sessions SET name = $1::text
      WHERE class_id = $2::integer AND id = $3::integer
      RETURNING *
    `,
            [req.body.nick, res.locals.token.classId, res.locals.token.id]
          )
        );
      } else {
        promises.push(
          client.query(
            `
      INSERT INTO student_sessions (name, session_date, completed_tasks, level, class_id)
      VALUES ($1::text, NOW(), 0, $2::integer, $3::integer)
      RETURNING *
    `,
            [req.body.nick, req.body.level, res.locals.token.classId]
          )
        );
      }
      return Promise.all(promises).then((res1) => {
        res.cookie(
          'token',
          jwt.sign(
            Object.assign(res.locals.token, {
              id: res1[0].rows[0].id,
              nick: req.body.nick,
              level: req.body.level,
            }),
            config.jwtSecret
          )
        );
        client.release();
        if (res.locals.token.sessionType !== 'poll') {
          res.cookie('nick', req.body.nick, { maxAge: 60 * 60 * 24 * 7 * 4 }); // 4 weeks
        }
        res.redirect(302, '/student/klasserom');
      });
    })
    .catch((err) => {
      console.error(err);
      res.render('error', { layout: 'main', message: 'Ukjent feil' });
    });
}

function endSession(req, res, next) {
  // For Edvald - delete session so logged-out sessions do not
  // appear in the list
  return config.getDatabaseClient().then((client) => {
    return client
      .query(`DELETE FROM student_sessions WHERE id = $1`, [
        res.locals.token.id,
      ])
      .then(() => {
        res.cookie('token', '', { expires: new Date(-1000) });
        res.redirect(302, req.body.admin ? '/adm' : '/');
      })
      .finally(() => {
        client.release();
      });
  });
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

function qrCode(classId, res) {
  res.append('Content-type', 'image/png');
  QRCode.toFileStream(
    res,
    'https://ziq.no/api/student/pin/?classId=' + classId,
    {
      width: 600,
    }
  );
}

function getPollResults(req, res, next) {
  if (req.params.pollToken) {
    let tokenData = jwt.verify(req.params.pollToken, config.jwtSecret);

    return config.getDatabaseClient().then((client) => {
      return client
        .query(
          `
      SELECT q_text, answer, count(*) AS num FROM poll_results WHERE student_session = $1::integer
      GROUP BY q_text, answer

    `,
          [tokenData.classId]
        )
        .then((result) => {
          res.json(result.rows);
          client.release();
        });
    });
  }
  next(new Error('not found'));
}

module.exports = {
  router: router,
};
