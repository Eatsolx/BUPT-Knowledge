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
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session.js'
import { useChat } from '../composables/useChat.js'
import { renderMarkdown, getReasoning, getAnswer } from '../utils/markdown.js'
import { scrollToBottom, autoResize, copyMessage } from '../utils/ui.js'

import '../assets/chat-interface.css'
import 'highlight.js/styles/github.css'
import 'github-markdown-css/github-markdown.css'

// 定义props
const props = defineProps({
  initialQuestion: {
    type: String,
    default: null
  }
})

const input = ref('')
const inputRef = ref(null)
const chatHistory = ref(null)
const copyStatus = ref({})

const router = useRouter()
const sessionStore = useSessionStore()
const { messages, streamingMessageIndex, sendMessage, handleStreamResponse, cancelStream } = useChat()

const isStreaming = computed(() => {
  return streamingMessageIndex.value !== -1 || messages.value.some(msg => msg.isStreaming)
})

onMounted(async () => {
  console.log('ChatInterface mounted, initialQuestion:', props.initialQuestion)
  console.log('Initial messages:', messages.value)
  console.log('Initial isStreaming:', isStreaming.value)
  
  // 如果没有消息，添加欢迎消息
  if (messages.value.length === 0) {
    const welcomeMessage = { role: 'assistant', content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' }
    sessionStore.addMessage(welcomeMessage)
  }
  
  // 如果有初始问题，自动发送
  if (props.initialQuestion) {
    await nextTick()
    console.log('Processing initial question:', props.initialQuestion)
    console.log('isStreaming before processing:', isStreaming.value)
    
    // 确保没有正在进行的流式请求，并重置所有消息的流式状态
    if (!isStreaming.value) {
      // 重置所有消息的isStreaming状态
      messages.value.forEach((msg, index) => {
        if (msg.isStreaming) {
          console.log('Resetting streaming state for message:', index)
          sessionStore.updateMessage(index, { ...msg, isStreaming: false })
        }
      })
      
      input.value = props.initialQuestion
      console.log('Sending initial question:', input.value)
      await send()
      input.value = ''
      await nextTick()
      scrollToBottom(chatHistory)
      
      // 清除URL中的question参数，避免刷新时重复提问
      router.replace({ path: '/chat', query: {} })
    } else {
      console.log('Cannot send initial question - streaming in progress')
    }
  }
})

onUnmounted(() => {
  // 清理工作
})

async function send() {
  console.log('send() called, input:', input.value, 'isStreaming:', isStreaming.value)
  if (!input.value.trim() || isStreaming.value) {
    console.log('send() early return - input empty or streaming')
    return
  }
  
  const userContent = input.value
  input.value = ''
  autoResize(inputRef)
  
  console.log('Sending message:', userContent)
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
