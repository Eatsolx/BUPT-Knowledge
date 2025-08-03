import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

/**
 * Vite构建工具配置
 * 定义项目的构建和开发配置
 * 参见: https://vite.dev/config/
 */
export default defineConfig({
  // 插件配置
  plugins: [
    vue(),  // Vue.js支持插件
    vueDevTools(),  // Vue开发工具插件
  ],
  // 路径解析配置
  resolve: {
    alias: {
      // 设置@别名指向src目录，简化导入路径
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
