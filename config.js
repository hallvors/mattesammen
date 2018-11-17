const { Pool } = require("pg");

const NODE_ENV = process.env.NODE_ENV || "development";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV !== "development",
});

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

function getDatabaseClient() {
  return Promise.resolve(pool.connect());
}

module.exports = {
  getDatabaseClient,
  jwtSecret: "wewagfbsignmq1309r",
  cookieSecret: "342aetsrydhgwewnrepofinsm39r"
};
