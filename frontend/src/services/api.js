import axios from 'axios';

/**
 * API服务配置
 * 使用相对路径，由Nginx代理到后端服务
 */
const api = axios.create({
    baseURL: '/api', // 使用相对路径，由 Nginx 代理
    timeout: 5000, // 请求超时时间
});

/**
 * API服务对象
 * 提供与后端通信的各种方法
 */
export default {
    /**
     * 流式聊天API
     * 发送消息到后端并返回流式响应
     * @param {Array} messages - 消息数组
     * @param {string} conversationId - 会话ID，可选
     * @param {AbortSignal} signal - 取消信号，用于中断请求
     * @returns {Promise<Response>} 流式响应对象
     */
    chatStream(messages, conversationId = null, signal = null) {
        const requestBody = { messages }
        if (conversationId) {
            // 将字符串转换为数字格式
            requestBody.conversation_id = parseInt(conversationId) || conversationId
        }
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        }
        
        // 添加取消信号支持
        if (signal) {
            options.signal = signal
        }
        
        return fetch('/api/chat/stream/', options);
    },
    
    /**
     * 取消对话API
     * 向后端发送取消当前对话的请求
     * @param {string} conversationId - 要取消的会话ID
     * @returns {Promise<Response>} 取消请求的响应
     */
    cancelChat(conversationId) {
        return fetch('/api/chat/cancel/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ conversation_id: parseInt(conversationId) || conversationId }),
        });
    }
}