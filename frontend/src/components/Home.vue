<template>
  <!-- 首页主容器 -->
  <div class="home">
    <!-- 英雄区域 -->
    <div class="hero-section">
      <div class="hero-content">
        <!-- 主标题 -->
        <h1 class="title">北京邮电大学知识库智能体</h1>
        <!-- 副标题 -->
        <p class="subtitle">基于AI技术的智能问答系统，为您提供准确、高效的知识服务</p>
        
        <!-- 功能特性展示 -->
        <div class="features">
          <!-- 智能问答特性 -->
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <h3>智能问答</h3>
            <p>基于AI的智能对话系统</p>
          </div>
          <!-- 快速响应特性 -->
          <div class="feature">
            <div class="feature-icon">⚡</div>
            <h3>快速响应</h3>
            <p>实时流式响应，体验流畅</p>
          </div>
        </div>
        
        <!-- 开始对话按钮 -->
        <router-link to="/chat" class="start-button">开始对话</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// 首页组件逻辑
// 当前为静态展示页面，无需额外逻辑
</script>

<style scoped>
/* 首页主容器样式 */
.home {
  height: calc(100vh - 70px);  /* 减去导航栏高度 */
  display: flex;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* 渐变背景 */
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* 英雄区域样式 */
.hero-section {
  text-align: center;
  margin-top: 8%;
  max-width: 800px;
  padding: 20px;
  width: 100%;
}

/* 英雄内容容器样式 */
.hero-content {
  background: rgba(255, 255, 255, 0.95);  /* 半透明白色背景 */
  border-radius: 20px;
  padding: 40px 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);  /* 阴影效果 */
  max-height: 80vh;
  overflow-y: auto;
}

/* 主标题样式 */
.title {
  font-size: 2.2rem;
  color: #333;
  margin-bottom: 15px;
  font-weight: bold;
}

/* 副标题样式 */
.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
}

/* 功能特性容器样式 */
.features {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

/* 单个功能特性样式 */
.feature {
  flex: 1;
  min-width: 180px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 15px;
  transition: transform 0.3s ease;  /* 悬停动画 */
}

/* 功能特性悬停效果 */
.feature:hover {
  transform: translateY(-5px);
}

/* 功能图标样式 */
.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

/* 功能标题样式 */
.feature h3 {
  color: #333;
  margin-bottom: 8px;
  font-size: 1.1rem;
}

/* 功能描述样式 */
.feature p {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
}

/* 开始对话按钮样式 */
.start-button {
  display: inline-block;
  background: linear-gradient(45deg, #667eea, #764ba2);  /* 渐变背景 */
  color: white;
  padding: 12px 30px;
  border-radius: 50px;
  text-decoration: none;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

/* 开始按钮悬停效果 */
.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
}

/* 响应式设计 - 移动端适配 */
@media (max-width: 768px) {
  .title {
    font-size: 1.8rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .features {
    flex-direction: column;
    align-items: center;
  }
  
  .feature {
    min-width: 220px;
  }
  
  .hero-content {
    padding: 30px 20px;
  }
}
</style> 