import { getDatabase, type DatabaseConnection } from "@netlify/database";

// Netlify Database auto-provisions a Postgres database and injects its
// connection string at runtime when this app is deployed on Netlify (or run
// via `netlify dev`) - no manual setup. DATABASE_URL is only for pointing at
// a different Postgres instance during local testing outside that context.
//
// Lazily initialized (not at module load) so that build-time steps which
// merely import route modules - without the env var necessarily present at
// that point - don't fail the build.
let db: DatabaseConnection | undefined;

function getDb(): DatabaseConnection {
  if (!db) {
    db = getDatabase({ connectionString: process.env.DATABASE_URL });
  }
  return db;
}

const db_ = {
  get sql() {
    return getDb().sql;
  },
  get pool() {
    return getDb().pool;
  },
};

export default db_;
