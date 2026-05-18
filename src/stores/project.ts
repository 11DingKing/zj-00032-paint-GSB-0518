import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, Layer, Color, HistoryStep, BlendMode, TransformState } from '@/types'
import { generateId, createImageData, cloneImageData, calculateDirtyRect, createCanvas, fillImageData } from '@/utils/canvas'
import { saveProject, loadProject, getAllProjectMetadata, deleteProject as deleteProjectFromDB } from '@/utils/db'
import type { ProjectMetadata } from '@/types'

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<Project | null>(null)
  const projectList = ref<ProjectMetadata[]>([])
  const isLoading = ref(false)
  const hasUnsavedChanges = ref(false)
  
  const currentLayer = computed(() => {
    if (!currentProject.value) return null
    return currentProject.value.layers.find(l => l.id === currentProject.value!.currentLayerId) || null
  })
  
  const visibleLayers = computed(() => {
    if (!currentProject.value) return []
    return currentProject.value.layers.filter(l => l.visible)
  })
  
  function createLayer(width: number, height: number, name: string, fillBackground = false): Layer {
    const bitmapData = createImageData(width, height)
    if (fillBackground) {
      fillImageData(bitmapData, { r: 255, g: 255, b: 255, a: 1 })
    }
    
    return {
      id: generateId(),
      name,
      width,
      height,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      bitmapData,
      maskEnabled: false,
      maskData: null,
      x: 0,
      y: 0
    }
  }
  
  async function loadProjectList(): Promise<void> {
    isLoading.value = true
    try {
      projectList.value = await getAllProjectMetadata()
    } finally {
      isLoading.value = false
    }
  }
  
  async function createNewProject(
    name: string,
    width: number,
    height: number,
    dpi: number = 72,
    background: Color = { r: 255, g: 255, b: 255, a: 1 }
  ): Promise<Project> {
    const backgroundLayer = createLayer(width, height, '背景', true)
    const drawingLayer = createLayer(width, height, '图层 1')
    
    const project: Project = {
      id: generateId(),
      name,
      thumbnail: '',
      width,
      height,
      dpi,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [backgroundLayer, drawingLayer],
      currentLayerId: drawingLayer.id,
      background,
      history: [],
      historyIndex: -1,
      selection: null
    }
    
    currentProject.value = project
    hasUnsavedChanges.value = true
    
    return project
  }
  
  async function openProject(id: string): Promise<Project | null> {
    isLoading.value = true
    try {
      const project = await loadProject(id)
      if (project) {
        currentProject.value = project
        hasUnsavedChanges.value = false
      }
      return project
    } finally {
      isLoading.value = false
    }
  }
  
  async function saveCurrentProject(): Promise<void> {
    if (!currentProject.value) return
    
    currentProject.value.thumbnail = generateThumbnail(currentProject.value)
    
    await saveProject(currentProject.value)
    hasUnsavedChanges.value = false
    await loadProjectList()
  }
  
  function generateThumbnail(project: Project): string {
    const maxSize = 256
    const scale = Math.min(maxSize / project.width, maxSize / project.height)
    const thumbWidth = Math.round(project.width * scale)
    const thumbHeight = Math.round(project.height * scale)
    
    const canvas = createCanvas(thumbWidth, thumbHeight)
    const ctx = canvas.getContext('2d')!
    
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, thumbWidth, thumbHeight)
    
    const drawCanvas = createCanvas(project.width, project.height)
    const drawCtx = drawCanvas.getContext('2d')!
    
    for (const layer of project.layers) {
      if (!layer.visible || !layer.bitmapData) continue
      
      const tempCanvas = createCanvas(project.width, project.height)
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(layer.bitmapData, 0, 0)
      
      drawCtx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode
      drawCtx.globalAlpha = layer.opacity / 100
      drawCtx.drawImage(tempCanvas, 0, 0)
    }
    
    ctx.drawImage(drawCanvas, 0, 0, thumbWidth, thumbHeight)
    
    return canvas.toDataURL('image/png', 0.8)
  }
  
  async function deleteProject(id: string): Promise<void> {
    await deleteProjectFromDB(id)
    if (currentProject.value?.id === id) {
      currentProject.value = null
    }
    await loadProjectList()
  }
  
  function closeProject(): void {
    currentProject.value = null
  }
  
  function addLayer(afterId?: string): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    const newLayer = createLayer(project.width, project.height, `图层 ${project.layers.length + 1}`)
    
    if (afterId) {
      const index = project.layers.findIndex(l => l.id === afterId)
      project.layers.splice(index + 1, 0, newLayer)
    } else {
      project.layers.push(newLayer)
    }
    
    project.currentLayerId = newLayer.id
    hasUnsavedChanges.value = true
  }
  
  function removeLayer(id: string): void {
    if (!currentProject.value) return
    if (currentProject.value.layers.length <= 1) return
    
    const project = currentProject.value
    const index = project.layers.findIndex(l => l.id === id)
    if (index === -1) return
    
    project.layers.splice(index, 1)
    
    if (project.currentLayerId === id) {
      const newIndex = Math.min(index, project.layers.length - 1)
      project.currentLayerId = project.layers[newIndex].id
    }
    
    hasUnsavedChanges.value = true
  }
  
  function duplicateLayer(id: string): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    const layer = project.layers.find(l => l.id === id)
    if (!layer) return
    
    const newLayer: Layer = {
      ...layer,
      id: generateId(),
      name: `${layer.name} 副本`,
      bitmapData: layer.bitmapData ? cloneImageData(layer.bitmapData) : null,
      maskData: layer.maskData ? cloneImageData(layer.maskData) : null
    }
    
    const index = project.layers.findIndex(l => l.id === id)
    project.layers.splice(index + 1, 0, newLayer)
    project.currentLayerId = newLayer.id
    
    hasUnsavedChanges.value = true
  }
  
  function setCurrentLayer(id: string): void {
    if (!currentProject.value) return
    currentProject.value.currentLayerId = id
  }
  
  function moveLayer(id: string, direction: 'up' | 'down'): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    const index = project.layers.findIndex(l => l.id === id)
    if (index === -1) return
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= project.layers.length) return
    
    const [layer] = project.layers.splice(index, 1)
    project.layers.splice(targetIndex, 0, layer)
    
    hasUnsavedChanges.value = true
  }
  
  function setLayerVisibility(id: string, visible: boolean): void {
    const layer = currentProject.value?.layers.find(l => l.id === id)
    if (layer) {
      layer.visible = visible
      hasUnsavedChanges.value = true
    }
  }
  
  function setLayerOpacity(id: string, opacity: number): void {
    const layer = currentProject.value?.layers.find(l => l.id === id)
    if (layer) {
      layer.opacity = Math.max(0, Math.min(100, opacity))
      hasUnsavedChanges.value = true
    }
  }
  
  function setLayerBlendMode(id: string, blendMode: BlendMode): void {
    const layer = currentProject.value?.layers.find(l => l.id === id)
    if (layer) {
      layer.blendMode = blendMode
      hasUnsavedChanges.value = true
    }
  }
  
  function setLayerName(id: string, name: string): void {
    const layer = currentProject.value?.layers.find(l => l.id === id)
    if (layer) {
      layer.name = name
      hasUnsavedChanges.value = true
    }
  }
  
  function recordHistory(layerId: string, beforeData: ImageData, afterData: ImageData): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    const dirtyRect = calculateDirtyRect(beforeData, afterData)
    
    if (dirtyRect.width === 0 || dirtyRect.height === 0) return
    
    const step: HistoryStep = {
      id: generateId(),
      timestamp: Date.now(),
      layerId,
      dirtyRect,
      beforeData: cloneImageData(beforeData),
      afterData: cloneImageData(afterData)
    }
    
    if (project.historyIndex < project.history.length - 1) {
      project.history = project.history.slice(0, project.historyIndex + 1)
    }
    
    project.history.push(step)
    
    if (project.history.length > 50) {
      project.history.shift()
    } else {
      project.historyIndex++
    }
    
    hasUnsavedChanges.value = true
  }
  
  function undo(): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    if (project.historyIndex < 0) return
    
    const step = project.history[project.historyIndex]
    const layer = project.layers.find(l => l.id === step.layerId)
    
    if (layer && layer.bitmapData) {
      const { x, y, width, height } = step.dirtyRect
      
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const srcIdx = (py * width + px) * 4
          const tgtIdx = ((y + py) * layer.width + (x + px)) * 4
          
          layer.bitmapData.data[tgtIdx] = step.beforeData.data[srcIdx]
          layer.bitmapData.data[tgtIdx + 1] = step.beforeData.data[srcIdx + 1]
          layer.bitmapData.data[tgtIdx + 2] = step.beforeData.data[srcIdx + 2]
          layer.bitmapData.data[tgtIdx + 3] = step.beforeData.data[srcIdx + 3]
        }
      }
      
      project.historyIndex--
      hasUnsavedChanges.value = true
    }
  }
  
  function redo(): void {
    if (!currentProject.value) return
    
    const project = currentProject.value
    if (project.historyIndex >= project.history.length - 1) return
    
    project.historyIndex++
    const step = project.history[project.historyIndex]
    const layer = project.layers.find(l => l.id === step.layerId)
    
    if (layer && layer.bitmapData) {
      const { x, y, width, height } = step.dirtyRect
      
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const srcIdx = (py * width + px) * 4
          const tgtIdx = ((y + py) * layer.width + (x + px)) * 4
          
          layer.bitmapData.data[tgtIdx] = step.afterData.data[srcIdx]
          layer.bitmapData.data[tgtIdx + 1] = step.afterData.data[srcIdx + 1]
          layer.bitmapData.data[tgtIdx + 2] = step.afterData.data[srcIdx + 2]
          layer.bitmapData.data[tgtIdx + 3] = step.afterData.data[srcIdx + 3]
        }
      }
      
      hasUnsavedChanges.value = true
    }
  }
  
  const canUndo = computed(() => {
    return currentProject.value ? currentProject.value.historyIndex >= 0 : false
  })
  
  const canRedo = computed(() => {
    if (!currentProject.value) return false
    return currentProject.value.historyIndex < currentProject.value.history.length - 1
  })
  
  function applyTransform(layerId: string, transform: TransformState): void {
    const layer = currentProject.value?.layers.find(l => l.id === layerId)
    if (!layer || !layer.bitmapData) return
    
    const beforeData = cloneImageData(layer.bitmapData)
    
    const canvas = createCanvas(layer.width, layer.height)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, layer.width, layer.height)
    
    ctx.save()
    ctx.translate(layer.width / 2, layer.height / 2)
    ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1)
    ctx.rotate((transform.rotation * Math.PI) / 180)
    ctx.scale(transform.scaleX, transform.scaleY)
    ctx.translate(-layer.width / 2, -layer.height / 2)
    
    const sourceCanvas = createCanvas(layer.width, layer.height)
    const sourceCtx = sourceCanvas.getContext('2d')!
    sourceCtx.putImageData(layer.bitmapData, 0, 0)
    
    ctx.drawImage(sourceCanvas, transform.x, transform.y)
    ctx.restore()
    
    layer.bitmapData = ctx.getImageData(0, 0, layer.width, layer.height)
    
    recordHistory(layerId, beforeData, layer.bitmapData)
  }
  
  function flipLayer(layerId: string, direction: 'horizontal' | 'vertical'): void {
    const layer = currentProject.value?.layers.find(l => l.id === layerId)
    if (!layer || !layer.bitmapData) return
    
    const beforeData = cloneImageData(layer.bitmapData)
    
    const canvas = createCanvas(layer.width, layer.height)
    const ctx = canvas.getContext('2d')!
    
    const sourceCanvas = createCanvas(layer.width, layer.height)
    const sourceCtx = sourceCanvas.getContext('2d')!
    sourceCtx.putImageData(layer.bitmapData, 0, 0)
    
    ctx.save()
    if (direction === 'horizontal') {
      ctx.translate(layer.width, 0)
      ctx.scale(-1, 1)
    } else {
      ctx.translate(0, layer.height)
      ctx.scale(1, -1)
    }
    ctx.drawImage(sourceCanvas, 0, 0)
    ctx.restore()
    
    layer.bitmapData = ctx.getImageData(0, 0, layer.width, layer.height)
    recordHistory(layerId, beforeData, layer.bitmapData)
  }
  
  return {
    currentProject,
    projectList,
    isLoading,
    hasUnsavedChanges,
    currentLayer,
    visibleLayers,
    canUndo,
    canRedo,
    loadProjectList,
    createNewProject,
    openProject,
    saveCurrentProject,
    deleteProject,
    closeProject,
    addLayer,
    removeLayer,
    duplicateLayer,
    setCurrentLayer,
    moveLayer,
    setLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    setLayerName,
    recordHistory,
    undo,
    redo,
    applyTransform,
    flipLayer
  }
})
