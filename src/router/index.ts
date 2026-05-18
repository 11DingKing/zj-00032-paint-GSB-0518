import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'project-list',
      component: () => import('../views/ProjectListView.vue')
    },
    {
      path: '/canvas/:projectId?',
      name: 'canvas',
      component: () => import('../views/CanvasView.vue')
    }
  ]
})

export default router
