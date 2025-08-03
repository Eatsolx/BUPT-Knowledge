<script setup>
import { useRouter } from 'vue-router'

// 获取路由实例
const router = useRouter()

/**
 * 导航到指定路径
 * @param {string} path - 目标路径
 */
const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <!-- 应用根容器 -->
  <div id="app">
    <!-- 导航菜单 -->
    <nav class="navbar">
      <div class="nav-container">
        <!-- 品牌标识 -->
        <div class="nav-brand">
          <router-link to="/" class="brand-link">北邮知识库智能体</router-link>
        </div>
        <!-- 导航菜单项 -->
        <div class="nav-menu">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/chat" class="nav-link">聊天</router-link>
        </div>
      </div>
    </nav>

    <!-- 路由视图容器 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <!-- 使用keep-alive保持组件状态 -->
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* HTML和body基础样式 */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
}

/* 应用根容器样式 */
#app {
  min-height: 100vh;
  background-color: #f5f5f7;
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
}

/* 导航栏样式 */
.navbar {
  background-color: #333;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
}

/* 导航容器样式 */
.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
}

/* 品牌链接样式 */
.nav-brand .brand-link {
  color: white;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
}

/* 导航菜单样式 */
.nav-menu {
  display: flex;
  gap: 20px;
}

/* 导航链接样式 */
.nav-link {
  color: #ccc;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

/* 导航链接悬停和激活状态 */
.nav-link:hover,
.nav-link.router-link-active {
  color: white;
  background-color: #555;
}

/* 主内容区域样式 */
.main-content {
  padding: 0;
  margin: 0;
  height: calc(100vh - 80px); /* 减去导航栏高度 */
}
</style>
