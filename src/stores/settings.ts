import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  ToolType,
  BrushSettings,
  Color,
  SelectionTool,
  ShapeType,
} from "@/types";

const RECENT_COLORS_KEY = "paint-app-recent-colors";
const MAX_RECENT_COLORS = 12;

function loadRecentColors(): Color[] {
  try {
    const saved = localStorage.getItem(RECENT_COLORS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRecentColors(colors: Color[]): void {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

export const useSettingsStore = defineStore("settings", () => {
  const currentTool = ref<ToolType>("brush");
  const selectionTool = ref<SelectionTool>("rectangle");
  const shapeTool = ref<ShapeType>("rectangle");
  const shapeStrokeColor = ref<Color>({ r: 0, g: 0, b: 0, a: 1 });
  const shapeFillColor = ref<Color>({ r: 0, g: 0, b: 0, a: 0 });
  const shapeLineWidth = ref(2);
  const isFullscreen = ref(false);

  const brushSettings = ref<BrushSettings>({
    type: "hard-edge",
    size: 20,
    hardness: 100,
    flow: 80,
    spacing: 25,
    pressureCurve: 50,
    color: { r: 0, g: 0, b: 0, a: 1 },
  });

  const foregroundColor = ref<Color>({ r: 0, g: 0, b: 0, a: 1 });
  const backgroundColor = ref<Color>({ r: 255, g: 255, b: 255, a: 1 });
  const recentColors = ref<Color[]>(loadRecentColors());
  const selectionTolerance = ref(32);

  function setTool(tool: ToolType): void {
    currentTool.value = tool;
  }

  function setSelectionTool(tool: SelectionTool): void {
    selectionTool.value = tool;
    currentTool.value = "selection";
  }

  function setShapeTool(tool: ShapeType): void {
    shapeTool.value = tool;
    currentTool.value = "shape";
  }

  function setShapeStrokeColor(color: Color): void {
    shapeStrokeColor.value = { ...color };
  }

  function setShapeFillColor(color: Color): void {
    shapeFillColor.value = { ...color };
  }

  function setShapeLineWidth(width: number): void {
    shapeLineWidth.value = Math.max(1, Math.min(50, width));
  }

  function setBrushType(type: BrushSettings["type"]): void {
    brushSettings.value.type = type;
    if (type === "eraser") {
      currentTool.value = "eraser";
    } else {
      currentTool.value = "brush";
    }
  }

  function setBrushSize(size: number): void {
    brushSettings.value.size = Math.max(1, Math.min(500, size));
  }

  function setBrushHardness(hardness: number): void {
    brushSettings.value.hardness = Math.max(0, Math.min(100, hardness));
  }

  function setBrushFlow(flow: number): void {
    brushSettings.value.flow = Math.max(1, Math.min(100, flow));
  }

  function setBrushSpacing(spacing: number): void {
    brushSettings.value.spacing = Math.max(1, Math.min(100, spacing));
  }

  function setPressureCurve(curve: number): void {
    brushSettings.value.pressureCurve = Math.max(0, Math.min(100, curve));
  }

  function setForegroundColor(color: Color): void {
    foregroundColor.value = { ...color };
    brushSettings.value.color = { ...color };
    addRecentColor(color);
  }

  function setBackgroundColor(color: Color): void {
    backgroundColor.value = { ...color };
  }

  function swapColors(): void {
    const temp = { ...foregroundColor.value };
    foregroundColor.value = { ...backgroundColor.value };
    backgroundColor.value = temp;
    brushSettings.value.color = { ...foregroundColor.value };
  }

  function addRecentColor(color: Color): void {
    const exists = recentColors.value.some(
      (c) =>
        c.r === color.r &&
        c.g === color.g &&
        c.b === color.b &&
        c.a === color.a,
    );
    if (exists) return;

    recentColors.value.unshift({ ...color });
    if (recentColors.value.length > MAX_RECENT_COLORS) {
      recentColors.value.pop();
    }
    saveRecentColors(recentColors.value);
  }

  function setSelectionTolerance(tolerance: number): void {
    selectionTolerance.value = Math.max(0, Math.min(100, tolerance));
  }

  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        isFullscreen.value = false;
      });
      isFullscreen.value = true;
    } else {
      document.exitFullscreen().catch(() => {
        isFullscreen.value = true;
      });
      isFullscreen.value = false;
    }
  }

  return {
    currentTool,
    selectionTool,
    shapeTool,
    shapeStrokeColor,
    shapeFillColor,
    shapeLineWidth,
    isFullscreen,
    brushSettings,
    foregroundColor,
    backgroundColor,
    recentColors,
    selectionTolerance,
    setTool,
    setSelectionTool,
    setShapeTool,
    setShapeStrokeColor,
    setShapeFillColor,
    setShapeLineWidth,
    setBrushType,
    setBrushSize,
    setBrushHardness,
    setBrushFlow,
    setBrushSpacing,
    setPressureCurve,
    setForegroundColor,
    setBackgroundColor,
    swapColors,
    addRecentColor,
    setSelectionTolerance,
    toggleFullscreen,
  };
});
