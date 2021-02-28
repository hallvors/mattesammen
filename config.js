const { Pool } = require("pg");

const NODE_ENV = process.env.NODE_ENV || "development";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV !== "development",
});

const jwtSecret = process.env.ZIQ_JWT_SECRET;
const cookieSecret = process.env.ZIQ_COOKIE_SECRET;

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

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
    jsFiles: [
      '/js/raphael.js',
      '/js/geobingo.js',
    ]
  }
];

const SHAPE_DESCS = {
  circle: 'en sirkel',
  square: 'et kvadrat',
  rectangle: 'et rektangel',
  triangle1: 'en likesidet trekant',
  triangle2: 'en rettvinklet trekant',
  poly5: 'en femkant',
  poly6: 'en sekskant',
}

function getDatabaseClient() {
  return Promise.resolve(pool.connect());
}

module.exports = {
  getDatabaseClient,
  jwtSecret,
  cookieSecret,
  types: SESSION_TYPES,
  SHAPE_DESCS,
};
