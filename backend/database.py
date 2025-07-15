from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from config import settings

# PostgreSQL Configuration with fallback to SQLite
try:
    engine = create_engine(settings.database_url)
    # Test connection
    with engine.connect() as conn:
        pass
    print("✅ PostgreSQL connection successful")
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    print("🔄 Falling back to SQLite for development...")
    # Fallback to SQLite
    sqlite_path = os.path.join(os.path.dirname(__file__), "barabula_dev.db")
    engine = create_engine(f"sqlite:///{sqlite_path}")
    print(f"✅ Using SQLite database: {sqlite_path}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database Dependency
def get_db():
    """Get PostgreSQL database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def init_db():
    """Initialize databases"""
    # Create PostgreSQL/SQLite tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    print("✅ Database initialization completed")
