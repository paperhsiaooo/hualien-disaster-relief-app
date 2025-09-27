import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function ensurePool(): mysql.Pool {
  if (pool) return pool;

  const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;
  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
    throw new Error("缺少 MySQL 連線環境變數 (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)");
  }

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: MYSQL_PORT ? Number(MYSQL_PORT) : 3306,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
  });

  return pool;
}

type QueryResult<T> = [T, mysql.FieldPacket[]];

export async function query<T = mysql.RowDataPacket[]>(sql: string, params?: unknown[]): Promise<T> {
  const [rows] = (await ensurePool().query(sql, params)) as QueryResult<T>;
  return rows;
}

export async function execute(sql: string, params?: unknown[]) {
  const [result] = await ensurePool().execute(sql, params);
  return result;
}

export async function getConnection() {
  return ensurePool().getConnection();
}


