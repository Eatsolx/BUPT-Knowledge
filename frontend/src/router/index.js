import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import ChatInterface from '../components/ChatInterface.vue'

/**
 * 路由配置数组
 * 定义应用的所有路由路径和对应的组件
 */
const routes = [
  {
    path: '/',  // 根路径
    name: 'Home',  // 路由名称
    component: Home  // 首页组件
  },
  {
    path: '/chat',  // 聊天页面路径
    name: 'Chat',  // 路由名称
    component: ChatInterface  // 聊天界面组件
  }
]

/**
 * 创建Vue Router实例
 * 使用HTML5历史模式，支持更友好的URL
 */
const router = createRouter({
  history: createWebHistory(),  // 使用HTML5历史模式
  routes  // 路由配置
})

export default router 