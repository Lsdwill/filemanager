import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let schemaReady: Promise<void> | null = null;
let databaseReady: Promise<void> | null = null;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!pool) {
    if (!databaseReady) {
      throw new Error('Database has not been initialized');
    }

    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }

  return pool;
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createSchema();
  }
  return schemaReady;
}

async function createSchema() {
  await ensureDatabase();
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS files (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      oss_key VARCHAR(768) NOT NULL,
      filename VARCHAR(512) NOT NULL,
      size BIGINT NOT NULL DEFAULT 0,
      type VARCHAR(128) NOT NULL DEFAULT '',
      folder VARCHAR(768) NOT NULL DEFAULT '',
      created_at VARCHAR(64) NOT NULL,
      UNIQUE KEY uniq_files_oss_key (oss_key),
      KEY idx_files_folder (folder),
      KEY idx_files_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(512) NOT NULL,
      path VARCHAR(768) NOT NULL,
      parent VARCHAR(768) NOT NULL DEFAULT '',
      created_at VARCHAR(64) NOT NULL,
      UNIQUE KEY uniq_folders_path (path),
      KEY idx_folders_parent (parent),
      KEY idx_folders_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS shares (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      file_id VARCHAR(64) NOT NULL,
      share_code VARCHAR(128) NOT NULL,
      is_password_protected TINYINT(1) NOT NULL DEFAULT 0,
      password VARCHAR(255) NULL,
      expires_at VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      view_count INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_shares_share_code (share_code),
      KEY idx_shares_file_id (file_id),
      KEY idx_shares_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS batch_shares (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      share_code VARCHAR(128) NOT NULL,
      file_ids JSON NOT NULL,
      is_password_protected TINYINT(1) NOT NULL DEFAULT 0,
      password VARCHAR(255) NULL,
      expires_at VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      view_count INT NOT NULL DEFAULT 0,
      UNIQUE KEY uniq_batch_shares_share_code (share_code),
      KEY idx_batch_shares_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS upload_shares (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      share_code VARCHAR(128) NOT NULL,
      name VARCHAR(512) NOT NULL,
      expires_at VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      UNIQUE KEY uniq_upload_shares_share_code (share_code),
      KEY idx_upload_shares_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS upload_files (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      upload_share_id VARCHAR(64) NOT NULL,
      oss_key VARCHAR(768) NOT NULL,
      filename VARCHAR(512) NOT NULL,
      size BIGINT NOT NULL DEFAULT 0,
      type VARCHAR(128) NOT NULL DEFAULT '',
      created_at VARCHAR(64) NOT NULL,
      saved TINYINT(1) NOT NULL DEFAULT 0,
      KEY idx_upload_files_upload_share_id (upload_share_id),
      KEY idx_upload_files_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureDatabase() {
  if (!databaseReady) {
    databaseReady = createDatabase();
  }
  return databaseReady;
}

async function createDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  const url = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) return;

  const serverUrl = new URL(url.toString());
  serverUrl.pathname = '';

  const connection = await mysql.createConnection(serverUrl.toString());
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName.replace(/`/g, '``')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await connection.end();
  }
}
