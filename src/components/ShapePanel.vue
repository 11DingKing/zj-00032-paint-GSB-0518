<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "@/stores/settings";
import { colorToString, colorToHex, hexToColor } from "@/utils/canvas";
import type { ShapeType } from "@/types";

const settingsStore = useSettingsStore();

const shapeTypes: Array<{ type: ShapeType; icon: string; label: string }> = [
  { type: "rectangle", icon: "▭", label: "矩形" },
  { type: "ellipse", icon: "◯", label: "圆形" },
  { type: "line", icon: "╱", label: "直线" },
];

const strokeColorHex = computed({
  get: () => colorToHex(settingsStore.shapeStrokeColor),
  set: (val: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      settingsStore.setShapeStrokeColor({ ...hexToColor(val), a: settingsStore.shapeStrokeColor.a });
    }
  },
});

const fillColorHex = computed({
  get: () => colorToHex(settingsStore.shapeFillColor),
  set: (val: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      settingsStore.setShapeFillColor({ ...hexToColor(val), a: settingsStore.shapeFillColor.a });
    }
  },
});
</script>

<template>
  <div class="shape-panel">
    <div class="panel-header">
      <span class="panel-title">形状工具</span>
    </div>

    <div class="shape-type-group">
      <div class="group-label">形状类型</div>
      <div class="shape-buttons">
        <button
          v-for="s in shapeTypes"
          :key="s.type"
          class="shape-btn"
          :class="{ active: settingsStore.shapeType === s.type }"
          @click="settingsStore.setShapeType(s.type)"
          :title="s.label"
        >
          <span class="shape-icon">{{ s.icon }}</span>
          <span class="shape-label">{{ s.label }}</span>
        </button>
      </div>
    </div>

    <div class="shape-options">
      <div class="option-row">
        <label class="option-label">描边颜色</label>
        <div class="color-input-row">
          <input
            type="color"
            :value="strokeColorHex"
            @input="(e) => { strokeColorHex = (e.target as HTMLInputElement).value; }"
            class="color-picker-input"
          />
          <input
            type="text"
            v-model="strokeColorHex"
            class="hex-input"
            maxlength="7"
          />
        </div>
      </div>

      <div class="option-row">
        <label class="option-label">描边宽度</label>
        <div class="slider-row">
          <input
            type="range"
            min="1"
            max="50"
            :value="settingsStore.shapeStrokeWidth"
            @input="(e) => settingsStore.setShapeStrokeWidth(Number((e.target as HTMLInputElement).value))"
            class="slider-input"
          />
          <span class="value-text">{{ settingsStore.shapeStrokeWidth }}px</span>
        </div>
      </div>

      <div class="option-row">
        <label class="option-label">填充</label>
        <div class="checkbox-row">
          <input
            type="checkbox"
            :checked="settingsStore.shapeUseFill"
            @change="(e) => settingsStore.setShapeUseFill((e.target as HTMLInputElement).checked)"
            class="checkbox-input"
          />
          <input
            v-if="settingsStore.shapeUseFill"
            type="color"
            :value="fillColorHex"
            @input="(e) => { fillColorHex = (e.target as HTMLInputElement).value; }"
            class="color-picker-input"
          />
          <input
            v-if="settingsStore.shapeUseFill"
            type="text"
            v-model="fillColorHex"
            class="hex-input"
            maxlength="7"
          />
        </div>
      </div>
    </div>

    <div class="preview-section">
      <div class="group-label">预览</div>
      <div class="preview-box">
        <svg width="100%" height="100%" viewBox="0 0 120 80">
          <rect
            v-if="settingsStore.shapeType === 'rectangle'"
            x="10" y="10" width="100" height="60"
            :fill="settingsStore.shapeUseFill ? colorToString(settingsStore.shapeFillColor) : 'none'"
            :stroke="colorToString(settingsStore.shapeStrokeColor)"
            :stroke-width="Math.min(settingsStore.shapeStrokeWidth / 2, 10)"
          />
          <ellipse
            v-else-if="settingsStore.shapeType === 'ellipse'"
            cx="60" cy="40" rx="50" ry="30"
            :fill="settingsStore.shapeUseFill ? colorToString(settingsStore.shapeFillColor) : 'none'"
            :stroke="colorToString(settingsStore.shapeStrokeColor)"
            :stroke-width="Math.min(settingsStore.shapeStrokeWidth / 2, 10)"
          />
          <line
            v-else-if="settingsStore.shapeType === 'line'"
            x1="10" y1="70" x2="110" y2="10"
            :stroke="colorToString(settingsStore.shapeStrokeColor)"
            :stroke-width="Math.min(settingsStore.shapeStrokeWidth / 2, 10)"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shape-panel {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.shape-type-group {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.group-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.shape-buttons {
  display: flex;
  gap: 6px;
}

.shape-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.shape-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.shape-btn.active {
  background: var(--accent);
  color: white;
}

.shape-icon {
  font-size: 18px;
}

.shape-label {
  font-size: 11px;
}

.shape-options {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.option-label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 60px;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.color-picker-input {
  width: 28px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  padding: 0;
}

.hex-input {
  flex: 1;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 11px;
  font-family: monospace;
  text-transform: uppercase;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.slider-input {
  flex: 1;
  height: 6px;
  appearance: none;
  background: var(--bg-tertiary);
  border-radius: 3px;
  cursor: pointer;
}

.slider-input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 14px;
  background: var(--accent);
  border-radius: 3px;
  cursor: pointer;
}

.value-text {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.checkbox-input {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--accent);
}

.preview-section {
  padding: 12px 16px;
}

.preview-box {
  width: 100%;
  height: 80px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
