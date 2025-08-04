import { ref, reactive } from 'vue'

function generateConversationId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

// 简化的session状态
const sessionState = reactive({
  conversationId: generateConversationId(),
  messages: []
})

export function useSessionStore() {
  const getConversationId = () => sessionState.conversationId
  
  const getMessages = () => sessionState.messages
  
  const addMessage = (message) => {
    sessionState.messages.push(message)
  }
  
  const updateMessage = (index, message) => {
    if (sessionState.messages[index]) {
      sessionState.messages[index] = message
    }
  }
  
  const resetSession = () => {
    sessionState.conversationId = generateConversationId()
    sessionState.messages = []
  }
  
  const resetMessages = (newMessages) => {
    sessionState.messages = newMessages
  }

  return {
    conversationId: sessionState.conversationId,
    messages: sessionState.messages,
    getConversationId,
    getMessages,
    addMessage,
    updateMessage,
    resetSession,
    resetMessages
  }
} 