<template>
  <div class="chat-app">
    <div class="chat-history" ref="chatHistory">
      <div v-for="(msg, idx) in messages" :key="idx" :class="['chat-bubble', msg.role]">
        <span v-if="msg.role === 'user'" class="bubble-label">你：</span>
        <span v-if="msg.role === 'ai'" class="bubble-label">AI：</span>
        <div v-if="msg.role === 'ai' && msg.content.includes('思考过程：')" class="ai-content">
          <div class="reasoning" v-html="renderMarkdown(getReasoning(msg.content))"></div>
          <div class="answer" v-html="renderMarkdown(getAnswer(msg.content))"></div>
        </div>
        <div v-else v-html="renderMarkdown(msg.content)" class="message-content"></div>
      </div>
    </div>
    <div class="chat">
      <textarea
        class="chat-input"
        ref="inputRef"
        v-model="input"
        placeholder="请输入消息..."
        rows="1"
        @input="autoResize"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="chat-button" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'

const input = ref('')
const inputRef = ref(null)
const messages = ref([])

// 配置marked选项
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true, // 支持GitHub风格的Markdown
})

// Markdown渲染函数
function renderMarkdown(content) {
  if (!content) return ''
  try {
    return marked(content)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return content // 如果渲染失败，返回原始内容
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

import api from '../services/api.js'

async function send() {
  if (!input.value.trim()) return
  messages.value.push({ role: 'user', content: input.value })
  input.value = ''
  autoResize()

  // 先插入一个空的AI消息用于流式拼接
  const aiMsg = { role: 'ai', content: '' }
  messages.value.push(aiMsg)
  scrollToBottom()

  try {
    // 调用后端API而不是直接调用阿里云API
    const response = await api.chatStream(
      messages.value.slice(0, -1).map((m) => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content,
      }))
    )

    if (!response.body) throw new Error('无响应流')
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let done = false
    let reasoning = ''
    let finalAnswer = ''
    let buffer = '' // 用于累积不完整的数据

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      if (value) {
        buffer += decoder.decode(value, { stream: true })

        // 按行分割，处理完整的行
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个可能不完整的行

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.replace('data: ', '').replace('data:', '').trim()
            if (!data || data === '[DONE]') continue

            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta
              if (delta) {
                let changed = false

                if (delta.reasoning_content) {
                  reasoning += delta.reasoning_content
                  changed = true
                }
                if (delta.content) {
                  finalAnswer += delta.content
                  changed = true
                }

                if (changed) {
                  // 简单拼接，避免重复
                  aiMsg.content = reasoning
                    ? `思考过程：${reasoning}\n最终答案：${finalAnswer}`
                    : finalAnswer
                  messages.value = [...messages.value]
                  scrollToBottom()
                }
              }
            } catch (e) {
              // 忽略解析失败的行
              console.log('解析失败的行:', line)
            }
          }
        }
      }
    }
  } catch (err) {
    aiMsg.content = 'AI接口请求失败，请稍后重试。'
    messages.value = [...messages.value]
  }
  scrollToBottom()
}

const chatHistory = ref(null)
function scrollToBottom() {
  nextTick(() => {
    if (chatHistory.value) {
      chatHistory.value.scrollTop = chatHistory.value.scrollHeight
    }
  })
}

// 自动调整输入框高度
function autoResize() {
  const el = inputRef.value
  if (!el) return

  // 先重置所有样式到初始状态
  el.style.height = '44px'
  el.style.overflowY = 'hidden'
  el.style.lineHeight = '44px' // 先设为单行状态
  el.style.paddingTop = '0'
  el.style.paddingBottom = '0'

  // 重新计算scrollHeight
  const scrollHeight = el.scrollHeight

  // 判断是否为单行
  if (scrollHeight <= 44) {
    // 单行：保持当前样式即可
    el.style.lineHeight = '44px'
    el.style.paddingTop = '0'
    el.style.paddingBottom = '0'
  } else {
    // 多行：修改样式
    el.style.lineHeight = '24px'
    el.style.paddingTop = '10px'
    el.style.paddingBottom = '5px'

    // 重新获取修改样式后的scrollHeight
    const newScrollHeight = el.scrollHeight

    // 最大高度120px
    if (newScrollHeight > 120) {
      el.style.height = '120px'
      el.style.overflowY = 'auto'
    } else {
      el.style.height = newScrollHeight + 'px'
    }
  }
}

// 输入内容变化时自适应
watch(input, () => {
  autoResize()
})
</script>

<style scoped>
.chat-app {
  max-width: 700px;
  width: 90%;
  height: 90vh;
  margin: 10px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}
