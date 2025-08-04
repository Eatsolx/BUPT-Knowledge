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
    接收前端消息，转发到Coze API，并返回流式响应
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
        api_url = getattr(settings, 'COZE_API_URL', 'https://api.coze.cn/v3/chat')
        api_key = getattr(settings, 'COZE_API_KEY', '')
        bot_id = getattr(settings, 'COZE_BOT_ID', '')
        user_id = getattr(settings, 'COZE_USER_ID', '123456789')
        
        # 验证配置完整性
        if not api_key or not bot_id:
            return Response(
                {"error": "API配置不完整，请检查环境变量"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # 处理会话ID
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            # 生成随机会话ID
            import random
            conversation_id = str(random.randint(1000000000000000000, 9999999999999999999))
        
        api_url_with_conversation = f"{api_url}?conversation_id={conversation_id}"
        
        # 准备请求数据 - 将前端消息转换为Coze API格式
        additional_messages = []
        for msg in messages:
            if msg.get('role') == 'user':
                additional_messages.append({
                    'role': 'user',
                    'content': msg.get('content', ''),
                    'content_type': 'text'
                })
        
        payload = {
            'bot_id': bot_id,
            'user_id': user_id,
            'stream': True,
            'auto_save_history': True,
            'additional_messages': additional_messages
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        def generate_stream():
            """生成流式响应数据"""
            try:
                # 优化：减少日志输出，只记录关键信息
                
                # 发送请求到Coze API
                response = requests.post(
                    api_url_with_conversation, 
                    json=payload, 
                    headers=headers, 
                    stream=True,
                    timeout=30  # 添加超时设置
                )
                
                if response.status_code != 200:
                    error_text = response.text if response.text else '未知错误'
                    yield f"data: {json.dumps({'error': f'AI服务请求失败: {error_text}'})}\n\n"
                    return
                
                # 处理流式响应数据
                buffer = ""
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        # 安全解码响应数据
                        try:
                            chunk_str = chunk.decode('utf-8')
                        except UnicodeDecodeError:
                            try:
                                chunk_str = chunk.decode('utf-8', errors='ignore')
                            except:
                                chunk_str = chunk.decode('latin-1', errors='ignore')
                        
                        buffer += chunk_str
                        lines = buffer.split('\n')
                        buffer = lines.pop() if lines else ""
                        
                        # 处理每一行数据
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                                
                            if line.startswith('event:'):
                                # 处理事件类型
                                event_type = line.replace('event:', '').strip()
                                if event_type == 'done':
                                    yield "data: [DONE]\n\n"
                                    return
                                elif event_type == 'conversation.message.completed':
                                    # 转发完成事件给前端
                                    yield f"{line}\n\n"
                                    
                            elif line.startswith('data:'):
                                # 处理数据内容
                                data_content = line.replace('data:', '').strip()
                                if data_content and data_content != '"[DONE]"':
                                    try:
                                        # 解析JSON数据
                                        json_data = json.loads(data_content)
                                        
                                        # 根据消息类型进行不同处理
                                        if json_data.get('type') == 'answer' and json_data.get('role') == 'assistant':
                                            # AI回复内容，转发给前端
                                            yield f"data: {json.dumps(json_data, ensure_ascii=False)}\n\n"
                                        elif json_data.get('type') == 'knowledge':
                                            # 知识库内容，只记录日志，不转发
                                            pass  # 移除日志输出
                                        elif json_data.get('type') == 'verbose':
                                            # 系统消息，只记录日志
                                            pass  # 移除日志输出
                                        elif json_data.get('status') in ['created', 'in_progress', 'completed']:
                                            # 状态消息，只记录日志
                                            pass  # 移除日志输出
                                            
                                    except json.JSONDecodeError as e:
                                        # 静默处理JSON解析错误，避免日志噪音
                                        # 非JSON数据直接转发
                                        yield f"data: {data_content}\n\n"
                                        
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

@csrf_exempt
@api_view(['POST'])
def cancel_chat(request):
    """
    取消对话API
    向后端发送取消当前对话的请求
    """
    try:
        # 获取请求数据
        data = request.data
        conversation_id = data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {"error": "conversation_id不能为空"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 从settings获取API配置
        api_url = getattr(settings, 'COZE_API_URL', 'https://api.coze.cn/v3/chat')
        api_key = getattr(settings, 'COZE_API_KEY', '')
        bot_id = getattr(settings, 'COZE_BOT_ID', '')
        user_id = getattr(settings, 'COZE_USER_ID', '123456789')
        
        if not api_key or not bot_id:
            return Response(
                {"error": "API配置不完整，请检查环境变量"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # 构建取消对话的URL
        cancel_url = f"{api_url}/cancel"
        
        # 准备请求数据
        payload = {
            'bot_id': bot_id,
            'user_id': user_id,
            'conversation_id': conversation_id
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        # 发送取消请求到Coze API
        response = requests.post(cancel_url, json=payload, headers=headers)
        
        if response.status_code == 200:
            return Response({"message": "对话已取消"})
        else:
            error_text = response.text if response.text else '未知错误'
            return Response(
                {"error": f"取消对话失败: {error_text}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {"error": f"服务器错误: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )