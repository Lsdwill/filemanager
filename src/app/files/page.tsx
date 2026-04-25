'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder, File, Image, FileText, Film, Music, Archive, Files,
  Upload, Trash2, Share2, Search, LayoutGrid, List,
  LogOut, Cloud, Menu, X, RefreshCw, FolderPlus, ChevronRight, ChevronDown, Download, Pencil, MoreVertical, Move, CheckSquare, Square, Link
} from 'lucide-react';
import ShareDialog from '@/components/ShareDialog';

interface FileInfo {
  id: string;
  oss_key: string;
  filename: string;
  size: number;
  type: string;
  folder: string;
  created_at: string;
  thumbnail_url?: string;
}

interface FolderInfo {
  id: string;
  name: string;
  path: string;
  parent: string;
  created_at: string;
}

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t)) return <Image className="w-8 h-8 text-pink-400" />;
  if (['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'].includes(t)) return <Film className="w-8 h-8 text-purple-400" />;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(t)) return <Music className="w-8 h-8 text-yellow-400" />;
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t)) return <FileText className="w-8 h-8 text-blue-400" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(t)) return <Archive className="w-8 h-8 text-orange-400" />;
  return <File className="w-8 h-8 text-gray-400" />;
}

function isPreviewable(type: string) {
  const t = type.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp3', 'wav', 'flac', 'aac', 'md', 'markdown', 'txt'].includes(t);
}

function isImageType(type: string) {
  const t = type.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t);
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// Scrolling filename component
function ScrollableFilename({ name, className }: { name: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (ref.current) {
      setIsOverflowing(ref.current.scrollWidth > ref.current.clientWidth);
    }
  }, [name]);

  return (
    <div
      ref={ref}
      className={`${className || ''} overflow-hidden`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className={`${isHovering && isOverflowing ? 'animate-marquee' : ''}`}
        style={isHovering && isOverflowing ? { width: `${ref.current?.scrollWidth}px` } : {}}
      >
        {name}
      </div>
    </div>
  );
}

