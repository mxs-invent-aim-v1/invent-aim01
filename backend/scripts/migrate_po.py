"""Add item_code and category columns to purchase_orders table."""
from db.database import engine
from sqlalchemy import text, inspect

insp = inspect(engine)
existing_cols = [c['name'] for c in insp.get_columns('purchase_orders')]

with engine.connect() as conn:
    if 'item_code' not in existing_cols:
        conn.execute(text('ALTER TABLE purchase_orders ADD COLUMN item_code VARCHAR(50)'))
        print('Added item_code column')
    else:
        print('item_code already exists')

    if 'category' not in existing_cols:
        conn.execute(text('ALTER TABLE purchase_orders ADD COLUMN category VARCHAR(20)'))
        print('Added category column')
    else:
        print('category already exists')

    conn.commit()

print('Migration complete')
