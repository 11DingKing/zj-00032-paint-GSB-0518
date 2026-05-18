import type { BrushSettings, Color } from '@/types'
import { setPixel } from './canvas'

export interface BrushStrokeContext {
  imageData: ImageData
  maskData: ImageData | null
  startX: number
  startY: number
  endX: number
  endY: number
  settings: BrushSettings
  pressure: number
  lastPressure: number
  isEraser: boolean
}

function createBrushMask(
  size: number,
  hardness: number,
  type: BrushSettings['type']
): Uint8ClampedArray {
  const radius = size / 2
  const diameter = Math.ceil(size)
  const mask = new Uint8ClampedArray(diameter * diameter)
  
  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - radius
      const dy = y - radius
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > radius) {
        mask[y * diameter + x] = 0
        continue
      }
      
      let alpha = 1
      const softEdge = radius * (1 - hardness)
      
      if (dist > radius - softEdge && softEdge > 0) {
        alpha = (radius - dist) / softEdge
      }
      
      switch (type) {
        case 'pencil':
          alpha *= 0.6 + Math.random() * 0.4
          if (dist > radius * 0.9) alpha *= 0.5
          break
        case 'crayon':
          alpha *= 0.5 + Math.random() * 0.5
          const noise = (Math.random() - 0.5) * 0.3
          alpha = Math.max(0, Math.min(1, alpha + noise))
          break
        case 'watercolor':
          const edgeFade = 1 - (dist / radius)
          alpha *= 0.4 + edgeFade * 0.6
          alpha *= 0.7 + Math.random() * 0.3
          break
        case 'marker':
          alpha *= dist < radius * 0.8 ? 0.9 : 0.7
          break
        case 'airbrush':
          const airbrushDist = dist / radius
          alpha *= Math.pow(1 - airbrushDist, 2)
          break
        case 'blur':
        case 'smudge':
          alpha *= 1 - (dist / radius) * 0.5
          break
      }
      
      mask[y * diameter + x] = Math.round(alpha * 255)
    }
  }
  
  return mask
}

function applyBrushPixel(
  ctx: BrushStrokeContext,
  x: number,
  y: number,
  baseAlpha: number,
  flow: number,
  pressure: number
): void {
  const { imageData, settings, isEraser } = ctx
  
  if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return
  
  const index = (y * imageData.width + x) * 4
  const alpha = (baseAlpha / 255) * (flow / 100) * pressure
  
  if (isEraser) {
    const existingAlpha = imageData.data[index + 3]
    imageData.data[index + 3] = Math.max(0, existingAlpha - Math.round(alpha * 255))
    if (imageData.data[index + 3] === 0) {
      imageData.data[index] = 0
      imageData.data[index + 1] = 0
      imageData.data[index + 2] = 0
    }
  } else {
    const color: Color = {
      r: settings.color.r,
      g: settings.color.g,
      b: settings.color.b,
      a: alpha
    }
    setPixel(imageData, x, y, color)
  }
}

export function drawBrushDab(
  ctx: BrushStrokeContext
): void {
  const { settings, pressure, isEraser } = ctx
  const actualSize = settings.size * pressure
  const mask = createBrushMask(actualSize, settings.hardness / 100, settings.type)
  const radius = actualSize / 2
  const diameter = mask.length > 0 ? Math.sqrt(mask.length) : 0
  
  if (isEraser && (settings.type === 'blur' || settings.type === 'smudge')) {
    return
  }
  
  for (let my = 0; my < diameter; my++) {
    for (let mx = 0; mx < diameter; mx++) {
      const maskAlpha = mask[my * diameter + mx]
      if (maskAlpha === 0) continue
      
      const px = Math.round(ctx.endX - radius + mx)
      const py = Math.round(ctx.endY - radius + my)
      
      applyBrushPixel(ctx, px, py, maskAlpha, settings.flow, pressure)
    }
  }
}

export function drawBrushLine(
  ctx: BrushStrokeContext
): void {
  const dx = ctx.endX - ctx.startX
  const dy = ctx.endY - ctx.startY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const spacing = Math.max(1, ctx.settings.size * (ctx.settings.spacing / 100))
  
  if (dist === 0) {
    drawBrushDab(ctx)
    return
  }
  
  const steps = Math.max(1, Math.ceil(dist / spacing))
  const pressureStep = (ctx.pressure - ctx.lastPressure) / steps
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = ctx.startX + dx * t
    const y = ctx.startY + dy * t
    const pressure = ctx.lastPressure + pressureStep * i
    
    const dabCtx = { ...ctx, endX: x, endY: y, pressure }
    drawBrushDab(dabCtx)
  }
}

export function applyBlur(
  imageData: ImageData,
  centerX: number,
  centerY: number,
  size: number,
  strength: number
): void {
  const radius = size / 2
  const strengthFactor = strength / 100
  const blurRadius = Math.ceil(radius * 0.3)
  
  if (blurRadius === 0) return
  
  const tempData = new Uint8ClampedArray(imageData.data)
  const width = imageData.width
  const height = imageData.height
  
  const minX = Math.max(0, Math.floor(centerX - radius))
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius))
  const minY = Math.max(0, Math.floor(centerY - radius))
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius))
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > radius) continue
      
      let r = 0, g = 0, b = 0, a = 0, count = 0
      
      for (let by = -blurRadius; by <= blurRadius; by++) {
        for (let bx = -blurRadius; bx <= blurRadius; bx++) {
          const sx = x + bx
          const sy = y + by
          
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
          
          const sIdx = (sy * width + sx) * 4
          r += tempData[sIdx]
          g += tempData[sIdx + 1]
          b += tempData[sIdx + 2]
          a += tempData[sIdx + 3]
          count++
        }
      }
      
      if (count > 0) {
        const idx = (y * width + x) * 4
        const blurAmount = strengthFactor * (1 - dist / radius)
        imageData.data[idx] = Math.round(tempData[idx] * (1 - blurAmount) + (r / count) * blurAmount)
        imageData.data[idx + 1] = Math.round(tempData[idx + 1] * (1 - blurAmount) + (g / count) * blurAmount)
        imageData.data[idx + 2] = Math.round(tempData[idx + 2] * (1 - blurAmount) + (b / count) * blurAmount)
        imageData.data[idx + 3] = Math.round(tempData[idx + 3] * (1 - blurAmount) + (a / count) * blurAmount)
      }
    }
  }
}

