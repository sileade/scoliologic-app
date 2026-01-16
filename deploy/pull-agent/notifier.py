"""
Модуль уведомлений для Pull-агента
Поддерживает Slack, Telegram и Email
"""
import json
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

import requests

from config import NotificationConfig

logger = logging.getLogger(__name__)


class Notifier:
    """Класс для отправки уведомлений"""
    
    def __init__(self, config: NotificationConfig):
        self.config = config
    
    def send(
        self,
        title: str,
        message: str,
        level: str = 'info',
        details: Optional[dict] = None
    ) -> bool:
        """
        Отправка уведомления во все настроенные каналы
        
        Args:
            title: Заголовок уведомления
            message: Текст сообщения
            level: Уровень (info, warning, error, success)
            details: Дополнительные данные
        
        Returns:
            True если хотя бы одно уведомление отправлено
        """
        success = False
        
        if self.config.has_slack:
            if self._send_slack(title, message, level, details):
                success = True
        
        if self.config.has_telegram:
            if self._send_telegram(title, message, level, details):
                success = True
        
        if self.config.has_email:
            if self._send_email(title, message, level, details):
                success = True
        
        return success
    
    def _send_slack(
        self,
        title: str,
        message: str,
        level: str,
        details: Optional[dict]
    ) -> bool:
        """Отправка в Slack"""
        try:
            color_map = {
                'info': '#36a64f',
                'warning': '#ff9800',
                'error': '#f44336',
                'success': '#4caf50'
            }
            
            emoji_map = {
                'info': ':information_source:',
                'warning': ':warning:',
                'error': ':x:',
                'success': ':white_check_mark:'
            }
            
            payload = {
                'attachments': [{
                    'color': color_map.get(level, '#36a64f'),
                    'blocks': [
                        {
                            'type': 'header',
                            'text': {
                                'type': 'plain_text',
                                'text': f"{emoji_map.get(level, '')} {title}",
                                'emoji': True
                            }
                        },
                        {
                            'type': 'section',
                            'text': {
                                'type': 'mrkdwn',
                                'text': message
                            }
                        },
                        {
                            'type': 'context',
                            'elements': [{
                                'type': 'mrkdwn',
                                'text': f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Scoliologic Pull Agent"
                            }]
                        }
                    ]
                }]
            }
            
            if details:
                fields = []
                for key, value in details.items():
                    fields.append({
                        'type': 'mrkdwn',
                        'text': f"*{key}:* {value}"
                    })
                payload['attachments'][0]['blocks'].insert(2, {
                    'type': 'section',
                    'fields': fields
                })
            
            response = requests.post(
                self.config.slack_webhook,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            logger.info("Slack notification sent")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
            return False
    
    def _send_telegram(
        self,
        title: str,
        message: str,
        level: str,
        details: Optional[dict]
    ) -> bool:
        """Отправка в Telegram"""
        try:
            emoji_map = {
                'info': 'ℹ️',
                'warning': '⚠️',
                'error': '❌',
                'success': '✅'
            }
            
            text = f"{emoji_map.get(level, 'ℹ️')} *{title}*\n\n{message}"
            
            if details:
                text += "\n\n📋 *Детали:*"
                for key, value in details.items():
                    text += f"\n• {key}: `{value}`"
            
            text += f"\n\n🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            url = f"https://api.telegram.org/bot{self.config.telegram_token}/sendMessage"
            payload = {
                'chat_id': self.config.telegram_chat_id,
                'text': text,
                'parse_mode': 'Markdown',
                'disable_web_page_preview': True
            }
            
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("Telegram notification sent")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")
            return False
    
    def _send_email(
        self,
        title: str,
        message: str,
        level: str,
        details: Optional[dict]
    ) -> bool:
        """Отправка Email"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Scoliologic] {title}"
            msg['From'] = self.config.email_from
            msg['To'] = self.config.email_to
            
            # Текстовая версия
            text_content = f"{title}\n\n{message}"
            if details:
                text_content += "\n\nДетали:"
                for key, value in details.items():
                    text_content += f"\n- {key}: {value}"
            
            # HTML версия
            level_colors = {
                'info': '#2196f3',
                'warning': '#ff9800',
                'error': '#f44336',
                'success': '#4caf50'
            }
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="border-left: 4px solid {level_colors.get(level, '#2196f3')}; padding-left: 15px;">
                    <h2 style="margin: 0 0 10px 0;">{title}</h2>
                    <p style="color: #666;">{message}</p>
                </div>
            """
            
            if details:
                html_content += """
                <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0;">Детали</h3>
                    <table style="width: 100%;">
                """
                for key, value in details.items():
                    html_content += f"""
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">{key}</td>
                            <td style="padding: 5px 0;">{value}</td>
                        </tr>
                    """
                html_content += "</table></div>"
            
            html_content += f"""
                <p style="margin-top: 20px; color: #999; font-size: 12px;">
                    Отправлено: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Scoliologic Pull Agent
                </p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(self.config.email_smtp_host, self.config.email_smtp_port) as server:
                server.starttls()
                server.send_message(msg)
            
            logger.info("Email notification sent")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False
    
    # Удобные методы для разных уровней
    def info(self, title: str, message: str, details: Optional[dict] = None) -> bool:
        return self.send(title, message, 'info', details)
    
    def warning(self, title: str, message: str, details: Optional[dict] = None) -> bool:
        return self.send(title, message, 'warning', details)
    
    def error(self, title: str, message: str, details: Optional[dict] = None) -> bool:
        return self.send(title, message, 'error', details)
    
    def success(self, title: str, message: str, details: Optional[dict] = None) -> bool:
        return self.send(title, message, 'success', details)
