import { ref, reactive } from 'vue'

/**
 * 生成随机会话ID
 * 确保生成的ID在int64范围内，避免数值溢出
 * @returns {string} 会话ID字符串
 */
function generateConversationId() {
  // int64最大值: 9223372036854775807 (19位)
  // 使用BigInt避免精度问题
  const maxInt64 = 9223372036854775807n
  
  // 生成8位随机数和10位时间戳的组合
  const randomPart = Math.floor(Math.random() * 100000000) // 8位随机数
  const timePart = Date.now() % 10000000000 // 10位时间戳
  const combined = BigInt(randomPart) * BigInt(10000000000) + BigInt(timePart)
  
  // 确保不超过int64最大值
  const safeId = combined % maxInt64
  
  return safeId.toString()
}

/**
 * 从sessionStorage获取或创建会话状态
 * @returns {Object} 会话状态对象
 */
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

/**
 * 保存会话状态到sessionStorage
 * @param {Object} state - 会话状态对象
 */
function saveSessionState(state) {
  sessionStorage.setItem('chatSession', JSON.stringify(state))
}

/**
 * 重置会话状态
 * @returns {Object} 新的会话状态对象
 */
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

// 添加待发送消息的状态
const pendingMessage = ref(null)

/**
 * 会话状态管理函数
 * 提供会话ID、消息列表的管理功能
 */
export function useSessionStore() {
  /**
   * 获取当前会话ID
   * @returns {string} 会话ID
   */
  const getConversationId = () => {
    console.log('Debug - 获取会话ID:', sessionState.conversationId)
    return sessionState.conversationId
  }
  
  /**
   * 获取消息列表
   * @returns {Array} 消息数组
   */
  const getMessages = () => sessionState.messages
  
  /**
   * 添加消息到会话
   * @param {Object} message - 消息对象
   */
  const addMessage = (message) => {
    // 检查是否已经存在相同的消息，避免重复添加
    const exists = sessionState.messages.some(msg => 
      msg.role === message.role && msg.content === message.content
    )
    if (!exists) {
      sessionState.messages.push(message)
      // 优化：批量保存，减少存储操作频率
      debounceSaveSession()
    }
  }
  
  /**
   * 更新指定索引的消息
   * @param {number} index - 消息索引
   * @param {Object} message - 新的消息对象
   */
  const updateMessage = (index, message) => {
    if (sessionState.messages[index]) {
      // 只在内容真正改变时才更新，避免不必要的存储操作
      const currentMsg = sessionState.messages[index]
      if (currentMsg.content !== message.content || 
          currentMsg.isStreaming !== message.isStreaming) {
        sessionState.messages[index] = message
        
        // 如果是流式状态变化，立即保存以确保UI响应
        if (currentMsg.isStreaming !== message.isStreaming) {
          saveSessionState(sessionState)
        } else {
          // 其他内容变化使用防抖保存
          debounceSaveSession()
        }
      }
    }
  }
  
  /**
   * 立即更新消息的流式状态
   * @param {number} index - 消息索引
   * @param {boolean} isStreaming - 流式状态
   */
  const updateStreamingStatus = (index, isStreaming) => {
    if (sessionState.messages[index]) {
      sessionState.messages[index].isStreaming = isStreaming
      // 立即保存，确保UI响应
      saveSessionState(sessionState)
      // 强制触发响应式更新
      sessionState.messages = [...sessionState.messages]
    }
  }
  
  /**
   * 重置会话状态
   */
  const resetSessionState = () => {
    const newState = resetSession()
    Object.assign(sessionState, newState)
  }
  
  /**
   * 重置消息列表
   * @param {Array} newMessages - 新的消息数组
   */
  const resetMessages = (newMessages) => {
    sessionState.messages = newMessages
    // 立即保存，因为这是重要的状态变更
    saveSessionState(sessionState)
  }
  
  /**
   * 检查是否是页面刷新
   * @returns {boolean} 是否是页面刷新
   */
  const isPageRefresh = () => {
    return window.performance && window.performance.navigation.type === 1
  }
  
  // 防抖保存函数，减少频繁的存储操作
  let saveDebounceTimer = null
  const debounceSaveSession = () => {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }
    saveDebounceTimer = setTimeout(() => {
      saveSessionState(sessionState)
      saveDebounceTimer = null
    }, 100) // 减少到100ms防抖延迟，提高响应速度
  }
  
  /**
   * 设置待发送的消息
   * @param {string} message - 待发送的消息内容
   */
  const setPendingMessage = (message) => {
    pendingMessage.value = message
  }
  
  /**
   * 获取并清除待发送的消息
   * @returns {string|null} 待发送的消息内容
   */
  const getAndClearPendingMessage = () => {
    const message = pendingMessage.value
    pendingMessage.value = null
    return message
  }

  /**
   * 设置会话ID
   * @param {string} conversationId - 会话ID
   */
  function setConversationId(conversationId) {
    console.log('Debug - 设置会话ID:', conversationId)
    sessionState.conversationId = conversationId
    saveSessionState(sessionState)
  }

  /**
   * 创建新会话
   * 调用API创建会话并设置会话ID
   * @returns {Promise<string>} 会话ID
   */
  async function createNewConversation() {
    try {
      const response = await api.createConversation()
      if (response.ok) {
        const data = await response.json()
        const conversationId = data.conversation_id
        if (conversationId) {
          setConversationId(conversationId)
          return conversationId
        } else {
          throw new Error('未获取到会话ID')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '创建会话失败')
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      throw error
    }
  }

  /**
   * 清除会话
   * 调用API清除会话并重置本地状态
   * @returns {Promise<void>}
   */
  async function clearConversation() {
    try {
      const conversationId = sessionState.conversationId
      const response = await api.clearConversation(conversationId)
      if (response.ok) {
        // 重置会话状态
        sessionState.conversationId = null
        sessionState.messages = []
        sessionState.createdAt = Date.now()
        
        // 添加欢迎消息
        const welcomeMessage = { 
          role: 'assistant', 
          content: '你好，我是北京邮电大学知识库智能体，很高兴为你服务。' 
        }
        sessionState.messages.push(welcomeMessage)
        
        saveSessionState(sessionState)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '清除会话失败')
      }
    } catch (error) {
      console.error('清除会话失败:', error)
      throw error
    }
  }

  /**
   * 获取上下文消息（前2条对话，总共4条消息）
   * @returns {Array} 上下文消息数组
   */
  function getContextMessages() {
    const messages = sessionState.messages
    if (messages.length <= 4) {
      // 如果消息数量少于等于4条，返回除最后一条之外的所有消息
      // 因为最后一条通常是当前正在发送的消息
      return messages.slice(0, -1)
    }
    // 返回最后4条消息作为上下文，但不包括最后一条（当前消息）
    return messages.slice(-5, -1)
  }

  return {
    conversationId: sessionState.conversationId,
    messages: sessionState.messages,
    getConversationId,
    getMessages,
    addMessage,
    updateMessage,
    updateStreamingStatus,
    resetSessionState,
    resetMessages,
    isPageRefresh,
    setPendingMessage,
    getAndClearPendingMessage,
    setConversationId,
    createNewConversation,
    clearConversation,
    getContextMessages
  }
}

// 监听页面刷新事件
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // 页面刷新时重置会话
    resetSession()
  })
} 