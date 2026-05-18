<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { exportPNG, downloadBlob } from '@/utils/export'
import CanvasWorkspace from '@/components/CanvasWorkspace.vue'
import Toolbar from '@/components/Toolbar.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import BrushPanel from '@/components/BrushPanel.vue'
import ColorPicker from '@/components/ColorPicker.vue'
import TopBar from '@/components/TopBar.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const isLoading = ref(true)

async function handleExportPNG() {
  if (!projectStore.currentProject) return
  const name = projectStore.currentProject.name.replace(/\s+/g, '_')
  const blob = await exportPNG(projectStore.currentProject)
  downloadBlob(blob, `${name}.png`)
}

function handleKeydown(e: KeyboardEvent) {
  const isCmd = e.metaKey || e.ctrlKey
  
  if (e.key === 'b' || e.key === 'B') {
    settingsStore.setTool('brush')
  } else if (e.key === 'e' || e.key === 'E') {
    if (!isCmd) {
      settingsStore.setTool('eraser')
      settingsStore.setBrushType('eraser')
    }
  } else if (e.key === 'g' || e.key === 'G') {
    settingsStore.setTool('fill')
  } else if (e.key === 'v' || e.key === 'V') {
    settingsStore.setTool('selection')
  } else if (e.key === 't' || e.key === 'T') {
    settingsStore.setTool('transform')
  } else if (e.key === 'i' || e.key === 'I') {
    settingsStore.setTool('eyedropper')
  } else if (e.key === 'u' || e.key === 'U') {
    settingsStore.setTool('shape')
  } else if (isCmd && e.key === 'e') {
    e.preventDefault()
    handleExportPNG()
  } else if (isCmd && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    projectStore.undo()
  } else if (isCmd && e.shiftKey && e.key === 'z') {
    e.preventDefault()
    projectStore.redo()
  } else if (isCmd && e.key === 'n') {
    e.preventDefault()
    router.push('/')
  } else if (isCmd && e.key === 's') {
    e.preventDefault()
    projectStore.saveCurrentProject()
  } else if (e.key === '[') {
    settingsStore.setBrushSize(Math.max(1, settingsStore.brushSettings.size - 5))
  } else if (e.key === ']') {
    settingsStore.setBrushSize(Math.min(500, settingsStore.brushSettings.size + 5))
  }
}

onMounted(async () => {
  const projectId = route.params.projectId as string
  if (projectId) {
    await projectStore.openProject(projectId)
  }
  if (!projectStore.currentProject) {
    router.push('/')
    return
  }
  isLoading.value = false
  
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="isLoading" class="loading">
    <div>加载中...</div>
  </div>
  <div v-else class="canvas-view">
    <TopBar />
    <div class="main-content">
      <Toolbar />
      <CanvasWorkspace />
      <div class="right-panels">
        <LayerPanel />
        <BrushPanel />
        <ColorPicker />
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 18px;
  color: var(--text-secondary);
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.right-panels {
  display: flex;
  flex-direction: column;
  width: 280px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  overflow-y: auto;
}
</style>
