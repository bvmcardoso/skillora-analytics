from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Base class for all models:
Base = declarative_base()
"""Declarative base class used for defining ORM models."""

# Create the async engine
DATABASE_URL = settings.database_url
engine = create_async_engine(DATABASE_URL, echo=settings.debug)
"""SQLAlchemy async engine connected to the configured PostgreSQL database."""

async_session = async_sessionmaker(
    autocommit=False, autoflush=False, bind=engine, class_=AsyncSession
)
"""Factory for creating asynchronous SQLAlchemy sessions."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session.

    This function is intended to be used with FastAPI's dependency injection system.
    It ensures that a new `AsyncSession` is created for each request and properly
    closed after use.

    Yields:
        AsyncSession: A SQLAlchemy asynchronous session bound to the current engine.
    """
    async with async_session() as session:
        yield session
