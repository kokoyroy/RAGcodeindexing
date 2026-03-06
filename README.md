# Code Indexer

A powerful codebase indexing tool that makes your code searchable using natural language. Built with TypeScript, it uses vector embeddings and semantic search to find relevant code snippets based on meaning, not just keywords.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Usage](#usage)
  - [CLI](#cli)
  - [MCP Server](#mcp-server)
  - [Programmatic API](#programmatic-api)
- [Architecture](#architecture)
  - [File Structure](#file-structure)
  - [Pipeline](#pipeline)
- [Configuration](#configuration)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Why This Project](#why-this-project)
- [License](#license)

---

## Features

- **Natural Language Search**: Find code using plain English queries like "find the authentication function"
- **Semantic Understanding**: Uses AI embeddings to understand code meaning, not just keywords
- **Incremental Indexing**: Only re-indexes changed files, saving time on large codebases
- **Local & Private**: Runs entirely locally - no external API calls, no data leaves your machine
- **MCP Integration**: Exposes tools for LLMs (Claude, GPT, opencode) to search your codebase
- **Multiple File Types**: Supports JavaScript (.js), TypeScript (.ts), and TSX (.tsx)
- **Tree-sitter Parsing**: Intelligent code chunking that preserves functions, classes, and exports
- **Parallel Processing**: Fast embedding generation with configurable concurrency

---

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Index current directory and search
npm start

# Or index a specific project
npm start -- /path/to/your/project "authentication function"
```

That's it! The first run will download the embedding model (~70MB) and then index your code.

---

## How It Works

### The RAG Pipeline

This tool implements the **Retrieval** part of RAG (Retrieval-Augmented Generation):

```
Your Codebase ──► Indexing ──► Vector Database
                                          │
                                          ▼
User Query  ──► Embedding ──► Similarity Search ──► Relevant Code
```

### Key Concepts

1. **Tree-sitter Parsing**: Breaks code into semantic units (functions, classes, exports) instead of arbitrary lines

2. **Vector Embeddings**: Converts code chunks into 384-dimensional vectors using the all-MiniLM-L6-v2 model

3. **Cosine Similarity**: Finds the most similar code by comparing vectors mathematically

4. **Incremental Indexing**: Uses MD5 hashes to detect which files changed, only re-indexing what's necessary

---

## Usage

### CLI

```bash
# Index current directory
npm start

# Index specific directory
npm start -- /path/to/project

# Index and search
npm start -- . "search query"

# Show help
npm start -- --help
```

### MCP Server

Start the MCP server to enable LLM integration:

```bash
# Start server (indexes on startup)
npm run mcp -- /path/to/project
```

This exposes three tools for LLMs:

| Tool | Description |
|------|-------------|
| `search_codebase` | Find relevant code using natural language |
| `reindex_codebase` | Force re-index all files |
| `get_index_stats` | Get index statistics |

#### Configuring with Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/settings.json`):

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "node",
      "args": ["/absolute/path/to/codeindexer/dist/mcpServer.js", "/path/to/your/project"]
    }
  }
}
```

#### Configuring with opencode

Add this to your opencode config:

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "npm",
      "args": ["run", "mcp", "--", "/path/to/your/project"],
      "cwd": "/path/to/codeindexer"
    }
  }
}
```

### Programmatic API

```typescript
import { indexer } from './indexer.js';

// Initialize (connects DB, loads ML model)
await indexer.initialize();

// Index a codebase
const stats = await indexer.index({
  targetDir: '/path/to/project',
  forceReindex: false,  // Use incremental indexing
});

console.log(stats);
// { filesScanned: 50, filesChanged: 12, chunksExtracted: 234, chunksIndexed: 234, errors: 0, duration: 5000 }

// Search!
const results = await indexer.search('authentication function', 5);

// Results include file path, lines, similarity score, and code preview
console.log(results);
// [
//   {
//     id: 1,
//     file_path: "src/auth.ts",
//     chunk_text: "function authenticateUser() { ... }",
//     start_line: 42,
//     end_line: 58,
//     similarity: 0.92
//   },
//   ...
// ]

// Clean up when done
await indexer.shutdown();
```

---

## Architecture

### File Structure

```
codeindexing/
├── src/
│   ├── database.ts              # SQLite + sqlite-vec storage
│   ├── embedder.ts             # Text → vector conversion (ML)
│   ├── fileScanner.ts          # File discovery and hashing
│   ├── semanticChunker.ts      # Tree-sitter code parsing
│   ├── indexer.ts              # Parallel pipeline orchestrator
│   ├── indexer_sequential.ts  # Sequential pipeline (slower, simpler)
│   ├── main.ts                 # CLI entry point
│   ├── mcpServer.ts            # MCP server for LLM integration
│   └── mcpClient.ts            # MCP client (testing)
├── package.json
├── tsconfig.json
├── LEARN.md                    # Deep-dive learning guide
└── README.md
```

### Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     INDEXING PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│  1. SCAN        Find all .js/.ts/.tsx files                   │
│  2. READ        Load file contents + compute MD5 hashes        │
│  3. FILTER      Compare hashes → skip unchanged files           │
│  4. CHUNK       Parse code into functions/classes (Tree-sitter)│
│  5. EMBED       Convert each chunk to 384-dim vector           │
│  6. STORE       Save to SQLite + vector table                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SEARCH PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│  Query: "find the login function"                               │
│                              │                                  │
│  ┌────────────┐             │                                  │
│  │  EMBEDDER  │◄────────────┘                                  │
│  │  (ML Model)│                                                 │
│  └─────┬──────┘                                                 │
│        │ 384-dim vector                                        │
│        ▼                                                         │
│  ┌────────────┐                                                 │
│  │  DATABASE  │                                                 │
│  │ (vec search)│                                                │
│  └─────┬──────┘                                                 │
│        │ SearchResults                                           │
│        ▼                                                         │
│  Code chunks sorted by similarity!                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | Custom database file path | `./codeindexer.db` |

### Indexer Options

```typescript
interface IndexerOptions {
  targetDir: string;        // Directory to index (required)
  forceReindex?: boolean;  // Skip incremental, re-index all (default: false)
  concurrency?: number;     // Parallel embedding workers (default: 10)
}
```

### Indexer Statistics

```typescript
interface IndexerStats {
  filesScanned: number;     // Total files found
  filesChanged: number;     // Files that needed re-indexing
  chunksExtracted: number;  // Code chunks parsed
  chunksIndexed: number;    // Chunks saved to DB
  errors: number;           // Errors encountered
  duration: number;         // Time taken (ms)
}
```

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run type check
npx tsc --noEmit

# Start development
npm start
```

### Testing MCP Server

```bash
# Start MCP server
npm run mcp -- /path/to/project

# Or test with MCP client
node dist/mcpClient.js /path/to/project
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe JavaScript |
| **SQLite** | Local database |
| **sqlite-vec** | Vector similarity search |
| **Transformers.js** | Local ML embeddings |
| **Tree-sitter** | Code parsing to AST |
| **MCP SDK** | LLM tool integration |

### Dependencies

- `better-sqlite3` - SQLite driver
- `@xenova/transformers` - ML model inference
- `tree-sitter` - Code parsing
- `tree-sitter-javascript` - JS/TS grammars
- `@modelcontextprotocol/sdk` - MCP protocol
- `md5` - File hashing

---

## Why This Project?

### Traditional Search vs Semantic Search

**Traditional (grep/strings):**
```
Query: "authenticate user"
Matches: "function authenticateUser()"
Only finds exact or substring matches
```

**This project (semantic):**
```
Query: "login functionality"
Matches: "function authenticateUser()"
Matches: "function validateCredentials()"
Matches: "class SessionManager"
Finds code by MEANING, not just keywords!
```

### Use Cases

1. **Code Review**: Quickly find relevant code before reviewing PRs
2. **Onboarding**: Help new developers explore the codebase
3. **Debugging**: Find similar bug fixes or error handling
4. **LLM Augmentation**: Provide context to AI coding assistants
5. **Refactoring**: Locate all usages of patterns to update

---

## Examples

### Example 1: Index the Current Project

```bash
cd codeindexing
npm start
```

Output:
```
══════════════════════════════════════════════════════════════
  Code Indexer - RAG-powered Codebase Search
══════════════════════════════════════════════════════════════

[Main] Initializing indexer...
[Indexer] Starting indexing of: /Users/kokoyroy/Desktop/codeindexing
[Indexer] Found 8 supported files
[Indexer] Reading files: [██████████████████] 100% (8/8)
[Indexer] Indexing 8 changed files
[Indexer] Extracted 45 code chunks
[Indexer] Generating embeddings: [██████████████████] 100% (45/45)
[Indexer] Storing chunks in database...
[Indexer] ✅ Indexing complete in 2500ms

[Main] Indexing Results:
  Files scanned: 8
  Files changed: 8
  Chunks extracted: 45
  Chunks indexed: 45
  Errors: 0
  Duration: 2500ms

[Main] Running test search...
  Query: "function declaration"

[Main] Search Results:
  [1] src/semanticChunker.ts:30-40
      Similarity: 87.5%
      Preview: function_declaration(node: Parser.SyntaxNode, sourceCode: string...
```

### Example 2: Index a Specific Project

```bash
npm start -- /Users/kokoyroy/Desktop/projects/my-express-app
```

### Example 3: Index and Search Together

```bash
npm start -- /Users/kokoyroy/Desktop/my-react-app "authentication middleware"
```

### Example 4: Common Project Paths

```bash
# Current working directory
npm start

# A nearby project folder
npm start -- ../my-project
npm start -- /Users/kokoyroy/Desktop/projects/webapp

# A Node.js/TypeScript project
npm start -- /Users/kokoyroy/Desktop/projects/typescript-api

# A React/Vue/Next.js project
npm start -- /Users/kokoyroy/Desktop/projects/nextjs-app
```

---

## Learn More

For deep-dive explanations of the architecture, algorithms, and design decisions, see [LEARN.md](LEARN.md).

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Xenova](https://huggingface.co/Xenova) for the transformers.js library
- [Tree-sitter](https://tree-sitter.github.io/) team for the parsing library
- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector search in SQLite
