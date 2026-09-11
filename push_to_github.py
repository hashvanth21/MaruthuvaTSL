#!/usr/bin/env python3
"""
Maruthuva TSL - Clean GitHub Push Utility
=========================================
Pushes the local committed 'main' branch to https://github.com/hashvanth21/MaruthuvaTSL.git
using Python Dulwich with certifi SSL certificate verification.

Usage:
  python3 push_to_github.py <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>

Or via environment variable:
  export GITHUB_TOKEN=ghp_your_token_here
  python3 push_to_github.py
"""

import sys
import os
import certifi
from dulwich import porcelain
from dulwich.repo import Repo

os.environ['SSL_CERT_FILE'] = certifi.where()

def main():
    token = os.environ.get("GITHUB_TOKEN")
    if not token and len(sys.argv) > 1:
        token = sys.argv[1].strip()

    if not token:
        print("=" * 80)
        print("MARUTHUVA TSL GITHUB PUSH AUTHENTICATION REQUIRED")
        print("=" * 80)
        print("GitHub requires authentication to push to: https://github.com/hashvanth21/MaruthuvaTSL")
        print("\nPlease run:")
        print("  python3 push_to_github.py <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>")
        print("\nOr set the environment variable:")
        print("  export GITHUB_TOKEN=ghp_your_token_here")
        print("  python3 push_to_github.py")
        print("\n(To generate a token: https://github.com/settings/tokens -> Generate New Token (classic) with 'repo' scope)")
        print("=" * 80)
        sys.exit(1)

    repo = Repo('.')
    commit_sha = repo.head()
    print(f"Current local HEAD commit: {commit_sha.decode()} on branch 'main'")
    print("Pushing to https://github.com/hashvanth21/MaruthuvaTSL.git ...")

    # Use authenticated remote URL
    remote_url = f"https://oauth2:{token}@github.com/hashvanth21/MaruthuvaTSL.git"

    try:
        porcelain.push('.', remote_url, b'refs/heads/main:refs/heads/main', force=False)
        print("\nSUCCESS! Successfully pushed Maruthuva TSL to:")
        print("  https://github.com/hashvanth21/MaruthuvaTSL")
    except Exception as e:
        print(f"\nPush failed: {e}")
        # Try force push if remote branch history diverged
        if "rejected" in str(e).lower() or "fast-forward" in str(e).lower():
            print("Attempting update with force=True...")
            try:
                porcelain.push('.', remote_url, b'refs/heads/main:refs/heads/main', force=True)
                print("\nSUCCESS! Successfully pushed (with force=True) to:")
                print("  https://github.com/hashvanth21/MaruthuvaTSL")
            except Exception as fe:
                print(f"Force push also failed: {fe}")
                sys.exit(1)
        else:
            sys.exit(1)

if __name__ == "__main__":
    main()
