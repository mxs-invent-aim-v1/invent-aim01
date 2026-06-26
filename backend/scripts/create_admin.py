import sys
from pathlib import Path

# Add the backend root directory to the python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from db.database import SessionLocal, init_db
from db.models import User
from core.security import get_password_hash

def create_admin(username: str, password: str):
    init_db()  # Ensure tables exist
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User '{username}' already exists.")
            return

        admin = User(
            username=username,
            hashed_password=get_password_hash(password),
            role="admin",
            can_upload=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"Admin user '{username}' created successfully.")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_admin.py <username> <password>")
        sys.exit(1)
        
    username = sys.argv[1]
    password = sys.argv[2]
    create_admin(username, password)
