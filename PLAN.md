# Code Indexer - Implementation Plan

## Status Overview

| Component | Status | Notes |
|-----------|--------|-------|
| File Scanner | ✅ Done | Absolute paths, MD5 hashes, multi-repo support |
| Semantic Chunker | ⚠️ Partial | Only JS/TS/TSX, needs multi-language support |
| Embedder | ✅ Done | Parallel processing (concurrency=10), all-MiniLM-L6-v2 (384 dims) |
| Database | ✅ Done | SQLite + sqlite-vec, batch inserts, proper UNIQUE constraint |
| Search | ✅ Done | Native `vec_distance_cosine()` - no JS fallback |
| MCP Server | ✅ Done | Basic tools exposed |
| CLI Commands | ✅ Done | Search, reindex, stats via `npm start` commands |
| Progress Bars | ✅ Done | Real-time percentage, count, time remaining |
| Setup Script | ✅ Done | Uses platform.ts for automatic detection |
| Multi-language | ❌ Missing | Only JS/TS/TSX supported |
| Cross-platform | ✅ Done | Auto-detects platform, loads correct sqlite-vec binary |

---

## ✅ COMPLETED

### 1. File Scanner (`src/fileScanner.ts`)
- [x] Recursive directory scanning
- [x] **Two-hash system**: `file_hash` (for change detection) + `content_hash` (for uniqueness)
- [x] **Absolute paths** throughout for multi-repo support
- [x] `filterChangedFiles()` for detecting modified files
- [x] Basic ignore directories: `node_modules`, `.git`, `dist`, `build`, `coverage`

### 2. Semantic Chunker (`src/semanticChunker.ts`)
- [x] Tree-sitter parsing for JavaScript
- [x] Tree-sitter parsing for TypeScript/TSX
- [x] **Upgraded to tree-sitter v0.25.0** (fixes 32KB parsing limit)
- [x] Extracts functions, classes, exports, variables
- [x] Line number tracking (start/end)

### 3. Embedder (`src/embedder.ts`)
- [x] Transformers.js integration
- [x] all-MiniLM-L6-v2 model (384 dimensions)
- [x] Mean pooling + normalization
- [x] `embedBatch()` for multiple texts
- [x] Model caching (download once)

### 4. Database (`src/database.ts`)
- [x] SQLite with better-sqlite3
- [x] sqlite-vec extension loading
- [x] **Native vector similarity** using `vec_distance_cosine()` (removed JS fallback)
- [x] **Batch inserts** via `insertChunksBatch()` for performance
- [x] Incremental updates with UPSERT
- [x] **Proper schema**: `UNIQUE(file_path, content_hash)` composite constraint

### 5. Indexer (`src/indexer.ts`)
- [x] Full pipeline orchestration
- [x] **Parallel processing** with configurable concurrency (default: 10)
- [x] **Real-time progress bars** with percentage, visual bar, count, time remaining
- [x] **ANSI colors** for CLI output
- [x] Async initialization
- [x] Statistics tracking
- [x] Error handling with graceful degradation

### 6. MCP Server (`src/mcpServer.ts`)
- [x] `search_codebase(query, limit)` tool
- [x] `reindex_codebase()` tool
- [x] `get_index_stats()` tool

---

## ⚠️ PARTIAL / NEEDS ENHANCEMENT

### 1. Multi-Language Support (HIGH PRIORITY)

**Current:** Only `.js`, `.ts`, `.tsx`

**Required:** Per SPEC.md, support 20+ languages:

| Language | Extension | Tree-sitter Package | Status |
|----------|-----------|---------------------|--------|
| Python | `.py` | `tree-sitter-python` | ❌ |
| Java | `.java` | `tree-sitter-java` | ❌ |
| C | `.c`, `.h` | `tree-sitter-c` | ❌ |
| C++ | `.cpp`, `.hpp` | `tree-sitter-cpp` | ❌ |
| C# | `.cs` | `tree-sitter-c-sharp` | ❌ |
| Go | `.go` | `tree-sitter-go` | ❌ |
| Rust | `.rs` | `tree-sitter-rust` | ❌ |
| Ruby | `.rb` | `tree-sitter-ruby` | ❌ |
| PHP | `.php` | `tree-sitter-php` | ❌ |
| Swift | `.swift` | `tree-sitter-swift` | ❌ |
| Kotlin | `.kt` | `tree-sitter-kotlin` | ❌ |
| Scala | `.scala` | `tree-sitter-scala` | ❌ |
| Lua | `.lua` | `tree-sitter-lua` | ❌ |
| Bash | `.sh`, `.bash` | `tree-sitter-bash` | ❌ |
| JSON | `.json` | `tree-sitter-json` | ❌ |
| YAML | `.yaml`, `.yml` | `tree-sitter-yaml` | ❌ |
| Markdown | `.md` | `tree-sitter-markdown` | ❌ |
| HTML | `.html` | `tree-sitter-html` | ❌ |
| CSS | `.css` | `tree-sitter-css` | ❌ |
| SQL | `.sql` | `tree-sitter-sql` | ❌ |

