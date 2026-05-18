<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { colorToHex, hexToColor, rgbToHsv, hsvToRgb, colorToString } from '@/utils/canvas'
import type { Color } from '@/types'

const settingsStore = useSettingsStore()

const hue = ref(0)
const saturation = ref(100)
const value = ref(100)

const fgColor = computed(() => settingsStore.foregroundColor)
const bgColor = computed(() => settingsStore.backgroundColor)

const hexValue = computed({
  get: () => colorToHex(fgColor.value),
  set: (val: string) => {
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const color = hexToColor(val)
      const hsv = rgbToHsv(color)
      hue.value = hsv.h * 360
      saturation.value = hsv.s * 100
      value.value = hsv.v * 100
      settingsStore.setForegroundColor(color)
    }
  }
})

const redValue = computed({
  get: () => fgColor.value.r,
  set: (val: number) => updateFromRgb(val, 'r')
})

const greenValue = computed({
  get: () => fgColor.value.g,
  set: (val: number) => updateFromRgb(val, 'g')
})

const blueValue = computed({
  get: () => fgColor.value.b,
  set: (val: number) => updateFromRgb(val, 'b')
})

const alphaValue = computed({
  get: () => Math.round(fgColor.value.a * 100),
  set: (val: number) => {
    const color = { ...fgColor.value, a: val / 100 }
    settingsStore.setForegroundColor(color)
  }
})

function updateFromHsv() {
  const color = hsvToRgb(hue.value / 360, saturation.value / 100, value.value / 100)
  color.a = fgColor.value.a
  settingsStore.setForegroundColor(color)
}

function updateFromRgb(newValue: number, channel: 'r' | 'g' | 'b') {
  const color = { ...fgColor.value }
  color[channel] = Math.max(0, Math.min(255, newValue))
  const hsv = rgbToHsv(color)
  hue.value = hsv.h * 360
  saturation.value = hsv.s * 100
  value.value = hsv.v * 100
  settingsStore.setForegroundColor(color)
}

function selectRecentColor(color: Color) {
  const hsv = rgbToHsv(color)
  hue.value = hsv.h * 360
  saturation.value = hsv.s * 100
  value.value = hsv.v * 100
  settingsStore.setForegroundColor(color)
}
</script>

<template>
  <div class="color-picker">
    <div class="panel-header">
      <span class="panel-title">颜色</span>
    </div>
    
    <div class="color-preview-section">
      <div class="color-swatches">
        <button
          class="swatch foreground"
          :style="{ background: colorToString(fgColor) }"
          @click="settingsStore.setForegroundColor(fgColor)"
        ></button>
        <button
          class="swatch background"
          :style="{ background: colorToString(bgColor) }"
          @click="settingsStore.swapColors()"
          title="点击交换颜色"
        ></button>
      </div>
      
      <div class="color-values">
        <div class="value-row">
          <label>HEX</label>
          <input
            type="text"
            v-model="hexValue"
            maxlength="7"
            class="hex-input"
          />
        </div>
      </div>
    </div>
    
    <div class="color-wheel-section">
      <div class="saturation-value">
        <div 
          class="sv-gradient"
          :style="{ background: `hsl(${hue}, 100%, 50%)` }"
        >
          <div class="white-gradient"></div>
          <div class="black-gradient"></div>
        </div>
        <div 
          class="sv-cursor"
          :style="{
            left: `${saturation}%`,
            bottom: `${value}%`,
            background: colorToString(fgColor)
          }"
        ></div>
      </div>
      
      <div class="hue-slider">
        <input
          type="range"
          min="0"
          max="360"
          v-model.number="hue"
          @input="updateFromHsv"
          class="hue-input"
        />
      </div>
      
      <div class="alpha-slider">
        <div class="alpha-track">
          <div class="alpha-gradient" :style="{
            background: `linear-gradient(to right, transparent, ${colorToString({ ...fgColor, a: 1 })})`
          }"></div>
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="alphaValue"
            class="alpha-input"
          />
        </div>
      </div>
    </div>
    
    <div class="rgb-sliders">
      <div class="rgb-row">
        <span class="rgb-label">R</span>
        <input
          type="range"
          min="0"
          max="255"
          v-model.number="redValue"
          class="rgb-input"
          :style="{ background: `linear-gradient(to right, #000000, #ff0000)` }"
        />
        <input
          type="number"
          min="0"
          max="255"
          v-model.number="redValue"
          class="rgb-number"
        />
      </div>
      
      <div class="rgb-row">
        <span class="rgb-label">G</span>
        <input
          type="range"
          min="0"
          max="255"
          v-model.number="greenValue"
          class="rgb-input"
          :style="{ background: `linear-gradient(to right, #000000, #00ff00)` }"
        />
        <input
          type="number"
          min="0"
          max="255"
          v-model.number="greenValue"
          class="rgb-number"
        />
      </div>
      
      <div class="rgb-row">
        <span class="rgb-label">B</span>
        <input
          type="range"
          min="0"
          max="255"
          v-model.number="blueValue"
          class="rgb-input"
          :style="{ background: `linear-gradient(to right, #000000, #0000ff)` }"
        />
        <input
          type="number"
          min="0"
          max="255"
          v-model.number="blueValue"
          class="rgb-number"
        />
      </div>
    </div>
    
    <div class="recent-colors">
      <div class="recent-label">最近使用</div>
      <div class="recent-grid">
        <button
          v-for="(color, index) in settingsStore.recentColors"
          :key="index"
          class="recent-swatch"
          :style="{ background: colorToString(color) }"
          @click="selectRecentColor(color)"
          :title="colorToHex(color)"
        ></button>
      </div>
    </div>
    
    <div class="tips">
      <span>💡 按住 Alt 点击画布取色</span>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
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

.color-preview-section {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}

.color-swatches {
  position: relative;
  width: 60px;
  height: 60px;
}

.swatch {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.swatch.foreground {
  z-index: 2;
}

.swatch.background {
  bottom: 0;
  right: 0;
  z-index: 1;
}

.color-values {
  flex: 1;
}

.value-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-row label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 30px;
}

.hex-input {
  flex: 1;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: monospace;
  text-transform: uppercase;
}

.color-wheel-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.saturation-value {
  position: relative;
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  margin-bottom: 12px;
}

.sv-gradient {
  position: absolute;
  inset: 0;
}

.white-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #ffffff, transparent);
}

.black-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #000000, transparent);
}

.sv-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, 50%);
  pointer-events: none;
}

.hue-slider,
.alpha-slider {
  margin-bottom: 10px;
}

.hue-input {
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, 
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
  appearance: none;
  cursor: pointer;
}

.hue-input::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 20px;
  background: white;
  border: 2px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.alpha-track {
  position: relative;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 12px 12px;
}

.alpha-gradient {
  position: absolute;
  inset: 0;
  border-radius: 6px;
}

.alpha-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.rgb-sliders {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.rgb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rgb-label {
  width: 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.rgb-input {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  appearance: none;
  cursor: pointer;
}

.rgb-input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 16px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 3px;
  cursor: pointer;
}

.rgb-number {
  width: 48px;
  padding: 4px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  text-align: center;
}

.recent-colors {
  padding: 12px 16px;
}

.recent-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.recent-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: transform 0.1s;
}

.recent-swatch:hover {
  transform: scale(1.1);
}

.tips {
  padding: 8px 16px 12px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}
</style>
