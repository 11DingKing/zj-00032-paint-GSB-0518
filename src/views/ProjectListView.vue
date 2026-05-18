<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { PRESET_SIZES } from '@/types'

const router = useRouter()
const projectStore = useProjectStore()

const showNewProjectModal = ref(false)
const newProjectName = ref('未命名项目')
const newProjectWidth = ref(1000)
const newProjectHeight = ref(1000)
const newProjectDPI = ref(72)
const customSize = ref(false)

onMounted(() => {
  projectStore.loadProjectList()
})

function selectPreset(index: number) {
  if (index >= 0) {
    const preset = PRESET_SIZES[index]
    newProjectWidth.value = preset.width
    newProjectHeight.value = preset.height
    newProjectDPI.value = preset.dpi
    customSize.value = false
  } else {
    customSize.value = true
  }
}

async function createProject() {
  const project = await projectStore.createNewProject(
    newProjectName.value,
    newProjectWidth.value,
    newProjectHeight.value,
    newProjectDPI.value
  )
  showNewProjectModal.value = false
  router.push(`/canvas/${project.id}`)
}

async function openProject(id: string) {
  await projectStore.openProject(id)
  router.push(`/canvas/${id}`)
}

async function deleteProject(id: string, event: Event) {
  event.stopPropagation()
  if (confirm('确定要删除这个项目吗？此操作无法撤销。')) {
    await projectStore.deleteProject(id)
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="project-list-view">
    <header class="header">
      <h1>Paint App</h1>
      <button class="btn-primary" @click="showNewProjectModal = true">
        + 新建项目
      </button>
    </header>
    
    <main class="content">
      <div v-if="projectStore.projectList.length === 0 && !projectStore.isLoading" class="empty-state">
        <div class="empty-icon">🎨</div>
        <h2>还没有项目</h2>
        <p>点击上方按钮创建你的第一个绘画项目</p>
      </div>
      
      <div v-else class="project-grid">
        <div
          v-for="project in projectStore.projectList"
          :key="project.id"
          class="project-card"
          @click="openProject(project.id)"
        >
          <div class="project-thumbnail">
            <img
              v-if="project.thumbnail"
              :src="project.thumbnail"
              :alt="project.name"
            />
            <div v-else class="thumbnail-placeholder">
              <span>{{ project.width }} x {{ project.height }}</span>
            </div>
          </div>
          <div class="project-info">
            <h3>{{ project.name }}</h3>
            <p class="project-size">{{ project.width }} × {{ project.height }}</p>
            <p class="project-date">{{ formatDate(project.updatedAt) }}</p>
            <button class="delete-btn" @click="deleteProject(project.id, $event)">
              删除
            </button>
          </div>
        </div>
      </div>
    </main>
    
    <div v-if="showNewProjectModal" class="modal-overlay" @click.self="showNewProjectModal = false">
      <div class="modal">
        <h2>新建项目</h2>
        
        <div class="form-group">
          <label>项目名称</label>
          <input
            type="text"
            v-model="newProjectName"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>画布尺寸</label>
          <select class="form-input" @change="selectPreset(($event.target as HTMLSelectElement).selectedIndex - 1)">
            <option value="" disabled selected>选择预设...</option>
            <option v-for="(preset, index) in PRESET_SIZES" :key="index" :value="preset.name">
              {{ preset.name }}
            </option>
            <option value="custom">自定义</option>
          </select>
        </div>
        
        <div class="size-inputs" v-if="customSize">
          <div class="form-group">
            <label>宽度 (px)</label>
            <input
              type="number"
              v-model.number="newProjectWidth"
              class="form-input"
              min="1"
              max="10000"
            />
          </div>
          <div class="form-group">
            <label>高度 (px)</label>
            <input
              type="number"
              v-model.number="newProjectHeight"
              class="form-input"
              min="1"
              max="10000"
            />
          </div>
          <div class="form-group">
            <label>DPI</label>
            <input
              type="number"
              v-model.number="newProjectDPI"
              class="form-input"
              min="72"
              max="600"
            />
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="showNewProjectModal = false">取消</button>
          <button class="btn-primary" @click="createProject">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-list-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  border-bottom: 1px solid var(--border);
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
}

.btn-primary {
  background: var(--accent);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.project-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}

.project-thumbnail {
  aspect-ratio: 1;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumbnail-placeholder {
  color: var(--text-muted);
  font-size: 14px;
}

.project-info {
  padding: 16px;
  position: relative;
}

.project-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-size,
.project-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.project-date {
  margin-top: 4px;
}

.delete-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--danger);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-card:hover .delete-btn {
  opacity: 1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow);
}

.modal h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--accent);
}

.size-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
