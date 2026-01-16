#!/usr/bin/env python3
"""
Безопасный Docker API Proxy для Pull-агента

Вместо прямого доступа к Docker socket, этот прокси предоставляет
ограниченный набор операций, необходимых для деплоя.

Преимущества:
- Ограниченный набор разрешённых операций
- Фильтрация по имени контейнера/сервиса
- Логирование всех операций
- Защита от случайного удаления критических контейнеров
"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import subprocess
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('docker-proxy')


class DockerOperation(Enum):
    """Разрешённые операции Docker"""
    BUILD = 'build'
    UP = 'up'
    DOWN = 'down'
    RESTART = 'restart'
    LOGS = 'logs'
    PS = 'ps'
    HEALTH = 'health'


@dataclass
class ProxyConfig:
    """Конфигурация прокси"""
    allowed_services: List[str]
    compose_file: str
    project_name: str
    protected_services: List[str]
    max_log_lines: int = 1000
    operation_timeout: int = 600


class DockerProxyError(Exception):
    """Ошибка прокси"""
    pass


class SecureDockerProxy:
    """
    Безопасный прокси для Docker операций.
    
    Ограничивает доступ к Docker API только необходимыми операциями
    для деплоя приложения.
    """
    
    def __init__(self, config: ProxyConfig):
        self.config = config
        self._validate_config()
    
    def _validate_config(self):
        """Валидация конфигурации"""
        if not self.config.allowed_services:
            raise DockerProxyError("No allowed services specified")
        
        if not os.path.exists(self.config.compose_file):
            raise DockerProxyError(f"Compose file not found: {self.config.compose_file}")
    
    def _is_service_allowed(self, service: str) -> bool:
        """Проверка, разрешён ли сервис"""
        return service in self.config.allowed_services
    
    def _is_service_protected(self, service: str) -> bool:
        """Проверка, защищён ли сервис от удаления"""
        return service in self.config.protected_services
    
    def _run_compose_command(
        self,
        command: List[str],
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """Выполнение docker-compose команды"""
        timeout = timeout or self.config.operation_timeout
        
        full_command = [
            'docker-compose',
            '-f', self.config.compose_file,
            '-p', self.config.project_name,
        ] + command
        
        logger.info(f"Executing: {' '.join(full_command)}")
        
        try:
            result = subprocess.run(
                full_command,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'stdout': '',
                'stderr': 'Operation timed out',
                'returncode': -1
            }
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'returncode': -1
            }
    
    def build(self, service: str, no_cache: bool = False) -> Dict[str, Any]:
        """
        Сборка сервиса.
        
        Args:
            service: Имя сервиса для сборки
            no_cache: Сборка без кэша
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        command = ['build']
        if no_cache:
            command.append('--no-cache')
        command.append(service)
        
        logger.info(f"Building service: {service}")
        return self._run_compose_command(command, timeout=900)  # 15 минут на сборку
    
    def up(self, service: str, detach: bool = True) -> Dict[str, Any]:
        """
        Запуск сервиса.
        
        Args:
            service: Имя сервиса для запуска
            detach: Запуск в фоне
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        command = ['up']
        if detach:
            command.append('-d')
        command.append(service)
        
        logger.info(f"Starting service: {service}")
        return self._run_compose_command(command, timeout=120)
    
    def down(self, service: str, remove_volumes: bool = False) -> Dict[str, Any]:
        """
        Остановка сервиса.
        
        Args:
            service: Имя сервиса для остановки
            remove_volumes: Удалить тома (запрещено для защищённых сервисов)
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        if self._is_service_protected(service) and remove_volumes:
            raise DockerProxyError(f"Cannot remove volumes for protected service '{service}'")
        
        command = ['down']
        if remove_volumes and not self._is_service_protected(service):
            command.append('-v')
        
        # Остановка только указанного сервиса
        command.extend(['--remove-orphans', service])
        
        logger.info(f"Stopping service: {service}")
        return self._run_compose_command(command, timeout=60)
    
    def restart(self, service: str) -> Dict[str, Any]:
        """
        Перезапуск сервиса.
        
        Args:
            service: Имя сервиса для перезапуска
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        logger.info(f"Restarting service: {service}")
        return self._run_compose_command(['restart', service], timeout=120)
    
    def logs(self, service: str, lines: int = 100, follow: bool = False) -> Dict[str, Any]:
        """
        Получение логов сервиса.
        
        Args:
            service: Имя сервиса
            lines: Количество строк
            follow: Следить за логами (не рекомендуется)
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        lines = min(lines, self.config.max_log_lines)
        
        command = ['logs', '--tail', str(lines)]
        if follow:
            command.append('--follow')
        command.append(service)
        
        timeout = 30 if not follow else 5
        return self._run_compose_command(command, timeout=timeout)
    
    def ps(self, service: Optional[str] = None) -> Dict[str, Any]:
        """
        Статус сервисов.
        
        Args:
            service: Имя сервиса (опционально)
        """
        command = ['ps']
        if service:
            if not self._is_service_allowed(service):
                raise DockerProxyError(f"Service '{service}' is not allowed")
            command.append(service)
        
        return self._run_compose_command(command, timeout=30)
    
    def health_check(self, service: str) -> Dict[str, Any]:
        """
        Проверка здоровья сервиса.
        
        Args:
            service: Имя сервиса
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        # Получаем статус контейнера
        result = self._run_compose_command(
            ['ps', '--format', 'json', service],
            timeout=30
        )
        
        if not result['success']:
            return {
                'healthy': False,
                'status': 'unknown',
                'error': result['stderr']
            }
        
        try:
            # Парсим JSON вывод
            containers = json.loads(result['stdout']) if result['stdout'] else []
            if isinstance(containers, dict):
                containers = [containers]
            
            if not containers:
                return {
                    'healthy': False,
                    'status': 'not_found',
                    'error': 'Container not found'
                }
            
            container = containers[0]
            status = container.get('State', 'unknown')
            health = container.get('Health', 'unknown')
            
            return {
                'healthy': status == 'running' and health in ['healthy', 'unknown'],
                'status': status,
                'health': health,
                'name': container.get('Name', service)
            }
        except json.JSONDecodeError:
            # Fallback для старых версий docker-compose
            return {
                'healthy': 'Up' in result['stdout'],
                'status': 'running' if 'Up' in result['stdout'] else 'stopped',
                'raw': result['stdout']
            }
    
    def deploy(self, service: str, no_cache: bool = True) -> Dict[str, Any]:
        """
        Полный цикл деплоя: build -> up.
        
        Args:
            service: Имя сервиса
            no_cache: Сборка без кэша
        """
        if not self._is_service_allowed(service):
            raise DockerProxyError(f"Service '{service}' is not allowed")
        
        logger.info(f"Starting deployment of service: {service}")
        
        # Build
        build_result = self.build(service, no_cache=no_cache)
        if not build_result['success']:
            return {
                'success': False,
                'stage': 'build',
                'error': build_result['stderr']
            }
        
        # Up
        up_result = self.up(service, detach=True)
        if not up_result['success']:
            return {
                'success': False,
                'stage': 'up',
                'error': up_result['stderr']
            }
        
        return {
            'success': True,
            'stage': 'complete',
            'message': f'Service {service} deployed successfully'
        }


def create_proxy_from_env() -> SecureDockerProxy:
    """Создание прокси из переменных окружения"""
    allowed_services = os.environ.get('ALLOWED_SERVICES', 'app').split(',')
    protected_services = os.environ.get('PROTECTED_SERVICES', 'postgres,redis').split(',')
    compose_file = os.environ.get('DOCKER_COMPOSE_FILE', '/app/repo/docker-compose.yml')
    project_name = os.environ.get('COMPOSE_PROJECT_NAME', 'scoliologic')
    
    config = ProxyConfig(
        allowed_services=[s.strip() for s in allowed_services],
        protected_services=[s.strip() for s in protected_services],
        compose_file=compose_file,
        project_name=project_name
    )
    
    return SecureDockerProxy(config)


# HTTP API для прокси (опционально)
if __name__ == '__main__':
    from flask import Flask, request, jsonify
    
    app = Flask(__name__)
    proxy = create_proxy_from_env()
    
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok'})
    
    @app.route('/deploy/<service>', methods=['POST'])
    def deploy(service):
        try:
            no_cache = request.args.get('no_cache', 'true').lower() == 'true'
            result = proxy.deploy(service, no_cache=no_cache)
            return jsonify(result)
        except DockerProxyError as e:
            return jsonify({'success': False, 'error': str(e)}), 403
    
    @app.route('/build/<service>', methods=['POST'])
    def build(service):
        try:
            no_cache = request.args.get('no_cache', 'false').lower() == 'true'
            result = proxy.build(service, no_cache=no_cache)
            return jsonify(result)
        except DockerProxyError as e:
            return jsonify({'success': False, 'error': str(e)}), 403
    
    @app.route('/restart/<service>', methods=['POST'])
    def restart(service):
        try:
            result = proxy.restart(service)
            return jsonify(result)
        except DockerProxyError as e:
            return jsonify({'success': False, 'error': str(e)}), 403
    
    @app.route('/logs/<service>', methods=['GET'])
    def logs(service):
        try:
            lines = int(request.args.get('lines', 100))
            result = proxy.logs(service, lines=lines)
            return jsonify(result)
        except DockerProxyError as e:
            return jsonify({'success': False, 'error': str(e)}), 403
    
    @app.route('/status/<service>', methods=['GET'])
    def status(service):
        try:
            result = proxy.health_check(service)
            return jsonify(result)
        except DockerProxyError as e:
            return jsonify({'success': False, 'error': str(e)}), 403
    
    @app.route('/ps', methods=['GET'])
    def ps():
        result = proxy.ps()
        return jsonify(result)
    
    port = int(os.environ.get('PROXY_PORT', 8080))
    app.run(host='0.0.0.0', port=port)