**Tasks:**
- [ ] Install tree-sitter language packages
- [ ] Create language detection mapping (extension → grammar)
- [ ] Lazy-load grammars per file type
- [ ] Define node types to extract per language
- [ ] Update `fileScanner.ts` with all extensions
- [ ] Update `semanticChunker.ts` with multi-language support

### 2. File Scanner Enhancements

**Missing ignored directories per SPEC:**
- [ ] `__pycache__`, `.venv`, `venv`, `env` (Python)
- [ ] `target` (Rust)
- [ ] `bin`, `obj` (.NET)
- [ ] `.idea`, `.vscode` (IDEs)

### 3. CLI Commands

**Current:** `npm start` supports search, reindex, stats via arguments:
```bash
npm start                    # Index current directory
npm start -- /path "query"   # Index path and search
npm start -- . "query"       # Search without re-index
npm start -- /path --reindex # Force full re-index
```

**Required per SPEC (dedicated scripts):**
```bash
npm run search "query"       # ❌ Missing - dedicated script
npm run reindex              # ❌ Missing - dedicated script  
npm run stats                # ❌ Missing - dedicated script
```

**Tasks:**
- [x] Search via `npm start -- /path "query"` ✅ Working
- [ ] Add `scripts/search.ts` CLI entry for dedicated command
- [ ] Add `scripts/reindex.ts` CLI entry for dedicated command
- [ ] Add `scripts/stats.ts` CLI entry for dedicated command
- [ ] Update `package.json` with new scripts

---

## ✅ COMPLETED

### Cross-Platform Support (`src/platform.ts`)

**Implementation complete!**

| Platform | Arch | sqlite-vec Package | Status |
|----------|------|--------------------|--------|
| macOS | ARM64 (M1/M2/M3) | `sqlite-vec-darwin-arm64` | ✅ |
| macOS | x64 (Intel) | `sqlite-vec-darwin-x64` | ✅ |
| Linux | x64 | `sqlite-vec-linux-x64` | ✅ |
| Linux | ARM64 | `sqlite-vec-linux-arm64` | ✅ |
| Windows | x64 | `sqlite-vec-windows-x64` | ✅ |

**Features implemented in `src/platform.ts`:**
- [x] `getPlatformInfo()` - Returns OS, arch, and combined platform string
- [x] `isPlatformSupported()` - Checks if current platform is supported
- [x] `getSqliteVecExtensionPath()` - Dynamic path resolution for sqlite-vec extension
- [x] `normalizePath()` - Handles Windows path differences (backslashes)
- [x] `isWindows()`, `isMacOS()`, `isLinux()` - Convenience platform checks

**Functions provided:**
```typescript
// src/platform.ts
export function getPlatformInfo(): PlatformInfo  // { os, arch, platform }
export function isPlatformSupported(): boolean
export function getSqliteVecExtensionPath(): string
export function normalizePath(p: string): string
export function isWindows(): boolean
export function isMacOS(): boolean
export function isLinux(): boolean
```

**How it works:**
1. Detects current OS and architecture via `os.platform()` and `os.arch()`
2. Maps platform to correct sqlite-vec extension filename (.dylib, .so, .dll)
3. Searches multiple possible installation paths
4. Returns the correct path for loading the native extension

**Database integration:**
```typescript
// database.ts now uses platform.ts
import { getSqliteVecExtensionPath } from './platform.js';
const extensionPath = getSqliteVecExtensionPath();
this.db.loadExtension(extensionPath);
```

---

## ❌ MISSING

**Features Implemented:**
- [x] **Parallel embedding processing** with configurable concurrency (default: 10)
- [x] **Real-time progress bars** with:
  - Percentage completion
  - Visual progress bar (█/░ characters)
  - Current/total count
  - Time remaining estimate
