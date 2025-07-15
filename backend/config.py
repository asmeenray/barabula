from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App Configuration
    app_name: str = "BARABULA"
    debug: bool = True
    environment: str = "development"
    
    # Database Configuration
    database_url: str
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # OpenAI Configuration
    openai_api_key: str = "your_openai_api_key_here"
    
    # External APIs
    google_maps_api_key: str = "your_google_maps_api_key_here"
    openweather_api_key: str = "your_openweather_api_key_here"
    amadeus_api_key: str = "your_amadeus_api_key_here"
    amadeus_api_secret: str = "your_amadeus_api_secret_here"
    
    # AWS Configuration
    aws_access_key_id: str = "your_aws_access_key_here"
    aws_secret_access_key: str = "your_aws_secret_key_here"
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "your_s3_bucket_here"
    
    # Kafka Configuration
    kafka_bootstrap_servers: str = "localhost:9092"
    
    # CORS Configuration
    allowed_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # MCP Server Configuration
    mcp_server_url: str = "http://localhost:3001"
    
    class Config:
        env_file = "/Users/asmeenray/projects/barabula/backend/.env"
        case_sensitive = False


settings = Settings()
