// Local development database: runs PostgreSQL 17 from the embedded-postgres package, with its
// data in ./.pgdata, so nothing needs installing system-wide. Use any other PostgreSQL by
// pointing DATABASE_URL at it instead.
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const url = new URL(process.env.DATABASE_URL ?? "postgres://osint:osint@localhost:5433/osint");
const dataDir = new URL("../.pgdata", import.meta.url).pathname;
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
});

if (!existsSync(dataDir)) await pg.initialise();
await pg.start();
const dbName = url.pathname.slice(1);
try {
  await pg.createDatabase(dbName);
} catch {} // already exists
console.log(`PostgreSQL ready on port ${url.port} (database "${dbName}", data in .pgdata). Ctrl+C to stop.`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