.chat-history {
  flex: 1;
  width: 90%;
  margin-top: 16px;
  margin-bottom: 80px;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: #d1d1d1 #f7f7f7;
}
.chat-bubble {
  max-width: 70%;
  padding: 10px 16px;
  border-radius: 16px;
  font-size: 16px;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(149, 157, 165, 0.12);
  display: flex;
  align-items: flex-start;
}
.chat-bubble.user {
  background: #e6f7ff;
  align-self: flex-end;
}
.chat-bubble.ai {
  background: #f7f7f7;
  align-self: flex-start;
}
.bubble-label {
  font-weight: bold;
  margin-right: 8px;
  color: #888;
}

.ai-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.reasoning {
  color: #888;
  font-style: italic;
  font-size: 14px;
  line-height: 1.4;
}

.answer {
  color: #333;
  line-height: 1.5;
}

.message-content {
  line-height: 1.5;
  color: #333;
}

/* Markdown样式 */
.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4,
.message-content h5,
.message-content h6 {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.25;
}

.message-content h1 {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 8px;
}

.message-content h2 {
  font-size: 1.3em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 6px;
}

.message-content h3 {
  font-size: 1.1em;
}

.message-content p {
  margin: 8px 0;
}

.message-content ul,
.message-content ol {
  margin: 8px 0;
  padding-left: 24px;
}

.message-content li {
  margin: 4px 0;
}

.message-content blockquote {
  margin: 8px 0;
  padding: 8px 16px;
  border-left: 4px solid #dfe2e5;
  background-color: #f6f8fa;
  color: #6a737d;
}

.message-content code {
  background-color: #f6f8fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.message-content pre {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content pre code {
  background-color: transparent;
  padding: 0;
}

.message-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.message-content th,
.message-content td {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
  text-align: left;
}

.message-content th {
  background-color: #f6f8fa;
  font-weight: 600;
}

.message-content a {
  color: #0366d6;
  text-decoration: none;
}

.message-content a:hover {
  text-decoration: underline;
}

.message-content strong {
  font-weight: 600;
}

.message-content em {
  font-style: italic;
}

.message-content hr {
  border: none;
  border-top: 1px solid #eaecef;
  margin: 16px 0;
}

/* 思考过程和答案的Markdown样式 */
.reasoning h1,
.reasoning h2,
.reasoning h3,
.reasoning h4,
.reasoning h5,
.reasoning h6,
.answer h1,
.answer h2,
.answer h3,
.answer h4,
.answer h5,
.answer h6 {
  margin: 8px 0 4px 0;
  font-weight: 600;
  line-height: 1.25;
}

.reasoning h1,
.answer h1 {
  font-size: 1.3em;
}

.reasoning h2,
.answer h2 {
  font-size: 1.1em;
}

.reasoning p,
.answer p {
  margin: 4px 0;
}

.reasoning ul,
.reasoning ol,
.answer ul,
.answer ol {
  margin: 4px 0;
  padding-left: 20px;
}

.reasoning li,
.answer li {
  margin: 2px 0;
}

.reasoning blockquote,
.answer blockquote {
  margin: 4px 0;
  padding: 6px 12px;
  border-left: 3px solid #dfe2e5;
  background-color: #f6f8fa;
  color: #6a737d;
}

.reasoning code,
.answer code {
  background-color: #f6f8fa;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.85em;
}

.reasoning pre,
.answer pre {
  background-color: #f6f8fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 4px 0;
}

.reasoning pre code,
.answer pre code {
  background-color: transparent;
  padding: 0;
}
.chat {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: center;
}
.chat-input {
  background-color: #f7f7f7;
  border: 1px solid #d1d1d1;
  box-shadow: 0 2px 8px rgba(149, 157, 165, 0.12);
  width: 70%;
  min-width: 120px;
  min-height: 44px;
  max-height: 120px;
  height: 44px;
  border-radius: 12px 0 0 12px;
  padding: 0 16px;
  font-size: 16px;
  line-height: 44px;
  outline: none;
  transition: border 0.2s;
  resize: none;
  overflow-y: auto;
}
.chat-input:focus {
  border: 1.5px solid #3d3d3a;
}
.chat-button {
  background-color: #faf9f5;
  border: 1px solid #d1d1d1;
  border-left: none;
  border-radius: 0 12px 12px 0;
  text-align: center;
  line-height: 40px;
  cursor: pointer;
  user-select: none;
  color: #3d3d3a;
  font-size: 16px;
  width: 100px;
  font-weight: 400;
  transition:
    background 0.2s,
    color 0.2s;
}
.chat-button:hover {
  background-color: #f0eede;
  color: #222;
}
.title {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f7f7f7;
  width: 100%;
  height: 40px;
  border: 1px solid #d1d1d1;
  transition: border 0.2s;
  border-radius: 16px 16px 5px 5px;
  padding: 8px 16px 8px 16px;
  color: #3d3d3a;
}
</style>
