"""
SecureVote — Admin Password Hash Generator
==========================================
Run this script ONCE to generate a secure bcrypt hash of your
chosen admin password.

Usage:
    python generate_password_hash.py

Requirements:
    pip install bcrypt

The printed hash is what you paste into seed_admin.sql.
"""

import bcrypt
import getpass
import sys

def generate_hash():
    print("=" * 52)
    print("  SecureVote — Admin Password Hash Generator")
    print("=" * 52)
    print()

    # Prompt for password twice without echoing it
    try:
        password = getpass.getpass("Enter admin password       : ")
        confirm  = getpass.getpass("Confirm admin password     : ")
    except KeyboardInterrupt:
        print("\n[!] Cancelled.")
        sys.exit(1)

    if password != confirm:
        print("\n[ERROR] Passwords do not match. Please try again.")
        sys.exit(1)

    if len(password) < 8:
        print("\n[ERROR] Password must be at least 8 characters.")
        sys.exit(1)

    # Generate bcrypt hash with work factor 12 (strong, ~250ms on modern hardware)
    password_bytes = password.encode('utf-8')
    salt           = bcrypt.gensalt(rounds=12)
    hashed         = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    print()
    print("-" * 52)
    print("  ✅ bcrypt hash generated successfully")
    print("-" * 52)
    print()
    print("Paste this hash into seed_admin.sql (PASTE_HASH_HERE):")
    print()
    print(hashed)
    print()
    print("-" * 52)
    print("  Hash starts with $2b$ — this confirms it is bcrypt.")
    print("  Keep this hash private. Do NOT share it.")
    print("-" * 52)

    # --- Verify the hash round-trips correctly ---
    if bcrypt.checkpw(password_bytes, hashed.encode('utf-8')):
        print("\n  ✅ Verification passed — hash matches the password.")
    else:
        print("\n  ❌ Verification FAILED — something went wrong. Try again.")
        sys.exit(1)

if __name__ == '__main__':
    generate_hash()
