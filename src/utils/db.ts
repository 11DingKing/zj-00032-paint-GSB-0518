import type { Project, ProjectMetadata, Layer, HistoryStep } from '@/types'

const DB_NAME = 'paint-app-db'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      
      if (!db.objectStoreNames.contains('layers')) {
        const layerStore = db.createObjectStore('layers', { keyPath: 'id', autoIncrement: true })
        layerStore.createIndex('projectId', 'projectId', { unique: false })
      }
      
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'projectId' })
      }
    }
  })
}

export async function saveProjectMetadata(metadata: ProjectMetadata): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readwrite')
    const store = transaction.objectStore('projects')
    const request = store.put(metadata)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getProjectMetadata(id: string): Promise<ProjectMetadata | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readonly')
    const store = transaction.objectStore('projects')
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllProjectMetadata(): Promise<ProjectMetadata[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('projects', 'readonly')
    const store = transaction.objectStore('projects')
    const index = store.index('updatedAt')
    const request = index.openCursor(null, 'prev')
    const results: ProjectMetadata[] = []
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['projects', 'layers', 'history'], 'readwrite')
    transaction.objectStore('projects').delete(id)
    
    const layerStore = transaction.objectStore('layers')
    const layerIndex = layerStore.index('projectId')
    const cursor = layerIndex.openCursor(IDBKeyRange.only(id))
    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (c) {
        layerStore.delete(c.primaryKey)
        c.continue()
      }
    }
    
    transaction.objectStore('history').delete(id)
    
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function saveProjectLayers(projectId: string, layers: Layer[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('layers', 'readwrite')
    const store = transaction.objectStore('layers')
    const index = store.index('projectId')
    const cursor = index.openCursor(IDBKeyRange.only(projectId))
    
    cursor.onsuccess = (event) => {
      const c = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (c) {
        store.delete(c.primaryKey)
        c.continue()
      }
    }
    
    transaction.oncomplete = () => {
      const trans2 = db.transaction('layers', 'readwrite')
      const store2 = trans2.objectStore('layers')
      layers.forEach((layer) => {
        store2.add({ projectId, layer })
      })
      trans2.oncomplete = () => resolve()
      trans2.onerror = () => reject(trans2.error)
    }
    
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getProjectLayers(projectId: string): Promise<Layer[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('layers', 'readonly')
    const store = transaction.objectStore('layers')
    const index = store.index('projectId')
    const request = index.getAll(IDBKeyRange.only(projectId))
    
    request.onsuccess = () => {
      const results = (request.result as Array<{ projectId: string; layer: Layer }>) || []
      resolve(results.map(r => r.layer))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveProjectHistory(projectId: string, history: HistoryStep[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('history', 'readwrite')
    const store = transaction.objectStore('history')
    const request = store.put({ projectId, steps: history.slice(0, 50) })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getProjectHistory(projectId: string): Promise<HistoryStep[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('history', 'readonly')
    const store = transaction.objectStore('history')
    const request = store.get(projectId)
    request.onsuccess = () => resolve((request.result as { steps: HistoryStep[] } | undefined)?.steps || [])
    request.onerror = () => reject(request.error)
  })
}

export async function saveProject(project: Project): Promise<void> {
  const metadata: ProjectMetadata = {
    id: project.id,
    name: project.name,
    thumbnail: project.thumbnail,
    width: project.width,
    height: project.height,
    dpi: project.dpi,
    createdAt: project.createdAt,
    updatedAt: Date.now()
  }
  
  await saveProjectMetadata(metadata)
  await saveProjectLayers(project.id, project.layers)
  await saveProjectHistory(project.id, project.history)
}

export async function loadProject(id: string): Promise<Project | null> {
  const metadata = await getProjectMetadata(id)
  if (!metadata) return null
  
  const layers = await getProjectLayers(id)
  const history = await getProjectHistory(id)
  
  return {
    ...metadata,
    layers,
    currentLayerId: layers.length > 0 ? layers[0].id : '',
    background: { r: 255, g: 255, b: 255, a: 1 },
    history,
    historyIndex: history.length,
    selection: null
  }
}
