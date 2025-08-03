import { nextTick } from 'vue'

/**
 * 滚动聊天历史到底部
 * 使用requestAnimationFrame优化滚动性能
 * @param {Object} chatHistoryRef - 聊天历史容器的ref对象
 */
export function scrollToBottom(chatHistoryRef) {
  // 使用 requestAnimationFrame 优化滚动性能
  requestAnimationFrame(() => {
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    }
  })
}

/**
 * 自动调整输入框高度
 * 根据内容长度动态调整输入框高度，提供更好的用户体验
 * @param {Object} inputRef - 输入框的ref对象
 */
export function autoResize(inputRef) {
  const el = inputRef.value
  if (!el) return

  // 重置输入框样式
  el.style.height = '44px'
  el.style.overflowY = 'hidden'
  el.style.lineHeight = '44px'
  el.style.paddingTop = '12px'
  el.style.paddingBottom = '12px'

  const scrollHeight = el.scrollHeight

  if (scrollHeight <= 44) {
    // 内容较少时使用单行样式
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'
  } else {
    // 内容较多时使用多行样式
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'

    const newScrollHeight = el.scrollHeight

    if (newScrollHeight > 120) {
      // 内容超过120px时设置最大高度并显示滚动条
      el.style.height = '120px'
      el.style.overflowY = 'auto'
    } else {
      // 根据内容设置合适的高度
      el.style.height = newScrollHeight + 'px'
      el.style.overflowY = 'hidden'
    }
  }
}

/**
 * 复制消息内容到剪贴板
 * 支持AI消息的思考过程和最终答案分离复制
 * @param {string} content - 要复制的内容
 * @param {Object} messages - 消息列表的ref对象
 * @param {Object} copyStatus - 复制状态管理对象
 */
export async function copyMessage(content, messages, copyStatus) {
  try {
    // 如果是AI消息且包含思考过程，只复制最终答案
    let textToCopy = content
    if (content.includes('思考过程：') && content.includes('最终答案：')) {
      textToCopy = getAnswer(content)
    }
    
    // 优化：检查剪贴板API是否可用
    if (navigator.clipboard && window.isSecureContext) {
      // 使用现代剪贴板API
      await navigator.clipboard.writeText(textToCopy)
    } else {
      // 降级方案：使用传统方法复制
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('传统复制方法失败:', err)
        throw err
      } finally {
        document.body.removeChild(textArea)
      }
    }
    
    // 找到当前消息的索引
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      // 更新复制状态
      copyStatus.value[messageIndex] = '已复制'
      copyStatus.value[messageIndex + '_time'] = Date.now() // 记录复制时间
      
      // 优化：使用更高效的DOM操作
      nextTick(() => {
        const copyButton = document.querySelector(`[data-message-index="${messageIndex}"]`)
        if (copyButton) {
          // 添加复制成功的视觉反馈
          copyButton.classList.add('copied')
          // 使用CSS动画而不是setTimeout
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 2000)
        }
      })
      
      // 优化：使用更长的清除时间，避免用户困惑
      setTimeout(() => {
        if (copyStatus.value[messageIndex] === '已复制') {
          copyStatus.value[messageIndex] = ''
          delete copyStatus.value[messageIndex + '_time']
        }
      }, 3000) // 增加到3秒
    }
  } catch (err) {
    console.error('复制失败:', err)
    // 提供用户友好的错误提示
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      copyStatus.value[messageIndex] = '复制失败'
      setTimeout(() => {
        copyStatus.value[messageIndex] = ''
      }, 2000)
    }
  }
}

/**
 * 从AI回复中提取最终答案部分
 * @param {string} content - AI回复的完整内容
 * @returns {string} 最终答案内容
 */
function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
} 