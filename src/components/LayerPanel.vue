<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import type { BlendMode } from '@/types'

const projectStore = useProjectStore()

const blendModes: Array<{ value: BlendMode; label: string }> = [
  { value: 'normal', label: '正常' },
  { value: 'multiply', label: '正片叠底' },
  { value: 'screen', label: '滤色' },
  { value: 'overlay', label: '叠加' },
  { value: 'darken', label: '变暗' },
  { value: 'lighten', label: '变亮' },
  { value: 'color-dodge', label: '颜色减淡' },
  { value: 'color-burn', label: '颜色加深' },
  { value: 'hard-light', label: '强光' },
  { value: 'soft-light', label: '柔光' },
  { value: 'difference', label: '差值' },
  { value: 'exclusion', label: '排除' }
]

function toggleVisibility(id: string, event: Event) {
  event.stopPropagation()
  const layer = projectStore.currentProject?.layers.find(l => l.id === id)
  if (layer) {
    projectStore.setLayerVisibility(id, !layer.visible)
  }
}

function handleOpacityChange(id: string, event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  projectStore.setLayerOpacity(id, value)
}

function handleBlendModeChange(id: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value as BlendMode
  projectStore.setLayerBlendMode(id, value)
}
</script>

<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="panel-title">图层</span>
      <div class="layer-actions">
        <button class="action-btn" @click="projectStore.addLayer()" title="添加图层">+</button>
      </div>
    </div>
    
    <div class="layers-list">
      <div
        v-for="layer in (projectStore.currentProject?.layers || []).slice().reverse()"
        :key="layer.id"
        class="layer-item"
        :class="{ active: layer.id === projectStore.currentProject?.currentLayerId }"
        @click="projectStore.setCurrentLayer(layer.id)"
      >
        <div class="layer-left">
          <button 
            class="visibility-btn"
            @click="toggleVisibility(layer.id, $event)"
            :title="layer.visible ? '隐藏' : '显示'"
          >
            {{ layer.visible ? '👁️' : '🚫' }}
          </button>
          <div class="layer-thumbnail">
            <span v-if="!layer.bitmapData" class="empty-thumb">-</span>
          </div>
        </div>
        
        <div class="layer-info">
          <div class="layer-name">{{ layer.name }}</div>
        </div>
        
        <div class="layer-right">
          <button 
            class="icon-btn"
            @click.stop="projectStore.duplicateLayer(layer.id)"
            title="复制图层"
          >
            📋
          </button>
          <button 
            class="icon-btn delete"
            @click.stop="projectStore.removeLayer(layer.id)"
            title="删除图层"
            :disabled="(projectStore.currentProject?.layers.length || 0) <= 1"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="projectStore.currentLayer" class="layer-settings">
      <div class="setting-row">
        <label>不透明度</label>
        <div class="slider-row">
          <input
            type="range"
            min="0"
            max="100"
            :value="projectStore.currentLayer.opacity"
            @input="handleOpacityChange(projectStore.currentLayer.id, $event)"
          />
          <span class="value">{{ projectStore.currentLayer.opacity }}%</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label>混合模式</label>
        <select 
          :value="projectStore.currentLayer.blendMode"
          @change="handleBlendModeChange(projectStore.currentLayer.id, $event)"
          class="blend-select"
        >
          <option v-for="mode in blendModes" :key="mode.value" :value="mode.value">
            {{ mode.label }}
          </option>
        </select>
      </div>
      
      <div class="flip-buttons">
        <button 
          class="flip-btn" 
          @click="projectStore.flipLayer(projectStore.currentLayer!.id, 'horizontal')"
        >
          ↔ 水平翻转
        </button>
        <button 
          class="flip-btn" 
          @click="projectStore.flipLayer(projectStore.currentLayer!.id, 'vertical')"
        >
          ↕ 垂直翻转
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.layer-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 16px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.layers-list {
  max-height: 300px;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.2s;
}

.layer-item:hover {
  background: var(--bg-tertiary);
}

.layer-item.active {
  background: var(--bg-tertiary);
  border-left-color: var(--accent);
}

.layer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.visibility-btn {
  width: 24px;
  height: 24px;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.visibility-btn:hover {
  opacity: 1;
}

.layer-thumbnail {
  width: 36px;
  height: 36px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-thumb {
  font-size: 10px;
  color: var(--text-muted);
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-right {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s;
}

.layer-item:hover .icon-btn {
  opacity: 0.7;
}

.icon-btn:hover {
  opacity: 1 !important;
  background: var(--bg-hover);
}

.icon-btn.delete:hover {
  color: var(--danger);
}

.icon-btn:disabled {
  opacity: 0.2 !important;
  cursor: not-allowed;
}

.layer-settings {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.setting-row {
  margin-bottom: 12px;
}

.setting-row label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-row input[type="range"] {
  flex: 1;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.slider-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}

.slider-row .value {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 36px;
  text-align: right;
}

.blend-select {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
}

.flip-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.flip-btn {
  flex: 1;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.flip-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
