#!/usr/bin/env python3
"""
Health check скрипт для Pull-агента
"""
import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path


def check_health() -> bool:
    """Проверка здоровья агента"""
    data_dir = Path(os.getenv('DATA_DIR', '/app/data'))
    status_file = data_dir / 'agent_status.json'
    
    # Проверяем существование файла статуса
    if not status_file.exists():
        print("Status file not found - agent may be starting")
        return True  # Разрешаем при первом запуске
    
    try:
        with open(status_file, 'r') as f:
            status = json.load(f)
        
        # Проверяем время последней проверки
        last_check = datetime.fromisoformat(status.get('last_check', ''))
        check_interval = int(os.getenv('CHECK_INTERVAL', '300'))
        max_age = timedelta(seconds=check_interval * 3)  # 3x интервал
        
        if datetime.now() - last_check > max_age:
            print(f"Last check too old: {last_check}")
            return False
        
        # Проверяем статус
        if status.get('status') == 'error':
            consecutive_errors = status.get('consecutive_errors', 0)
            if consecutive_errors >= 5:
                print(f"Too many consecutive errors: {consecutive_errors}")
                return False
        
        print(f"Agent healthy - last check: {last_check}")
        return True
        
    except Exception as e:
        print(f"Health check error: {e}")
        return False


if __name__ == '__main__':
    sys.exit(0 if check_health() else 1)
