import { nextTick } from 'vue'

// 滚动到底部
export function scrollToBottom(chatHistoryRef) {
  // 使用 requestAnimationFrame 优化滚动性能
  requestAnimationFrame(() => {
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    }
  })
}

// 自动调整输入框高度
export function autoResize(inputRef) {
  const el = inputRef.value
  if (!el) return

  el.style.height = '44px'
  el.style.overflowY = 'hidden'
  el.style.lineHeight = '44px'
  el.style.paddingTop = '12px'
  el.style.paddingBottom = '12px'

  const scrollHeight = el.scrollHeight

  if (scrollHeight <= 44) {
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'
  } else {
    el.style.lineHeight = '20px'
    el.style.paddingTop = '12px'
    el.style.paddingBottom = '12px'

    const newScrollHeight = el.scrollHeight

    if (newScrollHeight > 120) {
      el.style.height = '120px'
      el.style.overflowY = 'auto'
    } else {
      el.style.height = newScrollHeight + 'px'
      el.style.overflowY = 'hidden'
    }
  }
}

// 复制消息内容
export async function copyMessage(content, messages, copyStatus) {
  try {
    // 如果是AI消息且包含思考过程，只复制最终答案
    let textToCopy = content
    if (content.includes('思考过程：') && content.includes('最终答案：')) {
      textToCopy = getAnswer(content)
    }
    
    await navigator.clipboard.writeText(textToCopy)
    // 找到当前消息的索引
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      copyStatus.value[messageIndex] = '已复制'
      copyStatus.value[messageIndex + '_time'] = Date.now() // 记录复制时间
      
      // 添加复制成功的CSS类
      nextTick(() => {
        const copyButton = document.querySelector(`[data-message-index="${messageIndex}"]`)
        if (copyButton) {
          copyButton.classList.add('copied')
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 2000)
        }
      })
      
      // 使用更短的超时时间
      setTimeout(() => {
        copyStatus.value[messageIndex] = ''
        delete copyStatus.value[messageIndex + '_time']
      }, 2000)
    }
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = textToCopy
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

// 解析最终答案（从markdown.js导入）
function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
} 