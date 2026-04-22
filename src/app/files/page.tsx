'use client';

import { useAuth } from '@/components/AuthProvider';
import { useState, useEffect, useCallback } from 'react';
import {
  Folder, File, Image, FileText, Film, Music, Archive,
  Upload, Trash2, Share2, Search, LayoutGrid, List,
  LogOut, Cloud, Menu, X, RefreshCw, FolderPlus, ChevronRight, Eye, Download
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
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp3', 'wav', 'flac', 'aac'].includes(t);
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

export default function FilesPage() {
  const { token, logout } = useAuth();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareFile, setShareFile] = useState<FileInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

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

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    const imageFiles = files.filter(f => isImageType(f.type));
    if (imageFiles.length === 0) return;

    const loadThumbnails = async () => {
      const newThumbnails: Record<string, string> = {};
      for (const file of imageFiles) {
        try {
          const encodedKey = encodeURIComponent(file.oss_key);
          const res = await fetch(`/api/files/thumbnail/${encodedKey}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            newThumbnails[file.id] = data.thumbnail_url;
          }
        } catch {}
      }
      setThumbnails(prev => ({ ...prev, ...newThumbnails }));
    };

    loadThumbnails();
  }, [files, token]);

  const breadcrumbs = currentFolder
    ? currentFolder.split('/').map((name, i) => ({
        name,
        path: currentFolder.split('/').slice(0, i + 1).join('/'),
      }))
    : [];

  async function handleUpload(fileList: FileList | File[]) {
    if (!token) return;
    setUploading(true);
    setUploadProgress(0);
    const total = fileList.length;
    let completed = 0;

    for (const file of fileList) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', currentFolder);
      try {
        await fetch('/api/files/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      } catch (err) {
        console.error(err);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    fetchFiles();
  }

  async function handleDelete(id: string, ossKey: string) {
    if (!token || !confirm('确定删除此文件？')) return;
    try {
      const encodedKey = encodeURIComponent(ossKey);
      await fetch(`/api/files/${encodedKey}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteFolder(id: string, name: string) {
    if (!token || !confirm(`确定删除文件夹 "${name}" 及其所有内容？`)) return;
    try {
      await fetch('/api/folders', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setFolders(folders.filter(f => f.id !== id));
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateFolder() {
    if (!token || !newFolderName.trim()) return;
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parent: currentFolder }),
      });
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolder(false);
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  function openPreview(file: FileInfo) {
    const encodedKey = encodeURIComponent(file.oss_key);
    window.location.href = `/files/preview/${encodedKey}`;
  }

  async function handleDownload(ossKey: string) {
    if (!token) return;
    try {
      const encodedKey = encodeURIComponent(ossKey);
      const res = await fetch(`/api/files/download/${encodedKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.download_url;
      }
    } catch (err) {
      console.error(err);
    }
  }

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Sidebar - PC */}
      <aside className="hidden md:flex w-64 bg-white/5 border-r border-white/10 flex-col">
        <div className="p-6 flex items-center gap-3">
          <Cloud className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold text-white">我的网盘</span>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setCurrentFolder('')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${currentFolder === '' ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
            <Folder className="w-5 h-5" /> 全部文件
          </button>
          <button onClick={() => window.location.href = '/share'} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <Share2 className="w-5 h-5" /> 我的分享
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-red-400 transition-all">
            <LogOut className="w-5 h-5" /> 退出登录
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-white/10 flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold text-white">我的网盘</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white/60">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-2">
              <button onClick={() => { setCurrentFolder(''); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 font-medium">
                <Folder className="w-5 h-5" /> 全部文件
              </button>
              <button onClick={() => { window.location.href = '/share'; setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all">
                <Share2 className="w-5 h-5" /> 我的分享
              </button>
            </nav>
            <div className="p-4 border-t border-white/10">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/10 hover:text-red-400 transition-all">
                <LogOut className="w-5 h-5" /> 退出登录
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-white/60">
            <Menu className="w-6 h-6" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
            <button onClick={() => setCurrentFolder('')} className="text-white/60 hover:text-blue-400 transition-all shrink-0">
              根目录
            </button>
            {breadcrumbs.map((bc) => (
              <span key={bc.path} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-4 h-4 text-white/30" />
                <button onClick={() => setCurrentFolder(bc.path)} className="text-white/60 hover:text-blue-400 transition-all">
                  {bc.name}
                </button>
              </span>
            ))}
          </div>

          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all">
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </button>
            <button onClick={fetchFiles} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => setShowNewFolder(true)} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all" title="新建文件夹">
              <FolderPlus className="w-5 h-5" />
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">上传</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          </div>
        </header>

        {/* New folder dialog */}
        {showNewFolder && (
          <div className="px-4 md:px-6 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-3">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="文件夹名称"
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
              autoFocus
            />
            <button onClick={handleCreateFolder} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all">
              创建
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/60 transition-all">
              取消
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="px-4 md:px-6 py-3 bg-blue-500/10 border-b border-blue-500/20">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-blue-400 animate-bounce" />
              <span className="text-blue-400 text-sm">上传中... {uploadProgress}%</span>
              <div className="flex-1 bg-white/10 rounded-full h-2">
                <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-30 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white/10 rounded-2xl p-8 border border-blue-400/30">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <p className="text-white text-lg font-medium">拖拽文件到此处上传</p>
            </div>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/40">
              <Folder className="w-16 h-16 mb-4" />
              <p className="text-lg">暂无文件</p>
              <p className="text-sm">点击上传按钮或拖拽文件到此处</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Folders */}
              {filteredFolders.map(folder => (
                <div key={folder.id} className="group bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 hover:border-blue-400/30 transition-all cursor-pointer"
                  onClick={() => setCurrentFolder(folder.path)}>
                  <div className="flex justify-center mb-3">
                    <Folder className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-white text-sm font-medium truncate mb-1">{folder.name}</p>
                  <p className="text-white/40 text-xs">文件夹</p>
                  <div className="hidden group-hover:flex items-center justify-center gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Files */}
              {filteredFiles.map(file => (
                <div key={file.id} className="group bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 hover:border-blue-400/30 transition-all cursor-pointer"
                  onClick={() => isPreviewable(file.type) ? openPreview(file) : undefined}>
                  <div className="flex justify-center mb-3">
                    {isImageType(file.type) && thumbnails[file.id] ? (
                      <img src={thumbnails[file.id]} alt={file.filename} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  <p className="text-white text-sm font-medium truncate mb-1">{file.filename}</p>
                  <p className="text-white/40 text-xs">{formatSize(file.size)}</p>
                  <div className="hidden group-hover:flex items-center justify-center gap-2 mt-3">
                    {isPreviewable(file.type) && (
                      <button onClick={(e) => { e.stopPropagation(); openPreview(file); }} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all" title="预览">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file.oss_key); }} className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all" title="下载">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShareFile(file); }} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all" title="分享">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.oss_key); }} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Folders */}
              {filteredFolders.map(folder => (
                <div key={folder.id} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/10 hover:border-blue-400/30 transition-all cursor-pointer"
                  onClick={() => setCurrentFolder(folder.path)}>
                  <Folder className="w-8 h-8 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-white/40 text-xs">文件夹</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {/* Files */}
              {filteredFiles.map(file => (
                <div key={file.id} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 border border-white/10 hover:border-blue-400/30 transition-all cursor-pointer"
                  onClick={() => isPreviewable(file.type) ? openPreview(file) : undefined}>
                  {isImageType(file.type) && thumbnails[file.id] ? (
                    <img src={thumbnails[file.id]} alt={file.filename} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    getFileIcon(file.type)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-white/40 text-xs">{formatSize(file.size)} · {formatDate(file.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPreviewable(file.type) && (
                      <button onClick={(e) => { e.stopPropagation(); openPreview(file); }} className="p-2 rounded-lg text-white/40 hover:text-green-400 hover:bg-green-500/20 transition-all" title="预览">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file.oss_key); }} className="p-2 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-cyan-500/20 transition-all" title="下载">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShareFile(file); }} className="p-2 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-500/20 transition-all" title="分享">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id, file.oss_key); }} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 bg-white/5 backdrop-blur-xl border-t border-white/10 flex items-center justify-around py-3">
          <button onClick={() => setCurrentFolder('')} className="flex flex-col items-center gap-1 text-blue-400">
            <Folder className="w-5 h-5" />
            <span className="text-xs">文件</span>
          </button>
          <label className="flex flex-col items-center gap-1 text-white/60 cursor-pointer">
            <Upload className="w-5 h-5" />
            <span className="text-xs">上传</span>
            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          </label>
          <button onClick={() => setShowNewFolder(true)} className="flex flex-col items-center gap-1 text-white/60">
            <FolderPlus className="w-5 h-5" />
            <span className="text-xs">新建</span>
          </button>
          <button onClick={() => window.location.href = '/share'} className="flex flex-col items-center gap-1 text-white/60">
            <Share2 className="w-5 h-5" />
            <span className="text-xs">分享</span>
          </button>
        </nav>

        {/* Share dialog */}
        {shareFile && (
          <ShareDialog
            file={shareFile}
            token={token!}
            onClose={() => setShareFile(null)}
          />
        )}
      </main>
    </div>
  );
}