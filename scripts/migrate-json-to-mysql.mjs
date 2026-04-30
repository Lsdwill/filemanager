import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const root = process.cwd();
const dataDir = path.join(root, 'data');

loadEnv(path.join(root, '.env.local'));
loadEnv(path.join(root, '.env'));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

let pool;

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

function readJson(name) {
  const filePath = path.join(dataDir, name);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function ensureSchema() {
  await ensureDatabase();
  pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 5,
  });

  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
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

async function insertMany(label, rows, columns, valuesForRow) {
  if (rows.length === 0) {
    console.log(`${label}: processed 0`);
    return;
  }

  const chunkSize = 25;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values = chunk.map(valuesForRow);
    const placeholders = values
      .map((row) => `(${row.map(() => '?').join(', ')})`)
      .join(', ');
    const flattened = values.flat();

    await pool.query(
      `INSERT IGNORE INTO ${label} (${columns.join(', ')}) VALUES ${placeholders}`,
      flattened
    );
    console.log(`${label}: processed ${Math.min(start + chunk.length, rows.length)}/${rows.length}`);
  }
  console.log(`${label}: processed ${rows.length}`);
}

try {
  await ensureSchema();

  await insertMany(
    'files',
    readJson('files.json'),
    ['id', 'oss_key', 'filename', 'size', 'type', 'folder', 'created_at'],
    (file) => [
      file.id,
      file.oss_key,
      file.filename,
      file.size || 0,
      file.type || '',
      file.folder || '',
      file.created_at || new Date().toISOString(),
    ]
  );

  await insertMany(
    'folders',
    readJson('folders.json'),
    ['id', 'name', 'path', 'parent', 'created_at'],
    (folder) => [
      folder.id,
      folder.name,
      folder.path,
      folder.parent || '',
      folder.created_at || new Date().toISOString(),
    ]
  );

  await insertMany(
    'shares',
    readJson('shares.json'),
    ['id', 'file_id', 'share_code', 'is_password_protected', 'password', 'expires_at', 'created_at', 'view_count'],
    (share) => [
      share.id,
      share.file_id,
      share.share_code,
      share.is_password_protected ? 1 : 0,
      share.password ?? null,
      share.expires_at,
      share.created_at || new Date().toISOString(),
      share.view_count || 0,
    ]
  );

  await insertMany(
    'batch_shares',
    readJson('batch_shares.json'),
    ['id', 'share_code', 'file_ids', 'is_password_protected', 'password', 'expires_at', 'created_at', 'view_count'],
    (share) => [
      share.id,
      share.share_code,
      JSON.stringify(share.file_ids || []),
      share.is_password_protected ? 1 : 0,
      share.password ?? null,
      share.expires_at,
      share.created_at || new Date().toISOString(),
      share.view_count || 0,
    ]
  );

  await insertMany(
    'upload_shares',
    readJson('upload_shares.json'),
    ['id', 'share_code', 'name', 'expires_at', 'created_at'],
    (share) => [
      share.id,
      share.share_code,
      share.name,
      share.expires_at,
      share.created_at || new Date().toISOString(),
    ]
  );

  await insertMany(
    'upload_files',
    readJson('upload_files.json'),
    ['id', 'upload_share_id', 'oss_key', 'filename', 'size', 'type', 'created_at', 'saved'],
    (file) => [
      file.id,
      file.upload_share_id,
      file.oss_key,
      file.filename,
      file.size || 0,
      file.type || '',
      file.created_at || new Date().toISOString(),
      file.saved ? 1 : 0,
    ]
  );

  console.log('JSON to MySQL migration completed.');
} finally {
  if (pool) {
    await pool.end();
  }
}
