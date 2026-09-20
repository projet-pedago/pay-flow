import pg from "pg";

const { Pool } = pg;

const requiredEnv = [
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_DATABASE",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
] as const;

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.warn(`[PostgreSQL] Variable ${name} absente`);
  }
}

export const postgresPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? "5432"),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function testPostgresConnection(): Promise<boolean> {
  const client = await postgresPool.connect();

  try {
    const result = await client.query<{
      database: string;
      user_name: string;
      server_time: Date;
    }>(`
      SELECT
        current_database() AS database,
        current_user AS user_name,
        NOW() AS server_time
    `);

    console.log("[PostgreSQL] Connexion réussie :", result.rows[0]);

    return true;
  } catch (error) {
    console.error("[PostgreSQL] Erreur de connexion :", error);
    return false;
  } finally {
    client.release();
  }
}

export async function queryPostgres<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return postgresPool.query<T>(text, params);
}
