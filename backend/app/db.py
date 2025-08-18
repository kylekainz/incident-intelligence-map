import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Get database URL from environment variable, with fallback for development
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:!L#FQbhwB5xK+ZK@db.kyedhxlapbskwnjcccbd.supabase.co:5432/postgres")

# Engine connects to Postgres
engine = create_engine(DATABASE_URL)

# Session is the DB session you’ll use in your routes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class used for model definitions
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
