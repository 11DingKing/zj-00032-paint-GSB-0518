<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import type { ToolType, SelectionTool, ShapeType } from "@/types";

const settingsStore = useSettingsStore();

const tools: Array<{ type: ToolType; icon: string; label: string }> = [
  { type: "brush", icon: "✏️", label: "笔刷 (B)" },
  { type: "eraser", icon: "🧹", label: "橡皮 (E)" },
  { type: "fill", icon: "🪣", label: "填充 (G)" },
  { type: "selection", icon: "⬜", label: "选择 (V)" },
  { type: "shape", icon: "🔷", label: "形状 (U)" },
  { type: "transform", icon: "↔", label: "变换 (T)" },
  { type: "eyedropper", icon: "💧", label: "取色 (I)" },
];

const shapeTools: Array<{
  type: ShapeType;
  icon: string;
  label: string;
}> = [
  { type: "rectangle", icon: "▭", label: "矩形" },
  { type: "ellipse", icon: "◯", label: "圆形" },
  { type: "line", icon: "╱", label: "直线" },
];

const selectionTools: Array<{
  type: SelectionTool;
  icon: string;
  label: string;
}> = [
  { type: "rectangle", icon: "▢", label: "矩形选择" },
  { type: "ellipse", icon: "○", label: "椭圆选择" },
  { type: "lasso", icon: "⊶", label: "套索" },
  { type: "magic-wand", icon: "✧", label: "魔棒" },
];

function selectTool(tool: ToolType) {
  settingsStore.setTool(tool);
}

function selectSelectionTool(tool: SelectionTool) {
  settingsStore.setSelectionTool(tool);
}

function selectShapeTool(tool: ShapeType) {
  settingsStore.setShapeType(tool);
}
</script>

<template>
  <div class="toolbar">
    <div class="tool-group">
      <button
        v-for="tool in tools"
        :key="tool.type"
        class="tool-btn"
        :class="{ active: settingsStore.currentTool === tool.type }"
        @click="selectTool(tool.type)"
        :title="tool.label"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
      </button>
    </div>

    <div
      class="divider"
      v-if="
        settingsStore.currentTool === 'selection' ||
        settingsStore.currentTool === 'shape'
      "
    ></div>

    <div class="tool-group" v-if="settingsStore.currentTool === 'selection'">
      <button
        v-for="tool in selectionTools"
        :key="tool.type"
        class="tool-btn small"
        :class="{ active: settingsStore.selectionTool === tool.type }"
        @click="selectSelectionTool(tool.type)"
        :title="tool.label"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
      </button>
    </div>

    <div class="tool-group" v-if="settingsStore.currentTool === 'shape'">
      <button
        v-for="tool in shapeTools"
        :key="tool.type"
        class="tool-btn small"
        :class="{ active: settingsStore.shapeType === tool.type }"
        @click="selectShapeTool(tool.type)"
        :title="tool.label"
      >
        <span class="tool-icon">{{ tool.icon }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  gap: 4px;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.divider {
  width: 32px;
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tool-btn.small {
  width: 36px;
  height: 36px;
}

.tool-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tool-btn.active {
  background: var(--accent);
  color: white;
}

.tool-icon {
  font-size: 18px;
}

.small .tool-icon {
  font-size: 16px;
}
</style>
