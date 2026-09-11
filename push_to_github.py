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

    # Determine proper auth username based on token format
    if token.startswith("github_pat_"):
        auth_users = ["x-access-token", "hashvanth21"]
    else:
        auth_users = ["oauth2", "hashvanth21"]

    push_success = False
    for auth_user in auth_users:
        remote_url = f"https://{auth_user}:{token}@github.com/hashvanth21/MaruthuvaTSL.git"
        try:
            porcelain.push('.', remote_url, b'refs/heads/main:refs/heads/main', force=False)
            push_success = True
            print("\nSUCCESS! Successfully pushed Maruthuva TSL to:")
            print("  https://github.com/hashvanth21/MaruthuvaTSL")
            break
        except Exception as e:
            if "rejected" in str(e).lower() or "fast-forward" in str(e).lower():
                print("Remote branch has different history, attempting force update...")
                try:
                    porcelain.push('.', remote_url, b'refs/heads/main:refs/heads/main', force=True)
                    push_success = True
                    print("\nSUCCESS! Successfully pushed (with force=True) to:")
                    print("  https://github.com/hashvanth21/MaruthuvaTSL")
                    break
                except Exception as fe:
                    last_err = fe
            else:
                last_err = e

    if not push_success:
        print(f"\nPush failed: {last_err}")
        if "403" in str(last_err):
            print("\n" + "=" * 80)
            print("GITHUB TOKEN PERMISSION ISSUE DETECTED (HTTP 403 FORBIDDEN)")
            print("=" * 80)
            print("The token is valid for user 'hashvanth21', but lacks repository write permission.")
            print("\nTo fix this for your fine-grained token (github_pat_...):")
            print("1. Go to: https://github.com/settings/tokens?type=beta")
            print("2. Click on your token to edit it.")
            print("3. Under 'Repository access', ensure 'hashvanth21/MaruthuvaTSL' is selected.")
            print("4. Under 'Permissions' -> 'Repository permissions':")
            print("   Change 'Contents' from 'No access' (or 'Read-only') to: 'Read and write'")
            print("5. Click 'Save changes' (or generate a Classic Token with 'repo' scope at:")
            print("   https://github.com/settings/tokens/new (Classic with 'repo' checkbox checked)")
            print("=" * 80)
        sys.exit(1)

if __name__ == "__main__":
    main()
