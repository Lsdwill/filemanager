import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILES_DB = path.join(DATA_DIR, 'files.json');
const SHARES_DB = path.join(DATA_DIR, 'shares.json');
const FOLDERS_DB = path.join(DATA_DIR, 'folders.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filePath: string): any[] {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath: string, data: any[]) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- Files ---
export function insertFile(file: { id: string; oss_key: string; filename: string; size: number; type: string; folder: string }) {
  const files = readJson(FILES_DB);
  files.push({ ...file, created_at: new Date().toISOString() });
  writeJson(FILES_DB, files);
}

export function getFiles(folder?: string) {
  const files = readJson(FILES_DB);
  const sorted = files.sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (folder !== undefined) {
    return sorted.filter((f: any) => f.folder === folder);
  }
  return sorted;
}

export function getFileByOssKey(ossKey: string) {
  const files = readJson(FILES_DB);
  return files.find((f: any) => f.oss_key === ossKey);
}

export function getFileById(id: string) {
  const files = readJson(FILES_DB);
  return files.find((f: any) => f.id === id);
}

export function deleteFile(id: string) {
  const files = readJson(FILES_DB);
  writeJson(FILES_DB, files.filter((f: any) => f.id !== id));
}

export function deleteFileByOssKey(ossKey: string) {
  const files = readJson(FILES_DB);
  writeJson(FILES_DB, files.filter((f: any) => f.oss_key !== ossKey));
}

export function deleteFilesByFolder(folder: string) {
  const files = readJson(FILES_DB);
  writeJson(FILES_DB, files.filter((f: any) => f.folder !== folder && !f.folder.startsWith(folder + '/')));
}

// --- Folders ---
export interface FolderInfo {
  id: string;
  name: string;
  path: string;
  parent: string;
  created_at: string;
}

export function insertFolder(folder: FolderInfo) {
  const folders = readJson(FOLDERS_DB);
  folders.push(folder);
  writeJson(FOLDERS_DB, folders);
}

export function getFolders() {
  return readJson(FOLDERS_DB).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getSubFolders(parent: string) {
  const folders = readJson(FOLDERS_DB);
  return folders.filter((f: any) => f.parent === parent);
}

export function getFolderByPath(folderPath: string) {
  const folders = readJson(FOLDERS_DB);
  return folders.find((f: any) => f.path === folderPath);
}

export function deleteFolder(id: string) {
  const folders = readJson(FOLDERS_DB);
  const folder = folders.find((f: any) => f.id === id);
  if (folder) {
    // Delete all sub-folders recursively
    const toDelete = folders.filter((f: any) => f.path.startsWith(folder.path + '/') || f.id === id);
    writeJson(FOLDERS_DB, folders.filter((f: any) => !toDelete.some((d: any) => d.id === f.id)));
    // Delete all files in this folder and sub-folders
    deleteFilesByFolder(folder.path);
  }
}

// --- Shares ---
export function insertShare(share: {
  id: string;
  file_id: string;
  share_code: string;
  is_password_protected: boolean;
  password: string | null;
  expires_at: string;
}) {
  const shares = readJson(SHARES_DB);
  shares.push({ ...share, created_at: new Date().toISOString(), view_count: 0 });
  writeJson(SHARES_DB, shares);
}

export function getShareByCode(code: string) {
  const shares = readJson(SHARES_DB);
  return shares.find((s: any) => s.share_code === code);
}

export function getShares() {
  const shares = readJson(SHARES_DB);
  const files = readJson(FILES_DB);
  return shares.map((s: any) => {
    const file = files.find((f: any) => f.id === s.file_id);
    return {
      ...s,
      filename: file?.filename || '未知文件',
      size: file?.size || 0,
      type: file?.type || '',
    };
  }).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function deleteShare(id: string) {
  const shares = readJson(SHARES_DB);
  writeJson(SHARES_DB, shares.filter((s: any) => s.id !== id));
}

export function incrementViewCount(code: string) {
  const shares = readJson(SHARES_DB);
  const share = shares.find((s: any) => s.share_code === code);
  if (share) {
    share.view_count = (share.view_count || 0) + 1;
    writeJson(SHARES_DB, shares);
  }
}