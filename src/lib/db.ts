import type { RowDataPacket } from 'mysql2';
import { ensureSchema, getPool } from './mysql';

export interface FileInfo {
  id: string;
  oss_key: string;
  filename: string;
  size: number;
  type: string;
  folder: string;
  created_at: string;
}

export interface FolderInfo {
  id: string;
  name: string;
  path: string;
  parent: string;
  created_at: string;
}

export interface ShareInfo {
  id: string;
  file_id: string;
  share_code: string;
  is_password_protected: boolean;
  password: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
}

export interface BatchShareInfo {
  id: string;
  share_code: string;
  file_ids: string[];
  is_password_protected: boolean;
  password: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
}

export interface UploadShare {
  id: string;
  share_code: string;
  name: string;
  expires_at: string;
  created_at: string;
}

export interface UploadFile {
  id: string;
  upload_share_id: string;
  oss_key: string;
  filename: string;
  size: number;
  type: string;
  created_at: string;
  saved: boolean;
}

type FileRow = FileInfo & RowDataPacket;
type FolderRow = FolderInfo & RowDataPacket;
type ShareRow = Omit<ShareInfo, 'is_password_protected'> & { is_password_protected: number } & RowDataPacket;
type BatchShareRow = Omit<BatchShareInfo, 'file_ids' | 'is_password_protected'> & {
  file_ids: string | string[];
  is_password_protected: number;
} & RowDataPacket;
type UploadShareRow = UploadShare & RowDataPacket;
type UploadFileRow = Omit<UploadFile, 'saved'> & { saved: number } & RowDataPacket;

async function queryRows<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  await ensureSchema();
  const [rows] = await getPool().query<T[]>(sql, params);
  return rows;
}

function toShare(row: ShareRow): ShareInfo {
  return {
    ...row,
    is_password_protected: Boolean(row.is_password_protected),
  };
}

function parseFileIds(value: string | string[]) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toBatchShare(row: BatchShareRow): BatchShareInfo {
  return {
    ...row,
    file_ids: parseFileIds(row.file_ids),
    is_password_protected: Boolean(row.is_password_protected),
  };
}

function toUploadFile(row: UploadFileRow): UploadFile {
  return {
    ...row,
    saved: Boolean(row.saved),
  };
}

// --- Files ---
export async function insertFile(file: { id: string; oss_key: string; filename: string; size: number; type: string; folder: string }) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO files (id, oss_key, filename, size, type, folder, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       filename = VALUES(filename),
       size = VALUES(size),
       type = VALUES(type),
       folder = VALUES(folder)`,
    [file.id, file.oss_key, file.filename, file.size, file.type, file.folder, new Date().toISOString()]
  );
}

export async function getFiles(folder?: string): Promise<FileInfo[]> {
  if (folder !== undefined) {
    return queryRows<FileRow>(
      'SELECT * FROM files WHERE folder = ? ORDER BY created_at DESC',
      [folder]
    );
  }
  return queryRows<FileRow>('SELECT * FROM files ORDER BY created_at DESC');
}

export async function getFileByOssKey(ossKey: string): Promise<FileInfo | undefined> {
  const rows = await queryRows<FileRow>('SELECT * FROM files WHERE oss_key = ? LIMIT 1', [ossKey]);
  return rows[0];
}

export async function getFileById(id: string): Promise<FileInfo | undefined> {
  const rows = await queryRows<FileRow>('SELECT * FROM files WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

export async function deleteFile(id: string) {
  await ensureSchema();
  await getPool().execute('DELETE FROM files WHERE id = ?', [id]);
}

export async function deleteFileByOssKey(ossKey: string) {
  await ensureSchema();
  await getPool().execute('DELETE FROM files WHERE oss_key = ?', [ossKey]);
}

export async function moveFile(id: string, newOssKey: string, newFolder: string): Promise<FileInfo | null> {
  const file = await getFileById(id);
  if (!file) return null;

  await ensureSchema();
  await getPool().execute(
    'UPDATE files SET oss_key = ?, folder = ? WHERE id = ?',
    [newOssKey, newFolder, id]
  );
  return { ...file, oss_key: newOssKey, folder: newFolder };
}

export async function renameFile(id: string, newFilename: string, newOssKey: string): Promise<FileInfo | null> {
  const file = await getFileById(id);
  if (!file) return null;

  const type = newFilename.split('.').pop() || '';
  await ensureSchema();
  await getPool().execute(
    'UPDATE files SET filename = ?, oss_key = ?, type = ? WHERE id = ?',
    [newFilename, newOssKey, type, id]
  );
  return { ...file, filename: newFilename, oss_key: newOssKey, type };
}

export async function deleteFilesByFolder(folder: string) {
  await ensureSchema();
  await getPool().execute(
    'DELETE FROM files WHERE folder = ? OR folder LIKE ?',
    [folder, `${folder}/%`]
  );
}

// --- Folders ---
export async function insertFolder(folder: FolderInfo) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO folders (id, name, path, parent, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       parent = VALUES(parent)`,
    [folder.id, folder.name, folder.path, folder.parent, folder.created_at]
  );
}

