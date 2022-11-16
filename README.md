# Keeper Wallet Jira Action

## Usage

```yml
uses: Keeper-Wallet/jira-action@v1
with:
  component: ext
  hooks-url: ${{ secrets.HOOKS_URL }}
  hook-merge: ${{ secrets.HOOK_MERGE }}
  hook-release: ${{ secrets.HOOK_RELEASE }}
  # also you can optionally specify explicit release version to report instead
  # of using git tag
  release-version: v1.0.3
```
