import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Pencil,
  History,
  RotateCcw,
  GitCompareArrows,
  Check,
  Loader2,
  Image as ImageIcon,
  Calendar,
  ChevronRight,
  Hash,
} from 'lucide-react';
import type { IconItem, IconVersion } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDate, cn, createIconItemFromFile } from '@/utils';
import { formatVersionChangeType } from '@/utils/version';
import { useToast } from '@/components/Toast';
import VersionCompareModal from './VersionCompareModal';

interface Props {
  icon: IconItem;
  onClose: () => void;
  onUpdated?: (updated: IconItem) => void;
}

export default function IconDetailModal({ icon, onClose, onUpdated }: Props) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentIcon, setCurrentIcon] = useState<IconItem>(icon);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(icon.name);
  const [versions, setVersions] = useState<IconVersion[]>([]);
  const [versionThumbnails, setVersionThumbnails] = useState<Map<string, string>>(new Map());
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareSelection, setCompareSelection] = useState<[string | null, string | null]>([null, null]);

  const {
    renameIcon,
    getIconVersionList,
    getIconVersionWithData,
    updateIconData,
    createIconVersion,
    rollbackToVersion,
  } = useAppStore();

  const loadVersions = useCallback(async () => {
    setIsLoadingVersions(true);
    try {
      const list = await getIconVersionList(currentIcon.id);
      setVersions(list);
      const thumbMap = new Map<string, string>();
      for (const v of list.slice(0, 20)) {
        const vd = await getIconVersionWithData(v.id);
        if (vd) thumbMap.set(v.id, vd.dataUrl);
      }
      setVersionThumbnails(thumbMap);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [currentIcon.id, getIconVersionList, getIconVersionWithData]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleSaveName = () => {
    if (!editingName.trim()) return;
    renameIcon(currentIcon.id, editingName.trim());
    setCurrentIcon((prev) => ({ ...prev, name: editingName.trim() }));
    setIsEditingName(false);
    toast.showSuccess('名称已更新');
  };

  const handleReplace = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      const newItem = await createIconItemFromFile(files[0]);
      const updated = await updateIconData(currentIcon.id, newItem.dataUrl, newItem.name);
      if (updated) {
        await createIconVersion(currentIcon.id, newItem.dataUrl, 'replace', `替换为 ${files[0].name}`);
        setCurrentIcon(updated);
        onUpdated?.(updated);
        loadVersions();
      }
    } catch {
      toast.showError('替换图标失败');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRollback = async (version: IconVersion) => {
    if (!confirm(`确定要回滚到版本 v${version.version} 吗？`)) return;
    setIsProcessing(true);
    try {
      const updated = await rollbackToVersion(currentIcon.id, version.id);
      if (updated) {
        setCurrentIcon(updated);
        onUpdated?.(updated);
        loadVersions();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCompareSelect = (versionId: string) => {
    setCompareSelection(([a, b]) => {
      if (a === versionId) return [null, b];
      if (b === versionId) return [a, null];
      if (!a) return [versionId, b];
      if (!b) return [a, versionId];
      return [versionId, null];
    });
  };

  const startCompare = () => {
    const [a, b] = compareSelection;
    if (a && b) setShowCompare(true);
  };

  const clearCompareSelection = () => setCompareSelection([null, null]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="px-6 py-4 border-b border-ink-700/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="input text-sm !py-1 !px-2 w-48"
                    />
                    <button onClick={handleSaveName} className="btn btn-primary !py-1 !px-2 text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditingName(currentIcon.name);
                      }}
                      className="btn btn-secondary !py-1 !px-2 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{currentIcon.name}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-300"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{currentIcon.width}×{currentIcon.height}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(currentIcon.addedAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="btn btn-primary !py-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                替换图标
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleReplace(e.target.files)}
              />
              <button onClick={onClose} className="btn-ghost btn !p-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 grid grid-cols-[1fr_380px] gap-0 overflow-hidden">
            <div className="flex flex-col min-h-0 border-r border-ink-700/50">
              <div className="flex-1 min-h-0 flex items-center justify-center p-8 bg-ink-950/50 checkerboard overflow-auto">
                <div className="relative">
                  {isProcessing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/70 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                    </div>
                  )}
                  <img
                    src={currentIcon.dataUrl}
                    alt={currentIcon.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
                  />
                </div>
              </div>
              <div className="px-6 py-3 border-t border-ink-700/50 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 font-mono">
                  <Hash className="w-3 h-3 inline mr-1" />
                  ID: {currentIcon.id}
                </div>
                <div className="text-xs text-slate-500">
                  原始文件名: {currentIcon.originalName}
                </div>
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-ink-700/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-neon-cyan" />
                  <h3 className="font-semibold text-sm text-white">版本历史</h3>
                  <span className="chip bg-ink-800 text-slate-400 border border-ink-600 text-[10px]">
                    {versions.length}
                  </span>
                </div>
                {(compareSelection[0] || compareSelection[1]) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">
                      已选 {[compareSelection[0], compareSelection[1]].filter(Boolean).length}/2
                    </span>
                    {compareSelection[0] && compareSelection[1] && (
                      <button onClick={startCompare} className="btn btn-primary !py-1 !px-2 text-xs">
                        <GitCompareArrows className="w-3 h-3" />
                        对比
                      </button>
                    )}
                    <button onClick={clearCompareSelection} className="btn-ghost btn !py-1 !px-2 text-xs">
                      清除
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                {isLoadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-neon-cyan" />
                    <div className="text-xs">加载版本历史...</div>
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-center">
                    <History className="w-10 h-10 mb-2 opacity-30" />
                    <div className="text-sm">暂无历史版本</div>
                    <div className="text-xs mt-1">替换或编辑图标后会自动保存版本</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v, idx) => {
                      const thumb = versionThumbnails.get(v.id);
                      const selectedA = compareSelection[0] === v.id;
                      const selectedB = compareSelection[1] === v.id;
                      const isSelected = selectedA || selectedB;
                      return (
                        <div
                          key={v.id}
                          className={cn(
                            'group relative bg-ink-800/50 border rounded-lg overflow-hidden transition-all',
                            isSelected
                              ? 'border-neon-cyan ring-1 ring-neon-cyan/50'
                              : 'border-ink-700 hover:border-ink-600'
                          )}
                        >
                          <div className="flex gap-3 p-2.5">
                            <div
                              className="shrink-0 w-14 h-14 rounded-md bg-ink-900 border border-ink-700 overflow-hidden checkerboard flex items-center justify-center cursor-pointer"
                              onClick={() => toggleCompareSelect(v.id)}
                              title="点击选择用于对比"
                            >
                              {thumb ? (
                                <img src={thumb} alt="" className="max-w-full max-h-full object-contain" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-600" />
                              )}
                              {isSelected && (
                                <div className={cn(
                                  'absolute top-3 left-3 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-ink-950',
                                  selectedA ? 'bg-neon-cyan' : 'bg-neon-amber'
                                )}>
                                  {selectedA ? 'A' : 'B'}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-white">v{v.version}</span>
                                <span className={cn(
                                  'chip text-[10px]',
                                  v.changeType === 'replace' && 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20',
                                  v.changeType === 'edit' && 'bg-neon-amber/10 text-neon-amber border border-neon-amber/20',
                                  v.changeType === 'rollback' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                )}>
                                  {formatVersionChangeType(v.changeType)}
                                </span>
                                {idx === 0 && (
                                  <span className="chip bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 text-[10px]">
                                    当前
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(v.createdAt)}
                              </div>
                              {v.changeNote && (
                                <div className="text-[11px] text-slate-400 mt-1 truncate">{v.changeNote}</div>
                              )}
                              <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                                {v.width}×{v.height}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 shrink-0">
                              {idx !== 0 && (
                                <button
                                  onClick={() => handleRollback(v)}
                                  disabled={isProcessing}
                                  className="w-7 h-7 rounded hover:bg-neon-cyan/10 text-slate-500 hover:text-neon-cyan flex items-center justify-center transition-colors"
                                  title={`回滚到 v${v.version}`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-700 mt-auto" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-ink-700/50 shrink-0">
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  <div className="mb-1">💡 提示：点击版本缩略图可选择对比（选2个）</div>
                  <div>系统使用 SHA-256 内容哈希去重，相同内容不会重复存储</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCompare && compareSelection[0] && compareSelection[1] && (
        <VersionCompareModal
          versionIdA={compareSelection[0]}
          versionIdB={compareSelection[1]}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}
