from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
import redis
from config import settings

# PostgreSQL Configuration
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# MongoDB Configuration
mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
mongodb_db = mongodb_client.get_database("barabula")

# Redis Configuration
redis_client = redis.from_url(settings.redis_url, decode_responses=True)


# Database Dependency
def get_db():
    """Get PostgreSQL database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_mongodb():
    """Get MongoDB database"""
    return mongodb_db


def get_redis():
    """Get Redis client"""
    return redis_client


async def init_db():
    """Initialize databases"""
    # Create PostgreSQL tables
    Base.metadata.create_all(bind=engine)
    
    # Test MongoDB connection
    try:
        await mongodb_client.admin.command('ping')
        print("✅ MongoDB connection successful")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
    
    # Test Redis connection
    try:
        redis_client.ping()
        print("✅ Redis connection successful")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
    
    print("✅ Database initialization completed")
