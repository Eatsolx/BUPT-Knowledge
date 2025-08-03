import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // 使用相对路径，由 Nginx 代理
    timeout: 5000,
});

export default {
    // 流式聊天API
    chatStream(messages, conversationId = null, signal = null) {
        const requestBody = { messages }
        if (conversationId) {
            requestBody.conversation_id = conversationId
        }
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        }
        
        if (signal) {
            options.signal = signal
        }
        
        return fetch('/api/chat/stream/', options);
    },
    
    // 取消对话API
    cancelChat(conversationId) {
        return fetch('/api/chat/cancel/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ conversation_id: conversationId }),
        });
    }
}