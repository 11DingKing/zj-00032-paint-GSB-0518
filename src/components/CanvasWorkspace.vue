<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import { cloneImageData, createCanvas, colorToString } from "@/utils/canvas";
import {
  drawBrushLine,
  drawBrushDab,
  applyBlur,
  applySmudge,
  calculatePressureFromSpeed,
  floodFill,
} from "@/utils/brushes";
import type { ToolType } from "@/types";

const projectStore = useProjectStore();
const settingsStore = useSettingsStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const overlayCanvasRef = ref<HTMLCanvasElement | null>(null);

const isDrawing = ref(false);
const lastX = ref(0);
const lastY = ref(0);
const lastMoveTime = ref(0);
const lastPressure = ref(1);
const strokeStartData = ref<ImageData | null>(null);
const isAltPressed = ref(false);
const tempTool = ref<ToolType | null>(null);

const selectionStartX = ref(0);
const selectionStartY = ref(0);
const selectionPoints = ref<Array<{ x: number; y: number }>>([]);
const isSelecting = ref(false);

const shapeStartX = ref(0);
const shapeStartY = ref(0);
const shapeCurrentX = ref(0);
const shapeCurrentY = ref(0);
const isDrawingShape = ref(false);

const project = computed(() => projectStore.currentProject);
const currentLayer = computed(() => projectStore.currentLayer);

