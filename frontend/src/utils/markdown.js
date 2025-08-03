import { marked } from 'marked'
import hljs from 'highlight.js'

// 延迟初始化highlight.js，减少页面加载时的内存使用
let hljsInitialized = false
function initializeHighlightJS() {
  if (!hljsInitialized) {
    hljs.configure({
      ignoreUnescapedHTML: true
    })
    hljsInitialized = true
  }
}

// 延迟初始化marked，减少页面加载时的内存使用
let markedInitialized = false
function initializeMarked() {
  if (!markedInitialized) {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight.js error:', err);
          }
        }
        return hljs.highlightAuto(code).value;
      }
    })
    markedInitialized = true
  }
}

// Markdown渲染函数
export function renderMarkdown(content) {
  if (!content) return ''
  try {
    // 延迟初始化marked
    initializeMarked()
    return marked(content)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return content
  }
}

// 解析思考过程
export function getReasoning(content) {
  if (content.includes('思考过程：') && content.includes('最终答案：')) {
    return content.split('思考过程：')[1].split('最终答案：')[0].trim()
  }
  return ''
}

// 解析最终答案
export function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
}

// 代码高亮函数
export function applyCodeHighlighting() {
  // 使用更长的防抖时间，减少调用频率
  if (applyCodeHighlighting.debounceTimer) {
    clearTimeout(applyCodeHighlighting.debounceTimer)
  }
  
  applyCodeHighlighting.debounceTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      // 延迟初始化highlight.js
      initializeHighlightJS()
      
      // 只处理新添加的代码块，避免重复处理
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)')
      // 限制每次处理的代码块数量，避免一次性处理太多
      const limitedBlocks = Array.from(codeBlocks).slice(0, 5)
      limitedBlocks.forEach(block => {
        if (!block.classList.contains('hljs')) {
          hljs.highlightElement(block)
        }
      })
    })
  }, 200) // 增加到200ms防抖
} 