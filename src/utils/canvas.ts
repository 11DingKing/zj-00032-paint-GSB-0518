import type { Color, BlendMode } from '@/types'

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function createImageData(width: number, height: number): ImageData {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  return ctx.createImageData(width, height)
}

export function cloneImageData(imageData: ImageData): ImageData {
  const cloned = new ImageData(imageData.width, imageData.height)
  cloned.data.set(imageData.data)
  return cloned
}

export function clearImageData(imageData: ImageData): void {
  imageData.data.fill(0)
}

export function fillImageData(imageData: ImageData, color: Color): void {
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = color.r
    imageData.data[i + 1] = color.g
    imageData.data[i + 2] = color.b
    imageData.data[i + 3] = Math.round(color.a * 255)
  }
}

export function getPixel(imageData: ImageData, x: number, y: number): Color | null {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return null
  }
  const index = (y * imageData.width + x) * 4
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3] / 255
  }
}

export function setPixel(imageData: ImageData, x: number, y: number, color: Color): void {
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return
  }
  const index = (y * imageData.width + x) * 4
  const alpha = color.a
  if (alpha === 0) return
  
  if (alpha === 1) {
    imageData.data[index] = color.r
    imageData.data[index + 1] = color.g
    imageData.data[index + 2] = color.b
    imageData.data[index + 3] = 255
  } else {
    const existingR = imageData.data[index]
    const existingG = imageData.data[index + 1]
    const existingB = imageData.data[index + 2]
    const existingA = imageData.data[index + 3] / 255
    
    const outA = alpha + existingA * (1 - alpha)
    if (outA === 0) return
    
    imageData.data[index] = Math.round((color.r * alpha + existingR * existingA * (1 - alpha)) / outA)
    imageData.data[index + 1] = Math.round((color.g * alpha + existingG * existingA * (1 - alpha)) / outA)
    imageData.data[index + 2] = Math.round((color.b * alpha + existingB * existingA * (1 - alpha)) / outA)
    imageData.data[index + 3] = Math.round(outA * 255)
  }
}

export function copyImageDataRegion(
  source: ImageData,
  target: ImageData,
  sx: number, sy: number, sw: number, sh: number,
  tx: number, ty: number
): void {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const srcX = sx + x
      const srcY = sy + y
      const tgtX = tx + x
      const tgtY = ty + y
      
      if (srcX < 0 || srcX >= source.width || srcY < 0 || srcY >= source.height) continue
      if (tgtX < 0 || tgtX >= target.width || tgtY < 0 || tgtY >= target.height) continue
      
      const srcIndex = (srcY * source.width + srcX) * 4
      const tgtIndex = (tgtY * target.width + tgtX) * 4
      
      target.data[tgtIndex] = source.data[srcIndex]
      target.data[tgtIndex + 1] = source.data[srcIndex + 1]
      target.data[tgtIndex + 2] = source.data[srcIndex + 2]
      target.data[tgtIndex + 3] = source.data[srcIndex + 3]
    }
  }
}

export function blendColors(base: Color, blend: Color, mode: BlendMode): Color {
  const result: Color = { r: 0, g: 0, b: 0, a: blend.a }
  
  const bR = base.r / 255
  const bG = base.g / 255
  const bB = base.b / 255
  const sR = blend.r / 255
  const sG = blend.g / 255
  const sB = blend.b / 255
  
  function blendChannel(b: number, s: number): number {
    switch (mode) {
      case 'normal': return s
      case 'multiply': return b * s
      case 'screen': return 1 - (1 - b) * (1 - s)
      case 'overlay': return b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)
      case 'darken': return Math.min(b, s)
      case 'lighten': return Math.max(b, s)
      case 'color-dodge': return s === 1 ? 1 : Math.min(1, b / (1 - s))
      case 'color-burn': return s === 0 ? 0 : 1 - Math.min(1, (1 - b) / s)
      case 'hard-light': return s < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)
      case 'soft-light': return s < 0.5 
        ? b - (1 - 2 * s) * b * (1 - b)
        : b + (2 * s - 1) * ((b < 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b)
      case 'difference': return Math.abs(b - s)
      case 'exclusion': return b + s - 2 * b * s
      default: return s
    }
  }
  
  result.r = Math.round(blendChannel(bR, sR) * 255)
  result.g = Math.round(blendChannel(bG, sG) * 255)
  result.b = Math.round(blendChannel(bB, sB) * 255)
  
  return result
}

export function getBlendModeString(mode: BlendMode): GlobalCompositeOperation {
  const map: Record<BlendMode, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion'
  }
  return map[mode]
}

export function colorToString(color: Color): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
}

export function hexToColor(hex: string): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 1
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

export function colorToHex(color: Color): string {
  return '#' + [color.r, color.g, color.b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function rgbToHsv(color: Color): { h: number; s: number; v: number } {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  
  return { h, s, v }
}

export function hsvToRgb(h: number, s: number, v: number): Color {
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: 1
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function calculateDirtyRect(
  before: ImageData,
  after: ImageData
): { x: number; y: number; width: number; height: number } {
  let minX = before.width
  let minY = before.height
  let maxX = 0
  let maxY = 0
  
  for (let y = 0; y < before.height; y++) {
    for (let x = 0; x < before.width; x++) {
      const idx = (y * before.width + x) * 4
      const changed = 
        before.data[idx] !== after.data[idx] ||
        before.data[idx + 1] !== after.data[idx + 1] ||
        before.data[idx + 2] !== after.data[idx + 2] ||
        before.data[idx + 3] !== after.data[idx + 3]
      
      if (changed) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
}
