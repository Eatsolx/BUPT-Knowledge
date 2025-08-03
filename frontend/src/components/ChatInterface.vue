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
          <button 
            class="copy-button" 
            @click="copyMessage(msg.content)"
            :title="copyStatus[idx] || (msg.content.includes('思考过程：') ? '复制最终答案' : '复制消息')"
            :data-message-index="idx"
          >
            {{ copyStatus[idx] === '已复制' ? '已复制' : '复制' }}
          </button>
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
        @input="autoResize"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="chat-button" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onActivated } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import api from '../services/api.js'
import { useSessionStore } from '../stores/session.js'

// css
import '../assets/chat-interface.css'
import 'github-markdown-css/github-markdown.css'

// 确保highlight.js正确初始化
hljs.configure({
  ignoreUnescapedHTML: true
})

const input = ref('')
const inputRef = ref(null)
const chatHistory = ref(null)
const copyStatus = ref({})

// 使用会话状态管理
const sessionStore = useSessionStore()
const messages = ref(sessionStore.getMessages())

// 如果没有消息，添加欢迎消息
onMounted(() => {
  if (messages.value.length === 0) {
    const welcomeMessage = { role: 'assistant', content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' }
    messages.value.push(welcomeMessage)
    sessionStore.addMessage(welcomeMessage)
  }
})

// 组件激活时重新同步消息状态
onActivated(() => {
  // 只在消息数量不一致时才同步
  const sessionMessages = sessionStore.getMessages()
  if (messages.value.length !== sessionMessages.length) {
    messages.value = sessionMessages
  }
})

// 配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error('Highlight.js error:', err);
      }
    }
    return hljs.highlightAuto(code).value;
  }
})

// Markdown渲染函数
function renderMarkdown(content) {
  if (!content) return ''
  try {
    return marked(content)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return content
  }
}

// 解析思考过程
function getReasoning(content) {
  if (content.includes('思考过程：') && content.includes('最终答案：')) {
    return content.split('思考过程：')[1].split('最终答案：')[0].trim()
  }
  return ''
}

// 解析最终答案
function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
}

