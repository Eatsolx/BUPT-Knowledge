import { ref, reactive } from 'vue'

// 生成随机会话ID - 确保在int64范围内
function generateConversationId() {
  // int64最大值: 9223372036854775807 (19位)
  // 使用更安全的算法，确保不超过int64范围
  const maxInt64 = 9223372036854775807n // 使用BigInt避免精度问题
  
  // 生成一个在安全范围内的随机数
  const randomPart = Math.floor(Math.random() * 100000000) // 8位随机数
  const timePart = Date.now() % 10000000000 // 10位时间戳
  const combined = BigInt(randomPart) * BigInt(10000000000) + BigInt(timePart)
  
  // 确保不超过int64最大值
  const safeId = combined % maxInt64
  
  return safeId.toString()
}

// 从sessionStorage获取或创建会话状态
function getSessionState() {
  const stored = sessionStorage.getItem('chatSession')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('解析会话状态失败:', e)
    }
  }
  
  // 创建新的会话状态
  const newSession = {
    conversationId: generateConversationId(),
    messages: [],
    createdAt: Date.now()
  }
  
  sessionStorage.setItem('chatSession', JSON.stringify(newSession))
  return newSession
}

// 保存会话状态到sessionStorage
function saveSessionState(state) {
  sessionStorage.setItem('chatSession', JSON.stringify(state))
}

// 重置会话状态
function resetSession() {
  const newSession = {
    conversationId: generateConversationId(),
    messages: [],
    createdAt: Date.now()
  }
  sessionStorage.setItem('chatSession', JSON.stringify(newSession))
  return newSession
}

// 创建响应式状态
const sessionState = reactive(getSessionState())

// 导出状态管理函数
export function useSessionStore() {
  // 获取当前会话ID
  const getConversationId = () => sessionState.conversationId
  
  // 获取消息列表
  const getMessages = () => sessionState.messages
  
  // 添加消息
  const addMessage = (message) => {
    // 检查是否已经存在相同的消息，避免重复
    const exists = sessionState.messages.some(msg => 
      msg.role === message.role && msg.content === message.content
    )
    if (!exists) {
      sessionState.messages.push(message)
      saveSessionState(sessionState)
    }
  }
  
  // 更新消息
  const updateMessage = (index, message) => {
    if (sessionState.messages[index]) {
      // 只在内容真正改变时才更新
      if (sessionState.messages[index].content !== message.content || 
          sessionState.messages[index].isStreaming !== message.isStreaming) {
        sessionState.messages[index] = message
        saveSessionState(sessionState)
      }
    }
  }
  
  // 重置会话
  const resetSessionState = () => {
    const newState = resetSession()
    Object.assign(sessionState, newState)
  }
  
  // 重置消息列表
  const resetMessages = (newMessages) => {
    sessionState.messages = newMessages
    saveSessionState(sessionState)
  }
  
  // 检查是否是页面刷新
  const isPageRefresh = () => {
    return window.performance && window.performance.navigation.type === 1
  }
  
  return {
    conversationId: sessionState.conversationId,
    messages: sessionState.messages,
    getConversationId,
    getMessages,
    addMessage,
    updateMessage,
    resetSessionState,
    resetMessages,
    isPageRefresh
  }
}

// 监听页面刷新事件
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // 页面刷新时重置会话
    resetSession()
  })
} 