- [x] **ANSI color output** for better UX:
  - Cyan for headers
  - Green for success/stats
  - Magenta for file paths
  - Yellow for warnings
  - Gray for details
- [x] **Batch database inserts** via `insertChunksBatch()` with transaction wrapper
- [x] **Incremental indexing** working correctly (only re-indexes changed files)

**Technical Notes:**
- Using `parallelMap()` helper instead of `Promise.all()` for smooth progress updates
- Progress bars use `\r\x1b[K` for line clearing and carriage return
- `stdout.flush()` used for immediate display updates

### 2. Setup Script (HIGH PRIORITY)

**Required:** Automatic platform detection and sqlite-vec download

```bash
scripts/setup.js  # or setup.ts
```

**Features needed:**
- [ ] Detect OS: macOS (x64/ARM64), Linux (x64/ARM64), Windows (x64)
- [ ] Download appropriate sqlite-vec binary
- [ ] Handle permission issues
- [ ] Provide fallback instructions
- [ ] Check for required dependencies

**Platform matrix:**
| OS | Arch | sqlite-vec binary |
|----|------|-------------------|
| macOS | ARM64 | `sqlite-vec-darwin-arm64` |
| macOS | x64 | `sqlite-vec-darwin-x64` |
| Linux | ARM64 | `sqlite-vec-linux-arm64` |
| Linux | x64 | `sqlite-vec-linux-x64` |
| Windows | x64 | `sqlite-vec-windows-x64` |

### 2. Database Schema Updates

Per SPEC.md, should have separate tables:

**Current schema:**
```sql
code_chunks (
  id PRIMARY KEY,
  file_path TEXT,        -- Absolute path (multi-repo support)
  file_hash TEXT,        -- MD5 of entire file (change detection)
  chunk_text TEXT,
  start_line INTEGER,
  end_line INTEGER,
  content_hash TEXT,     -- MD5 of chunk text (uniqueness)
  embedding BLOB,
  created_at,
  updated_at,
  UNIQUE(file_path, content_hash)  -- Composite constraint
)
code_chunks_vec (chunk_id, embedding float[384])  -- Virtual table for sqlite-vec
```

**SPEC requires:**
```sql
files (id, file_path, content_hash, last_indexed)  -- ❌ Missing separate file table
vec_chunks (chunk_id, embedding)  -- ✅ Exists as code_chunks_vec
```

**Tasks:**
- [ ] Add `files` table for file-level metadata
- [ ] Track `last_indexed` timestamp per file
- [ ] Update incremental logic to use file table

### 3. Additional Chunk Metadata

Per SPEC, chunks should store:
- [x] `file_path`
- [x] `start_line`, `end_line`
- [x] `chunk_text`
- [ ] `chunk_type` (function, class, method, etc.) - NOT stored in DB currently

### 4. Performance Optimizations

Per SPEC:
- [x] **Batch insert embeddings** via `insertChunksBatch()` transaction wrapper
- [x] **Parallel processing** with concurrency=10 (configurable)
- [ ] Lazy-load tree-sitter grammars per language
- [ ] Chunk size limits for very large files
- [ ] Pagination for large codebases
- [ ] Cache embeddings for unchanged chunks

---

## Implementation Order

### ✅ COMPLETED
1. **Parallel Processing**: Concurrency=10 with configurable option
2. **Progress Bars**: Real-time percentage, visual bar, count, time remaining
3. **ANSI Colors**: CLI output with cyan headers, green stats, magenta paths
4. **Two-hash System**: `file_hash` + `content_hash` for change detection and uniqueness
5. **Absolute Paths**: Multi-repo support via absolute paths
6. **Batch Inserts**: `insertChunksBatch()` transaction wrapper for performance
7. **Native Vector Search**: Using `vec_distance_cosine()` - removed JS fallback
8. **Cross-Platform Support**: `src/platform.ts` with dynamic sqlite-vec path resolution

### Phase 1: Cross-Platform Support (COMPLETED ✅)
1. Create `src/platform.ts` - OS/arch detection ✅
2. Dynamic sqlite-vec path resolution in `database.ts` ✅
3. Windows path handling ✅
4. Platform detection utilities (`isWindows()`, `isMacOS()`, `isLinux()`) ✅

