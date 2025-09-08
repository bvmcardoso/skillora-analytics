from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or defaults.

    This class centralizes configuration for the Skillora backend, including
    database, Redis, authentication, uploads, and CORS. It leverages
    `pydantic_settings.BaseSettings` to validate and load values from a `.env`
    file or system environment variables.


    Attributes:
        app_name: Application name.
        environment: Current environment (e.g., development, staging, production).
        debug: Enable or disable debug mode.
        upload_dir: Directory path where uploaded files are stored.
        db_host: Database hostname.
        db_port: Database port.
        db_name: Database name.
        db_user: Database username.
        db_password: Database password.
        database_url_override: Optional full database URL to override derived values.
        redis_host: Redis hostname.
        redis_port: Redis port.
        secret_key: Secret key used for JWT signing.
        algorithm: Algorithm used for JWT signing (e.g., HS256).
        access_token_expire_minutes: JWT access token expiration in minutes.
        cors_origins: Comma-separated list of allowed CORS origins.

    Properties:
        database_url: Async database URL for application usage.
        alembic_database_url: Sync database URL for Alembic migrations.
        redis_url: Redis connection URL.
        cors_origins_list: Parsed list of allowed CORS origins.
    """

    model_config = SettingsConfigDict(
        env_file="backend/.env", env_prefix="", extra="ignore"
    )

    # App:
    app_name: str = Field("skillora", validation_alias="APP_NAME")
    environment: str = Field("development", validation_alias="ENVIRONMENT")
    debug: bool = Field(True, validation_alias="DEBUG")

    # Uploads:
    upload_dir: str = Field("/data/uploads", validation_alias="UPLOAD_DIR")

    # DB:
    db_host: str = Field("localhost", validation_alias="DB_HOST")
    db_port: int = Field(5432, validation_alias="DB_PORT")
    db_name: str = Field("skillora", validation_alias="DB_NAME")
    db_user: str = Field("user", validation_alias="DB_USER")
    db_password: str = Field("password", validation_alias="DB_PASSWORD")
    database_url_override: Optional[str] = Field(
        default=None, validation_alias="DATABASE_URL"
    )

    # Redis:
    redis_host: str = Field("redis", validation_alias="REDIS_HOST")
    redis_port: int = Field(6379, validation_alias="REDIS_PORT")

    # Auth:
    secret_key: str = Field("my_secret_key", validation_alias="SECRET_KEY")
    algorithm: str = Field("HS256", validation_alias="ALGORITHM")
    access_token_expire_minutes: int = Field(
        30, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # CORS:
    cors_origins: str = Field(
        "http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
        validation_alias="CORS_ORIGINS",
    )

    # Derived urls
    @property
    def database_url(self) -> str:
        # Async para a aplicação
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def alembic_database_url(self) -> str:
        # Sync para Alembic (evita dor de cabeça com engine async)
        return f"postgresql+psycopg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Pylance false positive
settings: "Settings" = Settings()  # type: ignore[call-arg]
