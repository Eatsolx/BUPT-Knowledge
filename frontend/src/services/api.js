import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // 使用相对路径，由 Nginx 代理
    timeout: 5000,
});

export default {
    // 流式聊天API
    chatStream(messages, conversationId = null) {
        const requestBody = { messages }
        if (conversationId) {
            requestBody.conversation_id = conversationId
        }
        
        return fetch('/api/chat/stream/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
    }
}