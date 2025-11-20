const jwt = require('jsonwebtoken');
const config = require('./config');

function decodeToken(req, res, next) {
  if (req.cookies.token) {
    try {
      let token = jwt.verify(req.cookies.token, config.jwtSecret);
      console.log(`decoded: ${JSON.stringify(token)}`);
      res.locals.token = token;
      return next();
    } catch (err) {
      console.log(err);
      return next(new Error('Invalid token'));
    }
  } else {
    res.render('error', { layout: 'main', message: 'mangler token' });
  }
}

module.exports = {
  decodeToken,
};
