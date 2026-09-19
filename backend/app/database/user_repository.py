"""
===============================================================================
TattvaAI - User Repository Abstraction
===============================================================================

Handles persistence operations for users, providing:
• SQLiteUserRepository (default local / development storage)
• DynamoDBUserRepository (optional serverless AWS DynamoDB storage)

Factory:
--------
get_user_repository(provider: Optional[str] = None)
Configured via settings.PERSISTENCE_PROVIDER ('sqlite' or 'dynamodb').
===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
import uuid

from sqlalchemy.exc import SQLAlchemyError

from app.core.logger import logger
from app.core.settings import settings
from app.database.models import User
from app.database.session import SessionLocal
from app.database.database import create_tables


class UserEntity:
    """Lightweight representation of a user for non-ORM persistence."""

    def __init__(
        self,
        id: str | int,
        email: str,
        full_name: str,
        hashed_password: str,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
    ) -> None:
        self.id = id
        self.email = email
        self.full_name = full_name
        self.hashed_password = hashed_password
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()


class BaseUserRepository(ABC):
    """Abstract base repository for user persistence."""

    @abstractmethod
    def create_user(self, email: str, full_name: str, hashed_password: str) -> Any:
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Any]:
        pass

    @abstractmethod
    def get_by_id(self, user_id: Any) -> Optional[Any]:
        pass

    @abstractmethod
    def close(self) -> None:
        pass


class SQLiteUserRepository(BaseUserRepository):
    """
    Local SQLite user repository using SQLAlchemy.
    """

    def __init__(self) -> None:
        create_tables()
        self.db = SessionLocal()

    def create_user(self, email: str, full_name: str, hashed_password: str) -> User:
        try:
            user = User(
                email=email.lower().strip(),
                full_name=full_name.strip(),
                hashed_password=hashed_password,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def get_by_email(self, email: str) -> Optional[User]:
        normalized_email = email.lower().strip()
        return self.db.query(User).filter(User.email == normalized_email).first()

    def get_by_id(self, user_id: int | str) -> Optional[User]:
        try:
            uid = int(user_id)
            return self.db.query(User).filter(User.id == uid).first()
        except (ValueError, TypeError):
            return None

    def close(self) -> None:
        self.db.close()


class DynamoDBUserRepository(BaseUserRepository):
    """
    AWS DynamoDB user repository for serverless deployments.
    Stores persistent user entities in the primary DynamoDB table (tattvaai_investigations)
    under the partition key `incident_id = USER#<email>`.
    """

    def __init__(self) -> None:
        import boto3
        self.region = settings.AWS_REGION
        self.table_name = settings.DYNAMODB_TABLE_NAME
        self.aws_enabled = settings.AWS_ENABLED
        self._table = None

        if self.aws_enabled:
            try:
                dynamodb = boto3.resource("dynamodb", region_name=self.region)
                self._table = dynamodb.Table(self.table_name)
                logger.info(
                    "[UserRepository] Initialized DynamoDB Table resource (Region: %s, Table: %s)",
                    self.region,
                    self.table_name,
                )
            except Exception as e:
                logger.warning("[UserRepository] DynamoDB initialization failed: %s", e)

        self._fallback_store: Dict[str, UserEntity] = {}

    def create_user(self, email: str, full_name: str, hashed_password: str) -> UserEntity:
        user_id = str(uuid.uuid4())
        normalized_email = email.lower().strip()
        user = UserEntity(
            id=user_id,
            email=normalized_email,
            full_name=full_name.strip(),
            hashed_password=hashed_password,
            is_active=True,
            created_at=datetime.utcnow(),
        )

        if self._table is not None:
            try:
                item = {
                    "incident_id": f"USER#{normalized_email}",
                    "entity_type": "USER",
                    "email": normalized_email,
                    "id": str(user.id),
                    "full_name": user.full_name,
                    "hashed_password": user.hashed_password,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat(),
                }
                self._table.put_item(Item=item)
                logger.info(
                    "[UserRepository] Successfully persisted user '%s' in DynamoDB table '%s'",
                    normalized_email,
                    self.table_name,
                )
                return user
            except Exception as e:
                logger.error("[UserRepository] DynamoDB put_item failed for user '%s': %s", normalized_email, e)
                raise

        self._fallback_store[normalized_email] = user
        return user

    def get_by_email(self, email: str) -> Optional[UserEntity]:
        normalized_email = email.lower().strip()
        if self._table is not None:
            try:
                response = self._table.get_item(Key={"incident_id": f"USER#{normalized_email}"})
                item = response.get("Item")
                if item:
                    return UserEntity(
                        id=item.get("id"),
                        email=item.get("email"),
                        full_name=item.get("full_name"),
                        hashed_password=item.get("hashed_password"),
                        is_active=item.get("is_active", True),
                        created_at=datetime.fromisoformat(item["created_at"]) if item.get("created_at") else None,
                    )
                return None
            except Exception as e:
                logger.error("[UserRepository] DynamoDB get_item failed for user '%s': %s", normalized_email, e)
                raise

        return self._fallback_store.get(normalized_email)

    def get_by_id(self, user_id: Any) -> Optional[UserEntity]:
        str_id = str(user_id)
        for user in self._fallback_store.values():
            if str(user.id) == str_id:
                return user
        return None

    def close(self) -> None:
        pass


def get_user_repository(provider: Optional[str] = None) -> BaseUserRepository:
    """
    Factory creating the configured user repository.
    """
    prov = (provider or settings.PERSISTENCE_PROVIDER or "sqlite").lower()
    if prov == "dynamodb" and settings.AWS_ENABLED:
        return DynamoDBUserRepository()
    return SQLiteUserRepository()
