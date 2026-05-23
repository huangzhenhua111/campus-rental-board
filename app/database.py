import os

from dotenv import load_dotenv
from sqlmodel import SQLModel,Session,create_engine

load_dotenv()

database_url=os.getenv("DATABASE_URL")
debug_sql=os.getenv("DEBUG_SQL","false").lower()=="true"

if database_url is None:
    raise RuntimeError("DATABASE_URL is not set")

engine=create_engine(database_url,echo=debug_sql,connect_args={"connect_timeout": 10},)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
