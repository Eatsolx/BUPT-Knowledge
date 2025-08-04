from django.contrib import admin
from django.urls import path
from api.views import chat_stream, cancel_chat

urlpatterns = [
    path('api/chat/stream/', chat_stream, name='chat-stream'),
    path('api/chat/cancel/', cancel_chat, name='chat-cancel'),
]