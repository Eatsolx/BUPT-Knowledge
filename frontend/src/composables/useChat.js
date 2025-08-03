import { ref, nextTick } from 'vue'
import api from '../services/api.js'
import { useSessionStore } from '../stores/session.js'

/**
 * 聊天功能组合式函数
 * 提供消息管理、流式响应处理、取消对话等核心功能
 */
export function useChat() {
  const sessionStore = useSessionStore()
  const messages = ref(sessionStore.getMessages())
  const currentStreamController = ref(null)
  const streamingMessageIndex = ref(-1) // 当前流式消息的索引
  
  // 消息数量限制，防止内存溢出
  const maxMessages = 100
  
  /**
   * 发送用户消息并创建AI消息占位符
   * @param {string} userContent - 用户输入的内容
   * @returns {Object} AI消息对象
   */
  async function sendMessage(userContent) {
    // 消息数量超限时清理旧消息
    if (messages.value.length >= maxMessages) {
      const recentMessages = messages.value.slice(-30)
      messages.value = recentMessages
      sessionStore.resetMessages(recentMessages)
    }
    
    // 添加用户消息
    const userMessage = { role: 'user', content: userContent }
    messages.value.push(userMessage)
    sessionStore.addMessage(userMessage)
    
    // 创建AI消息占位符，标记为流式输出状态
    const aiMsg = { role: 'assistant', content: '', isStreaming: true }
    messages.value.push(aiMsg)
    sessionStore.addMessage(aiMsg)
    
    // 设置当前流式消息索引
    streamingMessageIndex.value = messages.value.length - 1
    
    return aiMsg
  }
  
  /**
   * 处理流式响应数据
   * @param {Object} aiMsg - AI消息对象
   * @param {string} userContent - 用户输入内容
   */
  async function handleStreamResponse(aiMsg, userContent) {
    try {
      // 创建AbortController用于取消请求
      const controller = new AbortController()
      currentStreamController.value = controller
      
      // 发送流式请求
      const response = await api.chatStream([
        { role: 'user', content: userContent }
      ], sessionStore.getConversationId(), controller.signal)

      if (!response.body) throw new Error('无响应流')
      
      // 设置流式读取器
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false
      let buffer = ''
      let reasoningContent = ''
      let answerContent = ''

      // 简化更新函数，直接更新内容
      const updateMessageContent = (content) => {
        aiMsg.content = content
        const messageIndex = messages.value.length - 1
        sessionStore.updateMessage(messageIndex, aiMsg)
        messages.value[messageIndex] = { ...aiMsg }
      }

      // 处理流式数据
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          // 处理每一行数据
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.replace('data: ', '').replace('data:', '').trim()
              if (!data || data === '[DONE]') {
                // 流式输出结束，设置最终内容
                if (reasoningContent || answerContent) {
                  const finalContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                  aiMsg.content = finalContent
                }
                // 标记流式输出结束并立即更新状态
                aiMsg.isStreaming = false
                currentStreamController.value = null
                // 清除流式消息索引
                streamingMessageIndex.value = -1
                // 立即更新状态，确保UI响应
                const messageIndex = messages.value.length - 1
                // 强制触发Vue响应式更新 - 使用数组方法触发响应式
                messages.value.splice(messageIndex, 1, { ...aiMsg, isStreaming: false })
                // 立即更新流式状态，避免防抖延迟
                sessionStore.updateStreamingStatus(messageIndex, false)
                // 强制触发Vue响应式更新
                messages.value = [...messages.value]
                // 使用nextTick确保UI立即更新
                nextTick(() => {
                  // 确保状态已同步
                })
                continue
              }

              try {
                const json = JSON.parse(data)
                
                // 处理Coze API的响应格式
                if (json.role === 'assistant' && json.type === 'answer') {
                  // 检查是否是完整的数据包（包含完整的推理和答案）
                  if (json.reasoning_content && json.content && 
                      json.reasoning_content.length > 50 && json.content.length > 20) {
                    // 完整数据包，直接替换内容
                    const completeContent = `思考过程：${json.reasoning_content}\n最终答案：${json.content}`
                    updateMessageContent(completeContent)
                  } else {
                    // 处理推理过程
                    if (json.reasoning_content) {
                      reasoningContent += json.reasoning_content
                      const partialContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                      updateMessageContent(partialContent)
                    }
                    
                    // 处理最终答案
                    if (json.content) {
                      answerContent += json.content
                      const partialContent = `思考过程：${reasoningContent}\n最终答案：${answerContent}`
                      updateMessageContent(partialContent)
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
                          updateMessageContent(knowledgeData.chunks[0].slice || '已找到相关信息')
                        }
                      }
                    } catch (e) {
                      updateMessageContent('已找到相关信息')
                    }
                  }
                } else if (json.status === 'in_progress') {
                  // 对话进行中，显示加载状态
                  if (!aiMsg.content) {
                    updateMessageContent('正在思考中...')
                  }
                } else if (json.status === 'completed') {
                  // 对话完成，只在没有内容时才设置默认消息
                  if (!aiMsg.content || aiMsg.content === '正在思考中...') {
                    updateMessageContent('抱歉，我暂时无法回复。请稍后再试。')
                  }
                } else if (json.type === 'verbose') {
                  // 处理verbose类型的消息（通常是系统消息）
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
      
      // 检查是否是正常的中断请求
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        // 正常中断，保留已生成的内容
        if (aiMsg.content && aiMsg.content !== '正在思考中...') {
          // 正常中断，无需特殊处理
        } else {
          // 没有内容时显示中断提示
          aiMsg.content = '输出已中断'
        }
      } else {
        // 真正的请求失败
        aiMsg.content = `AI接口请求失败：${err.message || '请稍后重试'}`
      }
      
      // 更新会话状态中的消息
      const messageIndex = messages.value.length - 1
      // 强制触发Vue响应式更新 - 使用数组方法触发响应式
      messages.value.splice(messageIndex, 1, { ...aiMsg, isStreaming: false })
      // 立即更新流式状态，避免防抖延迟
      sessionStore.updateStreamingStatus(messageIndex, false)
      // 强制触发Vue响应式更新
      messages.value = [...messages.value]
    }
    
    // 标记流式输出结束
    aiMsg.isStreaming = false
    currentStreamController.value = null
    // 清除流式消息索引
    streamingMessageIndex.value = -1
    // 确保状态同步到会话存储
    const messageIndex = messages.value.length - 1
    // 强制触发Vue响应式更新 - 使用数组方法触发响应式
    messages.value.splice(messageIndex, 1, { ...aiMsg, isStreaming: false })
    // 立即更新流式状态，避免防抖延迟
    sessionStore.updateStreamingStatus(messageIndex, false)
    // 强制触发Vue响应式更新
    messages.value = [...messages.value]
    // 使用nextTick确保UI立即更新
    nextTick(() => {
      // 确保状态已同步
    })
  }
  
  /**
   * 取消对话流
   * @param {Object} message - 要取消的消息对象
   */
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
      // 清除流式消息索引
      streamingMessageIndex.value = -1
      
      // 只有在没有内容或只有加载提示时才设置中断消息
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      
      // 更新会话状态
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        // 强制触发Vue响应式更新 - 使用数组方法触发响应式
        messages.value.splice(messageIndex, 1, { ...message, isStreaming: false })
        // 立即更新流式状态，避免防抖延迟
        sessionStore.updateStreamingStatus(messageIndex, false)
        // 强制触发Vue响应式更新
        messages.value = [...messages.value]
        // 使用nextTick确保UI立即更新
        nextTick(() => {
          // 确保状态已同步
        })
      }
    } catch (err) {
      console.error('取消对话失败:', err)
      // 即使取消API调用失败，也要确保前端状态正确
      message.isStreaming = false
      // 清除流式消息索引
      streamingMessageIndex.value = -1
      if (!message.content || message.content === '正在思考中...') {
        message.content = '输出已中断'
      }
      
      const messageIndex = messages.value.findIndex(msg => msg === message)
      if (messageIndex !== -1) {
        // 强制触发Vue响应式更新 - 使用数组方法触发响应式
        messages.value.splice(messageIndex, 1, { ...message, isStreaming: false })
        // 立即更新流式状态，避免防抖延迟
        sessionStore.updateStreamingStatus(messageIndex, false)
        // 强制触发Vue响应式更新
        messages.value = [...messages.value]
        // 使用nextTick确保UI立即更新
        nextTick(() => {
          // 确保状态已同步
        })
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