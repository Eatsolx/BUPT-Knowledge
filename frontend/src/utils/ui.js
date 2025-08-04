import { nextTick } from 'vue'

export function scrollToBottom(chatHistoryRef) {
  requestAnimationFrame(() => {
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    }
  })
}

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

export async function copyMessage(content, messages, copyStatus) {
  try {
    let textToCopy = content
    if (content.includes('思考过程：') && content.includes('最终答案：')) {
      textToCopy = getAnswer(content)
    }
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy)
    } else {
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
    
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      copyStatus.value[messageIndex] = '已复制'
      copyStatus.value[messageIndex + '_time'] = Date.now()
      
      nextTick(() => {
        const copyButton = document.querySelector(`[data-message-index="${messageIndex}"]`)
        if (copyButton) {
          copyButton.classList.add('copied')
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 2000)
        }
      })
      
      setTimeout(() => {
        if (copyStatus.value[messageIndex] === '已复制') {
          copyStatus.value[messageIndex] = ''
          delete copyStatus.value[messageIndex + '_time']
        }
      }, 3000)
    }
  } catch (err) {
    console.error('复制失败:', err)
    const messageIndex = messages.value.findIndex(msg => msg.content === content)
    if (messageIndex !== -1) {
      copyStatus.value[messageIndex] = '复制失败'
      setTimeout(() => {
        copyStatus.value[messageIndex] = ''
      }, 2000)
    }
  }
}

function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
} 