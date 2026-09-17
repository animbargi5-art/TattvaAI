import os
from sqlalchemy import create_engine

from app.database.models import Base


# In AWS Lambda environments (/var/task is read-only), default SQLite to /tmp
_default_path = "/tmp/tattvaai.db" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "./tattvaai.db"
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{_default_path}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


def create_tables():

    Base.metadata.create_all(bind=engine)