function MoveDialog({ moveDialog, allFolders, onMove, onClose }: {
  moveDialog: { fileIds: string[], folderIds: string[] };
  allFolders: FolderInfo[];
  onMove: (fileIds: string[], folderIds: string[], targetFolder: string) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build tree from flat folder list
  const rootFolders = allFolders.filter(f => f.parent === '');
  const getChildren = (parentPath: string) => allFolders.filter(f => f.parent === parentPath);

  // Determine which folders are invalid targets (moving a folder into itself or descendants)
  const movingFolderPaths = moveDialog.folderIds
    .map(id => allFolders.find(f => f.id === id))
    .filter(Boolean)
    .map(f => f!.path);
  const invalidTargets = new Set<string>();
  for (const path of movingFolderPaths) {
    invalidTargets.add(path);
    allFolders.forEach(f => {
      if (f.path.startsWith(path + '/')) invalidTargets.add(f.path);
    });
  }

  const countLabel = moveDialog.fileIds.length > 0 && moveDialog.folderIds.length > 0
    ? `${moveDialog.fileIds.length} 个文件, ${moveDialog.folderIds.length} 个文件夹`
    : moveDialog.fileIds.length > 0 ? `${moveDialog.fileIds.length} 个文件`
    : `${moveDialog.folderIds.length} 个文件夹`;

  function renderTree(folderList: FolderInfo[], depth: number = 0) {
    return folderList.map(folder => {
      const children = getChildren(folder.path);
      const hasChildren = children.length > 0;
      const isExpanded = expanded.has(folder.id);
      const isInvalid = invalidTargets.has(folder.path);

      return (
        <div key={folder.id}>
          <button
            disabled={isInvalid}
            onClick={() => onMove(moveDialog.fileIds, moveDialog.folderIds, folder.path)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${isInvalid ? 'text-white/30 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'}`}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); setExpanded(prev => { const next = new Set(prev); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; }); }} className="p-0.5 text-white/40 hover:text-white">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <Folder className="w-4 h-4 text-blue-400" />
            <span className="truncate">{folder.name}</span>
          </button>
          {isExpanded && hasChildren && renderTree(children, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-white mb-1">移动到文件夹</h2>
        <p className="text-white/50 text-sm mb-4">{countLabel}</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <button onClick={() => onMove(moveDialog.fileIds, moveDialog.folderIds, '')} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all">
            <Folder className="w-4 h-4 text-blue-400" /> 根目录
          </button>
          {renderTree(rootFolders)}
        </div>
      </div>
    </div>
  );
}

function BatchShareDialog({ files, token, onClose }: { files: FileInfo[]; token: string; onClose: () => void }) {
  const [expiresHours, setExpiresHours] = useState(24);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/batch-share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_ids: files.map(f => f.id),
          expires_hours: expiresHours,
          is_password_protected: usePassword,
          password: usePassword ? password : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/batch-share/${data.shareCode}`;
        setShareLink(link);
        await navigator.clipboard.writeText(link);
      } else {
        const data = await res.json();
        alert(data.error || '创建分享失败');
      }
    } catch (err) {
      console.error(err);
      alert('创建分享失败');
    }
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-white mb-1">批量分享</h2>
        <p className="text-white/50 text-sm mb-4">已选择 {files.length} 个文件，将创建一个分享链接</p>

        {shareLink ? (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-400 text-sm mb-2">分享链接已创建并复制到剪贴板</p>
              <div className="bg-white/10 rounded-lg p-3 text-white text-sm break-all">{shareLink}</div>
            </div>
            <button onClick={onClose} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-medium transition-all">完成</button>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {files.map(f => (<div key={f.id} className="text-white/70 text-sm truncate">{f.filename}</div>))}
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">有效期</label>
                <select value={expiresHours} onChange={(e) => setExpiresHours(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-400">
                  <option value={1}>1 小时</option>
                  <option value={6}>6 小时</option>
                  <option value={24}>1 天</option>
                  <option value={168}>7 天</option>
                  <option value={720}>30 天</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-white/70 text-sm mb-2">
                  <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="rounded" />
                  设置访问密码
                </label>
                {usePassword && (
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400" />
                )}
              </div>
            </div>

            <button onClick={handleCreate} disabled={creating || (usePassword && !password)} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3 font-medium transition-all">
              {creating ? '创建中...' : '创建分享链接'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function FilesPage() {
  const { token, logout } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [currentFolder, setCurrentFolder] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('folder') || '';
    }
    return '';
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<FileInfo[]>([]);
  const [globalSearching, setGlobalSearching] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareFile, setShareFile] = useState<FileInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragTargetFolder, setDragTargetFolder] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileInfo | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderInfo | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuFile, setMenuFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [moveDialog, setMoveDialog] = useState<{ fileIds: string[], folderIds: string[] } | null>(null);
  const [allFolders, setAllFolders] = useState<FolderInfo[]>([]);
  const [batchShareFiles, setBatchShareFiles] = useState<FileInfo[] | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number; active: boolean } | null>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/files?folder=${encodeURIComponent(currentFolder)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [token, currentFolder]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  useEffect(() => {
    const imageFiles = files.filter(f => isImageType(f.type));
    if (imageFiles.length === 0) return;
    const loadThumbnails = async () => {
      const newThumbnails: Record<string, string> = {};
      for (const file of imageFiles) {
        try {
          const encodedKey = encodeURIComponent(file.oss_key);
          const res = await fetch(`/api/files/thumbnail/${encodedKey}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) { const data = await res.json(); newThumbnails[file.id] = data.thumbnail_url; }
        } catch {}
      }
      setThumbnails(prev => ({ ...prev, ...newThumbnails }));
    };
    loadThumbnails();
  }, [files, token]);

  const breadcrumbs = currentFolder
    ? currentFolder.split('/').map((name, i) => ({ name, path: currentFolder.split('/').slice(0, i + 1).join('/') }))
    : [];

  async function handleUpload(fileList: FileList | File[]) {
    if (!token) return;
    setUploading(true); setUploadProgress(0);
    const total = fileList.length; let completed = 0;
    for (const file of fileList) {
      const formData = new FormData(); formData.append('file', file); formData.append('folder', currentFolder);
      try { await fetch('/api/files/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }); completed++; setUploadProgress(Math.round((completed / total) * 100)); } catch (err) { console.error(err); }
    }
    setUploading(false); setUploadProgress(0); fetchFiles();
  }

  async function handleDelete(id: string, ossKey: string) {
    if (!token || !confirm('确定删除此文件？')) return;
    try { const encodedKey = encodeURIComponent(ossKey); await fetch(`/api/files/${encodedKey}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); setFiles(files.filter(f => f.id !== id)); } catch (err) { console.error(err); }
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!token) return;
    try {
      const res = await fetch('/api/folders', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (res.ok) { setFolders(folders.filter(f => f.id !== id)); fetchFiles(); }
      else { const data = await res.json(); alert(data.error || '删除失败'); }
    } catch (err) { console.error(err); }
  }

  async function handleCreateFolder() {
    if (!token || !newFolderName.trim()) return;
    try { const res = await fetch('/api/folders', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFolderName.trim(), parent: currentFolder }) }); if (res.ok) { setNewFolderName(''); setShowNewFolder(false); fetchFiles(); } } catch (err) { console.error(err); }
  }

  async function handleMoveFile(fileId: string, targetFolder: string) {
    if (!token) return;
    try { const res = await fetch('/api/files/move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, targetFolder }) }); if (res.ok) { fetchFiles(); } else { const data = await res.json(); alert(data.error || '移动失败'); } } catch (err) { console.error(err); }
  }

  async function handleBatchMove(fileIds: string[], folderIds: string[], targetFolder: string) {
    if (!token) return;
    for (const fileId of fileIds) {
      await handleMoveFile(fileId, targetFolder);
    }
    for (const folderId of folderIds) {
      try {
        const res = await fetch('/api/folders/move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: folderId, targetParent: targetFolder }) });
        if (!res.ok) { const data = await res.json(); alert(data.error || '移动文件夹失败'); }
      } catch (err) { console.error(err); }
    }
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
    setMoveDialog(null);
    fetchFiles();
  }

  async function fetchAllFolders() {
    if (!token) return;
    try {
      const res = await fetch('/api/folders?all=true', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setAllFolders(data.folders); }
    } catch (err) { console.error(err); }
  }

  async function handleRename() {
    if (!token || !renameValue.trim()) return;
    try {
      if (renamingFile) {
        const res = await fetch('/api/files/rename', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: renamingFile.id, newName: renameValue.trim() }) });
        if (res.ok) { setRenamingFile(null); setRenameValue(''); fetchFiles(); } else { const data = await res.json(); alert(data.error || '重命名失败'); }
      } else if (renamingFolder) {
        const res = await fetch('/api/folders/rename', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: renamingFolder.id, newName: renameValue.trim() }) });
        if (res.ok) { setRenamingFolder(null); setRenameValue(''); fetchFiles(); } else { const data = await res.json(); alert(data.error || '重命名失败'); }
      }
    } catch (err) { console.error(err); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const fileId = e.dataTransfer.getData('fileId');
    const folderId = e.dataTransfer.getData('folderId');
    const targetFolderPath = e.dataTransfer.getData('targetFolder');
    if (fileId && targetFolderPath) { handleMoveFile(fileId, targetFolderPath); return; }
    if (folderId && targetFolderPath) {
      fetch('/api/folders/move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: folderId, targetParent: targetFolderPath }) }).then(res => { if (res.ok) fetchFiles(); else res.json().then(d => alert(d.error || '移动失败')); });
      return;
    }
    if (e.dataTransfer.files.length > 0) { handleUpload(e.dataTransfer.files); }
  }

  function openPreview(file: FileInfo) {
    const folderParam = file.folder ? `&folder=${encodeURIComponent(file.folder)}` : '';
    window.location.href = `/files/preview/${file.id}?${folderParam}`;
  }

  async function handleDownload(ossKey: string) {
    if (!token) return;
    try { const encodedKey = encodeURIComponent(ossKey); const res = await fetch(`/api/files/download/${encodedKey}`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); window.location.href = data.download_url; } } catch (err) { console.error(err); }
  }

  function handleFileClick(e: React.MouseEvent, file: FileInfo) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newSet = new Set(selectedFiles);
      if (newSet.has(file.id)) newSet.delete(file.id); else newSet.add(file.id);
      setSelectedFiles(newSet);
    } else if (e.shiftKey && selectedFiles.size > 0) {
      e.preventDefault();
      const lastSelected = [...selectedFiles].pop()!;
      const allFileIds = filteredFiles.map(f => f.id);
      const startIdx = allFileIds.indexOf(lastSelected);
      const endIdx = allFileIds.indexOf(file.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const range = startIdx < endIdx ? allFileIds.slice(startIdx, endIdx + 1) : allFileIds.slice(endIdx, startIdx + 1);
        setSelectedFiles(new Set([...selectedFiles, ...range]));
      }
    } else {
      if (selectedFiles.size > 0) { setSelectedFiles(new Set()); return; }
      if (isPreviewable(file.type)) openPreview(file);
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    // Only start selection on left click in empty area
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.file-item, .folder-item, button, input, label')) return;

    const rect = fileListRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectionBox({
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
      active: true,
    });
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!selectionBox?.active) return;

    const rect = fileListRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectionBox(prev => prev ? {
      ...prev,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    } : null);
  }

  function handleMouseUp() {
    if (!selectionBox?.active) return;

    const rect = fileListRef.current?.getBoundingClientRect();
    if (!rect) {
      setSelectionBox(null);
      return;
    }

    const minX = Math.min(selectionBox.startX, selectionBox.endX);
    const maxX = Math.max(selectionBox.startX, selectionBox.endX);
    const minY = Math.min(selectionBox.startY, selectionBox.endY);
    const maxY = Math.max(selectionBox.startY, selectionBox.endY);

    // Check if selection box is too small (just a click)
    if (maxX - minX < 10 && maxY - minY < 10) {
      setSelectionBox(null);
      return;
    }

    // Find all file/folder elements within selection box
    const fileElements = fileListRef.current?.querySelectorAll('.file-item, .folder-item');
    if (!fileElements) {
      setSelectionBox(null);
      return;
    }

    const newSelectedFiles = new Set<string>();
    const newSelectedFolders = new Set<string>();

    fileElements.forEach(el => {
      const elRect = el.getBoundingClientRect();
      const elLeft = elRect.left - rect.left;
      const elTop = elRect.top - rect.top;
      const elRight = elLeft + elRect.width;
      const elBottom = elTop + elRect.height;

      // Check if element intersects with selection box
      if (elLeft < maxX && elRight > minX && elTop < maxY && elBottom > minY) {
        const id = el.getAttribute('data-id');
        const type = el.getAttribute('data-type');
        if (id) {
          if (type === 'folder') {
            newSelectedFolders.add(id);
          } else {
            newSelectedFiles.add(id);
          }
        }
      }
    });

    setSelectedFiles(newSelectedFiles);
    setSelectedFolders(newSelectedFolders);
    setSelectionBox(null);
  }

  async function handleBatchDelete() {
    if (!token) return;
    const total = selectedFiles.size + selectedFolders.size;
    if (total === 0) return;
    if (!confirm(`确定删除选中的 ${selectedFiles.size} 个文件和 ${selectedFolders.size} 个文件夹？`)) return;

    // Delete files
    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId);
      if (file) {
        try {
          const encodedKey = encodeURIComponent(file.oss_key);
          await fetch(`/api/files/${encodedKey}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        } catch (err) { console.error(err); }
      }
    }

    // Delete folders
    for (const folderId of selectedFolders) {
      try {
        const res = await fetch('/api/folders', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: folderId }) });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || '删除文件夹失败');
        }
      } catch (err) { console.error(err); }
    }

    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
    fetchFiles();
  }

  const filteredFiles = files.filter(f => f.filename.toLowerCase().includes(search.toLowerCase()));
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  async function handleGlobalSearch(query: string) {
    if (!token || !query.trim()) {
      setGlobalSearchResults([]);
      setShowGlobalSearch(false);
      return;
    }
    setGlobalSearching(true);
    setShowGlobalSearch(true);
    try {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalSearchResults(data.files);
      }
    } catch (err) {
      console.error(err);
    }
    setGlobalSearching(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Sidebar - PC */}
      <aside className="hidden md:flex w-64 bg-white/5 border-r border-white/10 flex-col">
        <div className="p-6 flex items-center gap-3"><Cloud className="w-8 h-8 text-blue-400" /><span className="text-xl font-bold text-white">我的网盘</span></div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setCurrentFolder('')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentFolder === '' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}><Folder className="w-5 h-5" /> 全部文件</button>
          <button onClick={() => window.location.href = '/share'} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Share2 className="w-5 h-5" /> 我的分享</button>
          <button onClick={() => window.location.href = '/batch-share'} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Files className="w-5 h-5" /> 批量分享</button>
          <button onClick={() => window.location.href = '/upload-share'} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Upload className="w-5 h-5" /> 上传分享</button>
        </nav>
        <div className="p-4 border-t border-white/10"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-red-400 transition-all"><LogOut className="w-5 h-5" /> 退出登录</button></div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-white/10 flex flex-col">
            <div className="p-6 flex items-center justify-between"><div className="flex items-center gap-3"><Cloud className="w-8 h-8 text-blue-400" /><span className="text-xl font-bold text-white">我的网盘</span></div><button onClick={() => setSidebarOpen(false)} className="text-white/60"><X className="w-6 h-6" /></button></div>
            <nav className="flex-1 px-4 space-y-2">
              <button onClick={() => { setCurrentFolder(''); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 font-medium"><Folder className="w-5 h-5" /> 全部文件</button>
              <button onClick={() => { window.location.href = '/share'; setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Share2 className="w-5 h-5" /> 我的分享</button>
              <button onClick={() => { window.location.href = '/batch-share'; setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Files className="w-5 h-5" /> 批量分享</button>
              <button onClick={() => { window.location.href = '/upload-share'; setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><Upload className="w-5 h-5" /> 上传分享</button>
            </nav>
            <div className="p-4 border-t border-white/10"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-red-400 transition-all"><LogOut className="w-5 h-5" /> 退出登录</button></div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen" onDragOver={(e) => { e.preventDefault(); if (!e.dataTransfer.types.includes('fileid')) setDragOver(true); }} onDragLeave={() => { setDragOver(false); setDragTargetFolder(null); }} onDrop={handleDrop}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex flex-wrap items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-white/60"><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-1 text-sm min-w-0 overflow-hidden flex-shrink-0">
            <button onClick={() => setCurrentFolder('')} className="text-white/60 hover:text-blue-400 transition-all shrink-0">根目录</button>
            {breadcrumbs.map((bc) => (<span key={bc.path} className="flex items-center gap-1 shrink-0"><ChevronRight className="w-4 h-4 text-white/30" /><button onClick={() => setCurrentFolder(bc.path)} className="text-white/60 hover:text-blue-400 transition-all">{bc.name}</button></span>))}
          </div>
          {/* Global search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => { setGlobalSearch(e.target.value); handleGlobalSearch(e.target.value); }}
              placeholder="全局搜索文件名..."
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
            />
            {showGlobalSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                {globalSearching ? (
                  <div className="p-4 text-center text-white/50"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
                ) : globalSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-white/50">未找到匹配文件</div>
                ) : (
                  globalSearchResults.map(file => (
                    <button
                      key={file.id}
                      onClick={() => { setShowGlobalSearch(false); setGlobalSearch(''); if (isPreviewable(file.type)) openPreview(file); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-all text-left"
                    >
                      {isImageType(file.type) && thumbnails[file.id] ? (
                        <img src={thumbnails[file.id]} alt={file.filename} className="w-10 h-10 rounded-lg object-cover" />
                      ) : getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{file.filename}</p>
                        <p className="text-white/40 text-xs">{file.folder || '根目录'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {/* Current folder search */}
          <div className="relative max-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="当前文件夹..." className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all">{viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}</button>
            <button onClick={fetchFiles} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all"><RefreshCw className="w-5 h-5" /></button>
            <button onClick={() => setShowNewFolder(true)} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all" title="新建文件夹"><FolderPlus className="w-5 h-5" /></button>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium cursor-pointer transition-all"><Upload className="w-4 h-4" /><span className="hidden sm:inline">上传</span><input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} /></label>
          </div>
        </header>

        {/* Batch action bar */}
        {(selectedFiles.size > 0 || selectedFolders.size > 0) && (
          <div className="px-4 md:px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-3 flex-wrap">
            <span className="text-blue-400 text-sm font-medium">已选择 {selectedFiles.size} 个文件, {selectedFolders.size} 个文件夹</span>
            <button onClick={() => { fetchAllFolders(); setMoveDialog({ fileIds: [...selectedFiles], folderIds: [...selectedFolders] }); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 text-sm transition-all flex items-center gap-2"><Move className="w-4 h-4" /> 移动到</button>
            <button onClick={() => { setBatchShareFiles(filteredFiles.filter(f => selectedFiles.has(f.id))); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 text-sm transition-all flex items-center gap-2"><Share2 className="w-4 h-4" /> 批量分享</button>
            <button onClick={handleBatchDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm transition-all flex items-center gap-2"><Trash2 className="w-4 h-4" /> 批量删除</button>
            <button onClick={() => { setSelectedFiles(new Set()); setSelectedFolders(new Set()); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/40 text-sm transition-all">取消选择</button>
          </div>
        )}

        {/* New folder / rename dialogs */}
        {showNewFolder && (
          <div className="px-4 md:px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} placeholder="文件夹名称" className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all" autoFocus />
            <button onClick={handleCreateFolder} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all">创建</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/60 transition-all">取消</button>
          </div>
        )}
        {(renamingFile || renamingFolder) && (
          <div className="px-4 md:px-6 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-3">
            <Pencil className="w-5 h-5 text-yellow-400" />
            <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} placeholder={renamingFolder ? '新文件夹名' : '新文件名'} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 transition-all" autoFocus />
            <button onClick={handleRename} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-xl text-white font-medium transition-all">确认</button>
            <button onClick={() => { setRenamingFile(null); setRenamingFolder(null); setRenameValue(''); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/60 transition-all">取消</button>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (<div className="px-4 md:px-6 py-3 bg-blue-500/10 border-b border-blue-500/20"><div className="flex items-center gap-3"><Upload className="w-5 h-5 text-blue-400 animate-bounce" /><span className="text-blue-400 text-sm">上传中... {uploadProgress}%</span><div className="flex-1 bg-white/10 rounded-full h-2"><div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${uploadProgress}%` }} /></div></div></div>)}

        {/* Drag overlay */}
        {dragOver && (<div className="absolute inset-0 z-30 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center"><div className="bg-white/10 rounded-2xl p-8 border border-blue-400/30"><Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" /><p className="text-white text-lg font-medium">拖拽文件到此处上传</p></div></div>)}

        {/* File list */}
        <div
          ref={fileListRef}
          className="flex-1 p-4 md:p-6 relative select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Selection box */}
          {selectionBox?.active && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400/20 z-40 pointer-events-none"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
              }}
            />
          )}
          {loading ? (<div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 text-blue-400 animate-spin" /></div>) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-white/40"><Folder className="w-16 h-16 mb-4" /><p className="text-lg">暂无文件</p><p className="text-sm">点击上传按钮或拖拽文件到此处</p></div>) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFolders.map(folder => (
                <div key={folder.id} data-id={folder.id} data-type="folder" className={`folder-item group relative rounded-xl p-4 border transition-all cursor-pointer ${selectedFolders.has(folder.id) ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : dragTargetFolder === folder.path ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/30'}`} draggable onDragStart={(e) => { e.dataTransfer.setData('folderId', folder.id); e.dataTransfer.setData('folderPath', folder.path); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => { if (menuFile !== folder.id && !selectedFolders.has(folder.id)) setCurrentFolder(folder.path); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolder(folder.path); }} onDragLeave={() => setDragTargetFolder(null)} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolder(null); const fileId = e.dataTransfer.getData('fileId'); const folderId = e.dataTransfer.getData('folderId'); const dropPath = folder.path; if (fileId) handleMoveFile(fileId, dropPath); else if (folderId) { const srcPath = e.dataTransfer.getData('folderPath'); if (srcPath !== dropPath && !dropPath.startsWith(srcPath + '/')) { fetch('/api/folders/move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: folderId, targetParent: dropPath }) }).then(res => { if (res.ok) fetchFiles(); else res.json().then(d => alert(d.error || '移动失败')); }); } } }}>
                  {selectedFolders.has(folder.id) && <div className="absolute top-2 left-2 z-10"><CheckSquare className="w-4 h-4 text-blue-400" /></div>}
                  <div className="absolute top-2 right-2 z-10" onMouseLeave={() => setMenuFile(null)}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuFile(folder.id); }} className="p-1 rounded-lg text-white/0 group-hover:text-white/40 hover:text-white hover:bg-white/10 transition-all"><MoreVertical className="w-4 h-4" /></button>
                    {menuFile === folder.id && (<div className="absolute top-6 right-0 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-20 py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setMenuFile(null); setRenamingFolder(folder); setRenameValue(folder.name); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-all"><Pencil className="w-4 h-4" /> 重命名</button>
                      <button onClick={() => { setMenuFile(null); fetchAllFolders(); setMoveDialog({ fileIds: [], folderIds: [folder.id] }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-all"><Move className="w-4 h-4" /> 移动到</button>
                      <button onClick={() => { setMenuFile(null); handleDeleteFolder(folder.id, folder.name); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /> 删除</button>
                    </div>)}
                  </div>
                  <div className="flex justify-center mb-3"><Folder className="w-8 h-8 text-blue-400" /></div>
                  <ScrollableFilename name={folder.name} className="text-white text-sm font-medium mb-1" />
                  <p className="text-white/40 text-xs">文件夹</p>
                </div>
              ))}
              {filteredFiles.map(file => (
                <div key={file.id} data-id={file.id} data-type="file" className={`file-item group relative rounded-xl p-4 border transition-all cursor-pointer ${selectedFiles.has(file.id) ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/30'}`} draggable onDragStart={(e) => { e.dataTransfer.setData('fileId', file.id); e.dataTransfer.effectAllowed = 'move'; }} onClick={(e) => handleFileClick(e, file)}>
                  {selectedFiles.has(file.id) && <div className="absolute top-2 left-2 z-10"><CheckSquare className="w-4 h-4 text-blue-400" /></div>}
                  <div className="absolute top-2 right-2 z-10" onMouseLeave={() => setMenuFile(null)}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuFile(file.id); }} className="p-1 rounded-lg text-white/0 group-hover:text-white/40 hover:text-white hover:bg-white/10 transition-all"><MoreVertical className="w-4 h-4" /></button>
                    {menuFile === file.id && (<div className="absolute top-6 right-0 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-20 py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setMenuFile(null); handleDownload(file.oss_key); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20 transition-all"><Download className="w-4 h-4" /> 下载</button>
                      <button onClick={async () => { setMenuFile(null); try { const res = await fetch(`/api/files/permanent-url/${file.id}`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); await navigator.clipboard.writeText(d.permanent_url); alert('永久链接已复制: ' + d.permanent_url); } } catch {} }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/20 transition-all"><Link className="w-4 h-4" /> 永久链接</button>
                      <button onClick={() => { setMenuFile(null); fetchAllFolders(); setMoveDialog({ fileIds: [file.id], folderIds: [] }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-all"><Move className="w-4 h-4" /> 移动到</button>
                      <button onClick={() => { setMenuFile(null); setShareFile(file); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/20 transition-all"><Share2 className="w-4 h-4" /> 分享</button>
                      <button onClick={() => { setMenuFile(null); setRenamingFile(file); setRenameValue(file.filename); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-all"><Pencil className="w-4 h-4" /> 重命名</button>
                      <button onClick={() => { setMenuFile(null); handleDelete(file.id, file.oss_key); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /> 删除</button>
                    </div>)}
                  </div>
                  <div className="flex justify-center mb-3">{isImageType(file.type) && thumbnails[file.id] ? (<img src={thumbnails[file.id]} alt={file.filename} className="w-16 h-16 rounded-lg object-cover" />) : (getFileIcon(file.type))}</div>
                  <ScrollableFilename name={file.filename} className="text-white text-sm font-medium mb-1" />
                  <p className="text-white/40 text-xs">{formatSize(file.size)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFolders.map(folder => (
                <div key={folder.id} data-id={folder.id} data-type="folder" className={`folder-item group relative flex items-center gap-4 rounded-xl px-4 py-3 border transition-all cursor-pointer ${selectedFolders.has(folder.id) ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : dragTargetFolder === folder.path ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/30'}`} draggable onDragStart={(e) => { e.dataTransfer.setData('folderId', folder.id); e.dataTransfer.setData('folderPath', folder.path); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => { if (menuFile !== folder.id && !selectedFolders.has(folder.id)) setCurrentFolder(folder.path); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolder(folder.path); }} onDragLeave={() => setDragTargetFolder(null)} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragTargetFolder(null); const fileId = e.dataTransfer.getData('fileId'); const folderId = e.dataTransfer.getData('folderId'); const dropPath = folder.path; if (fileId) handleMoveFile(fileId, dropPath); else if (folderId) { const srcPath = e.dataTransfer.getData('folderPath'); if (srcPath !== dropPath && !dropPath.startsWith(srcPath + '/')) { fetch('/api/folders/move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: folderId, targetParent: dropPath }) }).then(res => { if (res.ok) fetchFiles(); else res.json().then(d => alert(d.error || '移动失败')); }); } } }}>
                  {selectedFolders.has(folder.id) ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5 text-white/0 group-hover:text-white/20 transition-all" />}
                  <Folder className="w-8 h-8 text-blue-400" />
                  <div className="flex-1 min-w-0"><ScrollableFilename name={folder.name} className="text-white text-sm font-medium" /><p className="text-white/40 text-xs">文件夹</p></div>
                  <div className="relative" onMouseLeave={() => setMenuFile(null)}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuFile(folder.id); }} className="p-1 rounded-lg text-white/0 group-hover:text-white/40 hover:text-white hover:bg-white/10 transition-all"><MoreVertical className="w-4 h-4" /></button>
                    {menuFile === folder.id && (<div className="absolute right-0 top-6 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-20 py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setMenuFile(null); setRenamingFolder(folder); setRenameValue(folder.name); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-all"><Pencil className="w-4 h-4" /> 重命名</button>
                      <button onClick={() => { setMenuFile(null); fetchAllFolders(); setMoveDialog({ fileIds: [], folderIds: [folder.id] }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-all"><Move className="w-4 h-4" /> 移动到</button>
                      <button onClick={() => { setMenuFile(null); handleDeleteFolder(folder.id, folder.name); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /> 删除</button>
                    </div>)}
                  </div>
                </div>
              ))}
              {filteredFiles.map(file => (
                <div key={file.id} data-id={file.id} data-type="file" className={`file-item group relative flex items-center gap-4 rounded-xl px-4 py-3 border transition-all cursor-pointer ${selectedFiles.has(file.id) ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/30'}`} draggable onDragStart={(e) => { e.dataTransfer.setData('fileId', file.id); e.dataTransfer.effectAllowed = 'move'; }} onClick={(e) => handleFileClick(e, file)}>
                  {selectedFiles.has(file.id) ? <CheckSquare className="w-5 h-5 text-blue-400" /> : <Square className="w-5 h-5 text-white/0 group-hover:text-white/20 transition-all" />}
                  {isImageType(file.type) && thumbnails[file.id] ? (<img src={thumbnails[file.id]} alt={file.filename} className="w-10 h-10 rounded-lg object-cover" />) : (getFileIcon(file.type))}
                  <div className="flex-1 min-w-0"><ScrollableFilename name={file.filename} className="text-white text-sm font-medium" /><p className="text-white/40 text-xs">{formatSize(file.size)} · {formatDate(file.created_at)}</p></div>
                  <div className="relative" onMouseLeave={() => setMenuFile(null)}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuFile(file.id); }} className="p-1 rounded-lg text-white/0 group-hover:text-white/40 hover:text-white hover:bg-white/10 transition-all"><MoreVertical className="w-4 h-4" /></button>
                    {menuFile === file.id && (<div className="absolute right-0 top-6 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-20 py-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setMenuFile(null); handleDownload(file.oss_key); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20 transition-all"><Download className="w-4 h-4" /> 下载</button>
                      <button onClick={async () => { setMenuFile(null); try { const res = await fetch(`/api/files/permanent-url/${file.id}`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const d = await res.json(); await navigator.clipboard.writeText(d.permanent_url); alert('永久链接已复制: ' + d.permanent_url); } } catch {} }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/20 transition-all"><Link className="w-4 h-4" /> 永久链接</button>
                      <button onClick={() => { setMenuFile(null); fetchAllFolders(); setMoveDialog({ fileIds: [file.id], folderIds: [] }); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-all"><Move className="w-4 h-4" /> 移动到</button>
                      <button onClick={() => { setMenuFile(null); setShareFile(file); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-blue-500/20 transition-all"><Share2 className="w-4 h-4" /> 分享</button>
                      <button onClick={() => { setMenuFile(null); setRenamingFile(file); setRenameValue(file.filename); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-all"><Pencil className="w-4 h-4" /> 重命名</button>
                      <button onClick={() => { setMenuFile(null); handleDelete(file.id, file.oss_key); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /> 删除</button>
                    </div>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 bg-white/5 backdrop-blur-xl border-t border-white/10 flex items-center justify-around py-3">
          <button onClick={() => setCurrentFolder('')} className="flex flex-col items-center gap-1 text-blue-400"><Folder className="w-5 h-5" /><span className="text-xs">文件</span></button>
          <label className="flex flex-col items-center gap-1 text-white/60 cursor-pointer"><Upload className="w-5 h-5" /><span className="text-xs">上传</span><input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} /></label>
          <button onClick={() => setShowNewFolder(true)} className="flex flex-col items-center gap-1 text-white/60"><FolderPlus className="w-5 h-5" /><span className="text-xs">新建</span></button>
          <button onClick={() => window.location.href = '/share'} className="flex flex-col items-center gap-1 text-white/60"><Share2 className="w-5 h-5" /><span className="text-xs">分享</span></button>
        </nav>

        {/* Share dialog */}
        {shareFile && (<ShareDialog file={shareFile} token={token!} onClose={() => setShareFile(null)} />)}
        {batchShareFiles && batchShareFiles.length === 1 && (<ShareDialog file={batchShareFiles[0]} token={token!} onClose={() => setBatchShareFiles(null)} />)}
        {batchShareFiles && batchShareFiles.length > 1 && (
          <BatchShareDialog files={batchShareFiles} token={token!} onClose={() => setBatchShareFiles(null)} />
        )}

        {/* Move dialog */}
        {moveDialog && (
          <MoveDialog
            moveDialog={moveDialog}
            allFolders={allFolders}
            onMove={handleBatchMove}
            onClose={() => setMoveDialog(null)}
          />
        )}
      </main>
    </div>
  );
}