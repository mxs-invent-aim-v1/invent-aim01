"""Add po_id column to invoices table."""
from db.database import engine
from sqlalchemy import text, inspect

insp = inspect(engine)
existing_cols = [c['name'] for c in insp.get_columns('invoices')]

with engine.connect() as conn:
    if 'po_id' not in existing_cols:
        conn.execute(text('ALTER TABLE invoices ADD COLUMN po_id INTEGER REFERENCES purchase_orders(id)'))
        print('Added po_id column')
    else:
        print('po_id already exists')

    conn.commit()

print('Migration complete')