async function send() {
  if (!input.value.trim()) return
  
  const userMessage = { role: 'user', content: input.value }
  messages.value.push(userMessage)
  sessionStore.addMessage(userMessage)
  
  const userContent = input.value
  input.value = ''
  autoResize()

  const aiMsg = { role: 'assistant', content: '' }
  messages.value.push(aiMsg)
  sessionStore.addMessage(aiMsg)
  scrollToBottom()

  try {
    const response = await api.chatStream([
      { role: 'user', content: userContent }
    ], sessionStore.getConversationId())

    if (!response.body) throw new Error('无响应流')
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let done = false
    let buffer = ''
    let reasoningContent = ''
    let answerContent = ''

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      if (value) {
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.replace('data: ', '').replace('data:', '').trim()
            if (!data || data === '[DONE]') {
              // 流式输出结束，设置最终内容
              if (reasoningContent || answerContent) {
                aiMsg.content = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                const messageIndex = messages.value.length - 1
                sessionStore.updateMessage(messageIndex, aiMsg)
                messages.value = [...messages.value]
                scrollToBottom()
                applyCodeHighlighting()
              }
              continue
            }

            try {
              const json = JSON.parse(data)
              
              // 处理Coze API的响应格式
              if (json.role === 'assistant' && json.type === 'answer') {
                // 检查是否是完整的数据包（包含完整的推理和答案）
                if (json.reasoning_content && json.content && 
                    json.reasoning_content.length > 50 && json.content.length > 20) {
                  // 这是一个完整的数据包，直接替换内容
                  aiMsg.content = `思考过程：${json.reasoning_content}\n最终答案：${json.content}`
                  
                  const messageIndex = messages.value.length - 1
                  sessionStore.updateMessage(messageIndex, aiMsg)
                  messages.value = [...messages.value]
                  scrollToBottom()
                  applyCodeHighlighting()
                } else {
                  // 处理推理过程
                  if (json.reasoning_content) {
                    reasoningContent += json.reasoning_content
                    aiMsg.content = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                    
                    const messageIndex = messages.value.length - 1
                    sessionStore.updateMessage(messageIndex, aiMsg)
                    messages.value = [...messages.value]
                    scrollToBottom()
                    applyCodeHighlighting()
                  }
                  
                  // 处理最终答案
                  if (json.content) {
                    answerContent += json.content
                    aiMsg.content = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                    
                    const messageIndex = messages.value.length - 1
                    sessionStore.updateMessage(messageIndex, aiMsg)
                    messages.value = [...messages.value]
                    scrollToBottom()
                    applyCodeHighlighting()
                  }
                }
              } else if (json.role === 'assistant' && json.type === 'knowledge') {
                // 处理知识库回复
                if (json.content) {
                  try {
                    const contentData = JSON.parse(json.content)
                    if (contentData.msg_type === 'knowledge_recall') {
                      const knowledgeData = JSON.parse(contentData.data)
                      if (knowledgeData.chunks && knowledgeData.chunks.length > 0) {
                        aiMsg.content = knowledgeData.chunks[0].slice || '已找到相关信息'
                      }
                    }
                  } catch (e) {
                    aiMsg.content = '已找到相关信息'
                  }
                  const messageIndex = messages.value.length - 1
                  sessionStore.updateMessage(messageIndex, aiMsg)
                  messages.value = [...messages.value]
                  scrollToBottom()
                  applyCodeHighlighting()
                }
              } else if (json.status === 'in_progress') {
                // 对话进行中，显示加载状态
                if (!aiMsg.content) {
                  aiMsg.content = '正在思考中...'
                  const messageIndex = messages.value.length - 1
                  sessionStore.updateMessage(messageIndex, aiMsg)
                  messages.value = [...messages.value]
                  scrollToBottom()
                }
              } else if (json.status === 'completed') {
                // 对话完成，只在没有内容时才设置默认消息
                if (!aiMsg.content || aiMsg.content === '正在思考中...') {
                  aiMsg.content = '抱歉，我暂时无法回复。请稍后再试。'
                  const messageIndex = messages.value.length - 1
                  sessionStore.updateMessage(messageIndex, aiMsg)
                  messages.value = [...messages.value]
                  scrollToBottom()
                  applyCodeHighlighting()
                }
              } else if (json.type === 'verbose') {
                // 处理verbose类型的消息（通常是系统消息）
              }
            } catch (e) {
              console.log('解析失败的行:', line)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('API请求错误:', err)
    aiMsg.content = `AI接口请求失败：${err.message || '请稍后重试'}`
    // 更新会话状态中的消息
    const messageIndex = messages.value.length - 1
    sessionStore.updateMessage(messageIndex, aiMsg)
    messages.value = [...messages.value]
  }
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatHistory.value) {
      chatHistory.value.scrollTop = chatHistory.value.scrollHeight
    }
    // 重新应用代码高亮
    applyCodeHighlighting()
  })
}

function applyCodeHighlighting() {
  nextTick(() => {
    // 查找所有代码块并应用高亮
    const codeBlocks = document.querySelectorAll('pre code')
    codeBlocks.forEach(block => {
      if (!block.classList.contains('hljs')) {
        hljs.highlightElement(block)
      }
    })
  })
}

// 复制消息内容
async function copyMessage(content) {
  try {
    // 如果是AI消息且包含思考过程，只复制最终答案
    let textToCopy = content
    if (content.includes('思考过程：') && content.includes('最终答案：')) {
      textToCopy = getAnswer(content)
    }
    
    await navigator.clipboard.writeText(textToCopy)
    // 找到当前消息的索引
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      copyStatus.value[messageIndex] = '已复制'
      
      // 添加复制成功的CSS类
      nextTick(() => {
        const copyButton = document.querySelector(`[data-message-index="${messageIndex}"]`)
        if (copyButton) {
          copyButton.classList.add('copied')
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 2000)
        }
      })
      
      setTimeout(() => {
        copyStatus.value[messageIndex] = ''
      }, 2000)
    }
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = textToCopy
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

function autoResize() {
  const el = inputRef.value
  if (!el) return

  el.style.height = '44px'
  el.style.overflowY = 'hidden'
  el.style.lineHeight = '44px'
  el.style.paddingTop = '12px'
  el.style.paddingBottom = '12px'

  const scrollHeight = el.scrollHeight

  if (scrollHeight <= 44) {
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'
  } else {
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'

    const newScrollHeight = el.scrollHeight

    if (newScrollHeight > 120) {
      el.style.height = '120px'
      el.style.overflowY = 'auto'
    } else {
      el.style.height = newScrollHeight + 'px'
      el.style.overflowY = 'hidden'
    }
  }
}

watch(input, () => {
  autoResize()
})
</script>