export async function getFolders(): Promise<FolderInfo[]> {
  return queryRows<FolderRow>('SELECT * FROM folders ORDER BY created_at DESC');
}

export async function getSubFolders(parent: string): Promise<FolderInfo[]> {
  return queryRows<FolderRow>('SELECT * FROM folders WHERE parent = ? ORDER BY created_at DESC', [parent]);
}

export async function getFolderByPath(folderPath: string): Promise<FolderInfo | undefined> {
  const rows = await queryRows<FolderRow>('SELECT * FROM folders WHERE path = ? LIMIT 1', [folderPath]);
  return rows[0];
}

export async function getFolderById(id: string): Promise<FolderInfo | undefined> {
  const rows = await queryRows<FolderRow>('SELECT * FROM folders WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

export async function deleteFolder(id: string) {
  const folder = await getFolderById(id);
  if (!folder) return;

  await ensureSchema();
  await getPool().execute(
    'DELETE FROM folders WHERE id = ? OR path LIKE ?',
    [id, `${folder.path}/%`]
  );
  await deleteFilesByFolder(folder.path);
}

export async function renameFolder(id: string, newName: string): Promise<FolderInfo | null> {
  const folder = await getFolderById(id);
  if (!folder) return null;

  const oldPath = folder.path;
  const newPath = folder.parent ? `${folder.parent}/${newName}` : newName;

  await ensureSchema();
  const db = getPool();
  await db.execute('UPDATE folders SET name = ?, path = ? WHERE id = ?', [newName, newPath, id]);
  await db.execute(
    `UPDATE folders
     SET path = CONCAT(?, SUBSTRING(path, ?)),
         parent = CASE
           WHEN parent LIKE ? THEN CONCAT(?, SUBSTRING(parent, ?))
           ELSE parent
         END
     WHERE path LIKE ?`,
    [newPath, oldPath.length + 1, `${oldPath}%`, newPath, oldPath.length + 1, `${oldPath}/%`]
  );
  await db.execute(
    `UPDATE files
     SET folder = CONCAT(?, SUBSTRING(folder, ?)),
         oss_key = CONCAT(CONCAT(?, SUBSTRING(folder, ?)), '/', filename)
     WHERE folder = ? OR folder LIKE ?`,
    [newPath, oldPath.length + 1, newPath, oldPath.length + 1, oldPath, `${oldPath}/%`]
  );

  return { ...folder, name: newName, path: newPath };
}

export async function moveFolder(id: string, newParent: string): Promise<FolderInfo | null> {
  const folder = await getFolderById(id);
  if (!folder) return null;

  const oldPath = folder.path;
  const newPath = newParent ? `${newParent}/${folder.name}` : folder.name;

  await ensureSchema();
  const db = getPool();
  await db.execute('UPDATE folders SET parent = ?, path = ? WHERE id = ?', [newParent, newPath, id]);
  await db.execute(
    `UPDATE folders
     SET path = CONCAT(?, SUBSTRING(path, ?)),
         parent = CASE
           WHEN parent LIKE ? THEN CONCAT(?, SUBSTRING(parent, ?))
           ELSE parent
         END
     WHERE id <> ? AND path LIKE ?`,
    [newPath, oldPath.length + 1, `${oldPath}%`, newPath, oldPath.length + 1, id, `${oldPath}/%`]
  );
  await db.execute(
    `UPDATE files
     SET folder = CONCAT(?, SUBSTRING(folder, ?)),
         oss_key = CONCAT(CONCAT(?, SUBSTRING(folder, ?)), '/', filename)
     WHERE folder = ? OR folder LIKE ?`,
    [newPath, oldPath.length + 1, newPath, oldPath.length + 1, oldPath, `${oldPath}/%`]
  );

  return { ...folder, parent: newParent, path: newPath };
}

// --- Shares ---
export async function insertShare(share: {
  id: string;
  file_id: string;
  share_code: string;
  is_password_protected: boolean;
  password: string | null;
  expires_at: string;
}) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO shares (id, file_id, share_code, is_password_protected, password, expires_at, created_at, view_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE
       file_id = VALUES(file_id),
       is_password_protected = VALUES(is_password_protected),
       password = VALUES(password),
       expires_at = VALUES(expires_at)`,
    [
      share.id,
      share.file_id,
      share.share_code,
      share.is_password_protected ? 1 : 0,
      share.password,
      share.expires_at,
      new Date().toISOString(),
    ]
  );
}

export async function insertBatchShare(share: BatchShareInfo) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO batch_shares (id, share_code, file_ids, is_password_protected, password, expires_at, created_at, view_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       file_ids = VALUES(file_ids),
       is_password_protected = VALUES(is_password_protected),
       password = VALUES(password),
       expires_at = VALUES(expires_at)`,
    [
      share.id,
      share.share_code,
      JSON.stringify(share.file_ids),
      share.is_password_protected ? 1 : 0,
      share.password,
      share.expires_at,
      share.created_at,
      share.view_count,
    ]
  );
}

export async function getShareByCode(code: string): Promise<ShareInfo | undefined> {
  const rows = await queryRows<ShareRow>('SELECT * FROM shares WHERE share_code = ? LIMIT 1', [code]);
  return rows[0] ? toShare(rows[0]) : undefined;
}

export async function getBatchShareByCode(code: string): Promise<BatchShareInfo | undefined> {
  const rows = await queryRows<BatchShareRow>('SELECT * FROM batch_shares WHERE share_code = ? LIMIT 1', [code]);
  return rows[0] ? toBatchShare(rows[0]) : undefined;
}

export async function getShares() {
  const rows = await queryRows<ShareRow & { filename: string | null; size: number | null; type: string | null }>(
    `SELECT s.*, f.filename, f.size, f.type
     FROM shares s
     LEFT JOIN files f ON f.id = s.file_id
     ORDER BY s.created_at DESC`
  );

  return rows.map((row) => ({
    ...toShare(row),
    filename: row.filename || '未知文件',
    size: row.size || 0,
    type: row.type || '',
  }));
}

export async function getBatchShares() {
  const shares = await queryRows<BatchShareRow>('SELECT * FROM batch_shares ORDER BY created_at DESC');
  const files = await getFiles();

  return shares.map((row) => {
    const share = toBatchShare(row);
    const shareFiles = share.file_ids
      .map((fid) => {
        const file = files.find((f) => f.id === fid);
        return file ? { id: file.id, filename: file.filename, size: file.size, type: file.type, oss_key: file.oss_key } : null;
      })
      .filter(Boolean);

    return {
      ...share,
      files: shareFiles,
    };
  });
}

export async function deleteShare(id: string) {
  await ensureSchema();
  await getPool().execute('DELETE FROM shares WHERE id = ?', [id]);
}

export async function deleteBatchShare(id: string) {
  await ensureSchema();
  await getPool().execute('DELETE FROM batch_shares WHERE id = ?', [id]);
}

export async function incrementViewCount(code: string) {
  await ensureSchema();
  await getPool().execute('UPDATE shares SET view_count = view_count + 1 WHERE share_code = ?', [code]);
}

export async function incrementBatchViewCount(code: string) {
  await ensureSchema();
  await getPool().execute('UPDATE batch_shares SET view_count = view_count + 1 WHERE share_code = ?', [code]);
}

// --- Upload Shares (anonymous upload) ---
export async function insertUploadShare(share: UploadShare) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO upload_shares (id, share_code, name, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       expires_at = VALUES(expires_at)`,
    [share.id, share.share_code, share.name, share.expires_at, share.created_at]
  );
}

export async function getUploadShareByCode(code: string): Promise<UploadShare | undefined> {
  const rows = await queryRows<UploadShareRow>(
    'SELECT * FROM upload_shares WHERE share_code = ? OR id = ? LIMIT 1',
    [code, code]
  );
  return rows[0];
}

export async function getUploadShares(): Promise<UploadShare[]> {
  return queryRows<UploadShareRow>('SELECT * FROM upload_shares ORDER BY created_at DESC');
}

export async function deleteUploadShare(id: string): Promise<UploadFile[]> {
  const files = await getUploadFilesByShare(id);
  await ensureSchema();
  const db = getPool();
  await db.execute('DELETE FROM upload_shares WHERE id = ?', [id]);
  await db.execute('DELETE FROM upload_files WHERE upload_share_id = ?', [id]);
  return files;
}

export async function insertUploadFile(file: UploadFile) {
  await ensureSchema();
  await getPool().execute(
    `INSERT INTO upload_files (id, upload_share_id, oss_key, filename, size, type, created_at, saved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       upload_share_id = VALUES(upload_share_id),
       oss_key = VALUES(oss_key),
       filename = VALUES(filename),
       size = VALUES(size),
       type = VALUES(type),
       saved = VALUES(saved)`,
    [file.id, file.upload_share_id, file.oss_key, file.filename, file.size, file.type, file.created_at, file.saved ? 1 : 0]
  );
}

export async function getUploadFilesByShare(shareId: string): Promise<UploadFile[]> {
  const rows = await queryRows<UploadFileRow>('SELECT * FROM upload_files WHERE upload_share_id = ? ORDER BY created_at DESC', [shareId]);
  return rows.map(toUploadFile);
}

export async function getUploadFiles(): Promise<UploadFile[]> {
  const rows = await queryRows<UploadFileRow>('SELECT * FROM upload_files ORDER BY created_at DESC');
  return rows.map(toUploadFile);
}

export async function markUploadFileSaved(id: string) {
  await ensureSchema();
  await getPool().execute('UPDATE upload_files SET saved = 1 WHERE id = ?', [id]);
}

export async function deleteUploadFile(id: string) {
  await ensureSchema();
  await getPool().execute('DELETE FROM upload_files WHERE id = ?', [id]);
}
