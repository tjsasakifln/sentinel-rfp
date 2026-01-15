# Git Hooks - Quality Automation

This document explains the Git hooks configured in the Sentinel RFP project using Husky, lint-staged, and commitlint.

## Overview

Git hooks are automated scripts that run at specific points in the Git workflow to enforce code quality standards before commits and pushes reach the repository.

## Configured Hooks

### 1. Pre-commit Hook

**When it runs:** Before each commit is created

**What it does:**

- Runs ESLint with auto-fix on staged TypeScript files (`*.ts`, `*.tsx`)
- Runs Prettier to format staged files (TypeScript, JSON, Markdown)
- Only processes files that are staged (via lint-staged)

**Configuration:** See `package.json` → `lint-staged` section

**Example output:**

```bash
✔ Preparing lint-staged...
✔ Running tasks for staged files...
  ✔ package.json — 6 files
    ✔ *.{ts,tsx} — 3 files
      ✔ eslint --fix
      ✔ prettier --write
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
```

**If it fails:** The commit is blocked. Fix the linting errors and try again.

---

### 2. Commit-msg Hook

**When it runs:** After the commit message is written

**What it does:**

- Validates commit message follows [Conventional Commits](https://www.conventionalcommits.org/) format
- Enforces valid commit types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `security`, etc.
- Validates commit scopes match project modules (see CLAUDE.md)

**Valid commit format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Valid scopes (from CLAUDE.md):**

- `backend` - Backend services (NestJS)
- `frontend` - Frontend React
- `agents` - Autonomous AI agents
- `rfp` - RFP processing module
- `trust` - Trust Score system
- `ingest` - Document ingestion (VLM)
- `sme` - SME collaboration module
- `export` - Export functionality
- `search` - Semantic search / RAG
- `config` - Configurations
- `deps` - Dependencies
- `ci` - CI/CD workflows
- `api` - API endpoints
- `docs` - Documentation

**Examples:**

```bash
✅ Valid commits:
feat(backend): add JWT authentication
fix(frontend): resolve memory leak in useEffect
test(api): add integration tests for proposals endpoint
docs(config): update environment variables guide

❌ Invalid commits:
add authentication (missing type and scope)
feat: add auth (missing scope)
feat(auth): add JWT (invalid scope 'auth')
```

**Configuration:** See `commitlint.config.js`

---

### 3. Pre-push Hook

**When it runs:** Before pushing commits to the remote repository

**What it does:**

- Runs TypeScript type checking across all workspaces (`pnpm run typecheck`)
- Ensures no type errors exist before pushing

**Example output:**

```bash
🔍 Running TypeScript type check...
> turbo run typecheck

• Packages in scope: @sentinel-rfp/ai, @sentinel-rfp/api, @sentinel-rfp/database, @sentinel-rfp/web
• Running typecheck in 4 packages
@sentinel-rfp/api:typecheck: cache hit, replaying logs [cached]
@sentinel-rfp/web:typecheck: cache hit, replaying logs [cached]

Tasks:    2 successful, 2 total
Cached:   2 cached, 2 total
Time:     1.234s >>> FULL TURBO
```

**If it fails:** The push is blocked. Fix type errors and try again.

---

## Bypassing Hooks (Use with Caution)

In rare cases, you may need to bypass hooks:

```bash
# Skip pre-commit and commit-msg hooks
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

**⚠️ Warning:** Only bypass hooks in emergency situations. All commits should pass quality checks.

---

## Testing Hooks Locally

### Test commit-msg validation:

```bash
echo "feat(invalid): test" | pnpm exec commitlint
# Should fail with scope error

echo "feat(backend): test" | pnpm exec commitlint
# Should pass
```

### Test pre-commit (lint-staged):

```bash
# Make changes to a file
echo "const x = 1" >> apps/api/src/test.ts

# Stage the file
git add apps/api/src/test.ts

# Try to commit (lint-staged will run)
git commit -m "test(api): validate lint-staged"
```

### Test pre-push (typecheck):

```bash
pnpm run typecheck
# Should complete without errors
```

---

## Troubleshooting

### Hook not running

If hooks aren't executing:

1. **Check Husky installation:**

   ```bash
   ls -la .husky/
   # Should show pre-commit, commit-msg, pre-push
   ```

2. **Reinstall hooks:**

   ```bash
   pnpm exec husky install
   ```

3. **Check executable permissions (Unix/macOS):**
   ```bash
   chmod +x .husky/pre-commit
   chmod +x .husky/commit-msg
   chmod +x .husky/pre-push
   ```

### Commitlint fails on valid message

If commitlint rejects a valid commit:

1. **Verify scope is in commitlint.config.js:**

   ```javascript
   'scope-enum': [2, 'always', ['backend', 'frontend', /* ... */]]
   ```

2. **Test the message manually:**
   ```bash
   echo "feat(backend): test" | pnpm exec commitlint
   ```

### Type check takes too long

The pre-push hook runs `typecheck` across all workspaces. This is cached by Turbo, so subsequent runs should be fast.

To skip temporarily (not recommended):

```bash
git push --no-verify
```

---

## Related Documentation

- **Conventional Commits:** https://www.conventionalcommits.org/
- **Husky:** https://typicode.github.io/husky/
- **lint-staged:** https://github.com/okonet/lint-staged
- **commitlint:** https://commitlint.js.org/
- **Project commit scopes:** See CLAUDE.md

---

## Maintenance

### Adding a new commit scope

1. Edit `commitlint.config.js`
2. Add the scope to the `scope-enum` array
3. Document it in CLAUDE.md
4. Commit: `chore(ci): add new commit scope for <module>`

### Updating lint-staged rules

1. Edit `package.json` → `lint-staged` section
2. Test with a dummy commit
3. Commit: `chore(ci): update lint-staged rules`

### Disabling a hook temporarily

Rename or delete the hook file in `.husky/`:

```bash
mv .husky/pre-commit .husky/pre-commit.disabled
```

---

**Questions?** See docs/development/setup.md or ask the team in Slack #dev-sentinel-rfp
