from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import all model classes here so they are registered properly
from .incident import Incident  # noqa
