import { ref, reactive } from 'vue'

function generateConversationId() {
  const maxInt64 = 9223372036854775807n
  const randomPart = Math.floor(Math.random() * 100000000)
  const timePart = Date.now() % 10000000000
  const combined = BigInt(randomPart) * BigInt(10000000000) + BigInt(timePart)
  const safeId = combined % maxInt64
  return safeId.toString()
}

function getSessionState() {
  const stored = sessionStorage.getItem('chatSession')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('解析会话状态失败:', e)
    }
  }
  
  const newSession = {
    conversationId: generateConversationId(),
    messages: [],
    createdAt: Date.now()
  }
  
  sessionStorage.setItem('chatSession', JSON.stringify(newSession))
  return newSession
}

function saveSessionState(state) {
  sessionStorage.setItem('chatSession', JSON.stringify(state))
}

function resetSession() {
  const newSession = {
    conversationId: generateConversationId(),
    messages: [],
    createdAt: Date.now()
  }
  sessionStorage.setItem('chatSession', JSON.stringify(newSession))
  return newSession
}

const sessionState = reactive(getSessionState())
const pendingMessage = ref(null)

export function useSessionStore() {
  const getConversationId = () => {
    return sessionState.conversationId
  }
  
  const getMessages = () => sessionState.messages
  
  const addMessage = (message) => {
    const exists = sessionState.messages.some(msg => 
      msg.role === message.role && msg.content === message.content
    )
    if (!exists) {
      sessionState.messages.push(message)
      debounceSaveSession()
    }
  }
  
  const updateMessage = (index, message) => {
    if (sessionState.messages[index]) {
      const currentMsg = sessionState.messages[index]
      if (currentMsg.content !== message.content || 
          currentMsg.isStreaming !== message.isStreaming) {
        sessionState.messages[index] = message
        
        if (currentMsg.isStreaming !== message.isStreaming) {
          saveSessionState(sessionState)
        } else {
          debounceSaveSession()
        }
      }
    }
  }
  
  const updateStreamingStatus = (index, isStreaming) => {
    if (sessionState.messages[index]) {
      sessionState.messages[index].isStreaming = isStreaming
      saveSessionState(sessionState)
      sessionState.messages = [...sessionState.messages]
    }
  }
  
  const resetSessionState = () => {
    const newState = resetSession()
    Object.assign(sessionState, newState)
  }
  
  const resetMessages = (newMessages) => {
    sessionState.messages = newMessages
    saveSessionState(sessionState)
  }
  
  let saveDebounceTimer = null
  const debounceSaveSession = () => {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }
    saveDebounceTimer = setTimeout(() => {
      saveSessionState(sessionState)
      saveDebounceTimer = null
    }, 100)
  }
  
  const setPendingMessage = (message) => {
    pendingMessage.value = message
  }
  
  const getAndClearPendingMessage = () => {
    const message = pendingMessage.value
    pendingMessage.value = null
    return message
  }

  function setConversationId(conversationId) {
    sessionState.conversationId = conversationId
    saveSessionState(sessionState)
  }

  function getContextMessages() {
    const messages = sessionState.messages
    if (messages.length <= 4) {
      return messages.slice(0, -1)
    }
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
    setPendingMessage,
    getAndClearPendingMessage,
    setConversationId,
    getContextMessages
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resetSession()
  })
} 