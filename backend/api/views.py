import json
import requests
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@csrf_exempt
@api_view(['POST'])
def chat_stream(request):
    """
    流式AI聊天API
    """
    try:
        # 获取请求数据
        data = request.data
        messages = data.get('messages', [])
        
        # 验证消息格式
        if not messages:
            return Response(
                {"error": "消息不能为空"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 从settings获取API配置
        api_url = getattr(settings, 'DASHSCOPE_API_URL', '')
        api_key = getattr(settings, 'DASHSCOPE_API_KEY', '')
        model = getattr(settings, 'DASHSCOPE_MODEL', '')
        
        # 准备请求数据
        payload = {
            'model': model,
            'messages': messages,
            'stream': True,
            'stream_options': {'include_usage': True}
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        def generate_stream():
            """生成流式响应"""
            try:
                response = requests.post(
                    api_url, 
                    json=payload, 
                    headers=headers, 
                    stream=True
                )
                
                if response.status_code != 200:
                    yield f"data: {json.dumps({'error': 'AI服务请求失败'})}\n\n"
                    return
                
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        # 解码并处理数据
                        chunk_str = chunk.decode('utf-8')
                        lines = chunk_str.split('\n')
                        
                        for line in lines:
                            if line.startswith('data:'):
                                data_content = line.replace('data: ', '').replace('data:', '').strip()
                                if data_content and data_content != '[DONE]':
                                    yield f"data: {data_content}\n\n"
                                elif data_content == '[DONE]':
                                    yield "data: [DONE]\n\n"
                                    return
                                    
            except Exception as e:
                yield f"data: {json.dumps({'error': f'服务器错误: {str(e)}'})}\n\n"
        
        # 返回流式响应
        response = StreamingHttpResponse(
            generate_stream(),
            content_type='text/plain'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
        
    except Exception as e:
        return Response(
            {"error": f"服务器错误: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )