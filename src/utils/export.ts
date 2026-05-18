import type { Project, Layer } from '@/types'
import { createCanvas } from './canvas'
import JSZip from 'jszip'

export function mergeLayersToCanvas(project: Project): HTMLCanvasElement {
  const canvas = createCanvas(project.width, project.height)
  const ctx = canvas.getContext('2d')!
  
  ctx.fillStyle = `rgb(${project.background.r}, ${project.background.g}, ${project.background.b})`
  ctx.fillRect(0, 0, project.width, project.height)
  
  for (const layer of project.layers) {
    if (!layer.visible || !layer.bitmapData) continue
    renderLayer(ctx, layer, project.width, project.height)
  }
  
  return canvas
}

export function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  width: number,
  height: number
): void {
  if (!layer.bitmapData) return
  
  const layerCanvas = createCanvas(width, height)
  const layerCtx = layerCanvas.getContext('2d')!
  layerCtx.putImageData(layer.bitmapData, 0, 0)
  
  if (layer.maskEnabled && layer.maskData) {
    const maskCanvas = createCanvas(width, height)
    const maskCtx = maskCanvas.getContext('2d')!
    maskCtx.putImageData(layer.maskData, 0, 0)
    
    layerCtx.globalCompositeOperation = 'destination-in'
    layerCtx.drawImage(maskCanvas, 0, 0)
  }
  
  ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode
  ctx.globalAlpha = layer.opacity / 100
  ctx.drawImage(layerCanvas, layer.x, layer.y)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

export function exportPNG(project: Project, quality: number = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = mergeLayersToCanvas(project)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create PNG blob'))
      },
      'image/png',
      quality
    )
  })
}

export function exportJPEG(project: Project, quality: number = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = mergeLayersToCanvas(project)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create JPEG blob'))
      },
      'image/jpeg',
      quality
    )
  })
}

export async function exportPSD(project: Project): Promise<Blob> {
  const zip = new JSZip()
  
  const layersJson = {
    name: project.name,
    width: project.width,
    height: project.height,
    dpi: project.dpi,
    background: project.background,
    layers: project.layers.map((layer, index) => ({
      id: layer.id,
      name: layer.name,
      index,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      x: layer.x,
      y: layer.y,
      maskEnabled: layer.maskEnabled
    }))
  }
  
  zip.file('layers.json', JSON.stringify(layersJson, null, 2))
  
  const mergedCanvas = mergeLayersToCanvas(project)
  const mergedBlob = await new Promise<Blob>((resolve, reject) => {
    mergedCanvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Failed to create merged PNG')),
      'image/png'
    )
  })
  zip.file('merged.png', mergedBlob)
  
  for (let i = 0; i < project.layers.length; i++) {
    const layer = project.layers[i]
    if (!layer.bitmapData) continue
    
    const layerCanvas = createCanvas(project.width, project.height)
    const layerCtx = layerCanvas.getContext('2d')!
    layerCtx.putImageData(layer.bitmapData, 0, 0)
    
    const layerBlob = await new Promise<Blob>((resolve, reject) => {
      layerCanvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create layer PNG')),
        'image/png'
      )
    })
    
    zip.file(`layers/${i.toString().padStart(3, '0')}_${layer.name}.png`, layerBlob)
    
    if (layer.maskEnabled && layer.maskData) {
      const maskCanvas = createCanvas(project.width, project.height)
      const maskCtx = maskCanvas.getContext('2d')!
      maskCtx.putImageData(layer.maskData, 0, 0)
      
      const maskBlob = await new Promise<Blob>((resolve, reject) => {
        maskCanvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create mask PNG')),
          'image/png'
        )
      })
      
      zip.file(`layers/${i.toString().padStart(3, '0')}_${layer.name}_mask.png`, maskBlob)
    }
  }
  
  return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
