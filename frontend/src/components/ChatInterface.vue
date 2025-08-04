<template>
  <div class="chat-container">
    <div class="chat-history" ref="chatHistory">
      <div v-for="(msg, idx) in messages" :key="idx" class="message-container">
        <div :class="['chat-bubble', msg.role]">
          <div class="message-header">
            <span class="bubble-label">{{ msg.role === 'user' ? '你：' : 'AI：' }}</span>
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
              :title="copyStatus[idx] || '复制消息'"
              :data-message-index="idx"
            >
              {{ copyStatus[idx] === '已复制' ? '已复制' : '复制' }}
            </button>
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
    
    <div class="chat">
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
      <button class="chat-button" @click="send" :disabled="isStreaming">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useSessionStore } from '../stores/session.js'
import { useChat } from '../composables/useChat.js'
import { renderMarkdown, getReasoning, getAnswer } from '../utils/markdown.js'
import { scrollToBottom, autoResize, copyMessage } from '../utils/ui.js'

import '../assets/chat-interface.css'
import 'highlight.js/styles/github.css'
import 'github-markdown-css/github-markdown.css'

const input = ref('')
const inputRef = ref(null)
const chatHistory = ref(null)
const copyStatus = ref({})

const sessionStore = useSessionStore()
const { messages, streamingMessageIndex, sendMessage, handleStreamResponse, cancelStream } = useChat()

const isStreaming = computed(() => {
  return streamingMessageIndex.value !== -1 || messages.value.some(msg => msg.isStreaming)
})

onMounted(async () => {
  const pendingMessage = sessionStore.getAndClearPendingMessage()
  
  if (messages.value.length === 0) {
    const welcomeMessage = { role: 'assistant', content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' }
    messages.value.push(welcomeMessage)
    sessionStore.addMessage(welcomeMessage)
  }
  
  if (pendingMessage) {
    input.value = pendingMessage
    await send()
  }
})

onUnmounted(() => {
  // 清理工作
})

async function send() {
  if (!input.value.trim() || isStreaming.value) return
  
  const userContent = input.value
  input.value = ''
  autoResize(inputRef)
  
  const aiMsg = await sendMessage(userContent)
  scrollToBottom(chatHistory)
  
  await handleStreamResponse(aiMsg, userContent)
  scrollToBottom(chatHistory)
}

async function copyMessageHandler(content) {
  await copyMessage(content, messages, copyStatus)
}

async function cancelStreamHandler(message) {
  await cancelStream(message)
  scrollToBottom(chatHistory)
}

function autoResizeHandler() {
  autoResize(inputRef)
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

watch(input, () => {
  autoResizeHandler()
})
</script>
