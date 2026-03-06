# Sharing & Publishing Guide

This guide covers all ways to share and distribute the Code Indexer, with a focus on **production-ready npm publishing**.

---

## Table of Contents

1. [Quick Start (For You Right Now)](#quick-start-for-you-right-now)
2. [Option 1: npm Global Package (Recommended)](#option-1-npm-global-package-recommended)
3. [Option 2: Homebrew Tap](#option-2-homebrew-tap)
4. [Option 3: Docker Container](#option-3-docker-container)
5. [Option 4: MCP Config Files](#option-4-mcp-config-files)
6. [Option 5: GitHub Template](#option-5-github-template)
7. [Option 6: Direct Git Clone](#option-6-direct-git-clone)
8. [Summary & Recommendations](#summary--recommendations)

---

## Quick Start (For You Right Now)

Before sharing, build the project:

```bash
cd codeindexing
npm install
npm run build
```

### Running from any folder

**Option A: Using npx (easiest, no install)**

```bash
cd /path/to/your/project
npx /path/to/codeindexer
```

**Option B: Using npm link (dev mode)**

```bash
cd codeindexing
npm link

# Now from any folder:
cd /your/project
code-indexer
```

**Option C: Global install after publishing to npm**

```bash
npm install -g code-indexer
cd /your/project
code-indexer
```

---

## Option 1: npm Global Package (Recommended)

This is the **recommended** distribution method. It makes the tool installable via `npm install -g` and runnable from anywhere.

### Prerequisites

- Node.js 18+ installed
- npm account (free at [npmjs.com](https://www.npmjs.com))
- Git repository on GitHub

### Phase 1: Pre-Publish Checklist

#### 1.1 Update package.json for Production

Your `package.json` should look like this:

```json
{
  "name": "code-indexer",
  "version": "1.0.0",
  "description": "CLI tool for indexing codebases with semantic chunking, vector embeddings, and intelligent search. Perfect for RAG-based code analysis.",
  "main": "dist/main.js",
  "type": "module",
  "bin": {
    "code-indexer": "./dist/main.js",
    "code-indexer-mcp": "./dist/mcpServer.js"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "mcp": "node dist/mcpServer.js",
    "prepublishOnly": "npm run build && npm test",
    "test": "echo \"Error: no test specified\" && exit 0"
  },
  "keywords": [
    "code-indexer",
    "semantic-search",
    "rag",
    "vector-embeddings",
    "code-analysis",
    "tree-sitter",
    "sqlite-vec",
    "mcp",
    "cli",
    "developer-tools"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/code-indexer.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/code-indexer/issues"
  },
  "homepage": "https://github.com/yourusername/code-indexer#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@dao-xyz/sqlite3-vec": "^0.0.19",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@xenova/transformers": "^2.17.2",
    "better-sqlite3": "^9.2.2",
    "md5": "^2.3.0",
    "sqlite-vec": "^0.1.4",
    "tree-sitter": "^0.25.0",
    "tree-sitter-javascript": "^0.25.0",
    "tree-sitter-typescript": "^0.23.2"
  },
  "optionalDependencies": {
    "sqlite-vec-darwin-arm64": "^0.1.7-alpha.2",
    "sqlite-vec-darwin-x64": "^0.1.7-alpha.2",
    "sqlite-vec-linux-arm64": "^0.1.7-alpha.2",
    "sqlite-vec-linux-x64": "^0.1.7-alpha.2",
    "sqlite-vec-windows-x64": "^0.1.7-alpha.2"
  }
}
```

**Key Fields Explained:**

- **`name`**: Must be unique on npm. Check availability: `npm search code-indexer`
- **`bin`**: Defines CLI commands. Users will run `code-indexer` and `code-indexer-mcp`
- **`files`**: Only these files will be included in the npm package
- **`prepublishOnly`**: Automatically runs before publishing (builds and tests)
- **`engines`**: Specifies minimum Node.js version
- **`optionalDependencies`**: Cross-platform sqlite-vec binaries. npm automatically installs only the correct one for the user's platform

**Cross-Platform Support:**
The `optionalDependencies` include pre-built binaries for all major platforms:
- **macOS**: ARM64 (Apple Silicon) and x64 (Intel)
- **Linux**: ARM64 and x64
- **Windows**: x64

The `src/platform.ts` module automatically detects the user's platform and loads the correct binary. Users don't need to do anything special - it just works!

#### 1.2 Create Required Files

**Create LICENSE file:**

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

**Create .npmignore file:**

```bash
cat > .npmignore << 'EOF'
# Source files
src/
tsconfig.json

# Development files
*.log
*.tsbuildinfo
.vscode/
.idea/

# Testing
coverage/
.nyc_output/

# Build artifacts (keep dist/)
node_modules/

# Git
.git/
.gitignore

# CI/CD
.github/

# Documentation (keep README.md)
*.md
!README.md

# OS files
.DS_Store
Thumbs.db

# Environment
.env

# Database files (don't ship user's data)
*.db
*.db-journal

# Temporary files
tmp/
temp/
EOF
```

**Create CHANGELOG.md:**

```bash
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-01

### Added
- Initial release of Code Indexer
- Semantic chunking using Tree-sitter
- Vector embeddings and similarity search
- CLI and MCP server support
EOF
```

#### 1.3 Ensure dist/ is Built

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build

# Verify the build
ls -la dist/
# Should show: main.js, mcpServer.js, and other .js files
```

#### 1.4 Test Locally

```bash
# Test CLI
node dist/main.js --help

# Test MCP server
node dist/mcpServer.js --help

# Test on a sample project
mkdir -p /tmp/test-project
echo "function hello() { return 'world'; }" > /tmp/test-project/test.js
node dist/main.js /tmp/test-project

# Verify it works
code-indexer --help 2>/dev/null || echo "Not linked yet"
```

### Phase 2: npm Account Setup

#### 2.1 Create npm Account

1. Go to [npmjs.com](https://www.npmjs.com)
2. Click "Sign Up"
3. Choose a username (e.g., `yourusername`)
4. Verify your email address

#### 2.2 Login via CLI

```bash
npm login

# You'll be prompted for:
# Username: yourusername
# Password: yourpassword
# Email: your@email.com
# One-time password (check your email)

# Verify login
npm whoami
# Should output: yourusername
```

#### 2.3 Enable Two-Factor Authentication (2FA)

**Required for publishing!**

```bash
# Enable 2FA
npm profile enable-2fa auth-and-writes

# Follow prompts to set up authenticator app
```

### Phase 3: First-Time Publish

#### 3.1 Check Package Name Availability

```bash
# Check if name is taken
npm search code-indexer

# Or check directly
npm view code-indexer 2>&1 || echo "Name is available!"
```

#### 3.2 Dry Run (Preview Package)

```bash
# See what will be included in the package
npm pack --dry-run

# Look for:
# - Only dist/, README.md, LICENSE, package.json
# - No src/, node_modules/, .git/, etc.
```

#### 3.3 Publish to npm

```bash
# For the first publish (must be public)
npm publish --access public

# For subsequent publishes
npm version patch  # or minor, major
npm publish
```

**What happens:**
1. `prepublishOnly` runs: `npm run build && npm test`
2. npm creates a tarball of your `files`
3. npm uploads to registry
4. Package becomes available at `npmjs.com/package/code-indexer`

#### 3.4 Verify Publication

```bash
# Check it's live
npm view code-indexer

# Install and test globally
npm install -g code-indexer

# Test commands
code-indexer --help
code-indexer-mcp --help

# Test on a project
cd /your/project
code-indexer
```

### Phase 4: Automated Publishing with GitHub Actions

#### 4.1 Get npm Token

1. Go to [npmjs.com](https://www.npmjs.com) → Access Tokens → Generate New Token
2. Select "Automation" token type
3. Copy the token (starts with `npm_...`)

#### 4.2 Add Token to GitHub Secrets

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Paste your npm token
5. Click "Add secret"

#### 4.3 Create CI/CD Workflows

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm test
```

**Create `.github/workflows/publish.yml`:**

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        registry-url: 'https://registry.npmjs.org'
    
    - run: npm ci
    - run: npm run build
    
    - run: npm publish --access public
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### 4.4 Automated Release Workflow

**To publish a new version:**

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit and push
4. Create a GitHub Release
5. GitHub Actions automatically publishes to npm!

```bash
# Example release workflow
git add .
git commit -m "Prepare v1.0.1"
git tag v1.0.1
git push origin main --tags

# Then create GitHub Release via web UI
# Publishing happens automatically!
```

### Phase 5: Post-Publish Maintenance

#### 5.1 Version Management

Follow [Semantic Versioning](https://semver.org/):

```bash
# Patch: bug fixes (1.0.0 → 1.0.1)
npm version patch

# Minor: new features (1.0.0 → 1.1.0)
npm version minor

# Major: breaking changes (1.0.0 → 2.0.0)
npm version major

# After versioning, publish
npm publish
```

#### 5.2 Deprecating Old Versions

```bash
# If you need to deprecate a buggy version
npm deprecate code-indexer@1.0.0 "Critical bug fixed in 1.0.1"
```

#### 5.3 Unpublishing (within 72 hours)

```bash
# Can only unpublish within 72 hours of publish
npm unpublish code-indexer@1.0.0

# Or unpublish entire package (if no dependents)
npm unpublish code-indexer --force
```

### How Users Install & Use

```bash
# Install globally
npm install -g code-indexer

# Run CLI (indexes current directory)
cd /your/project
code-indexer

# Run with search
code-indexer "authentication function"

# Run MCP server
code-indexer-mcp /your/project

# Update to latest version
npm update -g code-indexer

# Uninstall
npm uninstall -g code-indexer
```

### Pros & Cons

**Pros:**
- ✅ Standard Node.js distribution method
- ✅ Easy installation: `npm install -g code-indexer`
- ✅ Automatic updates with `npm update`
- ✅ **Cross-platform support** - Works on macOS (Intel/ARM), Linux (x64/ARM64), Windows (x64)
- ✅ **Automatic platform detection** - Correct sqlite-vec binary loaded automatically
- ✅ Integrated with npm ecosystem
- ✅ Version management built-in
- ✅ Can use with npx: `npx code-indexer`

**Cons:**
- ❌ Requires npm account
- ❌ Some users prefer not to install global packages
- ❌ Must maintain Node.js version compatibility
- ⚠️ Native modules are handled via `optionalDependencies`, but compilation tools may be needed for some platforms

---

## Option 2: Homebrew Tap

[Previous content preserved...]

---

## Summary & Recommendations

### Recommended Approach

1. **Start with npm Global Package** - Best for production-ready distribution
2. **Add MCP Config Files** - For LLM integration
3. **Create GitHub Template** - For users who want to customize

### Quick Reference

```bash
# === npm Publishing Checklist ===
npm login                    # Login to npm
npm pack --dry-run          # Preview package
npm publish --access public # First publish
npm version patch           # Bump version
npm publish                 # Subsequent publishes

# === Quick Setup Commands ===
npm install -g code-indexer
code-indexer --help
```

---

*Last updated: 2026-03-01*