function renderCanvas() {
  const canvas = canvasRef.value;
  if (!canvas || !project.value) return;

  const ctx = canvas.getContext("2d")!;
  const p = project.value;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = colorToString(p.background);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const layer of p.layers) {
    if (!layer.visible || !layer.bitmapData) continue;

    const tempCanvas = createCanvas(p.width, p.height);
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(layer.bitmapData, 0, 0);

    if (layer.maskEnabled && layer.maskData) {
      const maskCanvas = createCanvas(p.width, p.height);
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.putImageData(layer.maskData, 0, 0);
      tempCtx.globalCompositeOperation = "destination-in";
      tempCtx.drawImage(maskCanvas, 0, 0);
    }

    ctx.globalCompositeOperation =
      layer.blendMode === "normal" ? "source-over" : layer.blendMode;
    ctx.globalAlpha = layer.opacity / 100;
    ctx.drawImage(tempCanvas, layer.x, layer.y);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function renderOverlay() {
  const overlay = overlayCanvasRef.value;
  if (!overlay || !project.value) return;

  const ctx = overlay.getContext("2d")!;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (isSelecting.value) {
    ctx.strokeStyle = "#4a9eff";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    if (
      settingsStore.selectionTool === "lasso" &&
      selectionPoints.value.length > 1
    ) {
      ctx.beginPath();
      ctx.moveTo(selectionPoints.value[0].x, selectionPoints.value[0].y);
      for (let i = 1; i < selectionPoints.value.length; i++) {
        ctx.lineTo(selectionPoints.value[i].x, selectionPoints.value[i].y);
      }
      ctx.stroke();
    }
  }

  if (isDrawingShape.value && settingsStore.currentTool === "shape") {
    drawShapePreview(ctx);
  }

  if (
    !isDrawing.value &&
    !isDrawingShape.value &&
    (settingsStore.currentTool === "brush" ||
      settingsStore.currentTool === "eraser" ||
      settingsStore.brushSettings.type === "blur" ||
      settingsStore.brushSettings.type === "smudge")
  ) {
    const size = settingsStore.brushSettings.size;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(lastX.value, lastY.value, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function getCanvasCoords(event: MouseEvent): { x: number; y: number } {
  const canvas = canvasRef.value;
  if (!canvas || !project.value) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = Math.floor((event.clientX - rect.left) * scale);
  const y = Math.floor((event.clientY - rect.top) * scale);

  return { x, y };
}

function drawShapePreview(ctx: CanvasRenderingContext2D) {
  const strokeColor = colorToString(settingsStore.shapeStrokeColor);
  const fillColor = colorToString(settingsStore.shapeFillColor);
  const strokeWidth = settingsStore.shapeStrokeWidth;

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const x1 = shapeStartX.value;
  const y1 = shapeStartY.value;
  const x2 = shapeCurrentX.value;
  const y2 = shapeCurrentY.value;

  if (settingsStore.shapeType === "rectangle") {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (settingsStore.shapeUseFill) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(left, top, width, height);
    }
    ctx.strokeRect(left, top, width, height);
  } else if (settingsStore.shapeType === "ellipse") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (settingsStore.shapeUseFill) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (settingsStore.shapeType === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawShapeToLayer() {
  if (!currentLayer.value || !currentLayer.value.bitmapData) return;

  const layerCanvas = createCanvas(project.value!.width, project.value!.height);
  const layerCtx = layerCanvas.getContext("2d")!;
  layerCtx.putImageData(currentLayer.value.bitmapData, 0, 0);

  const strokeColor = colorToString(settingsStore.shapeStrokeColor);
  const fillColor = colorToString(settingsStore.shapeFillColor);
  const strokeWidth = settingsStore.shapeStrokeWidth;

  layerCtx.lineWidth = strokeWidth;
  layerCtx.strokeStyle = strokeColor;
  layerCtx.lineCap = "round";
  layerCtx.lineJoin = "round";

  const x1 = shapeStartX.value;
  const y1 = shapeStartY.value;
  const x2 = shapeCurrentX.value;
  const y2 = shapeCurrentY.value;

  if (settingsStore.shapeType === "rectangle") {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (settingsStore.shapeUseFill) {
      layerCtx.fillStyle = fillColor;
      layerCtx.fillRect(left, top, width, height);
    }
    layerCtx.strokeRect(left, top, width, height);
  } else if (settingsStore.shapeType === "ellipse") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;

    layerCtx.beginPath();
    layerCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (settingsStore.shapeUseFill) {
      layerCtx.fillStyle = fillColor;
      layerCtx.fill();
    }
    layerCtx.stroke();
  } else if (settingsStore.shapeType === "line") {
    layerCtx.beginPath();
    layerCtx.moveTo(x1, y1);
    layerCtx.lineTo(x2, y2);
    layerCtx.stroke();
  }

  const newImageData = layerCtx.getImageData(
    0,
    0,
    project.value!.width,
    project.value!.height,
  );

  if (currentLayer.value.bitmapData) {
    const beforeData = cloneImageData(currentLayer.value.bitmapData);
    currentLayer.value.bitmapData = newImageData;
    projectStore.recordHistory(currentLayer.value.id, beforeData, newImageData);
  }
}

function handleMouseDown(event: MouseEvent) {
  if (!project.value || !currentLayer.value) return;
  if (currentLayer.value.locked || !currentLayer.value.bitmapData) return;

  const { x, y } = getCanvasCoords(event);
  lastX.value = x;
  lastY.value = y;
  lastMoveTime.value = Date.now();
  lastPressure.value = 1;

  if (isAltPressed.value && settingsStore.currentTool !== "eyedropper") {
    tempTool.value = settingsStore.currentTool;
    pickColorAt(x, y);
    return;
  }

  if (settingsStore.currentTool === "eyedropper") {
    pickColorAt(x, y);
    return;
  }

  if (settingsStore.currentTool === "selection") {
    startSelection(x, y);
    return;
  }

  if (settingsStore.currentTool === "shape") {
    startShape(x, y);
    return;
  }

  if (settingsStore.currentTool === "fill") {
    doFill(x, y);
    return;
  }

  isDrawing.value = true;
  strokeStartData.value = cloneImageData(currentLayer.value.bitmapData);

  const brushType = settingsStore.brushSettings.type;

  if (brushType === "blur") {
    applyBlur(
      currentLayer.value.bitmapData,
      x,
      y,
      settingsStore.brushSettings.size,
      settingsStore.brushSettings.flow,
    );
  } else {
    const strokeCtx = {
      imageData: currentLayer.value.bitmapData,
      maskData: currentLayer.value.maskData,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      settings: settingsStore.brushSettings,
      pressure: 1,
      lastPressure: 1,
      isEraser:
        settingsStore.currentTool === "eraser" || brushType === "eraser",
    };
    drawBrushDab(strokeCtx);
  }

  renderCanvas();
}

function handleMouseMove(event: MouseEvent) {
  const { x, y } = getCanvasCoords(event);

  lastX.value = x;
  lastY.value = y;

  if (
    isAltPressed.value &&
    isDrawing.value === false &&
    tempTool.value === null
  ) {
    renderOverlay();
    return;
  }

  if (isSelecting.value) {
    updateSelection(x, y);
    return;
  }

  if (isDrawingShape.value) {
    shapeCurrentX.value = x;
    shapeCurrentY.value = y;
    renderOverlay();
    return;
  }

  if (
    !isDrawing.value ||
    !currentLayer.value ||
    !currentLayer.value.bitmapData
  ) {
    renderOverlay();
    return;
  }

  const now = Date.now();
  const timeDiff = now - lastMoveTime.value || 1;
  const distance = Math.sqrt((x - lastX.value) ** 2 + (y - lastY.value) ** 2);
  const speed = (distance / timeDiff) * 10;
  const pressure = calculatePressureFromSpeed(
    speed,
    settingsStore.brushSettings.pressureCurve,
  );

  const brushType = settingsStore.brushSettings.type;

  if (brushType === "blur") {
    applyBlur(
      currentLayer.value.bitmapData,
      x,
      y,
      settingsStore.brushSettings.size,
      settingsStore.brushSettings.flow,
    );
  } else if (brushType === "smudge") {
    const prevX = lastX.value - (x - lastX.value) * 0.1;
    const prevY = lastY.value - (y - lastY.value) * 0.1;
    applySmudge(
      currentLayer.value.bitmapData,
      prevX,
      prevY,
      x,
      y,
      settingsStore.brushSettings.size,
      settingsStore.brushSettings.flow,
    );
  } else {
    const strokeCtx = {
      imageData: currentLayer.value.bitmapData,
      maskData: currentLayer.value.maskData,
      startX: lastX.value,
      startY: lastY.value,
      endX: x,
      endY: y,
      settings: settingsStore.brushSettings,
      pressure,
      lastPressure: lastPressure.value,
      isEraser:
        settingsStore.currentTool === "eraser" || brushType === "eraser",
    };
    drawBrushLine(strokeCtx);
  }

  lastPressure.value = pressure;
  lastMoveTime.value = now;
  lastX.value = x;
  lastY.value = y;

  renderCanvas();
}

function handleMouseUp() {
  if (isSelecting.value) {
    finishSelection();
    return;
  }

  if (isDrawingShape.value) {
    finishShape();
    return;
  }

  if (tempTool.value) {
    settingsStore.setTool(tempTool.value);
    tempTool.value = null;
    return;
  }

  if (!isDrawing.value || !currentLayer.value || !strokeStartData.value) {
    isDrawing.value = false;
    renderOverlay();
    return;
  }

  isDrawing.value = false;

  if (currentLayer.value.bitmapData) {
    projectStore.recordHistory(
      currentLayer.value.id,
      strokeStartData.value,
      currentLayer.value.bitmapData,
    );
  }

  strokeStartData.value = null;
  renderOverlay();
}

function handleMouseLeave() {
  if (isDrawing.value) {
    handleMouseUp();
  }
}

function pickColorAt(x: number, y: number) {
  if (!project.value) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d")!;
  const pixel = ctx.getImageData(x, y, 1, 1).data;

  const color = {
    r: pixel[0],
    g: pixel[1],
    b: pixel[2],
    a: pixel[3] / 255,
  };

  settingsStore.setForegroundColor(color);
}

function startSelection(x: number, y: number) {
  isSelecting.value = true;
  selectionStartX.value = x;
  selectionStartY.value = y;
  selectionPoints.value = [{ x, y }];
}

function updateSelection(x: number, y: number) {
  if (settingsStore.selectionTool === "lasso") {
    selectionPoints.value.push({ x, y });
  }
  renderOverlay();
}

function finishSelection() {
  isSelecting.value = false;
  selectionPoints.value = [];
  renderOverlay();
}

function startShape(x: number, y: number) {
  isDrawingShape.value = true;
  shapeStartX.value = x;
  shapeStartY.value = y;
  shapeCurrentX.value = x;
  shapeCurrentY.value = y;
}

function finishShape() {
  isDrawingShape.value = false;
  drawShapeToLayer();
  renderOverlay();
  renderCanvas();
}

function doFill(x: number, y: number) {
  if (!currentLayer.value || !currentLayer.value.bitmapData) return;

  const beforeData = cloneImageData(currentLayer.value.bitmapData);

  floodFill(
    currentLayer.value.bitmapData,
    x,
    y,
    settingsStore.foregroundColor,
    settingsStore.selectionTolerance,
  );

  projectStore.recordHistory(
    currentLayer.value.id,
    beforeData,
    currentLayer.value.bitmapData,
  );
  renderCanvas();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Alt" || e.key === "Option") {
    isAltPressed.value = true;
    renderOverlay();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === "Alt" || e.key === "Option") {
    isAltPressed.value = false;
    if (tempTool.value) {
      settingsStore.setTool(tempTool.value);
      tempTool.value = null;
    }
    renderOverlay();
  }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY > 0 ? -5 : 5;
    settingsStore.setBrushSize(
      Math.max(1, Math.min(500, settingsStore.brushSettings.size + delta)),
    );
  }
}

watch(
  () => projectStore.currentProject,
  () => {
    nextTick(() => {
      renderCanvas();
      renderOverlay();
    });
  },
  { deep: true },
);

watch(
  () => projectStore.currentLayer,
  () => {
    nextTick(() => {
      renderCanvas();
    });
  },
  { deep: true },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  nextTick(() => {
    renderCanvas();
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
});
</script>

<template>
  <div class="canvas-workspace" @wheel="handleWheel">
    <div
      v-if="project"
      class="canvas-container"
      :style="{
        width: `${project.width}px`,
        height: `${project.height}px`,
      }"
    >
      <canvas
        ref="canvasRef"
        :width="project.width"
        :height="project.height"
        class="main-canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
      ></canvas>

      <canvas
        ref="overlayCanvasRef"
        :width="project.width"
        :height="project.height"
        class="overlay-canvas"
      ></canvas>
    </div>

    <div v-else class="no-project">
      <span>请打开一个项目</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-workspace {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111111;
  overflow: auto;
  padding: 40px;
  position: relative;
}

.canvas-workspace::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
    linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
    linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
  opacity: 0.5;
  pointer-events: none;
}

.canvas-container {
  position: relative;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
}

.main-canvas {
  position: absolute;
  inset: 0;
  cursor: crosshair;
}

.overlay-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.no-project {
  color: var(--text-muted);
  font-size: 16px;
}
</style>
