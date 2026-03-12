# fix_relationships.py
import sqlite3
import os

def fix_relationships():
    """Drop and recreate tables with correct relationships"""
    
    db_path = 'geon.db'
    
    if os.path.exists(db_path):
        print(f"🗑️  Deleting existing database: {db_path}")
        os.remove(db_path)
        print("✅ Database deleted")
    else:
        print("📂 No existing database found")
    
    print("\n✅ Ready to recreate database with correct relationships")
    print("➡️  Now run: python main.py")

if __name__ == "__main__":
    fix_relationships()