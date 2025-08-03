import { ref } from 'vue'
import api from '../services/api.js'
import { useSessionStore } from '../stores/session.js'

export function useChat() {
  const sessionStore = useSessionStore()
  const messages = ref(sessionStore.getMessages())
  const currentStreamController = ref(null)
  
  // 限制消息数量，防止内存问题
  const maxMessages = 50
  
  // 发送消息
  async function sendMessage(userContent) {
    // 限制消息数量，防止内存问题
    if (messages.value.length >= maxMessages) {
      // 保留最新的20条消息
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
    
    return aiMsg
  }
  
  // 处理流式响应
  async function handleStreamResponse(aiMsg, userContent) {
    try {
      // 创建AbortController用于取消请求
      const controller = new AbortController()
      currentStreamController.value = controller
      
      const response = await api.chatStream([
        { role: 'user', content: userContent }
      ], sessionStore.getConversationId(), controller.signal)

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
                  messages.value[messageIndex] = { ...aiMsg }
                }
                // 标记流式输出结束
                aiMsg.isStreaming = false
                currentStreamController.value = null
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
                    messages.value[messageIndex] = { ...aiMsg }
                  } else {
                    // 处理推理过程
                    if (json.reasoning_content) {
                      reasoningContent += json.reasoning_content
                      aiMsg.content = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                      
                      const messageIndex = messages.value.length - 1
                      sessionStore.updateMessage(messageIndex, aiMsg)
                      messages.value[messageIndex] = { ...aiMsg }
                    }
                    
                    // 处理最终答案
                    if (json.content) {
                      answerContent += json.content
                      aiMsg.content = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                      
                      const messageIndex = messages.value.length - 1
                      sessionStore.updateMessage(messageIndex, aiMsg)
                      messages.value[messageIndex] = { ...aiMsg }
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
                    messages.value[messageIndex] = { ...aiMsg }
                  }
                } else if (json.status === 'in_progress') {
                  // 对话进行中，显示加载状态
                  if (!aiMsg.content) {
                    aiMsg.content = '正在思考中...'
                    const messageIndex = messages.value.length - 1
                    sessionStore.updateMessage(messageIndex, aiMsg)
                    messages.value[messageIndex] = { ...aiMsg }
                  }
                } else if (json.status === 'completed') {
                  // 对话完成，只在没有内容时才设置默认消息
                  if (!aiMsg.content || aiMsg.content === '正在思考中...') {
                    aiMsg.content = '抱歉，我暂时无法回复。请稍后再试。'
                    const messageIndex = messages.value.length - 1
                    sessionStore.updateMessage(messageIndex, aiMsg)
                    messages.value[messageIndex] = { ...aiMsg }
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
      
      // 检查是否是正常的中断请求
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        // 这是正常的中断，保留已生成的内容
        if (aiMsg.content && aiMsg.content !== '正在思考中...') {
          // 保留现有内容，不显示错误
          console.log('请求被正常中断')
        } else {
          // 如果还没有内容，显示中断提示
          aiMsg.content = '输出已中断'
        }
      } else {
        // 这是真正的请求失败
        aiMsg.content = `AI接口请求失败：${err.message || '请稍后重试'}`
      }
      
      // 更新会话状态中的消息
      const messageIndex = messages.value.length - 1
      sessionStore.updateMessage(messageIndex, aiMsg)
      messages.value[messageIndex] = { ...aiMsg }
    }
    
    // 标记流式输出结束
    aiMsg.isStreaming = false
    currentStreamController.value = null
  }
  
  // 取消对话流
  async function cancelStream(message) {
    try {
      // 取消当前的流式请求
      if (currentStreamController.value) {
        currentStreamController.value.abort()
        currentStreamController.value = null
      }
      
      // 调用后端取消API
      const conversationId = sessionStore.getConversationId()
      if (conversationId) {
        await api.cancelChat(conversationId)
      }
      
      // 更新消息状态
      message.isStreaming = false
      
      // 只有在没有内容或只有加载提示时才设置中断消息
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      // 如果有内容，保留现有内容，不覆盖
      
      // 更新会话状态
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        sessionStore.updateMessage(messageIndex, message)
        messages.value[messageIndex] = { ...message }
      }
    } catch (err) {
      console.error('取消对话失败:', err)
      // 即使取消API调用失败，也要确保前端状态正确
      message.isStreaming = false
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        sessionStore.updateMessage(messageIndex, message)
        messages.value[messageIndex] = { ...message }
      }
    }
  }
  
  return {
    messages,
    currentStreamController,
    sendMessage,
    handleStreamResponse,
    cancelStream
  }
} 