### Phase 2: Multi-Language Support
1. Install tree-sitter language packages
2. Create `src/languages.ts` - language config mapping
3. Update `semanticChunker.ts` - multi-language support
4. Update `fileScanner.ts` - all extensions + ignore patterns

### Phase 3: CLI Enhancement (Dedicated Scripts)
1. Create `scripts/search.ts`
2. Create `scripts/reindex.ts`
3. Create `scripts/stats.ts`
4. Update `package.json` scripts

### Phase 4: Setup Script
1. Create `scripts/setup.ts`
2. Platform detection logic
3. sqlite-vec download logic
4. Post-install hook in package.json

### Phase 5: Database Refinements
1. Add `files` table
2. Store `chunk_type` in chunks
3. Cache embeddings for unchanged chunks

---

### Tree-sitter 32KB Limit Fix (COMPLETED)

**Problem**: Tree-sitter v0.21.1 had a hardcoded 32KB buffer limit causing "Invalid argument" errors on large files.

**Solution**: Upgraded to tree-sitter v0.25.0 which removes the limit.

**Changes**:
- Upgraded `tree-sitter` from 0.21.1 → 0.25.0
- Upgraded `tree-sitter-javascript` from 0.21.4 → 0.25.0
- Upgraded `tree-sitter-typescript` from 0.21.2 → 0.23.2
- Removed regex fallback (`chunkTopLevel()` and `chunkWithRegex()` methods)
- Simplified `chunk()` method to use tree-sitter directly

**Results**:
- ✅ Parses files > 32KB successfully (tested with 44KB file)
- ✅ Better chunk quality (full AST vs regex)
- ✅ +18% more chunks extracted (1,613 vs 1,357)
- ✅ Zero parsing errors

---

### Key Features (Recently Added)
- **Parallel Processing**: Embeddings generated with configurable concurrency (default: 10)
- **Progress Bars**: Real-time updates with percentage, visual bar, count, and time remaining
- **ANSI Colors**: Cyan headers, green stats, magenta file paths for better UX
- **Two-hash System**: Efficient change detection (`file_hash`) + chunk uniqueness (`content_hash`)
- **Batch Inserts**: Database writes grouped for better performance
- **Multi-repo Support**: Absolute paths enable indexing multiple repositories

## File Structure (Target)

```
codeindexing/
├── src/
│   ├── main.ts             # CLI entry (index + search)
│   ├── indexer.ts          # Orchestrator
│   ├── database.ts         # SQLite + vec storage
│   ├── embedder.ts         # ML embeddings
│   ├── fileScanner.ts      # File discovery
│   ├── semanticChunker.ts  # Tree-sitter parsing
│   ├── platform.ts         # NEW: OS/arch detection
│   ├── languages.ts        # NEW: Language configs
│   ├── mcpServer.ts        # MCP server
│   └── mcpClient.ts        # MCP client
├── scripts/
│   ├── search.ts           # NEW: Search-only CLI
│   ├── reindex.ts          # NEW: Force reindex CLI
│   ├── stats.ts            # NEW: Stats CLI
│   └── setup.ts            # NEW: Platform setup
├── SPEC.md                 # Project specification
├── PLAN.md                 # This file
├── AGENTS.md               # AI coding guide
├── package.json
└── tsconfig.json
```

---

## Quick Reference

### Run Commands
```bash
npm run build              # Compile TypeScript
npm start                  # Index current dir (shows real-time progress bars)
npm start -- /path         # Index specific directory
npm start -- /path "query" # Index path and search
npm start -- . "query"     # Search without re-indexing
npm run mcp                # Start MCP server
```

### Database Location
- Default: `./codeindexer.db`
- Override: `DB_PATH=/custom/path.db npm start`

### Embedding Model
- Model: `Xenova/all-MiniLM-L6-v2`
- Dimensions: 384
- Size: ~70MB (cached after first download)

### Configuration Options
- `concurrency` (in `IndexerOptions`): Number of parallel embeddings (default: 10)
- `DB_PATH`: Custom database location (default: `./codeindexer.db`)

---

## Future Improvements

### High Impact

#### 1. Multi-Language Support
- Add Python, Go, Rust, Java, C++, and more
- Install tree-sitter language packages
- Define node types per language

#### 2. Hybrid Search (Vector + Keyword)
- Combine vector similarity with BM25 keyword matching
- Use Reciprocal Rank Fusion for better results
- Improves recall for exact matches

#### 3. Git Awareness
- Index by commit/branch
- Show code history
- Track when functions were added/modified

