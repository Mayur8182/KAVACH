from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarative class for all PostgreSQL application models (to be created in Step 3)."""
    pass


__all__ = ["Base"]
