<template>
  <div class="chat-container">
    <div class="chat-history" ref="chatHistory">
      <div v-for="(msg, idx) in messages" :key="idx" class="message-container">
        <div :class="['chat-bubble', msg.role]">
          <div class="message-header">
            <span v-if="msg.role === 'user'" class="bubble-label">你：</span>
            <span v-if="msg.role === 'assistant'" class="bubble-label">AI：</span>
          </div>
          <div v-if="msg.role === 'assistant' && msg.content.includes('思考过程：')" class="ai-content">
            <div class="reasoning">{{ getReasoning(msg.content) }}</div>
            <div class="answer markdown-body" v-html="renderMarkdown(getAnswer(msg.content))"></div>
          </div>
          <div v-else v-html="renderMarkdown(msg.content)" class="message-content markdown-body"></div>
          <div class="message-actions">
            <button 
              class="copy-button" 
              @click="copyMessageHandler(msg.content)"
              :title="copyStatus[idx] || (msg.content.includes('思考过程：') ? '复制最终答案' : '复制消息')"
              :data-message-index="idx"
            >
              {{ copyStatus[idx] === '已复制' ? '已复制' : '复制' }}
            </button>
            <button 
              v-if="msg.role === 'assistant' && msg.isStreaming" 
              class="cancel-button" 
              @click="cancelStreamHandler(msg)"
              title="中断输出"
            >
              中断
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat">
      <textarea
        class="chat-input"
        ref="inputRef"
        v-model="input"
        placeholder="请输入您的问题..."
        rows="1"
        @input="autoResizeHandler"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="chat-button" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onActivated, onUnmounted } from 'vue'
import { useSessionStore } from '../stores/session.js'
import { useChat } from '../composables/useChat.js'
import { renderMarkdown, getReasoning, getAnswer, applyCodeHighlighting } from '../utils/markdown.js'
import { scrollToBottom, autoResize, copyMessage } from '../utils/ui.js'

// 异步加载CSS，减少页面加载时的内存使用
import('../assets/chat-interface.css')
import('highlight.js/styles/github.css')
import('github-markdown-css/github-markdown.css')

const input = ref('')
const inputRef = ref(null)
const chatHistory = ref(null)
const copyStatus = ref({})

// 使用会话状态管理
const sessionStore = useSessionStore()

// 使用聊天逻辑组合式函数
const { messages, currentStreamController, sendMessage, handleStreamResponse, cancelStream } = useChat()

// 内存监控和清理
let memoryCheckInterval = null

// 合并onMounted钩子
onMounted(() => {
  // 如果没有消息，添加欢迎消息
  if (messages.value.length === 0) {
    const welcomeMessage = { role: 'assistant', content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' }
    messages.value.push(welcomeMessage)
    sessionStore.addMessage(welcomeMessage)
  }
  
  // 定期检查内存使用情况（延迟启动，避免页面加载时立即执行）
  setTimeout(() => {
    memoryCheckInterval = setInterval(() => {
      // 如果消息数量过多，清理旧消息
      if (messages.value.length > 30) {
        const recentMessages = messages.value.slice(-15)
        messages.value = recentMessages
        sessionStore.resetMessages(recentMessages)
      }
      
      // 清理过期的复制状态
      const now = Date.now()
      Object.keys(copyStatus.value).forEach(key => {
        if (copyStatus.value[key] === '已复制' && now - copyStatus.value[key + '_time'] > 5000) {
          delete copyStatus.value[key]
          delete copyStatus.value[key + '_time']
        }
      })
    }, 30000) // 每30秒检查一次
  }, 5000) // 延迟5秒启动内存检查
})

// 组件激活时重新同步消息状态
onActivated(() => {
  // 只在消息数量不一致时才同步
  const sessionMessages = sessionStore.getMessages()
  if (messages.value.length !== sessionMessages.length) {
    messages.value = sessionMessages
  }
})

onUnmounted(() => {
  // 清理内存检查定时器
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval)
    memoryCheckInterval = null
  }
  
  // 清理代码高亮的防抖定时器
  if (applyCodeHighlighting.debounceTimer) {
    clearTimeout(applyCodeHighlighting.debounceTimer)
  }
  
  // 取消正在进行的请求
  if (currentStreamController.value) {
    currentStreamController.value.abort()
    currentStreamController.value = null
  }
})

async function send() {
  if (!input.value.trim()) return
  
  const userContent = input.value
  input.value = ''
  autoResize(inputRef)
  
  // 发送消息并获取AI消息对象
  const aiMsg = await sendMessage(userContent)
  scrollToBottom(chatHistory)
  
  // 处理流式响应
  await handleStreamResponse(aiMsg, userContent)
  scrollToBottom(chatHistory)
  applyCodeHighlighting()
}

// 复制消息的包装函数
async function copyMessageHandler(content) {
  await copyMessage(content, messages, copyStatus)
}

// 取消流的包装函数
async function cancelStreamHandler(message) {
  await cancelStream(message)
  scrollToBottom(chatHistory)
}

// 自动调整输入框高度的包装函数
function autoResizeHandler() {
  autoResize(inputRef)
}

watch(input, () => {
  autoResizeHandler()
})
</script>
