from pydantic import AliasChoices, Field
from pydantic_settings import (BaseSettings, SettingsConfigDict,)


class Settings(BaseSettings):
    APP_NAME: str = "Tattva AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    SIGNOZ_URL: str = ""
    SIGNOZ_API_KEY: str = ""
    SIGNOZ_MCP_SERVER: str = ""

    # Generic MCP Server Configuration
    MCP_SERVER_URL: str = ""
    MCP_TIMEOUT_SECONDS: float = 10.0

    # Allows the product demo and local UI to run without a SigNoz account.
    # Production deployments must explicitly set this to false.
    DEMO_MODE: bool = False

    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    OTEL_SERVICE_NAME: str = "tattva-ai-backend"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # AWS Configuration (Safe local-development defaults)
    AWS_REGION: str = "us-east-1"
    AWS_ENABLED: bool = False
    BEDROCK_REGION: str = "us-east-1"
    BEDROCK_ENABLED: bool = False
    BEDROCK_MODEL_ID: str = "us.anthropic.claude-sonnet-4-6"
    # Canonical variable is DYNAMODB_TABLE_NAME; accepts DYNAMODB_TABLE as alias
    DYNAMODB_TABLE_NAME: str = Field(
        default="tattvaai_investigations",
        validation_alias=AliasChoices("DYNAMODB_TABLE_NAME", "DYNAMODB_TABLE"),
    )

    # Persistence & Storage Providers ('sqlite' or 'dynamodb', 'local' or 's3')
    PERSISTENCE_PROVIDER: str = "sqlite"
    REPORT_STORAGE_PROVIDER: str = "local"
    # Canonical variable is S3_REPORT_BUCKET; accepts S3_BUCKET as alias
    S3_REPORT_BUCKET: str = Field(
        default="tattvaai-investigation-reports",
        validation_alias=AliasChoices("S3_REPORT_BUCKET", "S3_BUCKET"),
    )
    S3_REGION: str = "us-east-1"

    # AWS Secrets Manager
    AWS_SECRET_NAME: str = "tattvaai/production/secrets"
    SECRETS_MANAGER_ENABLED: bool = False

    # Telemetry Source Provider ('mock', 'otlp', 'signoz')
    TELEMETRY_SOURCE: str = "mock"

    # Frontend Origin for strict CORS enforcement
    FRONTEND_ORIGIN: str = ""

    @property
    def DYNAMODB_TABLE(self) -> str:
        """Alias property for canonical DYNAMODB_TABLE_NAME."""
        return self.DYNAMODB_TABLE_NAME

    @property
    def S3_BUCKET(self) -> str:
        """Alias property for canonical S3_REPORT_BUCKET."""
        return self.S3_REPORT_BUCKET

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
