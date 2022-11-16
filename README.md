# Keeper Wallet Jira Action

## Usage

```yml
uses: Keeper-Wallet/jira-action@v1
with:
  component: ext
  github-token: ${{ secrets.GITHUB_TOKEN }}
  hooks-url: ${{ secrets.HOOKS_URL }}
  hook-merge: ${{ secrets.HOOK_MERGE }}
  hook-release: ${{ secrets.HOOK_RELEASE }}
```
