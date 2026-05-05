# Contributing to Systemics

Thanks for your interest! This guide covers how to contribute code, report issues, and suggest features.

---

## Code of Conduct

- Be respectful and constructive
- Assume good intent
- Focus on the code, not the person
- Help others learn

---

## Getting Started

### Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/systemics.git
cd systemics
npm install
npx prisma generate
cp .env.example .env
# Edit .env with your credentials
```

### Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/description` - new features
- `fix/description` - bug fixes
- `docs/description` - documentation
- `refactor/description` - code cleanup

---

## Development Workflow

### Before You Start

1. Check existing issues to avoid duplicates
2. Comment on an issue to claim it
3. For new features, open an issue first to discuss

### Making Changes

1. Write code
2. Run the build:
   ```bash
   npm run build
   ```
3. Fix any TypeScript/ESLint errors
4. Test locally

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new platform fetcher for GitLab
fix: prevent double-counting of PRs
docs: update API documentation
refactor: simplify XP normalization
test: add tests for skill tree unlocks
```

---

## Project Structure

```
systemics/
├── prisma/           # Database schema
├── src/
│   ├── app/          # Next.js App Router (pages + API routes)
│   ├── components/   # React components (UI layer)
│   ├── lib/          # Business logic, fetchers, AI
│   └── middleware.ts # Auth middleware
├── docs/             # Documentation
├── .github/          # GitHub Actions workflows
└── public/           # Static assets
```

### Where to Add Code

| What | Where |
|---|---|
| New API endpoint | `src/app/api/route-name/route.ts` |
| New UI component | `src/components/ComponentName.tsx` |
| New platform fetcher | `src/lib/fetchers/platform.ts` |
| New AI function | `src/lib/ai/functionName.ts` |
| XP rule change | `src/lib/xp/normalize.ts` |
| Database change | `prisma/schema.prisma` |

---

## Style Guide

### TypeScript

- Use strict types. Avoid `any` where possible.
- Export interfaces from feature modules.
- Use `zod` for API input validation.

### React

- Use functional components + hooks
- Prefer Server Components where possible
- Use `"use client"` only when needed (hooks, browser APIs)

### Tailwind / shadcn

- Use Tailwind utility classes
- Extend shadcn components rather than replacing
- Maintain dark theme consistency

---

## Testing

### Manual Testing

1. Run `npm run dev`
2. Test your changes in the browser
3. Check both authenticated and unauthenticated states
4. Test on mobile viewport

### Database Testing

```bash
# Reset and re-migrate
npx prisma migrate reset
# Seed with test data if you have a seed script
```

---

## Submitting Changes

### Pull Request Process

1. Push your branch:
   ```bash
   git push origin feature/your-feature
   ```

2. Open a Pull Request on GitHub
3. Fill out the PR template:
   - What changed
   - Why it changed
   - How to test it
   - Screenshots (for UI changes)

4. Request review from maintainers
5. Address feedback
6. Merge when approved

### PR Checklist

- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] No new ESLint warnings
- [ ] Tested locally
- [ ] Updated documentation (if needed)
- [ ] Added to CHANGELOG (if significant)

---

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs
- Environment (OS, browser, Node version)

### Feature Requests

Include:
- Use case
- Proposed solution
- Alternatives considered
- Willingness to implement

---

## Areas Needing Help

Check the issue tracker for:
- `good first issue` - easy entry points
- `help wanted` - maintainers need assistance
- `bug` - something is broken
- `enhancement` - new features

---

## Questions?

- Open a Discussion on GitHub
- Tag `@maintainers` in issues

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
