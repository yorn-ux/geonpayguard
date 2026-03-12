from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from typing import List

logger = logging.getLogger(__name__)

# --- Database URL Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    cleaned_url = DATABASE_URL.strip()
    
    # Handle environment-specific prefix fixes
    if cleaned_url.startswith("psql '"):
        cleaned_url = cleaned_url[5:-1]
    
    # SQLAlchemy 1.4+ requires 'postgresql' instead of 'postgres'
    if cleaned_url.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = cleaned_url.replace("postgres://", "postgresql://", 1)
    else:
        SQLALCHEMY_DATABASE_URL = cleaned_url

    # Parse connection for logging (without password)
    safe_url = SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else SQLALCHEMY_DATABASE_URL
    logger.info(f"🔌 Connecting to database: {safe_url}")

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,
        pool_pre_ping=True,
        connect_args={"sslmode": "require"} if "postgresql" in SQLALCHEMY_DATABASE_URL else {}
    )
    logger.info("✅ Database Engine: Production (PostgreSQL)")
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./geon.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
    logger.warning("⚠️ Database Engine: Local Dev (SQLite)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DB Dependency ---
def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection() -> bool:
    """Test database connection"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {e}")
        return False

def ensure_clean_schema():
    """Ensure we have a clean schema to work with (PostgreSQL only)"""
    # Skip if using SQLite
    if "sqlite" in str(engine.url):
        logger.info("📊 SQLite mode - skipping PostgreSQL-specific schema cleanup")
        return True
        
    try:
        with SessionLocal() as db:
            # Check if there are any objects in the public schema
            result = db.execute(text("""
                SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
            """)).scalar()
            
            if result and result > 0:
                logger.info(f"📊 Found {result} existing tables")
                
                # Try to drop the problematic index specifically
                try:
                    db.execute(text("DROP INDEX IF EXISTS ix_user_settings_user_id CASCADE"))
                    db.commit()
                    logger.info("✅ Dropped problematic index if it existed")
                except Exception as idx_error:
                    logger.warning(f"⚠️ Index drop issue (non-critical): {idx_error}")
            
            # Set search path
            try:
                db.execute(text("SET search_path TO public"))
                db.commit()
            except Exception as path_error:
                logger.warning(f"⚠️ Search path setting issue (non-critical): {path_error}")
            
        return True
    except Exception as e:
        logger.warning(f"⚠️ Schema cleanup warning (non-critical): {e}")
        return True  # Return True to continue initialization even if cleanup fails

def init_db_safe():
    """
    Safe database initialization that handles schema and table creation properly.
    Works with both PostgreSQL and SQLite.
    """
    try:
        # Import all models here to register them with Base.metadata
        from app.models.user import User
        from app.models.wallet import Wallet
        from app.models.dispute import Dispute
        from app.models.settings import UserSettings, BusinessMetadata, PlatformConfig
        from app.models.vault import Campaign
        from app.models.wallet import Transaction
        
        # Detect database type
        is_postgresql = "postgresql" in str(engine.url)
        is_sqlite = "sqlite" in str(engine.url)
        
        logger.info(f"🔍 Database type: {'PostgreSQL' if is_postgresql else 'SQLite' if is_sqlite else 'Unknown'}")
        
        # For PostgreSQL only, ensure schema is clean
        if is_postgresql:
            ensure_clean_schema()
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        logger.info(f"📊 Found {len(existing_tables)} existing tables: {existing_tables}")
        
        # Get all tables defined in models
        all_tables = Base.metadata.tables.keys()
        logger.info(f"📋 Expected tables: {list(all_tables)}")
        
        # Create all tables at once (simpler and works with both databases)
        logger.info("➕ Creating/verifying all tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Table creation/verification complete")
        
        # Refresh inspector to get updated table list
        inspector = inspect(engine)
        final_tables = inspector.get_table_names()
        logger.info(f"✅ Final tables: {final_tables}")
        
        # For existing tables, ensure indexes exist (works with both databases)
        for table_name in final_tables:
            try:
                # Skip if table doesn't exist in metadata
                if table_name not in Base.metadata.tables:
                    continue
                    
                existing_indexes = inspector.get_indexes(table_name)
                existing_index_names = [idx['name'] for idx in existing_indexes if idx['name'] is not None]
                
                # Get the table from metadata
                table = Base.metadata.tables[table_name]
                
                # Create any missing indexes
                for index in table.indexes:
                    if index.name and index.name not in existing_index_names:
                        logger.info(f"  ➕ Creating index: {index.name} on {table_name}")
                        try:
                            index.create(bind=engine)
                            logger.info(f"  ✅ Created index: {index.name}")
                        except Exception as idx_error:
                            # This might fail if index already exists or is incompatible
                            logger.debug(f"  ⚠️ Index creation issue for {index.name}: {idx_error}")
            except Exception as table_error:
                logger.debug(f"⚠️ Error checking indexes for {table_name}: {table_error}")
                # Continue with other tables
        
        logger.info("✅ Database initialization completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database Initialization Error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

# Don't auto-initialize
# test_connection()
# init_db_safe()