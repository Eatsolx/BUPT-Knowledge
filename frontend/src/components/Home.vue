<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="title">北京邮电大学知识库智能体</h1>
        <p class="subtitle">基于AI技术的智能问答系统，为您提供准确、高效的知识服务</p>
        <div class="features">
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <h3>智能问答</h3>
            <p>基于AI的智能对话系统</p>
          </div>
          <div class="feature">
            <div class="feature-icon">⚡</div>
            <h3>快速响应</h3>
            <p>实时流式响应，体验流畅</p>
          </div>
        </div>
        <router-link to="/chat" class="start-button">开始对话</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// 首页组件逻辑
</script>

<style scoped>
.home {
  height: calc(100vh - 70px);
  display: flex;
  /* align-items: center; */
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  width: 100%;
  position: relative;
  z-index: 1;
}

.hero-section {
  text-align: center;
  margin-top: 8%;
  max-width: 800px;
  padding: 20px;
  width: 100%;
}

.hero-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 40px 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.title {
  font-size: 2.2rem;
  color: #333;
  margin-bottom: 15px;
  font-weight: bold;
}

.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
}

.features {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.feature {
  flex: 1;
  min-width: 180px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 15px;
  transition: transform 0.3s ease;
}

.feature:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.feature h3 {
  color: #333;
  margin-bottom: 8px;
  font-size: 1.1rem;
}

.feature p {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
}

.start-button {
  display: inline-block;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 12px 30px;
  border-radius: 50px;
  text-decoration: none;
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
}

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