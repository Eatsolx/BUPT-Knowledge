import { marked } from 'marked'
import hljs from 'highlight.js'

let hljsInitialized = false

function initializeHighlightJS() {
  if (!hljsInitialized) {
    hljs.configure({
      ignoreUnescapedHTML: true
    })
    hljsInitialized = true
  }
}

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

export function renderMarkdown(content) {
  if (!content) return ''
  try {
    initializeMarked()
    return marked(content)
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return content
  }
}

export function getReasoning(content) {
  if (content.includes('思考过程：') && content.includes('最终答案：')) {
    return content.split('思考过程：')[1].split('最终答案：')[0].trim()
  }
  return ''
}

export function getAnswer(content) {
  if (content.includes('最终答案：')) {
    return content.split('最终答案：')[1].trim()
  }
  return content
}

export function applyCodeHighlighting() {
  if (applyCodeHighlighting.debounceTimer) {
    clearTimeout(applyCodeHighlighting.debounceTimer)
  }
  
  applyCodeHighlighting.debounceTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      initializeHighlightJS()
      
      const codeBlocks = document.querySelectorAll('pre code:not(.hljs)')
      const limitedBlocks = Array.from(codeBlocks).slice(0, 3)
      
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
          rootMargin: '50px'
        })
        
        limitedBlocks.forEach(block => {
          observer.observe(block)
        })
      }
    })
  }, 300)
} 