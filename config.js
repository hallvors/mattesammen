const { Pool } = require('pg');

const NODE_ENV = process.env.NODE_ENV || 'development';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    NODE_ENV !== 'development'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

const jwtSecret = process.env.ZIQ_JWT_SECRET;
const cookieSecret = process.env.ZIQ_COOKIE_SECRET;

if (!(jwtSecret && cookieSecret && process.env.DATABASE_URL)) {
  console.error('Required environment variables missing!');
  process.exit(-1);
}

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

function getDatabaseClient() {
  return Promise.resolve(pool.connect()).catch((err) => {
    console.error('database connection failure');
    console.error(err);
    return Promise.reject(err.message);
  });
}

const SESSION_TYPES = [
  {
    mathType: 'addisjon',
    title: 'Addisjonsrommet',
    sign: '+',
    verb: 'addere',
    jsFiles: ['/js/basics.js'],
  },
  {
    mathType: 'subtraksjon',
    title: 'Subtraksjonsrommet',
    sign: '-',
    verb: 'subtrahere',
    jsFiles: ['/js/basics.js'],
  },
  {
    mathType: 'multiplikasjon',
    title: 'Multiplikasjonsrommet',
    sign: '*',
    verb: 'multiplisere',
    jsFiles: ['/js/basics.js'],
  },
  {
    mathType: 'divisjon',
    title: 'Divisjonsrommet',
    sign: '/',
    verb: 'dividere',
    jsFiles: ['/js/basics.js'],
  },
  {
    mathType: 'geobingo',
    title: 'Geometribingorommet',
    jsFiles: ['/js/raphael.js', '/js/geobingo.js'],
  },
  {
    mathType: 'fractions',
    title: 'Visuelle brøker - felles',
    jsFiles: ['/js/fractions.js'],
  },
  {
    mathType: 'predefined-answers',
    title: 'Fasitrommet',
    jsFiles: ['/js/predefined-answers.js'],
  },
  {
    mathType: 'proofing',
    title: 'Korrekturrommet',
    jsFiles: ['/js/proofing.js'],
  },
  {
    mathType: 'wordcloud',
    title: 'Ordgrupper',
    jsFiles: ['/js/wordcloud.js'],
  },
  {
    mathType: 'wordbingo',
    title: 'Ordbingo',
    jsFiles: ['/js/raphael.js', '/js/wordbingo.js'],
  },
  {
    mathType: 'quiz',
    title: 'Quiz',
    jsFiles: ['/js/quiz.js'],
  },
  {
    mathType: 'poll',
    title: 'Spørreundersøkelse',
    jsFiles: ['/js/quiz.js'],
  },
];

const SHAPE_DESCS = {
  circle: 'en sirkel',
  square: 'et kvadrat',
  rectangle: 'et rektangel',
  triangle1: 'en likesidet trekant',
  triangle2: 'en rettvinklet trekant',
  poly5: 'en femkant',
  poly6: 'en sekskant',
  trapes: 'en trapes',
  paralellogram: 'et paralellogram',
};

module.exports = {
  getDatabaseClient,
  jwtSecret,
  cookieSecret,
  types: SESSION_TYPES,
  SHAPE_DESCS,
};
