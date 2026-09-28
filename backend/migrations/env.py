from alembic import context

from app.costs.tables import Base

# app/costs/db.py hands in the live connection, so the URL never lives in a config file.
connection = context.config.attributes["connection"]
context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)
with context.begin_transaction():
    context.run_migrations()
