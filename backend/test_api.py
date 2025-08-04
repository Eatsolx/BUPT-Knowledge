#!/usr/bin/env python
"""
简单的API测试脚本
用于验证修改后的API是否正常工作
"""
import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.views import chat_stream
from rest_framework.test import APIRequestFactory
from rest_framework.test import force_authenticate
import json

def test_chat_stream():
    """测试聊天流API"""
    print("=== 测试聊天流API ===")
    
    factory = APIRequestFactory()
    
    # 创建测试请求数据
    test_data = {
        'messages': [
            {'role': 'user', 'content': '你好'}
        ]
        # 不提供conversation_id，让API自动创建
    }
    
    # 创建POST请求
    request = factory.post('/api/chat/stream/', 
                          data=json.dumps(test_data),
                          content_type='application/json')
    
    print(f"请求数据: {test_data}")
    
    try:
        # 调用视图函数
        response = chat_stream(request)
        print(f"响应状态码: {response.status_code}")
        print(f"响应类型: {type(response)}")
        
        if hasattr(response, 'content'):
            print(f"响应内容: {response.content[:200]}")
            
    except Exception as e:
        print(f"测试失败: {str(e)}")

if __name__ == '__main__':
    print("开始API测试...")
    test_chat_stream()
    print("\n测试完成!") 