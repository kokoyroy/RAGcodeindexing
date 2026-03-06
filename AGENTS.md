# AGENTS.md - Code Indexer Project Guide

This document provides essential information for AI coding agents working on this codebase.

## Project Overview

A Node.js/TypeScript codebase indexer that performs semantic chunking using Tree-sitter and stores embeddings in SQLite with sqlite-vec for vector similarity search. Also exposes MCP (Model Context Protocol) tools for LLM integration.

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (outputs to ./dist)
npm run build

# Run the CLI indexer
npm start                           # Index current directory
npm start -- /path/to/project       # Index specific directory
npm start -- . "search query"       # Index and search

# Run MCP server for LLM integration
npm run mcp -- /path/to/project
```

## Type Checking

```bash
# TypeScript compiler (also checks types)
npx tsc --noEmit
```

## Testing

This project does not currently have a test framework configured. Manual testing via:
```bash
npm run build && npm start
```

## Code Style Guidelines

### Module System

- **ESM modules only** - `"type": "module"` in package.json
- Always use explicit `.js` extensions in import paths for TypeScript files:
  ```typescript
  import { foo } from './module.js';  // Correct - even for .ts files
  import { foo } from './module';      // Wrong - will fail at runtime
  ```

### TypeScript Configuration

- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Source maps and declarations generated
- Output directory: `./dist`
- Source directory: `./src`

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `filePaths`, `queryEmbedding` |
| Functions | camelCase | `searchSimilar()`, `computeHash()` |
| Classes | PascalCase | `CodeDatabase`, `SemanticChunker` |
| Interfaces | PascalCase | `CodeChunk`, `SearchResult`, `FileInfo` |
| Constants | camelCase or SCREAMING_SNAKE | `supportedExtensions`, `DB_PATH` |
| Database columns | snake_case | `file_path`, `chunk_text`, `start_line` |
| Private members | private keyword + camelCase | `private dbPath`, `private isInitialized` |

### Imports Organization

Group imports logically:
```typescript
// 1. External libraries
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import * as fs from 'fs';
import * as path from 'path';

// 2. Internal modules (with .js extension!)
import { FileScanner, FileInfo } from './fileScanner.js';
import { embedder } from './embedder.js';
import { db, CodeChunk, SearchResult } from './database.js';
```

### Error Handling

- Use try/catch blocks for all operations that can fail
- Log errors with `console.error()` prefixed with module name in brackets
- Return null or empty arrays on failure rather than throwing (graceful degradation)
- Re-throw only for critical initialization failures

```typescript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('[ModuleName] Operation failed:', error);
  return null;  // Graceful degradation
}
```

### Singleton Pattern

Export singleton instances at module level:
```typescript
class Embedder {
  // ... implementation
}

export const embedder = new Embedder();
```

### Async Initialization

Classes requiring async setup should have an `initialize()` method:
```typescript
class SomeClass {
  private isInitialized: boolean = false;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    // ... setup code
    this.isInitialized = true;
  }
}
```

### Database Patterns

- Use parameterized queries (never string interpolation)
- Use `prepare()` for reusable statements
- Handle both sync (better-sqlite3) and async operations appropriately

### Vector Embeddings

- Embedding dimension: 384 (all-MiniLM-L6-v2 model)
- Always normalize embeddings before storage
- Convert to Float32Array and Buffer for sqlite-vec storage

### File Structure

```
src/
├── main.ts             # CLI entry point
├── indexer.ts          # Main orchestrator class
├── database.ts         # SQLite + vector storage
├── embedder.ts         # ML model for embeddings
├── fileScanner.ts      # File discovery and hashing
├── semanticChunker.ts  # Tree-sitter code parsing
├── mcpServer.ts        # MCP protocol server
└── mcpClient.ts        # MCP client for testing
```

### Environment Variables

- `DB_PATH` - Custom SQLite database location (default: `./codeindexer.db`)

### Supported File Types

The indexer handles:
- `.js` - JavaScript
- `.ts` - TypeScript  
- `.tsx` - TypeScript with JSX

Ignored directories:
- `node_modules`, `.git`, `dist`, `build`, `coverage`

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `better-sqlite3` | Synchronous SQLite driver |
| `@dao-xyz/sqlite3-vec` | Vector search extension |
| `@xenova/transformers` | Local ML model inference |
| `tree-sitter` | Code parsing to AST |
| `tree-sitter-typescript` | TypeScript grammar |
| `@modelcontextprotocol/sdk` | MCP server implementation |

### MCP Tools Exposed

1. `search_codebase(query, limit)` - Semantic code search
2. `reindex_codebase()` - Force full re-index
3. `get_index_stats()` - Get indexing statistics

## Important Notes

- Model download happens on first run (~70MB, cached afterward)
- Incremental indexing uses MD5 hashes to skip unchanged files
- sqlite-vec falls back to JavaScript cosine similarity if extension fails
- All imports from local modules MUST include `.js` extension even for `.ts` files
