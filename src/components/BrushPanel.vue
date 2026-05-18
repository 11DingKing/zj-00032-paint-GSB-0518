<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import type { BrushType } from '@/types'

const settingsStore = useSettingsStore()

const brushTypes: Array<{ type: BrushType; label: string; icon: string }> = [
  { type: 'hard-edge', label: '硬边', icon: '●' },
  { type: 'soft-edge', label: '软边', icon: '◐' },
  { type: 'airbrush', label: '喷枪', icon: '◎' },
  { type: 'marker', label: '马克笔', icon: '▮' },
  { type: 'watercolor', label: '水彩', icon: '💧' },
  { type: 'pencil', label: '铅笔', icon: '✎' },
  { type: 'crayon', label: '蜡笔', icon: '🖍️' },
  { type: 'eraser', label: '橡皮', icon: '🧹' },
  { type: 'smudge', label: '涂抹', icon: '〰️' },
  { type: 'blur', label: '模糊', icon: '🌫️' }
]
</script>

<template>
  <div class="brush-panel">
    <div class="panel-header">
      <span class="panel-title">笔刷</span>
    </div>
    
    <div class="brush-types">
      <button
        v-for="brush in brushTypes"
        :key="brush.type"
        class="brush-type-btn"
        :class="{ active: settingsStore.brushSettings.type === brush.type }"
        @click="settingsStore.setBrushType(brush.type)"
        :title="brush.label"
      >
        <span class="brush-icon">{{ brush.icon }}</span>
        <span class="brush-label">{{ brush.label }}</span>
      </button>
    </div>
    
    <div class="brush-settings">
      <div class="setting-row">
        <div class="setting-header">
          <label>尺寸</label>
          <span class="value">{{ settingsStore.brushSettings.size }}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="500"
          :value="settingsStore.brushSettings.size"
          @input="settingsStore.setBrushSize(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="setting-row">
        <div class="setting-header">
          <label>硬度</label>
          <span class="value">{{ settingsStore.brushSettings.hardness }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="settingsStore.brushSettings.hardness"
          @input="settingsStore.setBrushHardness(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="setting-row">
        <div class="setting-header">
          <label>流量</label>
          <span class="value">{{ settingsStore.brushSettings.flow }}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          :value="settingsStore.brushSettings.flow"
          @input="settingsStore.setBrushFlow(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="setting-row">
        <div class="setting-header">
          <label>间距</label>
          <span class="value">{{ settingsStore.brushSettings.spacing }}%</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          :value="settingsStore.brushSettings.spacing"
          @input="settingsStore.setBrushSpacing(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
      
      <div class="setting-row">
        <div class="setting-header">
          <label>压感曲线</label>
          <span class="value">{{ settingsStore.brushSettings.pressureCurve }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="settingsStore.brushSettings.pressureCurve"
          @input="settingsStore.setPressureCurve(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
      
      <div v-if="settingsStore.currentTool === 'selection'" class="setting-row">
        <div class="setting-header">
          <label>魔棒容差</label>
          <span class="value">{{ settingsStore.selectionTolerance }}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          :value="settingsStore.selectionTolerance"
          @input="settingsStore.setSelectionTolerance(parseInt(($event.target as HTMLInputElement).value))"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.brush-panel {
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

.brush-types {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.brush-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.brush-type-btn:hover {
  background: var(--bg-tertiary);
}

.brush-type-btn.active {
  background: var(--accent);
}

.brush-icon {
  font-size: 16px;
}

.brush-type-btn.active .brush-icon {
  filter: brightness(0) invert(1);
}

.brush-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.brush-type-btn.active .brush-label {
  color: white;
}

.brush-settings {
  padding: 12px 16px;
}

.setting-row {
  margin-bottom: 14px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.setting-header label {
  font-size: 12px;
  color: var(--text-secondary);
}

.setting-header .value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

input[type="range"] {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}
</style>