export function applySmudge(
  imageData: ImageData,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  size: number,
  strength: number
): void {
  const radius = size / 2
  const strengthFactor = strength / 100
  const width = imageData.width
  const height = imageData.height
  
  const dx = endX - startX
  const dy = endY - startY
  const dist = Math.sqrt(dx * dx + dy * dy)
  
  if (dist === 0) return
  
  const steps = Math.ceil(dist / 2)
  const tempData = new Uint8ClampedArray(imageData.data)
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const cx = startX + dx * t
    const cy = startY + dy * t
    const sampleX = startX + dx * (t - 0.1)
    const sampleY = startY + dy * (t - 0.1)
    
    const sampleMinX = Math.max(0, Math.floor(sampleX - radius))
    const sampleMaxX = Math.min(width - 1, Math.ceil(sampleX + radius))
    const sampleMinY = Math.max(0, Math.floor(sampleY - radius))
    const sampleMaxY = Math.min(height - 1, Math.ceil(sampleY + radius))
    
    let sampleR = 0, sampleG = 0, sampleB = 0, sampleA = 0, sampleCount = 0
    
    for (let y = sampleMinY; y <= sampleMaxY; y++) {
      for (let x = sampleMinX; x <= sampleMaxX; x++) {
        const d = Math.sqrt((x - sampleX) ** 2 + (y - sampleY) ** 2)
        if (d > radius) continue
        
        const idx = (y * width + x) * 4
        const weight = 1 - d / radius
        sampleR += tempData[idx] * weight
        sampleG += tempData[idx + 1] * weight
        sampleB += tempData[idx + 2] * weight
        sampleA += tempData[idx + 3] * weight
        sampleCount += weight
      }
    }
    
    if (sampleCount === 0) continue
    
    sampleR /= sampleCount
    sampleG /= sampleCount
    sampleB /= sampleCount
    sampleA /= sampleCount
    
    const targetMinX = Math.max(0, Math.floor(cx - radius))
    const targetMaxX = Math.min(width - 1, Math.ceil(cx + radius))
    const targetMinY = Math.max(0, Math.floor(cy - radius))
    const targetMaxY = Math.min(height - 1, Math.ceil(cy + radius))
    
    for (let y = targetMinY; y <= targetMaxY; y++) {
      for (let x = targetMinX; x <= targetMaxX; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        if (d > radius) continue
        
        const idx = (y * width + x) * 4
        const blend = strengthFactor * (1 - d / radius) * (1 - t * 0.5)
        
        imageData.data[idx] = Math.round(imageData.data[idx] * (1 - blend) + sampleR * blend)
        imageData.data[idx + 1] = Math.round(imageData.data[idx + 1] * (1 - blend) + sampleG * blend)
        imageData.data[idx + 2] = Math.round(imageData.data[idx + 2] * (1 - blend) + sampleB * blend)
        imageData.data[idx + 3] = Math.round(imageData.data[idx + 3] * (1 - blend) + sampleA * blend)
      }
    }
  }
}

export function calculatePressureFromSpeed(
  speed: number,
  pressureCurve: number
): number {
  const maxSpeed = 20
  const normalizedSpeed = Math.min(1, speed / maxSpeed)
  
  let pressure = 1 - normalizedSpeed
  
  const curve = pressureCurve / 100
  if (curve > 0.5) {
    pressure = Math.pow(pressure, 2 - curve * 2)
  } else {
    pressure = 1 - Math.pow(1 - pressure, curve * 2 + 0.5)
  }
  
  return Math.max(0.1, Math.min(1, pressure))
}

export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: Color,
  tolerance: number
): void {
  const width = imageData.width
  const height = imageData.height
  
  const startIdx = (startY * width + startX) * 4
  const startR = imageData.data[startIdx]
  const startG = imageData.data[startIdx + 1]
  const startB = imageData.data[startIdx + 2]
  const startA = imageData.data[startIdx + 3]
  
  const toleranceValue = Math.floor(tolerance * 2.55 * 3)
  const visited = new Set<number>()
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()!
    const key = y * width + x
    
    if (visited.has(key)) continue
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    
    const idx = key * 4
    const dr = imageData.data[idx] - startR
    const dg = imageData.data[idx + 1] - startG
    const db = imageData.data[idx + 2] - startB
    const da = imageData.data[idx + 3] - startA
    const diff = Math.abs(dr) + Math.abs(dg) + Math.abs(db) + Math.abs(da)
    
    if (diff > toleranceValue) continue
    
    visited.add(key)
    
    imageData.data[idx] = fillColor.r
    imageData.data[idx + 1] = fillColor.g
    imageData.data[idx + 2] = fillColor.b
    imageData.data[idx + 3] = Math.round(fillColor.a * 255)
    
    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }
}
