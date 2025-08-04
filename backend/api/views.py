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
    try:
        data = request.data
        messages = data.get('messages', [])
        
        if not messages:
            return Response(
                {"error": "消息不能为空"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        api_url = getattr(settings, 'COZE_API_URL', 'https://api.coze.cn/v3/chat')
        api_key = getattr(settings, 'COZE_API_KEY', '')
        bot_id = getattr(settings, 'COZE_BOT_ID', '')
        user_id = getattr(settings, 'COZE_USER_ID', '123456789')
        
        if not api_key or not bot_id:
            return Response(
                {"error": "API配置不完整，请检查环境变量"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        conversation_id = data.get('conversation_id')
        if conversation_id:
            try:
                conversation_id = int(conversation_id)
            except (ValueError, TypeError):
                return Response(
                    {"error": "conversation_id必须是数字格式"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        api_url_with_conversation = f"{api_url}?conversation_id={conversation_id}" if conversation_id else api_url
        
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
            try:
                response = requests.post(
                    api_url_with_conversation, 
                    json=payload, 
                    headers=headers, 
                    stream=True,
                    timeout=30
                )
                
                if response.status_code != 200:
                    error_text = response.text if response.text else '未知错误'
                    yield f"data: {json.dumps({'error': f'AI服务请求失败: {error_text}'})}\n\n"
                    return
                
                buffer = ""
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        try:
                            chunk_str = chunk.decode('utf-8')
                        except UnicodeDecodeError:
                            chunk_str = chunk.decode('utf-8', errors='ignore')
                        
                        buffer += chunk_str
                        lines = buffer.split('\n')
                        buffer = lines.pop() if lines else ""
                        
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                                
                            if line.startswith('event:'):
                                event_type = line.replace('event:', '').strip()
                                if event_type == 'done':
                                    yield "data: [DONE]\n\n"
                                    return
                                elif event_type == 'conversation.message.completed':
                                    yield f"{line}\n\n"
                                    
                            elif line.startswith('data:'):
                                data_content = line.replace('data:', '').strip()
                                if data_content and data_content != '"[DONE]"':
                                    try:
                                        json_data = json.loads(data_content)
                                        
                                        if json_data.get('type') == 'answer' and json_data.get('role') == 'assistant':
                                            yield f"data: {json.dumps(json_data, ensure_ascii=False)}\n\n"
                                        elif json_data.get('type') == 'knowledge':
                                            pass
                                        elif json_data.get('type') == 'verbose':
                                            pass
                                        elif json_data.get('status') in ['created', 'in_progress', 'completed']:
                                            pass
                                            
                                    except json.JSONDecodeError as e:
                                        yield f"data: {data_content}\n\n"
                                        
            except Exception as e:
                yield f"data: {json.dumps({'error': f'服务器错误: {str(e)}'})}\n\n"
        
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
    try:
        data = request.data
        conversation_id = data.get('conversation_id')
        
        if not conversation_id:
            return Response(
                {"error": "conversation_id不能为空"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        api_url = getattr(settings, 'COZE_API_URL', 'https://api.coze.cn/v3/chat')
        api_key = getattr(settings, 'COZE_API_KEY', '')
        bot_id = getattr(settings, 'COZE_BOT_ID', '')
        user_id = getattr(settings, 'COZE_USER_ID', '123456789')
        
        if not api_key or not bot_id:
            return Response(
                {"error": "API配置不完整，请检查环境变量"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        cancel_url = f"{api_url}/cancel"
        
        payload = {
            'bot_id': bot_id,
            'user_id': user_id,
            'conversation_id': conversation_id
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
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