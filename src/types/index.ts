export interface IconMeta {
  id: string;
  name: string;
  originalName: string;
  width: number;
  height: number;
  addedAt: number;
}

export interface IconItem extends IconMeta {
  dataUrl: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  iconIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SpriteConfig {
  columns: number;
  spacing: number;
  bgColor: string;
  classPrefix: string;
  retina: boolean;
}

export interface IconPosition {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteResult {
  imageDataUrl: string;
  cssCode: string;
  scssCode: string;
  iconPositions: IconPosition[];
  totalWidth: number;
  totalHeight: number;
  cellWidth: number;
  cellHeight: number;
}

export interface SplitConfig {
  rows: number;
  columns: number;
  iconWidth: number;
  iconHeight: number;
  spacing: number;
  padding: number;
}

export interface SplitIcon {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

export type VersionChangeType = 'replace' | 'edit' | 'rollback';

export interface IconVersion {
  id: string;
  iconId: string;
  version: number;
  contentHash: string;
  name: string;
  width: number;
  height: number;
  changeType: VersionChangeType;
  changeNote?: string;
  createdAt: number;
  parentVersionId?: string;
}

export interface IconVersionWithData extends IconVersion {
  dataUrl: string;
}

export interface VersionDiffResult {
  versionA: IconVersion;
  versionB: IconVersion;
  diffDataUrl: string;
  changedPixels: number;
  totalPixels: number;
  changePercent: number;
  width: number;
  height: number;
}

export interface ContentBlobRecord {
  hash: string;
  blob: Blob;
  refCount: number;
  createdAt: number;
}
