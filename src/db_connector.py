import sqlite3
import pandas as pd
import os

class TDDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        if not os.path.exists(db_path):
            print(f"⚠️ Warning: Database file not found at {db_path}")
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def list_tables(self):
        """Returns a list of all tables in the database."""
        query = "SELECT name FROM sqlite_master WHERE type='table';"
        with self.get_connection() as conn:
            tables = pd.read_sql(query, conn)
        return tables['name'].tolist()

    def inspect_table(self, table_name):
        """Returns the first 5 rows and column info for a specific table."""
        with self.get_connection() as conn:
            df = pd.read_sql(f"SELECT * FROM {table_name} LIMIT 5", conn)
            schema = pd.read_sql(f"PRAGMA table_info({table_name})", conn)
        return df, schema

if __name__ == "__main__":
    # Path to our downloaded dataset
    script_dir = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(script_dir, "..", "data", "td_V2.db")
    db = TDDatabase(DB_PATH)
    
    try:
        tables = db.list_tables()
        print(f"📊 Found {len(tables)} tables in the database:")
        for t in tables:
            print(f" - {t}")
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
