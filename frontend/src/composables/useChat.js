import { ref, computed } from 'vue'
import api from '../services/api.js'
import { useSessionStore } from '../stores/session.js'

export function useChat() {
  const sessionStore = useSessionStore()
  // 使用computed保持响应式
  const messages = computed(() => sessionStore.messages)
  const currentStreamController = ref(null)
  const streamingMessageIndex = ref(-1)
  
  const maxMessages = 50
  
  // 强制触发响应式更新的辅助函数
  const triggerReactiveUpdate = () => {
    // 只通过sessionStore来触发更新，避免computed只读问题
    const currentMessages = [...sessionStore.messages]
    sessionStore.messages.length = 0
    sessionStore.messages.push(...currentMessages)
  }
  
  async function sendMessage(userContent) {
    if (messages.value.length >= maxMessages) {
      const recentMessages = messages.value.slice(-20)
      sessionStore.resetMessages(recentMessages)
    }
    
    const userMessage = { role: 'user', content: userContent }
    sessionStore.addMessage(userMessage)
    
    const aiMsg = { role: 'assistant', content: '', isStreaming: true }
    sessionStore.addMessage(aiMsg)
    
    streamingMessageIndex.value = sessionStore.messages.length - 1
    return aiMsg
  }
  
  async function handleStreamResponse(aiMsg, userContent) {
    const clearStreamingState = () => {
      aiMsg.isStreaming = false
      currentStreamController.value = null
      streamingMessageIndex.value = -1
      const messageIndex = messages.value.length - 1
      sessionStore.updateMessage(messageIndex, { ...aiMsg, isStreaming: false })
      triggerReactiveUpdate()
    }

    try {
      const controller = new AbortController()
      currentStreamController.value = controller
      
      // 确保发送正确的消息格式
      const messagesToSend = [{ role: 'user', content: userContent }]
      
      console.log('发送到API的数据:', {
        messages: messagesToSend,
        conversationId: sessionStore.getConversationId()
      })
      
      const response = await api.chatStream(
        messagesToSend, 
        sessionStore.getConversationId(), 
        controller.signal
      )

      console.log('API响应状态:', response.status)
      
      if (!response.body) throw new Error('无响应流')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let reasoningContent = ''
      let answerContent = ''

      const updateMessageContent = (content) => {
        console.log('更新消息内容:', content)
        aiMsg.content = content
        const messageIndex = messages.value.length - 1
        sessionStore.updateMessage(messageIndex, aiMsg)
        triggerReactiveUpdate()
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          console.log('接收到流式数据:', buffer)
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            console.log('处理行:', line)
            if (line.startsWith('event:')) {
              const eventType = line.replace('event:', '').trim()
              console.log('事件类型:', eventType)
              if (eventType === 'conversation.message.completed') {
                if (aiMsg.content && aiMsg.content.length > 0 && aiMsg.content !== '正在思考中...') {
                  clearStreamingState()
                  return
                }
              }
            }
            
            if (line.startsWith('data:')) {
              const data = line.replace('data: ', '').replace('data:', '').trim()
              console.log('数据内容:', data)
              if (!data || data === '[DONE]') {
                if (reasoningContent || answerContent) {
                  const finalContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                  aiMsg.content = finalContent
                  const messageIndex = messages.value.length - 1
                  sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                  triggerReactiveUpdate()
                }
                clearStreamingState()
                return
              }

              try {
                const json = JSON.parse(data)
                console.log('解析的JSON:', json)
                
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
                          sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                          triggerReactiveUpdate()
                          clearStreamingState()
                          return
                        }
                      }
                    } catch (e) {
                      const finalContent = '已找到相关信息'
                      aiMsg.content = finalContent
                      const messageIndex = messages.value.length - 1
                      sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                      triggerReactiveUpdate()
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
                    sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                    triggerReactiveUpdate()
                  } else if (!aiMsg.content || aiMsg.content === '正在思考中...') {
                    const finalContent = '抱歉，我暂时无法回复。请稍后再试。'
                    aiMsg.content = finalContent
                    const messageIndex = messages.value.length - 1
                    sessionStore.updateMessage(messageIndex, { ...aiMsg, content: finalContent })
                    triggerReactiveUpdate()
                  }
                  clearStreamingState()
                  return
                }
              } catch (e) {
                console.log('JSON解析错误:', e)
              }
            }
          }
        }
      }
    } catch (err) {
      // 检查是否是取消操作导致的错误
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        if (!aiMsg.content || aiMsg.content === '正在思考中...') {
          aiMsg.content = '输出已中断'
        }
        // AbortError是正常的取消操作，不需要显示为错误
        console.log('流式请求已取消')
      } else {
        console.error('API请求错误:', err)
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
        sessionStore.updateMessage(messageIndex, { ...message, isStreaming: false })
        triggerReactiveUpdate()
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
        sessionStore.updateMessage(messageIndex, { ...message, isStreaming: false })
        triggerReactiveUpdate()
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