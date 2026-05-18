<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { exportPNG, exportJPEG, exportPSD, downloadBlob } from '@/utils/export'

const router = useRouter()
const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

async function handleSave() {
  await projectStore.saveCurrentProject()
}

function handleBack() {
  if (projectStore.hasUnsavedChanges) {
    if (!confirm('有未保存的更改，确定要离开吗？')) {
      return
    }
  }
  projectStore.closeProject()
  router.push('/')
}

async function exportAs(format: 'png' | 'jpeg' | 'psd') {
  if (!projectStore.currentProject) return
  
  const name = projectStore.currentProject.name.replace(/\s+/g, '_')
  let blob: Blob
  let filename: string
  
  switch (format) {
    case 'png':
      blob = await exportPNG(projectStore.currentProject)
      filename = `${name}.png`
      break
    case 'jpeg':
      blob = await exportJPEG(projectStore.currentProject, 0.9)
      filename = `${name}.jpg`
      break
    case 'psd':
      blob = await exportPSD(projectStore.currentProject)
      filename = `${name}.zip`
      break
  }
  
  downloadBlob(blob, filename)
}

function toggleFullscreen() {
  settingsStore.toggleFullscreen()
}
</script>

<template>
  <div class="top-bar">
    <div class="left">
      <button class="back-btn" @click="handleBack">
        ←
      </button>
      <span class="project-name">
        {{ projectStore.currentProject?.name }}
        <span v-if="projectStore.hasUnsavedChanges" class="unsaved">*</span>
      </span>
    </div>
    
    <div class="center">
      <div class="history-buttons">
        <button 
          class="history-btn" 
          :disabled="!projectStore.canUndo"
          @click="projectStore.undo"
          title="撤销 (Cmd+Z)"
        >
          ↩
        </button>
        <button 
          class="history-btn" 
          :disabled="!projectStore.canRedo"
          @click="projectStore.redo"
          title="重做 (Cmd+Shift+Z)"
        >
          ↪
        </button>
      </div>
    </div>
    
    <div class="right">
      <button class="action-btn" @click="toggleFullscreen">
        ⤢
      </button>
      
      <button class="action-btn export-png-btn" @click="exportAs('png')" title="导出PNG (Cmd+E)">
        导出PNG
      </button>
      
      <div class="export-menu">
        <button class="action-btn">更多 ▾</button>
        <div class="dropdown">
          <button @click="exportAs('jpeg')">导出 JPEG</button>
          <button @click="exportAs('psd')">导出为 ZIP</button>
        </div>
      </div>
      
      <button class="save-btn" @click="handleSave" :disabled="!projectStore.hasUnsavedChanges">
        保存 (Cmd+S)
      </button>
    </div>
  </div>
</template>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.left,
.center,
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 18px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.project-name {
  font-size: 14px;
  font-weight: 500;
}

.unsaved {
  color: var(--accent);
  margin-left: 2px;
}

.history-buttons {
  display: flex;
  gap: 4px;
}

.history-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.history-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.history-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.export-png-btn {
  background: var(--accent);
  color: white;
}

.export-png-btn:hover {
  background: var(--accent-hover);
  color: white;
}

.export-menu {
  position: relative;
}

.export-menu:hover .dropdown {
  display: block;
}

.dropdown {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  min-width: 140px;
  z-index: 100;
}

.dropdown button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.dropdown button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.save-btn {
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
