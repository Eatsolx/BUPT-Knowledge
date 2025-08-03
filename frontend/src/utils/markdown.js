import { marked } from 'marked'
import hljs from 'highlight.js'

// 延迟初始化标志，减少页面加载时的内存使用
let hljsInitialized = false

/**
 * 初始化highlight.js代码高亮库
 * 使用延迟初始化策略，减少初始内存占用
 */
function initializeHighlightJS() {
  if (!hljsInitialized) {
    hljs.configure({
      ignoreUnescapedHTML: true
    })
    hljsInitialized = true
  }
}

// 延迟初始化标志
let markedInitialized = false

/**
 * 初始化marked Markdown解析器
 * 配置Markdown渲染选项和代码高亮功能
 */
function initializeMarked() {
  if (!markedInitialized) {
    marked.setOptions({
      breaks: true, // 支持换行
      gfm: true, // 启用GitHub风格Markdown
      highlight: function (code, lang) {
        // 代码高亮处理
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

/**
 * Markdown内容渲染函数
 * @param {string} content - 要渲染的Markdown内容
 * @returns {string} 渲染后的HTML字符串
 */
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

/**
 * 从AI回复中提取思考过程部分
 * @param {string} content - AI回复的完整内容
 * @returns {string} 思考过程内容
 */
export function getReasoning(content) {
  if (content.includes('思考过程：') && content.includes('最终答案：')) {
    return content.split('思考过程：')[1].split('最终答案：')[0].trim()
  }
  return ''
}

/**
 * 从AI回复中提取最终答案部分
 * @param {string} content - AI回复的完整内容
 * @returns {string} 最终答案内容
 */
export function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
}

/**
 * 应用代码高亮到页面中的代码块
 * 使用防抖机制避免频繁调用
 */
export function applyCodeHighlighting() {
  // 使用防抖机制，避免频繁调用
  if (applyCodeHighlighting.debounceTimer) {
    clearTimeout(applyCodeHighlighting.debounceTimer)
  }
  
  applyCodeHighlighting.debounceTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      // 延迟初始化highlight.js
      initializeHighlightJS()
      
      // 优化：只处理新添加的代码块，避免重复处理
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)')
      
      // 限制每次处理的代码块数量，避免一次性处理太多影响性能
      const limitedBlocks = Array.from(codeBlocks).slice(0, 3)
      
      // 使用IntersectionObserver优化，只处理可见的代码块
      if (limitedBlocks.length > 0) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const block = entry.target
              if (!block.classList.contains('hljs')) {
                try {
                  hljs.highlightElement(block)
                } catch (error) {
                  console.warn('代码高亮失败:', error)
                }
              }
              observer.unobserve(block)
            }
          })
        }, {
          rootMargin: '50px' // 提前50px开始处理
        })
        
        limitedBlocks.forEach(block => {
          observer.observe(block)
        })
      }
    })
  }, 300) // 增加到300ms防抖延迟，减少性能开销
} 