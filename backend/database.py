from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import settings


engine = create_engine(settings.database_url)

class Base(DeclarativeBase):
    pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
    # Create PostgreSQL tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")
    print("Database initialization completed")
