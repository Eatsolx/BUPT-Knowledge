import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import ChatInterface from '../components/ChatInterface.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatInterface
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 