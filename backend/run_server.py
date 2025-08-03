#!/usr/bin/env python
"""
Django开发服务器启动脚本
用于快速启动Django开发服务器，简化开发流程
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    # 设置Django设置模块路径
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    # 初始化Django应用
    django.setup()
    # 执行Django管理命令
    execute_from_command_line(sys.argv) 