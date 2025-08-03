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
        api_url = getattr(settings, 'COZE_API_URL', 'https://api.coze.cn/v3/chat')
        api_key = getattr(settings, 'COZE_API_KEY', '')
        bot_id = getattr(settings, 'COZE_BOT_ID', '')
        user_id = getattr(settings, 'COZE_USER_ID', '123456789')
        
        # 验证配置
        print(f"API配置检查:")
        print(f"  API URL: {api_url}")
        print(f"  API Key: {'已设置' if api_key else '未设置'}")
        print(f"  Bot ID: {bot_id}")
        print(f"  User ID: {user_id}")
        
        if not api_key or not bot_id:
            return Response(
                {"error": "API配置不完整，请检查环境变量"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # 从前端获取conversation_id，如果没有则生成一个新的
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            # 生成一个随机的conversation_id
            import random
            conversation_id = str(random.randint(1000000000000000000, 9999999999999999999))
        
        api_url_with_conversation = f"{api_url}?conversation_id={conversation_id}"
        
        # 准备请求数据 - 根据Coze API文档格式
        # 将前端传来的messages转换为additional_messages格式
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
            """生成流式响应"""
            try:
                print(f"发送请求到: {api_url_with_conversation}")
                print(f"请求数据: {json.dumps(payload, ensure_ascii=False)}")
                

                
                response = requests.post(
                    api_url_with_conversation, 
                    json=payload, 
                    headers=headers, 
                    stream=True
                )
                
                print(f"响应状态码: {response.status_code}")
                if response.status_code != 200:
                    error_text = response.text if response.text else '未知错误'
                    print(f"API错误: {error_text}")
                    yield f"data: {json.dumps({'error': f'AI服务请求失败: {error_text}'})}\n\n"
                    return
                
                print("开始处理流式响应...")
                buffer = ""
                
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        # 解码并处理数据，使用更安全的编码处理
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
                        
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                                
                            print(f"处理行: {line[:100]}...")
                            
                            if line.startswith('event:'):
                                # 处理事件类型
                                event_type = line.replace('event:', '').strip()
                                print(f"收到事件: {event_type}")
                                
                                # 如果是结束事件，发送结束信号
                                if event_type == 'done':
                                    print("收到结束信号")
                                    yield "data: [DONE]\n\n"
                                    return
                                    
                            elif line.startswith('data:'):
                                # 处理数据内容
                                data_content = line.replace('data:', '').strip()
                                if data_content and data_content != '"[DONE]"':
                                    try:
                                        # 解析JSON数据
                                        json_data = json.loads(data_content)
                                        print(f"解析数据: {json_data}")
                                        
                                        # 转发AI的回复内容和推理过程，过滤掉知识库内容
                                        if json_data.get('type') == 'answer' and json_data.get('role') == 'assistant':
                                            # 这是AI回复的内容，转发给前端
                                            yield f"data: {json.dumps(json_data, ensure_ascii=False)}\n\n"
                                        elif json_data.get('type') == 'knowledge':
                                            # 这是知识库内容，不转发给前端，只记录日志
                                            print(f"知识库内容: {json_data.get('content', '')[:100]}...")
                                        elif json_data.get('type') == 'verbose':
                                            # 这是系统消息，不转发给前端
                                            print(f"系统消息: {json_data.get('content', '')[:100]}...")
                                        elif json_data.get('status') in ['created', 'in_progress', 'completed']:
                                            # 这些是状态消息，不转发给前端
                                            print(f"状态消息: {json_data.get('status')}")
                                        # 移除else分支，避免重复转发
                                            
                                    except json.JSONDecodeError as e:
                                        print(f"JSON解析错误: {e}, 数据: {data_content}")
                                        # 如果不是JSON，直接转发原始数据
                                        yield f"data: {data_content}\n\n"
                                        
            except Exception as e:
                print(f"流式处理错误: {str(e)}")
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
        print(f"API错误: {str(e)}")
        return Response(
            {"error": f"服务器错误: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@api_view(['POST'])
def cancel_chat(request):
    """
    取消对话API
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
        
        # 发送取消请求
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
        print(f"取消对话错误: {str(e)}")
        return Response(
            {"error": f"服务器错误: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )