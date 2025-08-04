<template>
  <!-- 聊天界面主容器 -->
  <div class="chat-container">
    <!-- 聊天历史记录区域 -->
    <div class="chat-history" ref="chatHistory">
      <!-- 遍历显示所有消息 -->
      <div v-for="(msg, idx) in messages" :key="idx" class="message-container">
        <!-- 消息气泡，根据角色设置不同样式 -->
        <div :class="['chat-bubble', msg.role]">
          <!-- 消息头部：显示角色标签 -->
          <div class="message-header">
            <span v-if="msg.role === 'user'" class="bubble-label">你：</span>
            <span v-if="msg.role === 'assistant'" class="bubble-label">AI：</span>
          </div>
          
          <!-- AI消息内容：支持思考过程和最终答案的分离显示 -->
          <div v-if="msg.role === 'assistant' && msg.content.includes('思考过程：')" class="ai-content">
            <!-- 思考过程部分 -->
            <div class="reasoning">{{ getReasoning(msg.content) }}</div>
            <!-- 最终答案部分，支持Markdown渲染 -->
            <div class="answer markdown-body" v-html="renderMarkdown(getAnswer(msg.content))"></div>
          </div>
          <!-- 普通消息内容，支持Markdown渲染 -->
          <div v-else v-html="renderMarkdown(msg.content)" class="message-content markdown-body"></div>
          
          <!-- 消息操作按钮区域 -->
          <div class="message-actions">
            <!-- 复制按钮 -->
            <button 
              class="copy-button" 
              @click="copyMessageHandler(msg.content)"
              :title="copyStatus[idx] || (msg.content.includes('思考过程：') ? '复制最终答案' : '复制消息')"
              :data-message-index="idx"
            >
              {{ copyStatus[idx] === '已复制' ? '已复制' : '复制' }}
            </button>
            <!-- 中断按钮：在AI消息流式输出时显示，不自动隐藏 -->
            <button 
              v-if="msg.role === 'assistant' && (streamingMessageIndex === idx || msg.isStreaming)" 
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
    
    <!-- 聊天输入区域 -->
    <div class="chat">
      <!-- 文本输入框 -->
      <textarea
        class="chat-input"
        ref="inputRef"
        v-model="input"
        :placeholder="isStreaming ? 'AI正在输出中，请稍候...' : '请输入您的问题...'"
        :disabled="isStreaming"
        rows="1"
        @input="autoResizeHandler"
        @keydown="handleKeydown"
      ></textarea>
      <!-- 发送按钮 -->
      <button class="chat-button" @click="send" :disabled="isStreaming">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onActivated, onUnmounted, computed } from 'vue'
import { useSessionStore } from '../stores/session.js'
import { useChat } from '../composables/useChat.js'
import { renderMarkdown, getReasoning, getAnswer, applyCodeHighlighting } from '../utils/markdown.js'
import { scrollToBottom, autoResize, copyMessage } from '../utils/ui.js'

// 同步加载CSS资源
import '../assets/chat-interface.css'
import 'highlight.js/styles/github.css'
import 'github-markdown-css/github-markdown.css'

// 响应式数据定义
const input = ref('') // 输入框内容
const inputRef = ref(null) // 输入框DOM引用
const chatHistory = ref(null) // 聊天历史DOM引用
const copyStatus = ref({}) // 复制状态管理

// 使用会话状态管理
const sessionStore = useSessionStore()

// 使用聊天逻辑组合式函数
const { messages, currentStreamController, streamingMessageIndex, sendMessage, handleStreamResponse, cancelStream } = useChat()

// 计算是否正在流式输出
const isStreaming = computed(() => {
  return streamingMessageIndex.value !== -1 || messages.value.some(msg => msg.isStreaming)
})

// 内存监控定时器
let memoryCheckInterval = null

// 组件挂载时的初始化逻辑
onMounted(async () => {
  // 检查是否有待发送的消息
  const pendingMessage = sessionStore.getAndClearPendingMessage()
  
  // 如果没有消息，添加欢迎消息
  if (messages.value.length === 0) {
    const welcomeMessage = { role: 'assistant', content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' }
    messages.value.push(welcomeMessage)
    sessionStore.addMessage(welcomeMessage)
  }
  
  // 如果有待发送的消息，自动发送
  if (pendingMessage) {
    // 设置输入框内容
    input.value = pendingMessage
    // 自动发送消息
    await send()
  }
  
  // 优化内存监控：使用更智能的清理策略
  setTimeout(() => {
    memoryCheckInterval = setInterval(() => {
      // 智能消息清理：根据消息长度和数量动态调整
      const totalContentLength = messages.value.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
      const messageCount = messages.value.length
      
      // 当消息数量超过30条或总内容长度超过80000字符时清理
      if (messageCount > 30 || totalContentLength > 80000) {
        // 保留最近的20条消息，但确保包含用户和AI的对话
        const recentMessages = messages.value.slice(-20)
        // 确保清理后的消息仍然有完整的对话结构
        if (recentMessages.length > 0) {
          messages.value = recentMessages
          sessionStore.resetMessages(recentMessages)
        }
      }
      
      // 优化复制状态清理：只清理超过15秒的复制状态
      const now = Date.now()
      Object.keys(copyStatus.value).forEach(key => {
        if (copyStatus.value[key] === '已复制' && now - copyStatus.value[key + '_time'] > 15000) {
          delete copyStatus.value[key]
          delete copyStatus.value[key + '_time']
        }
      })
    }, 120000) // 改为每2分钟检查一次，减少性能开销
  }, 15000) // 延迟15秒启动内存检查
})

// 组件激活时重新同步消息状态
onActivated(async () => {
  // 只在消息数量不一致时才同步，避免不必要的更新
  const sessionMessages = sessionStore.getMessages()
  if (messages.value.length !== sessionMessages.length) {
    messages.value = sessionMessages
  }
  
  // 检查是否有待发送的消息
  const pendingMessage = sessionStore.getAndClearPendingMessage()
  if (pendingMessage && !isStreaming.value) {
    // 设置输入框内容
    input.value = pendingMessage
    // 自动发送消息
    await send()
  }
})

// 组件卸载时的清理工作
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

/**
 * 发送消息的主要函数
 */
async function send() {
  // 验证输入内容不为空
  if (!input.value.trim()) return
  
  // 如果正在流式输出，阻止发送
  if (isStreaming.value) return
  
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

/**
 * 复制消息的包装函数
 */
async function copyMessageHandler(content) {
  await copyMessage(content, messages, copyStatus)
}

/**
 * 取消流式输出的包装函数
 */
async function cancelStreamHandler(message) {
  await cancelStream(message)
  scrollToBottom(chatHistory)
}

/**
 * 自动调整输入框高度的包装函数
 */
function autoResizeHandler() {
  autoResize(inputRef)
}

/**
 * 处理键盘事件
 */
function handleKeydown(event) {
  // 如果按下回车键且没有按Shift键，发送消息
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // 阻止默认的换行行为
    send();
  }
}

// 监听输入框内容变化，自动调整高度
watch(input, () => {
  autoResizeHandler()
})
</script>
