"""
Конфигурация Pull-агента для GitOps
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class GitConfig:
    """Конфигурация Git репозитория"""
    repo_url: str
    branch: str
    token: Optional[str]
    local_path: str
    
    @classmethod
    def from_env(cls) -> 'GitConfig':
        return cls(
            repo_url=os.getenv('GIT_REPO_URL', 'https://github.com/sileade/scoliologic-app.git'),
            branch=os.getenv('GIT_BRANCH', 'main'),
            token=os.getenv('GIT_TOKEN'),
            local_path=os.getenv('GIT_LOCAL_PATH', '/app/repo')
        )
    
    @property
    def auth_url(self) -> str:
        """URL с токеном авторизации"""
        if self.token and 'github.com' in self.repo_url:
            return self.repo_url.replace('https://', f'https://{self.token}@')
        return self.repo_url


@dataclass
class DockerConfig:
    """Конфигурация Docker"""
    compose_file: str
    app_container: str
    network: str
    
    @classmethod
    def from_env(cls) -> 'DockerConfig':
        return cls(
            compose_file=os.getenv('DOCKER_COMPOSE_FILE', '/app/repo/docker-compose.yml'),
            app_container=os.getenv('APP_CONTAINER_NAME', 'scoliologic-app'),
            network=os.getenv('DOCKER_NETWORK', 'scoliologic-network')
        )


@dataclass
class DeployConfig:
    """Конфигурация деплоя"""
    auto_deploy: bool
    rollback_on_failure: bool
    health_check_url: str
    health_check_timeout: int
    health_check_retries: int
    deploy_timeout: int
    
    @classmethod
    def from_env(cls) -> 'DeployConfig':
        return cls(
            auto_deploy=os.getenv('AUTO_DEPLOY', 'true').lower() == 'true',
            rollback_on_failure=os.getenv('ROLLBACK_ON_FAILURE', 'true').lower() == 'true',
            health_check_url=os.getenv('HEALTH_CHECK_URL', 'http://app:3000/api/health'),
            health_check_timeout=int(os.getenv('HEALTH_CHECK_TIMEOUT', '30')),
            health_check_retries=int(os.getenv('HEALTH_CHECK_RETRIES', '5')),
            deploy_timeout=int(os.getenv('DEPLOY_TIMEOUT', '300'))
        )


@dataclass
class NotificationConfig:
    """Конфигурация уведомлений"""
    slack_webhook: Optional[str]
    telegram_token: Optional[str]
    telegram_chat_id: Optional[str]
    email_smtp_host: Optional[str]
    email_smtp_port: int
    email_from: Optional[str]
    email_to: Optional[str]
    
    @classmethod
    def from_env(cls) -> 'NotificationConfig':
        return cls(
            slack_webhook=os.getenv('SLACK_WEBHOOK_URL'),
            telegram_token=os.getenv('TELEGRAM_BOT_TOKEN'),
            telegram_chat_id=os.getenv('TELEGRAM_CHAT_ID'),
            email_smtp_host=os.getenv('EMAIL_SMTP_HOST'),
            email_smtp_port=int(os.getenv('EMAIL_SMTP_PORT', '587')),
            email_from=os.getenv('EMAIL_FROM'),
            email_to=os.getenv('EMAIL_TO')
        )
    
    @property
    def has_slack(self) -> bool:
        return bool(self.slack_webhook)
    
    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_token and self.telegram_chat_id)
    
    @property
    def has_email(self) -> bool:
        return bool(self.email_smtp_host and self.email_from and self.email_to)


@dataclass
class AgentConfig:
    """Полная конфигурация агента"""
    git: GitConfig
    docker: DockerConfig
    deploy: DeployConfig
    notification: NotificationConfig
    check_interval: int
    data_dir: str
    
    @classmethod
    def from_env(cls) -> 'AgentConfig':
        return cls(
            git=GitConfig.from_env(),
            docker=DockerConfig.from_env(),
            deploy=DeployConfig.from_env(),
            notification=NotificationConfig.from_env(),
            check_interval=int(os.getenv('CHECK_INTERVAL', '300')),
            data_dir=os.getenv('DATA_DIR', '/app/data')
        )


# Глобальный экземпляр конфигурации
config = AgentConfig.from_env()
