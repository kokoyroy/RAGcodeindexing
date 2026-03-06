# Contributing to Code Indexer

First off, thank you for considering contributing to Code Indexer! It's people like you that make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming, inclusive environment. By participating, you're expected to uphold this standard. Be respectful, constructive, and helpful.

---

## How Can I Contribute?

### Report Bugs

Found a bug? Please [open an issue](https://github.com/kokoyroy/RAGcodeindexing/issues/new?template=bug_report.md) with:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, etc.)

### Suggest Enhancements

Have an idea? [Open a feature request](https://github.com/kokoyroy/RAGcodeindexing/issues/new?template=feature_request.md) with:

- Clear description of the feature
- Use case and benefits
- Possible implementation approach (if you have ideas)

### Improve Documentation

Documentation improvements are always welcome:

- Fix typos or unclear sections
- Add examples or use cases
- Improve API documentation
- Translate documentation

### Submit Pull Requests

Ready to code? See [Pull Request Process](#pull-request-process) below.

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Code editor (VS Code recommended)

### Local Development

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/RAGcodeindexing.git
cd RAGcodeindexing

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Run the CLI
npm start

# 5. Run tests (when available)
npm test

# 6. Run type checking
npx tsc --noEmit
```

### Development Workflow

```bash
# Make changes to src/*.ts files

# Build
npm run build

# Test your changes
npm start -- /path/to/test/project "test query"

# Check types
npx tsc --noEmit
```

---

## Project Structure

```
RAGcodeindexing/
├── src/
│   ├── main.ts              # CLI entry point
│   ├── indexer.ts           # Main orchestrator class
│   ├── database.ts          # SQLite + sqlite-vec storage
│   ├── embedder.ts          # ML model for embeddings
│   ├── fileScanner.ts       # File discovery and hashing
│   ├── semanticChunker.ts   # Tree-sitter code parsing
│   ├── mcpServer.ts         # MCP protocol server
│   ├── mcpClient.ts         # MCP client for testing
│   ├── indexer_sequential.ts # Sequential indexer (simpler)
│   └── platform.ts          # Platform utilities
├── dist/                    # Compiled JavaScript
├── docs/                    # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

### Key Modules

| Module | Responsibility |
|--------|---------------|
| `indexer.ts` | Orchestrates the entire indexing pipeline |
| `database.ts` | SQLite database operations + vector search |
| `embedder.ts` | ML model initialization and embedding generation |
| `fileScanner.ts` | Find and read files, compute hashes |
| `semanticChunker.ts` | Parse code into semantic chunks using Tree-sitter |
| `mcpServer.ts` | Expose tools via MCP protocol |

---

## Coding Standards

### TypeScript Guidelines

1. **Strict Mode**: This project uses TypeScript strict mode. Ensure all types are correct.

2. **ESM Modules**: Always use explicit `.js` extensions in imports:
   ```typescript
   // ✅ Correct
   import { foo } from './module.js';
   
   // ❌ Wrong
   import { foo } from './module';
   ```

3. **No Comments**: Per project style, avoid code comments unless absolutely necessary for complex logic.

4. **Naming Conventions**:
   - Variables: `camelCase`
   - Functions: `camelCase`
   - Classes: `PascalCase`
   - Interfaces: `PascalCase`
   - Constants: `camelCase` or `SCREAMING_SNAKE_CASE`
   - Database columns: `snake_case`

5. **Error Handling**: Use try/catch blocks, log errors with `console.error()` prefixed with module name:
   ```typescript
   try {
     const result = await someOperation();
     return result;
   } catch (error) {
     console.error('[ModuleName] Operation failed:', error);
     return null;
   }
   ```

6. **Async Initialization**: Classes requiring async setup should have an `initialize()` method:
   ```typescript
   class SomeClass {
     private isInitialized: boolean = false;
     
     async initialize(): Promise<void> {
       if (this.isInitialized) return;
       // setup code
       this.isInitialized = true;
     }
   }
   ```

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Max line length: 100 characters
- No trailing whitespace
- Blank line before return statements (optional)

### Testing

Currently, this project doesn't have automated tests. When adding tests:

1. Place test files in `tests/` directory
2. Use descriptive test names
3. Test both success and error cases
4. Mock external dependencies (file system, network, etc.)

---

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(indexer): add support for Python files
fix(database): handle sqlite-vec extension loading errors
docs(readme): add FAQ section
refactor(embedder): improve embedding cache performance
```

### Tips

- Keep commits atomic (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issues when applicable: `fix: resolve #123`

---

## Pull Request Process

### Before Submitting

1. **Update from main**:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run checks**:
   ```bash
   npm run build
   npx tsc --noEmit
   npm start  # manual test
   ```

3. **Update documentation** if needed

### Submitting

1. Push your branch:
   ```bash
   git push origin your-branch
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template:
   - Description of changes
   - Related issue (if any)
   - Type of change (bug fix, feature, etc.)
   - Testing performed
   - Screenshots (if applicable)

### PR Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

### After Merge

- Delete your feature branch
- Update your local main branch
- Celebrate! 🎉

---

## Reporting Bugs

### Before Reporting

1. Check existing issues to avoid duplicates
2. Try the latest version
3. Clear your database and rebuild: `rm codeindexer.db && npm run build`

### Bug Report Template

When reporting a bug, include:

**Description**
Clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Run command '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., macOS 13.0]
- Node.js version: [e.g., 18.17.0]
- npm version: [e.g., 9.6.7]
- Code Indexer version: [e.g., 1.0.0]

**Additional Context**
Add any other context, logs, or screenshots.

---

## Requesting Features

### Feature Request Template

**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context, screenshots, or examples.

---

## Questions?

- Open a [Discussion](https://github.com/kokoyroy/RAGcodeindexing/discussions)
- Check existing [Issues](https://github.com/kokoyroy/RAGcodeindexing/issues)
- Review [LEARN.md](LEARN.md) for deep dives

---

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes (for significant contributions)
- Our gratitude! 🙏

---

Thank you for contributing to Code Indexer! Your efforts help make code search better for everyone.

<div align="center">

[⬆ Back to Top](#contributing-to-code-indexer)

</div>
