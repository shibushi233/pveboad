from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


engine = create_engine(settings.database_url, echo=settings.debug, connect_args={"check_same_thread": False})


_MIGRATIONS = [
    ("pvenode", "pve_node_name", "ALTER TABLE pvenode ADD COLUMN pve_node_name VARCHAR(128) NOT NULL DEFAULT ''"),
]


def _run_migrations() -> None:
    insp = inspect(engine)
    for table, column, sql in _MIGRATIONS:
        if table in insp.get_table_names():
            existing = {col["name"] for col in insp.get_columns(table)}
            if column not in existing:
                with engine.connect() as conn:
                    conn.execute(text(sql))
                    conn.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _run_migrations()


def get_session():
    with Session(engine) as session:
        yield session
