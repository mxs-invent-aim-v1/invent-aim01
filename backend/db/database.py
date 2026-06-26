"""
Database session management and initialization.
"""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

import config
from db.models import Base, Category

logger = logging.getLogger(__name__)

# SQLite: check_same_thread=False needed for FastAPI's async context
connect_args = {"check_same_thread": False} if "sqlite" in config.DATABASE_URL else {}

engine = create_engine(
    config.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    
    # Run simple migrations for existing tables
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE product_catalog ADD COLUMN workflow_id INTEGER REFERENCES workflows(id)"))
            conn.commit()
            logger.info("Added workflow_id column to product_catalog")
    except Exception:
        # Expected if column already exists
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE invoices ADD COLUMN tracking_category_override VARCHAR(100)"))
            conn.commit()
            logger.info("Added tracking_category_override column to invoices")
    except Exception:
        # Expected if column already exists
        pass


def seed_default_categories() -> None:
    """Insert the 3 default categories if they don't exist yet."""
    defaults = [
        {"name": "Category 1", "color": "cyan"},
        {"name": "Category 2", "color": "purple"},
        {"name": "Category 3", "color": "orange"},
    ]
    db = SessionLocal()
    try:
        for cat_data in defaults:
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not existing:
                db.add(Category(name=cat_data["name"], color=cat_data["color"]))
                logger.info(f"Seeded category: {cat_data['name']}")
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to seed categories: {e}")
    finally:
        db.close()


def get_db():
    """FastAPI dependency — yields a DB session and ensures cleanup."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

