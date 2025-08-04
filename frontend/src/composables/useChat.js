import { ref } from 'vue'
import api from '../services/api.js'
import { useSessionStore } from '../stores/session.js'

export function useChat() {
  const sessionStore = useSessionStore()
  const messages = ref(sessionStore.getMessages())
  const currentStreamController = ref(null)
  const streamingMessageIndex = ref(-1)
  
  const maxMessages = 50
  
  async function sendMessage(userContent) {
    if (messages.value.length >= maxMessages) {
      const recentMessages = messages.value.slice(-20)
      messages.value = recentMessages
      sessionStore.resetMessages(recentMessages)
    }
    
    const userMessage = { role: 'user', content: userContent }
    messages.value.push(userMessage)
    sessionStore.addMessage(userMessage)
    
    const aiMsg = { role: 'assistant', content: '', isStreaming: true }
    messages.value.push(aiMsg)
    sessionStore.addMessage(aiMsg)
    
    streamingMessageIndex.value = messages.value.length - 1
    return aiMsg
  }
  
  async function handleStreamResponse(aiMsg, userContent) {
    const clearStreamingState = () => {
      aiMsg.isStreaming = false
      currentStreamController.value = null
      streamingMessageIndex.value = -1
      const messageIndex = messages.value.length - 1
      messages.value[messageIndex] = { ...aiMsg, isStreaming: false }
      sessionStore.updateStreamingStatus(messageIndex, false)
      messages.value = [...messages.value]
    }

    try {
      const controller = new AbortController()
      currentStreamController.value = controller
      
      const response = await api.chatStream([
        { role: 'user', content: userContent }
      ], sessionStore.getConversationId(), controller.signal)

      if (!response.body) throw new Error('无响应流')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let reasoningContent = ''
      let answerContent = ''

      const updateMessageContent = (content) => {
        aiMsg.content = content
        const messageIndex = messages.value.length - 1
        messages.value[messageIndex] = { ...aiMsg }
        sessionStore.updateMessage(messageIndex, aiMsg)
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              const eventType = line.replace('event:', '').trim()
              if (eventType === 'conversation.message.completed') {
                if (aiMsg.content && aiMsg.content.length > 0 && aiMsg.content !== '正在思考中...') {
                  clearStreamingState()
                  return
                }
              }
            }
            
            if (line.startsWith('data:')) {
              const data = line.replace('data: ', '').replace('data:', '').trim()
              if (!data || data === '[DONE]') {
                if (reasoningContent || answerContent) {
                  const finalContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                  aiMsg.content = finalContent
                  const messageIndex = messages.value.length - 1
                  messages.value[messageIndex] = { ...aiMsg, content: finalContent }
                  sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                }
                clearStreamingState()
                return
              }

              try {
                const json = JSON.parse(data)
                
                if (json.role === 'assistant' && json.type === 'answer') {
                  if (json.reasoning_content) {
                    reasoningContent += json.reasoning_content
                    const partialContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                    updateMessageContent(partialContent)
                  }
                    
                  if (json.content) {
                    answerContent += json.content
                    const partialContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                    updateMessageContent(partialContent)
                  }
                } else if (json.role === 'assistant' && json.type === 'knowledge') {
                  if (json.content) {
                    try {
                      const contentData = JSON.parse(json.content)
                      if (contentData.msg_type === 'knowledge_recall') {
                        const knowledgeData = JSON.parse(contentData.data)
                        if (knowledgeData.chunks && knowledgeData.chunks.length > 0) {
                          const finalContent = knowledgeData.chunks[0].slice || '已找到相关信息'
                          aiMsg.content = finalContent
                          const messageIndex = messages.value.length - 1
                          messages.value[messageIndex] = { ...aiMsg, content: finalContent }
                          sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                          clearStreamingState()
                          return
                        }
                      }
                    } catch (e) {
                      const finalContent = '已找到相关信息'
                      aiMsg.content = finalContent
                      const messageIndex = messages.value.length - 1
                      messages.value[messageIndex] = { ...aiMsg, content: finalContent }
                      sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                      clearStreamingState()
                      return
                    }
                  }
                } else if (json.status === 'in_progress') {
                  if (!aiMsg.content) {
                    updateMessageContent('正在思考中...')
                  }
                } else if (json.status === 'completed') {
                  if (reasoningContent || answerContent) {
                    const finalContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                    aiMsg.content = finalContent
                    const messageIndex = messages.value.length - 1
                    messages.value[messageIndex] = { ...aiMsg, content: finalContent }
                    sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                  } else if (!aiMsg.content || aiMsg.content === '正在思考中...') {
                    const finalContent = '抱歉，我暂时无法回复。请稍后再试。'
                    aiMsg.content = finalContent
                    const messageIndex = messages.value.length - 1
                    messages.value[messageIndex] = { ...aiMsg, content: finalContent }
                    sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                  }
                  clearStreamingState()
                  return
                }
              } catch (e) {
                // 静默处理解析错误
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('API请求错误:', err)
      
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        if (!aiMsg.content || aiMsg.content === '正在思考中...') {
          aiMsg.content = '输出已中断'
        }
      } else {
        aiMsg.content = `AI接口请求失败：${err.message || '请稍后重试'}`
      }
      
      if (aiMsg.isStreaming) {
        clearStreamingState()
      }
    }
    
    if (aiMsg.isStreaming) {
      clearStreamingState()
    }
  }
  
  async function cancelStream(message) {
    try {
      if (currentStreamController.value) {
        currentStreamController.value.abort()
        currentStreamController.value = null
      }
      
      const conversationId = sessionStore.getConversationId()
      if (conversationId) {
        await api.cancelChat(conversationId)
      }
      
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      
      message.isStreaming = false
      streamingMessageIndex.value = -1
      
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        messages.value[messageIndex] = { ...message, isStreaming: false }
        sessionStore.updateStreamingStatus(messageIndex, false)
        messages.value = [...messages.value]
      }
    } catch (err) {
      console.error('取消对话失败:', err)
      message.isStreaming = false
      streamingMessageIndex.value = -1
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        messages.value[messageIndex] = { ...message, isStreaming: false }
        sessionStore.updateStreamingStatus(messageIndex, false)
        messages.value = [...messages.value]
      }
    }
  }
  
  return {
    messages,
    currentStreamController,
    streamingMessageIndex,
    sendMessage,
    handleStreamResponse,
    cancelStream
  }
} 