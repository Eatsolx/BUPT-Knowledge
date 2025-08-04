<template>
  <div class="home">
    <div class="welcome-section">
      <div class="welcome-content">
        <div class="chat-bubble assistant">
          <div class="message-header">
            <span class="bubble-label">AI：</span>
          </div>
          <div class="message-content">
            <h2>欢迎使用北邮知识库智能体</h2>
            <p>我是基于AI技术的智能问答系统，可以为您提供准确、高效的知识服务。</p>
            <p>您可以询问我关于：</p>
            <ul>
              <li>📝 学校基本信息</li>
              <li>📚 课程信息</li>
              <li>🎓 毕业要求</li>
              <li>🏫 学校规章制度</li>
            </ul>
            <p>点击下方按钮开始对话，或者直接输入您的问题。</p>
          </div>
        </div>
        
        <div class="quick-start">
          <h3>快速开始</h3>
          <div class="quick-actions">
            <button class="quick-button" @click="startChat">开始对话</button>
            <button class="quick-button secondary" @click="showExamples">查看示例</button>
          </div>
        </div>
        
        <div v-if="showExampleQuestions" class="examples-section">
          <h3>您可以这样问我：</h3>
          <div class="example-questions">
            <div class="example-question" @click="askQuestion('北邮有哪些热门专业？')">
              "北邮有哪些热门专业？"
            </div>
            <div class="example-question" @click="askQuestion('学校有奖学金吗？')">
              "学校有奖学金吗？"
            </div>
            <div class="example-question" @click="askQuestion('学校有哪几个食堂？')">
              "学校有哪几个食堂？"
            </div>
            <div class="example-question" @click="askQuestion('如何查询成绩？')">
              "如何查询成绩？"
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onActivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.js'

const router = useRouter()
const showExampleQuestions = ref(false)

onActivated(async () => {
  await nextTick()
  document.body.offsetHeight
})

const startChat = () => {
  router.push('/chat')
}

const showExamples = () => {
  showExampleQuestions.value = !showExampleQuestions.value
}

const askQuestion = (question) => {
  router.push({
    path: '/chat',
    query: { question: question }
  })
}
</script>

<style scoped>
.home {
  height: calc(100vh - 70px);
  background-color: #f5f5f7;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.welcome-section {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  min-width: 300px;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home .chat-bubble {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}

.home .chat-bubble.assistant {
  border-left: 4px solid #007bff;
}

.home .message-header {
  margin-bottom: 10px;
}

.home .bubble-label {
  font-weight: bold;
  color: #007bff;
  font-size: 0.9rem;
}

.home .message-content {
  line-height: 1.6;
}

.home .message-content h2 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.5rem;
}

.home .message-content p {
  color: #666;
  margin-bottom: 10px;
}

.home .message-content ul {
  margin: 15px 0;
  padding-left: 20px;
}

.home .message-content li {
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
}

.quick-start {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-start h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.quick-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.quick-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 120px;
}

.quick-button:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.quick-button.secondary {
  background: #6c757d;
}

.quick-button.secondary:hover {
  background: #545b62;
}

.examples-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.examples-section h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.example-questions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.example-question {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #495057;
  font-size: 0.95rem;
  line-height: 1.4;
}

.example-question:hover {
  background: #e9ecef;
  border-color: #007bff;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .home {
    padding: 15px;
  }
  
  .welcome-section {
    max-width: 100%;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .example-questions {
    grid-template-columns: 1fr;
  }
  
  .message-content h2 {
    font-size: 1.3rem;
  }
}
</style> 