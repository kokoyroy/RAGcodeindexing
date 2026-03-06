# Code Indexer - Project Specification

## Role
Senior Backend Engineer

## Goal
Build a Node.js codebase indexer using SQLite for storage and semantic search.

## Project Requirements

### Tech Stack
- **Node.js (TypeScript)** - Core runtime and language
- **better-sqlite3** - SQLite database driver
- **sqlite-vec** - Vector search extension for SQLite
- **tree-sitter** - Code parsing for semantic chunking
- **tree-sitter-wasm** - Universal language support via WebAssembly grammars
- **@xenova/transformers** - Local ML model for embeddings (all-MiniLM-L6-v2)

### Supported Languages
The indexer should support ALL major programming languages:

| Language | Extension(s) | Tree-sitter Grammar |
|----------|--------------|---------------------|
| JavaScript | `.js`, `.mjs`, `.cjs` | tree-sitter-javascript |
| TypeScript | `.ts` | tree-sitter-typescript |
| TypeScript JSX | `.tsx` | tree-sitter-tsx |
| Python | `.py` | tree-sitter-python |
| Java | `.java` | tree-sitter-java |
| C | `.c`, `.h` | tree-sitter-c |
| C++ | `.cpp`, `.cc`, `.cxx`, `.hpp`, `.hh` | tree-sitter-cpp |
| C# | `.cs` | tree-sitter-c-sharp |
| Go | `.go` | tree-sitter-go |
| Rust | `.rs` | tree-sitter-rust |
| Ruby | `.rb` | tree-sitter-ruby |
| PHP | `.php` | tree-sitter-php |
| Swift | `.swift` | tree-sitter-swift |
| Kotlin | `.kt`, `.kts` | tree-sitter-kotlin |
| Scala | `.scala` | tree-sitter-scala |
| Lua | `.lua` | tree-sitter-lua |
| Bash/Shell | `.sh`, `.bash` | tree-sitter-bash |
| JSON | `.json` | tree-sitter-json |
| YAML | `.yaml`, `.yml` | tree-sitter-yaml |
| Markdown | `.md` | tree-sitter-markdown |
| HTML | `.html`, `.htm` | tree-sitter-html |
| CSS | `.css` | tree-sitter-css |
| SQL | `.sql` | tree-sitter-sql |

### Ignored Directories
- `node_modules`, `.git`, `dist`, `build`, `coverage`
- `__pycache__`, `.venv`, `venv`, `env`
- `target` (Rust), `bin`, `obj` (.NET)
- `.idea`, `.vscode`

## Core Logic

### 1. File Scanner
- Scan local directory recursively for supported file extensions
- Skip ignored directories
- Calculate MD5 content hash for each file
- Track file metadata (path, size, modified time, hash)

### 2. Tree-sitter Chunking
- Parse each file using the appropriate tree-sitter grammar
- Extract logical code blocks as chunks:
  - Functions/methods
  - Classes/structs/interfaces
  - Constants and type definitions
  - Important comments/docstrings
- Store chunk metadata: file path, start/end lines, chunk type

### 3. Embedding
- Use all-MiniLM-L6-v2 model locally (384 dimensions)
- Convert each code chunk into a vector embedding
- Cache model after first download (~70MB)
- Normalize embeddings before storage

### 4. SQLite Vector Storage
Create two tables:
```sql
-- File metadata
CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  file_path TEXT UNIQUE,
  content_hash TEXT,
  last_indexed DATETIME
);

-- Vector embeddings (virtual table)
CREATE VIRTUAL TABLE vec_chunks USING vec0(
  chunk_id TEXT,
  embedding FLOAT[384]
);
```

### 5. Incremental Logic
- Store content hash for each indexed file
- On re-index, compare hashes
- Only re-process files with changed content
- Remove stale chunks for deleted/modified files

### 6. Search
- Accept natural language query string
- Embed the query using the same model
- Use `vec_distance_cosine()` to find top-k similar chunks
- Return results with:
  - File path
  - Start/end lines
  - Code content
  - Similarity score

## Deliverables

### 1. Complete Code
- Full TypeScript source with proper ESM modules
- Clear separation of concerns (scanner, chunker, embedder, database, search)
- Comprehensive error handling
- Type definitions for all data structures

### 2. Cross-Platform Support
Must work on all major platforms:

| Platform | Architecture | Support Level |
|----------|--------------|---------------|
| macOS | ARM64 (M1/M2/M3) | Full support |
| macOS | x64 (Intel) | Full support |
| Linux | x64 | Full support |
| Linux | ARM64 | Full support |
| Windows | x64 | Full support |

Requirements:
- Automatic OS and architecture detection
- Dynamic sqlite-vec extension loading based on platform
- Proper path handling (Windows backslashes, Unix forward slashes)
- Native module compilation support (better-sqlite3, tree-sitter)
- Platform-specific installation instructions

### 3. Setup Script
Automatic platform detection and sqlite-vec extension download:
- Detect OS: macOS (x64/ARM64), Linux (x64/ARM64), Windows (x64)
- Download appropriate sqlite-vec binary
- Handle permission issues
- Provide fallback instructions

### 4. CLI Commands
```bash
# Index current directory
npm start

# Index specific directory
npm start -- /path/to/project

# Index and search
npm start -- . "How does the login work?"

# Search only (use existing index)
npm run search "authentication flow"

# Force full re-index
npm run reindex

# Show index statistics
npm run stats
```

### 5. MCP Integration (Bonus)
Expose tools for LLM integration:
- `search_codebase(query, limit)` - Semantic code search
- `reindex_codebase()` - Force full re-index
- `get_index_stats()` - Get indexing statistics

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   File Scanner  │────▶│  Semantic        │────▶│    Embedder     │
│                 │     │  Chunker         │     │                 │
│  - Discover     │     │  (Tree-sitter)   │     │  (Transformers) │
│  - Hash         │     │  - Parse AST     │     │  - all-MiniLM   │
│  - Filter       │     │  - Extract       │     │  - 384 dims     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database                             │
│  ┌──────────────┐         ┌───────────────────────────────┐     │
│  │    files     │         │        vec_chunks             │     │
│  │              │         │    (sqlite-vec virtual)       │     │
│  │ - path       │         │                               │     │
│  │ - hash       │         │ - chunk_id (TEXT)             │     │
│  │ - indexed_at │         │ - embedding (FLOAT[384])      │     │
│  └──────────────┘         └───────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │      Search API       │
              │                       │
              │ - Embed query         │
              │ - Cosine similarity   │
              │ - Return top-k        │
              └───────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Platform Detection                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    src/platform.ts                        │   │
│  │                                                           │   │
│  │  - getPlatform() → { os: 'darwin'|'linux'|'win32',       │   │
│  │                       arch: 'x64'|'arm64' }               │   │
│  │  - getSqliteVecPath() → path to extension                │   │
│  │  - normalizePath() → cross-platform path handling        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Platform-specific sqlite-vec binaries:                          │
│  - sqlite-vec-darwin-arm64 (macOS M1/M2/M3)                      │
│  - sqlite-vec-darwin-x64 (macOS Intel)                           │
│  - sqlite-vec-linux-x64                                          │
│  - sqlite-vec-linux-arm64                                        │
│  - sqlite-vec-windows-x64                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- Batch insert embeddings for efficiency
- Lazy-load tree-sitter grammars per language
- Consider chunking very large files
- Implement pagination for large codebases
- Cache embeddings for unchanged chunks
