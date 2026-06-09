import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  GitCompareArrows,
  Layers,
  Image as ImageIcon,
  Percent,
  Eye,
} from 'lucide-react';
import type { IconVersionWithData, VersionDiffResult } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDate, cn } from '@/utils';
import { formatVersionChangeType } from '@/utils/version';
import { useToast } from '@/components/Toast';

type ViewMode = 'side-by-side' | 'overlay' | 'diff';

interface Props {
  versionIdA: string;
  versionIdB: string;
  onClose: () => void;
}

export default function VersionCompareModal({ versionIdA, versionIdB, onClose }: Props) {
  const toast = useToast();
  const { diffVersions, getIconVersionWithData } = useAppStore();

  const [versionA, setVersionA] = useState<IconVersionWithData | null>(null);
  const [versionB, setVersionB] = useState<IconVersionWithData | null>(null);
  const [diff, setDiff] = useState<VersionDiffResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [va, vb] = await Promise.all([
          getIconVersionWithData(versionIdA),
          getIconVersionWithData(versionIdB),
        ]);
        if (!va || !vb) {
          toast.showError('版本数据加载失败');
          onClose();
          return;
        }
        setVersionA(va);
        setVersionB(vb);
        const diffResult = await diffVersions(versionIdA, versionIdB);
        setDiff(diffResult);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [versionIdA, versionIdB, getIconVersionWithData, diffVersions, toast, onClose]);

  const VersionCard = ({ v, label, color }: { v: IconVersionWithData; label: string; color: 'cyan' | 'amber' }) => (
    <div className="bg-ink-800/40 border border-ink-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-ink-950',
            color === 'cyan' ? 'bg-neon-cyan' : 'bg-neon-amber'
          )}>
            {label}
          </span>
          <span className="font-mono text-sm font-semibold text-white">v{v.version}</span>
          <span className={cn(
            'chip text-[10px]',
            v.changeType === 'replace' && 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20',
            v.changeType === 'edit' && 'bg-neon-amber/10 text-neon-amber border border-neon-amber/20',
            v.changeType === 'rollback' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          )}>
            {formatVersionChangeType(v.changeType)}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-slate-500 mb-2">{formatDate(v.createdAt)}</div>
      <div className="aspect-square checkerboard bg-ink-900 rounded-md overflow-hidden flex items-center justify-center border border-ink-700">
        <img src={v.dataUrl} alt={`v${v.version}`} className="max-w-full max-h-full object-contain" />
      </div>
      <div className="mt-2 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>{v.width}×{v.height}</span>
        <span className="truncate ml-2">{v.name}</span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-900 border border-ink-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-ink-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center">
              <GitCompareArrows className="w-5 h-5 text-neon-amber" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">版本对比</h2>
              {versionA && versionB && (
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">v{versionA.version}</span>
                  <span>→</span>
                  <span className="font-mono">v{versionB.version}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn !p-2">
            <X className="w-4 h-4" />
          </button>
        </header>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-neon-cyan" />
            <div className="text-sm">正在对比版本...</div>
          </div>
        ) : versionA && versionB ? (
          <>
            <div className="px-6 py-3 border-b border-ink-700/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-ink-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={cn(
                    'btn !py-1.5 !px-3 text-xs flex items-center gap-1.5',
                    viewMode === 'side-by-side' ? 'btn-primary' : 'btn-ghost'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  并排对比
                </button>
                <button
                  onClick={() => setViewMode('overlay')}
                  className={cn(
                    'btn !py-1.5 !px-3 text-xs flex items-center gap-1.5',
                    viewMode === 'overlay' ? 'btn-primary' : 'btn-ghost'
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  叠加对比
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={cn(
                    'btn !py-1.5 !px-3 text-xs flex items-center gap-1.5',
                    viewMode === 'diff' ? 'btn-primary' : 'btn-ghost'
                  )}
                >
                  <Percent className="w-3.5 h-3.5" />
                  差异视图
                </button>
              </div>

              {diff && (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-slate-500">变化像素：</span>
                    <span className="text-rose-400 font-mono font-semibold">{diff.changedPixels.toLocaleString()}</span>
                    <span className="text-slate-600"> / {diff.totalPixels.toLocaleString()}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-500">变化率：</span>
                    <span className={cn(
                      'font-mono font-semibold',
                      diff.changePercent > 50 ? 'text-rose-400' : diff.changePercent > 10 ? 'text-neon-amber' : 'text-neon-cyan'
                    )}>
                      {diff.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-6 bg-ink-950/30">
              {viewMode === 'side-by-side' && (
                <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <VersionCard v={versionA} label="A" color="cyan" />
                  <VersionCard v={versionB} label="B" color="amber" />
                </div>
              )}

              {viewMode === 'overlay' && (
                <div className="max-w-3xl mx-auto">
                  <div className="mb-4 flex items-center gap-3 justify-center">
                    <span className="text-xs text-slate-500">B 版本透明度</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-64 accent-neon-cyan"
                    />
                    <span className="text-xs text-neon-cyan font-mono w-10">{overlayOpacity}%</span>
                  </div>
                  <div className="relative aspect-square checkerboard bg-ink-900 rounded-xl overflow-hidden border border-ink-700 mx-auto" style={{ maxWidth: 600 }}>
                    <img
                      src={versionA.dataUrl}
                      alt="A"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <img
                      src={versionB.dataUrl}
                      alt="B"
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ opacity: overlayOpacity / 100 }}
                    />
                    <div className="absolute top-3 left-3 w-6 h-6 rounded bg-neon-cyan flex items-center justify-center text-xs font-bold text-ink-950">
                      A
                    </div>
                    <div
                      className="absolute top-3 right-3 w-6 h-6 rounded bg-neon-amber flex items-center justify-center text-xs font-bold text-ink-950"
                      style={{ opacity: overlayOpacity / 100 }}
                    >
                      B
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'diff' && diff && (
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      玫红色高亮为差异像素
                    </span>
                  </div>
                  <div className="relative aspect-square checkerboard bg-ink-900 rounded-xl overflow-hidden border border-ink-700 mx-auto" style={{ maxWidth: 600 }}>
                    <img
                      src={diff.diffDataUrl}
                      alt="diff"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-4 text-center text-xs text-slate-500 font-mono">
                    画布尺寸: {diff.width}×{diff.height}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
            <div className="text-sm">无法加载版本数据</div>
          </div>
        )}
      </div>
    </div>
  );
}
