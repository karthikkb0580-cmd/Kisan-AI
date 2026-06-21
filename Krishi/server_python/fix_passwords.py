import sys
sys.path.insert(0, '.')
from app.services.auth_helpers import hash_password
from app import database

database.init_db()
pw = hash_password('password')

# Generic seed users — no personal/private email or phone numbers here.
# Add your own test accounts locally; do NOT commit real credentials.
users_to_seed = [
    ('Dr. Demo Farmer', 'demo@krishi.ai',  None),
    ('Dev User',        'dev@krishi.ai',   None),
]

for full_name, email, phone in users_to_seed:
    existing = database.get_user_by_email(email)
    if existing:
        database.update_user_profile(user_id=existing['id'], password_hash=pw)
        print(f'[UPDATED] {email} — password hash refreshed')
    else:
        uid = database.create_user(
            full_name=full_name,
            email=email,
            phone=phone,
            password_hash=pw,
        )
        if uid:
            database.update_user_verification(user_id=uid, email_verified=True, phone_verified=True)
            print(f'[SEEDED]  {email} (id={uid})')
        else:
            print(f'[FAILED]  {email}')

print('Done.')
