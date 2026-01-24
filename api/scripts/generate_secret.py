#!/usr/bin/env python3
"""Generate a secure secret for AUTH_SECRET environment variable."""

import secrets
import sys


def generate_secret(length: int = 32) -> str:
    """Generate a cryptographically secure random string."""
    return secrets.token_urlsafe(length)


def main():
    """Main function to generate and display secret."""
    if len(sys.argv) > 1:
        try:
            length = int(sys.argv[1])
            if length < 16:
                print("Warning: Secret length should be at least 16 characters", file=sys.stderr)
        except ValueError:
            print("Error: Length must be a number", file=sys.stderr)
            sys.exit(1)
    else:
        length = 32
    
    secret = generate_secret(length)
    
    print("Generated secure secret:")
    print(secret)
    print()
    print("Add this to your .env file:")
    print(f"AUTH_SECRET={secret}")
    print()
    print("Or set as environment variable:")
    print(f"export AUTH_SECRET={secret}")


if __name__ == "__main__":
    main()