### Mid Impact

#### 4. Dedicated CLI Commands
```bash
npm run search "query"   # Search only
npm run reindex         # Force reindex
npm run stats           # Show stats
```

#### 5. Web UI
- Simple dashboard to browse indexed code
- Click to view full file at chunk location
- Search history

#### 6. REST API Server
```bash
GET /search?q=auth
GET /stats
POST /reindex
```

#### 7. Chunk Type Storage
- Store `chunk_type` in database (function, class, method, etc.)
- Filter search results by type

### Nice to Have

#### 8. Import Graph
- Map dependencies between files
- Show which files import which
- Build call graphs

#### 9. Diff Indexing
- Only index changed functions within a file
- More granular incremental updates

#### 10. Webhooks
- Auto-reindex on file save
- Watch mode for development

#### 11. Multiple Embeddings
- Support different embedding models
- Compare results across models

#### 12. Reranking
- Use secondary model to reorder results
- Improve top-k accuracy

---

## LLM/CLI Tool Integration

Optimizations specifically for pairing with LLM CLI tools like Claude Code, opencode, etc.

### Essential (LLM-Priority)

#### 1. Enhanced MCP Tools
- [ ] More detailed search results (file structure, imports, exports)
- [ ] `get_file_context(path)` - Get file with surrounding context
- [ ] `find_related_files(path)` - Find files that import/use this file
- [ ] `get_function_signature(path, functionName)` - Quick overview
- [ ] `search_by_symbol(name)` - Find by exact function/class name

#### 2. Chunk Type Storage + Filtering
- [ ] Store `chunk_type` in database (function, class, method, import, export)
- [ ] MCP tool params: `filter_by_type?: string[]`
- [ ] LLM can ask: "show me all auth functions"

#### 3. LLM-Friendly Output
- [ ] Structured JSON with metadata
- [ ] Token count estimation
- [ ] Intelligent truncation (preserve code structure)
- [ ] Syntax-aware highlighting

### Very Useful

#### 4. Multi-Repo Support
- [ ] Index multiple repositories
- [ ] `search_codebase(query, repo?: string)` - Search specific repo
- [ ] `list_indexed_repos()` - Show available repos
- [ ] Claude can query across all known repos

#### 5. Similarity + Filters
- [ ] `min_similarity?: number` - Filter low-quality matches
- [ ] `file_pattern?: string` - Glob patterns (*.ts, src/**)
- [ ] `exclude_pattern?: string` - Exclude patterns

#### 6. Search History
- [ ] Store recent searches in DB
- [ ] `get_recent_searches()` - For context
- [ ] `repeat_last_search()` - Quick re-run

### Nice to Have

#### 7. Code Intelligence
- [ ] Extract function signatures (params, return type)
- [ ] Show dependencies (imports/exports)
- [ ] Build simple call graph

#### 8. Test Discovery
- [ ] Link tests to source files
- [ ] `find_tests_for(file)` - Find related test files
- [ ] "Show me tests for auth.ts"

#### 9. Diff Awareness
- [ ] Track recent changes
- [ ] "What changed in login() recently?"
- [ ] Link to git blame

#### 10. Streaming Results
- [ ] Stream results to LLM as found
- [ ] LLM can start answering before full results
- [ ] Better UX for large codebases

### MCP Tools (Target)

```typescript
// Search tools
search_codebase(query: string, limit?: number, filters?: SearchFilters): SearchResult[]
search_by_symbol(name: string, type?: 'function' | 'class' | 'method'): SearchResult[]
find_related_files(path: string): string[]

// Context tools  
get_file_context(path: string, startLine?: number, endLine?: number): string
get_function_signature(path: string, name: string): FunctionSignature

// Navigation tools
find_tests_for(filePath: string): string[]
find_imports(path: string): string[]
find_exports(path: string): string[]

// Management tools
list_indexed_repos(): RepoInfo[]
get_index_stats(): Stats
reindex_repo(repo?: string): ReindexResult
```

### Example LLM Interactions

```
User: "How is authentication implemented?"
→ Claude calls search_codebase("authentication", limit=5)
→ Returns functions, classes related to auth

User: "Show me the tests for auth.ts"  
→ Claude calls find_tests_for("src/auth.ts")
→ Returns test file paths

User: "What does validateToken() do?"
→ Claude calls get_function_signature("src/auth.ts", "validateToken")
→ Returns signature + brief description
```
