// 导入主样式文件（当前已注释）
// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

/**
 * 创建Vue应用实例
 * 这是应用的入口点，负责初始化Vue应用
 */
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())
// 使用Vue Router路由管理
app.use(router)

// 将应用挂载到DOM元素
app.mount('#app')
