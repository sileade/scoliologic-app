#!/usr/bin/env python3
"""
Pull-агент для GitOps автоматического развёртывания (Secure Version)
Scoliologic Patient App

Безопасная версия, использующая Docker Proxy вместо прямого доступа к Docker socket.

Функции:
- Мониторинг Git репозитория на наличие новых коммитов
- Автоматический pull и пересборка при обнаружении изменений
- Health check приложения после деплоя
- Автоматический rollback при ошибках
- Уведомления в Slack/Telegram/Email
"""
import os
import sys
import json
import time
import signal
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import subprocess

import requests
import schedule

from config import config, AgentConfig
from notifier import Notifier
from docker_proxy import SecureDockerProxy, ProxyConfig, DockerProxyError

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/app/data/agent.log')
    ]
)
logger = logging.getLogger('pull-agent-secure')


class SecurePullAgent:
    """
    GitOps Pull-агент для автоматического развёртывания (Безопасная версия)
    
    Использует Docker Proxy для ограниченного доступа к Docker API.
    """
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.notifier = Notifier(config.notification)
        self.running = True
        self.last_commit: Optional[str] = None
        self.consecutive_errors = 0
        self.status_file = Path(config.data_dir) / 'agent_status.json'
        self.history_file = Path(config.data_dir) / 'deploy_history.json'
        
        # Инициализация безопасного Docker прокси
        proxy_config = ProxyConfig(
            allowed_services=['app'],  # Только app сервис
            protected_services=['postgres', 'redis', 'ollama'],  # Защищённые сервисы
            compose_file=config.docker.compose_file,
            project_name='scoliologic'
        )
        self.docker_proxy = SecureDockerProxy(proxy_config)
        
        # Создаём директорию данных
        Path(config.data_dir).mkdir(parents=True, exist_ok=True)
        
        # Загружаем последний известный коммит
        self._load_state()
        
        # Обработка сигналов
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)
        
        logger.info("Secure Pull Agent initialized")
        logger.info(f"Allowed services: {proxy_config.allowed_services}")
        logger.info(f"Protected services: {proxy_config.protected_services}")
    
    def _handle_signal(self, signum, frame):
        """Обработка сигналов остановки"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    def _load_state(self):
        """Загрузка состояния из файла"""
        try:
            if self.status_file.exists():
                with open(self.status_file, 'r') as f:
                    state = json.load(f)
                    self.last_commit = state.get('last_commit')
                    logger.info(f"Loaded state: last_commit={self.last_commit}")
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
    
    def _save_state(self, status: str = 'ok', error: Optional[str] = None):
        """Сохранение состояния в файл"""
        try:
            state = {
                'last_check': datetime.now().isoformat(),
                'last_commit': self.last_commit,
                'status': status,
                'consecutive_errors': self.consecutive_errors,
                'error': error,
                'mode': 'secure'  # Отметка о безопасном режиме
            }
            with open(self.status_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def _add_to_history(self, commit: str, status: str, message: str):
        """Добавление записи в историю деплоев"""
        try:
            history = []
            if self.history_file.exists():
                with open(self.history_file, 'r') as f:
                    history = json.load(f)
            
            history.append({
                'timestamp': datetime.now().isoformat(),
                'commit': commit,
                'status': status,
                'message': message,
                'mode': 'secure'
            })
            
            # Храним последние 100 записей
            history = history[-100:]
            
            with open(self.history_file, 'w') as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to add to history: {e}")
    
    def _run_command(self, cmd: list, cwd: Optional[str] = None, timeout: int = 300) -> Tuple[int, str, str]:
        """Выполнение команды с таймаутом"""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.config.git.local_path,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, '', 'Command timed out'
        except Exception as e:
            return -1, '', str(e)
    
    def _get_remote_commit(self) -> Optional[str]:
        """Получение хэша последнего коммита из удалённого репозитория"""
        try:
            cmd = ['git', 'ls-remote', self.config.git.auth_url, f'refs/heads/{self.config.git.branch}']
            code, stdout, stderr = self._run_command(cmd, cwd='/tmp', timeout=30)
            
            if code == 0 and stdout:
                commit = stdout.split()[0]
                return commit
            
            logger.error(f"Failed to get remote commit: {stderr}")
            return None
        except Exception as e:
            logger.error(f"Error getting remote commit: {e}")
            return None
    
    def _get_local_commit(self) -> Optional[str]:
        """Получение хэша текущего локального коммита"""
        try:
            cmd = ['git', 'rev-parse', 'HEAD']
            code, stdout, stderr = self._run_command(cmd, timeout=10)
            
            if code == 0 and stdout:
                return stdout.strip()
            
            return None
        except Exception as e:
            logger.error(f"Error getting local commit: {e}")
            return None
    
    def _pull_changes(self) -> bool:
        """Получение изменений из репозитория"""
        try:
            logger.info("Pulling changes from remote...")
            
            # Fetch
            cmd = ['git', 'fetch', 'origin', self.config.git.branch]
            code, stdout, stderr = self._run_command(cmd, timeout=60)
            if code != 0:
                logger.error(f"Git fetch failed: {stderr}")
                return False
            
            # Reset to remote
            cmd = ['git', 'reset', '--hard', f'origin/{self.config.git.branch}']
            code, stdout, stderr = self._run_command(cmd, timeout=30)
            if code != 0:
                logger.error(f"Git reset failed: {stderr}")
                return False
            
            logger.info("Successfully pulled changes")
            return True
        except Exception as e:
            logger.error(f"Error pulling changes: {e}")
            return False
    
    def _build_and_deploy(self) -> bool:
        """Сборка и развёртывание приложения через безопасный прокси"""
        try:
            logger.info("Building and deploying application via secure proxy...")
            
            # Используем безопасный прокси для деплоя
            result = self.docker_proxy.deploy('app', no_cache=True)
            
            if not result['success']:
                logger.error(f"Deploy failed at stage '{result.get('stage', 'unknown')}': {result.get('error', 'Unknown error')}")
                return False
            
            logger.info("Build and deploy completed successfully")
            return True
            
        except DockerProxyError as e:
            logger.error(f"Docker proxy error: {e}")
            return False
        except Exception as e:
            logger.error(f"Error during build/deploy: {e}")
            return False
    
    def _health_check(self) -> bool:
        """Проверка здоровья приложения после деплоя"""
        logger.info("Running health check...")
        
        # Сначала проверяем через Docker прокси
        try:
            docker_health = self.docker_proxy.health_check('app')
            if not docker_health.get('healthy', False):
                logger.warning(f"Docker health check: {docker_health}")
        except Exception as e:
            logger.warning(f"Docker health check failed: {e}")
        
        # Затем проверяем HTTP endpoint
        for attempt in range(self.config.deploy.health_check_retries):
            try:
                response = requests.get(
                    self.config.deploy.health_check_url,
                    timeout=self.config.deploy.health_check_timeout
                )
                if response.status_code == 200:
                    logger.info(f"Health check passed on attempt {attempt + 1}")
                    return True
                logger.warning(f"Health check returned {response.status_code}")
            except requests.RequestException as e:
                logger.warning(f"Health check attempt {attempt + 1} failed: {e}")
            
            if attempt < self.config.deploy.health_check_retries - 1:
                time.sleep(10)
        
        logger.error("Health check failed after all retries")
        return False
    
    def _rollback(self, previous_commit: str) -> bool:
        """Откат к предыдущей версии"""
        try:
            logger.warning(f"Rolling back to {previous_commit}...")
            
            # Checkout предыдущего коммита
            cmd = ['git', 'checkout', previous_commit]
            code, stdout, stderr = self._run_command(cmd, timeout=30)
            if code != 0:
                logger.error(f"Git checkout failed: {stderr}")
                return False
            
            # Пересборка через безопасный прокси
            if not self._build_and_deploy():
                return False
            
            # Проверка после отката
            if not self._health_check():
                return False
            
            logger.info("Rollback completed successfully")
            return True
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False
    
    def check_and_deploy(self):
        """Основной цикл проверки и деплоя"""
        try:
            logger.info("Checking for updates...")
            
            # Получаем удалённый коммит
            remote_commit = self._get_remote_commit()
            if not remote_commit:
                self.consecutive_errors += 1
                self._save_state('error', 'Failed to get remote commit')
                return
            
            # Получаем локальный коммит
            local_commit = self._get_local_commit()
            
            # Проверяем, есть ли изменения
            if remote_commit == local_commit:
                logger.info("No changes detected")
                self.consecutive_errors = 0
                self._save_state('ok')
                return
            
            logger.info(f"New commit detected: {remote_commit[:8]} (was: {local_commit[:8] if local_commit else 'none'})")
            
            # Автодеплой отключен - только уведомляем
            if not self.config.deploy.auto_deploy:
                self.notifier.info(
                    "Новый коммит обнаружен",
                    f"Обнаружен новый коммит в репозитории.\nАвтодеплой отключен.",
                    {'Коммит': remote_commit[:8], 'Ветка': self.config.git.branch}
                )
                self._save_state('ok')
                return
            
            # Уведомляем о начале деплоя
            self.notifier.info(
                "Начало деплоя (Secure Mode)",
                f"Обнаружен новый коммит. Начинаю развёртывание через безопасный прокси...",
                {'Коммит': remote_commit[:8], 'Ветка': self.config.git.branch, 'Режим': 'Secure'}
            )
            
            # Pull изменений
            if not self._pull_changes():
                self.consecutive_errors += 1
                self._save_state('error', 'Failed to pull changes')
                self.notifier.error(
                    "Ошибка pull",
                    "Не удалось получить изменения из репозитория",
                    {'Коммит': remote_commit[:8]}
                )
                return
            
            # Сборка и деплой через безопасный прокси
            if not self._build_and_deploy():
                self.consecutive_errors += 1
                self._save_state('error', 'Build/deploy failed')
                self._add_to_history(remote_commit, 'failed', 'Build/deploy failed')
                
                # Пытаемся откатиться
                if self.config.deploy.rollback_on_failure and local_commit:
                    self.notifier.warning(
                        "Ошибка деплоя - откат",
                        "Сборка не удалась. Выполняю откат...",
                        {'Коммит': remote_commit[:8]}
                    )
                    if self._rollback(local_commit):
                        self.notifier.success(
                            "Откат выполнен",
                            "Успешно откатились к предыдущей версии",
                            {'Версия': local_commit[:8]}
                        )
                    else:
                        self.notifier.error(
                            "Откат не удался",
                            "Критическая ошибка! Требуется ручное вмешательство.",
                            {'Коммит': remote_commit[:8]}
                        )
                return
            
            # Health check
            if not self._health_check():
                self.consecutive_errors += 1
                self._save_state('error', 'Health check failed')
                self._add_to_history(remote_commit, 'failed', 'Health check failed')
                
                # Пытаемся откатиться
                if self.config.deploy.rollback_on_failure and local_commit:
                    self.notifier.warning(
                        "Health check не пройден - откат",
                        "Приложение не отвечает после деплоя. Выполняю откат...",
                        {'Коммит': remote_commit[:8]}
                    )
                    if self._rollback(local_commit):
                        self.notifier.success(
                            "Откат выполнен",
                            "Успешно откатились к предыдущей версии",
                            {'Версия': local_commit[:8]}
                        )
                    else:
                        self.notifier.error(
                            "Откат не удался",
                            "Критическая ошибка! Требуется ручное вмешательство.",
                            {'Коммит': remote_commit[:8]}
                        )
                return
            
            # Успешный деплой
            self.last_commit = remote_commit
            self.consecutive_errors = 0
            self._save_state('ok')
            self._add_to_history(remote_commit, 'success', 'Deployed successfully (secure mode)')
            
            self.notifier.success(
                "Деплой успешен (Secure Mode)",
                "Новая версия успешно развёрнута через безопасный прокси.",
                {
                    'Коммит': remote_commit[:8],
                    'Ветка': self.config.git.branch,
                    'Режим': 'Secure',
                    'Время': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
            )
            
            logger.info(f"Successfully deployed {remote_commit[:8]} via secure proxy")
            
        except Exception as e:
            self.consecutive_errors += 1
            logger.error(f"Error in check_and_deploy: {e}")
            self._save_state('error', str(e))
            self.notifier.error(
                "Ошибка агента",
                f"Произошла непредвиденная ошибка: {e}",
                {'Ошибок подряд': self.consecutive_errors}
            )
    
    def run(self):
        """Запуск агента"""
        logger.info(f"Starting Secure Pull Agent (check interval: {self.config.deploy.check_interval}s)")
        
        # Первая проверка сразу
        self.check_and_deploy()
        
        # Планируем регулярные проверки
        schedule.every(self.config.deploy.check_interval).seconds.do(self.check_and_deploy)
        
        while self.running:
            schedule.run_pending()
            time.sleep(1)
        
        logger.info("Secure Pull Agent stopped")


def main():
    """Точка входа"""
    agent = SecurePullAgent(config)
    agent.run()


if __name__ == '__main__':
    main()
