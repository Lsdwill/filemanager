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

export function moveFile(id: string, newOssKey: string, newFolder: string) {
  const files = readJson(FILES_DB);
  const file = files.find((f: any) => f.id === id);
  if (file) {
    file.oss_key = newOssKey;
    file.folder = newFolder;
    writeJson(FILES_DB, files);
  }
  return file;
}

export function renameFile(id: string, newFilename: string, newOssKey: string) {
  const files = readJson(FILES_DB);
  const file = files.find((f: any) => f.id === id);
  if (file) {
    file.filename = newFilename;
    file.oss_key = newOssKey;
    file.type = newFilename.split('.').pop() || '';
    writeJson(FILES_DB, files);
  }
  return file;
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

export function getFolderById(id: string) {
  const folders = readJson(FOLDERS_DB);
  return folders.find((f: any) => f.id === id);
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

export function renameFolder(id: string, newName: string) {
  const folders = readJson(FOLDERS_DB);
  const folder = folders.find((f: any) => f.id === id);
  if (!folder) return null;

  const oldPath = folder.path;
  const newPath = folder.parent ? `${folder.parent}/${newName}` : newName;

  // Update this folder
  folder.name = newName;
  folder.path = newPath;

  // Update all sub-folders whose path starts with oldPath
  folders.forEach((f: any) => {
    if (f.path.startsWith(oldPath + '/')) {
      f.path = newPath + f.path.slice(oldPath.length);
      f.parent = f.parent.startsWith(oldPath) ? newPath + f.parent.slice(oldPath.length) : f.parent;
    }
  });

  // Update all files whose folder starts with oldPath
  const files = readJson(FILES_DB);
  files.forEach((f: any) => {
    if (f.folder === oldPath || f.folder.startsWith(oldPath + '/')) {
      f.folder = newPath + f.folder.slice(oldPath.length);
      f.oss_key = f.folder ? `${f.folder}/${f.filename}` : f.filename;
    }
  });
  writeJson(FILES_DB, files);
  writeJson(FOLDERS_DB, folders);
  return folder;
}

export function moveFolder(id: string, newParent: string) {
  const folders = readJson(FOLDERS_DB);
  const folder = folders.find((f: any) => f.id === id);
  if (!folder) return null;

  const oldPath = folder.path;
  const newPath = newParent ? `${newParent}/${folder.name}` : folder.name;

  // Update this folder
  folder.parent = newParent;
  folder.path = newPath;

  // Update all sub-folders whose path starts with oldPath
  folders.forEach((f: any) => {
    if (f.path.startsWith(oldPath + '/') && f.id !== id) {
      f.path = newPath + f.path.slice(oldPath.length);
      f.parent = f.parent.startsWith(oldPath) ? newPath + f.parent.slice(oldPath.length) : f.parent;
    }
  });

  // Update all files whose folder starts with oldPath
  const files = readJson(FILES_DB);
  files.forEach((f: any) => {
    if (f.folder === oldPath || f.folder.startsWith(oldPath + '/')) {
      f.folder = newPath + f.folder.slice(oldPath.length);
      f.oss_key = f.folder ? `${f.folder}/${f.filename}` : f.filename;
    }
  });
  writeJson(FILES_DB, files);
  writeJson(FOLDERS_DB, folders);
  return folder;
}

// --- Shares ---
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

const BATCH_SHARES_DB = path.join(DATA_DIR, 'batch_shares.json');

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

export function insertBatchShare(share: BatchShareInfo) {
  const shares = readJson(BATCH_SHARES_DB);
  shares.push(share);
  writeJson(BATCH_SHARES_DB, shares);
}

export function getShareByCode(code: string) {
  const shares = readJson(SHARES_DB);
  return shares.find((s: any) => s.share_code === code);
}

export function getBatchShareByCode(code: string): BatchShareInfo | undefined {
  const shares = readJson(BATCH_SHARES_DB);
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

export function getBatchShares() {
  const shares = readJson(BATCH_SHARES_DB);
  const files = readJson(FILES_DB);
  return shares.map((s: any) => {
    const shareFiles = s.file_ids.map((fid: string) => {
      const file = files.find((f: any) => f.id === fid);
      return file ? { id: file.id, filename: file.filename, size: file.size, type: file.type, oss_key: file.oss_key } : null;
    }).filter(Boolean);
    return {
      ...s,
      files: shareFiles,
    };
  }).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function deleteShare(id: string) {
  const shares = readJson(SHARES_DB);
  writeJson(SHARES_DB, shares.filter((s: any) => s.id !== id));
}

export function deleteBatchShare(id: string) {
  const shares = readJson(BATCH_SHARES_DB);
  writeJson(BATCH_SHARES_DB, shares.filter((s: any) => s.id !== id));
}

export function incrementViewCount(code: string) {
  const shares = readJson(SHARES_DB);
  const share = shares.find((s: any) => s.share_code === code);
  if (share) {
    share.view_count = (share.view_count || 0) + 1;
    writeJson(SHARES_DB, shares);
  }
}

export function incrementBatchViewCount(code: string) {
  const shares = readJson(BATCH_SHARES_DB);
  const share = shares.find((s: any) => s.share_code === code);
  if (share) {
    share.view_count = (share.view_count || 0) + 1;
    writeJson(BATCH_SHARES_DB, shares);
  }
}

// --- Upload Shares (anonymous upload) ---
const UPLOAD_SHARES_DB = path.join(DATA_DIR, 'upload_shares.json');
const UPLOAD_FILES_DB = path.join(DATA_DIR, 'upload_files.json');

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

export function insertUploadShare(share: UploadShare) {
  const shares = readJson(UPLOAD_SHARES_DB);
  shares.push(share);
  writeJson(UPLOAD_SHARES_DB, shares);
}

export function getUploadShareByCode(code: string): UploadShare | undefined {
  const shares = readJson(UPLOAD_SHARES_DB);
  return shares.find((s: any) => s.share_code === code);
}

export function getUploadShares(): UploadShare[] {
  return readJson(UPLOAD_SHARES_DB).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function deleteUploadShare(id: string) {
  const shares = readJson(UPLOAD_SHARES_DB);
  const share = shares.find((s: any) => s.id === id);
  if (share) {
    writeJson(UPLOAD_SHARES_DB, shares.filter((s: any) => s.id !== id));
    // Delete all uploaded files for this share
    const uploadFiles = readJson(UPLOAD_FILES_DB);
    const toDelete = uploadFiles.filter((f: any) => f.upload_share_id === id);
    writeJson(UPLOAD_FILES_DB, uploadFiles.filter((f: any) => f.upload_share_id !== id));
    return toDelete;
  }
  return [];
}

export function insertUploadFile(file: UploadFile) {
  const files = readJson(UPLOAD_FILES_DB);
  files.push(file);
  writeJson(UPLOAD_FILES_DB, files);
}

export function getUploadFilesByShare(shareId: string): UploadFile[] {
  return readJson(UPLOAD_FILES_DB).filter((f: any) => f.upload_share_id === shareId);
}

export function getUploadFiles(): UploadFile[] {
  return readJson(UPLOAD_FILES_DB);
}

export function markUploadFileSaved(id: string) {
  const files = readJson(UPLOAD_FILES_DB);
  const file = files.find((f: any) => f.id === id);
  if (file) {
    file.saved = true;
    writeJson(UPLOAD_FILES_DB, files);
  }
}

export function deleteUploadFile(id: string) {
  const files = readJson(UPLOAD_FILES_DB);
  writeJson(UPLOAD_FILES_DB, files.filter((f: any) => f.id !== id));
}