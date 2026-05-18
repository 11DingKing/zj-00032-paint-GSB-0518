export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export type BrushType =
  | "hard-edge"
  | "soft-edge"
  | "airbrush"
  | "marker"
  | "watercolor"
  | "pencil"
  | "crayon"
  | "eraser"
  | "smudge"
  | "blur";

export type SelectionTool = "rectangle" | "ellipse" | "lasso" | "magic-wand";

export type ShapeTool = "rectangle" | "ellipse" | "line";

export type ToolType =
  | "brush"
  | "eraser"
  | "fill"
  | "selection"
  | "transform"
  | "eyedropper"
  | "shape";

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface BrushSettings {
  type: BrushType;
  size: number;
  hardness: number;
  flow: number;
  spacing: number;
  pressureCurve: number;
  color: Color;
}

export interface Layer {
  id: string;
  name: string;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  bitmapData: ImageData | null;
  maskEnabled: boolean;
  maskData: ImageData | null;
  x: number;
  y: number;
}

export interface Selection {
  type: SelectionTool;
  path: Path2D;
  pixels: Uint8ClampedArray | null;
  bounds: { x: number; y: number; width: number; height: number };
  tolerance: number;
}

export interface TransformState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface HistoryStep {
  id: string;
  timestamp: number;
  layerId: string;
  dirtyRect: { x: number; y: number; width: number; height: number };
  beforeData: ImageData;
  afterData: ImageData;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  thumbnail: string;
  width: number;
  height: number;
  dpi: number;
  createdAt: number;
  updatedAt: number;
}

export interface Project extends ProjectMetadata {
  layers: Layer[];
  currentLayerId: string;
  background: Color;
  history: HistoryStep[];
  historyIndex: number;
  selection: Selection | null;
}

export interface PresetSize {
  name: string;
  width: number;
  height: number;
  dpi: number;
}

export const PRESET_SIZES: PresetSize[] = [
  { name: "手机 (1080x1920)", width: 1080, height: 1920, dpi: 326 },
  { name: "A4 (2480x3508)", width: 2480, height: 3508, dpi: 300 },
  { name: "正方形 (1000x1000)", width: 1000, height: 1000, dpi: 72 },
  { name: "正方形 (2048x2048)", width: 2048, height: 2048, dpi: 72 },
  { name: "HD (1920x1080)", width: 1920, height: 1080, dpi: 72 },
];
