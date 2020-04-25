const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const config = require('./config');

const app = express();

app.use(cookieParser(config.cookieSecret, {
  httpOnly: true
  // secure: true
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', '.hbs');


app.use('/favicons', express.static('client/favicons'));
app.use('/images', express.static('client/images'));
app.use('/css', express.static('client/css'));
app.use('/js', express.static('client/js'));
app.use('/sounds', express.static('client/sounds'));
app.use('/sider', express.static('client/html'));

const api = require('./api').router;
app.use('/api', api);

const adm = require('./adm').router;
app.use('/adm', adm);

const student = require('./student').router;
app.use('/student', student);

app.get('/', (req, res, next) => {
  res.redirect(301, '/student');
});

// Hook app
const server = require('http').createServer();
server.on('request', app);
// Mount Socket.IO to the App
const websocket = require('./websocket');
websocket.mount(server);

server.listen(process.env.PORT, () => {
  console.log(`[ready] http://localhost:${process.env.PORT}`);
});
