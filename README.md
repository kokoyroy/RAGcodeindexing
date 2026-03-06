<div align="center">

# Code Indexer

**AI-Powered Semantic Code Search for Your Local Codebase**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

[Features](#-features) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Examples](#-examples) • [API](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 🎯 What is This?

Code Indexer is a **local, privacy-first** tool that makes your codebase searchable using natural language. Instead of searching for exact keywords, you can ask questions like:

- *"Where is user authentication handled?"*
- *"Find database connection logic"*
- *"Show me error handling for API calls"*

It uses **AI embeddings** and **semantic search** to understand the *meaning* of your code, not just the text. Perfect for onboarding, debugging, code reviews, and augmenting LLM coding assistants.

### Why Code Indexer?

| Traditional Search | Code Indexer |
|-------------------|--------------|
| Searches for exact text matches | Understands code *semantically* |
| `"auth"` only finds `"auth"` | `"login"` finds authentication code |
| grep, ripgrep, IDE search | Vector similarity search |
| No context understanding | AI-powered meaning extraction |

---

## ✨ Features

- 🔍 **Semantic Search** - Find code by meaning, not just keywords
- 🏠 **100% Local** - No cloud APIs, no data leaves your machine
- ⚡ **Fast Indexing** - Incremental updates, parallel processing
- 🧠 **Smart Chunking** - Tree-sitter parsing preserves code structure
- 🔌 **MCP Integration** - Works with Claude, opencode, and other LLMs
- 📦 **Zero Config** - Works out of the box, no setup required
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🔄 **Incremental** - Only re-indexes changed files

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- ~100MB disk space (for ML model)

### Installation

```bash
# Clone the repository
git clone https://github.com/kokoyroy/RAGcodeindexing.git
cd RAGcodeindexing

# Install dependencies
npm install

# Build TypeScript
npm run build

# Index and search your codebase!
npm start
```

> **💡 Tip**: No path needed! Running `npm start` without arguments indexes the **current directory** by default.

**First run?** The tool will download the ML model (~70MB). This only happens once.

### Basic Usage

**Default Behavior**: If you don't specify a path, Code Indexer will automatically use the **current directory**.

```bash
# Index current directory (default)
npm start

# Index current directory explicitly
npm start -- .

# Index a specific project
npm start -- /path/to/your/project

# Index and search in one command
npm start -- . "authentication function"

# Index specific project and search
npm start -- /path/to/project "database connection pool"
```

---

## 🏗️ How It Works

### The RAG Pipeline

Code Indexer implements the **Retrieval** part of RAG (Retrieval-Augmented Generation):

```
┌─────────────────────────────────────────────────────────────┐
│                    INDEXING PIPELINE                         │
├─────────────────────────────────────────────────────────────┤
│  Codebase → Scan → Parse → Chunk → Embed → Store (SQLite)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     SEARCH PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│  Query → Embed → Vector Search → Rank → Return Results     │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Parsing** | Tree-sitter | Parse code into AST, extract semantic chunks |
| **Embedding** | Transformers.js (all-MiniLM-L6-v2) | Convert text to 384-dim vectors |
| **Storage** | SQLite + sqlite-vec | Store chunks + vectors locally |
| **Search** | Cosine similarity | Find most similar code vectors |

### Why Tree-sitter?

Traditional code search splits files by lines or characters. Tree-sitter understands code structure:

```typescript
// ❌ Traditional: arbitrary line splits
// Line 1: function authenticateUser(
// Line 2:   credentials: Creds

// ✅ Tree-sitter: semantic chunks
function authenticateUser(credentials: Creds): Promise<User> {
  // entire function as one chunk
}
```

---

## 📖 Examples

### Example 1: Index Current Directory

```bash
# From the codeindexer directory
cd /path/to/RAGcodeindexing
npm start

# This indexes the codeindexer project itself!
```

### Example 2: Index a Specific Project

```bash
$ npm start -- ~/projects/my-express-api

══════════════════════════════════════════════════════════════
  Code Indexer - RAG-powered Codebase Search
══════════════════════════════════════════════════════════════

[Indexer] Initializing...
[Indexer] Found 42 .ts files
[Indexer] Reading files: [██████████████████] 100% (42/42)
[Indexer] Extracted 156 code chunks
[Indexer] Generating embeddings: [████████████] 100% (156/156)
[Indexer] ✅ Complete in 3.2s

Results:
  Files scanned: 42
  Chunks indexed: 156
  Duration: 3,240ms
```

### Example 2: Semantic Search

```bash
$ npm start -- ~/projects/my-express-api "error handling"

[Main] Searching for: "error handling"

Top Results:
  [1] src/middleware/errorHandler.ts:15-32 (92% match)
      export function errorHandler(err: Error, req: Request...

  [2] src/utils/logger.ts:45-58 (87% match)
      catch (error) {
        logger.error('Database connection failed'...

  [3] src/api/routes.ts:102-118 (84% match)
      try {
        await processPayment(data);
      } catch (error)...
```

### Example 3: Find Similar Code

```bash
$ npm start -- . "JWT token validation"

[Main] Results:
  [1] src/auth/jwt.ts:23-41 (95%)
      export function validateToken(token: string)...

  [2] src/middleware/auth.ts:12-28 (89%)
      if (!verifyJWT(req.headers.authorization))...
```

**See [EXAMPLES.md](EXAMPLES.md) for more detailed use cases.**

---

## 🔌 MCP Integration

Code Indexer exposes tools via the **Model Context Protocol (MCP)**, allowing LLMs like Claude to search your codebase.

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_codebase` | Search code semantically | `query` (string), `limit` (number) |
| `reindex_codebase` | Force full re-index | none |
| `get_index_stats` | Get indexing statistics | none |

### Configure with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "node",
      "args": ["/path/to/RAGcodeindexing/dist/mcpServer.js", "/path/to/your/project"]
    }
  }
}
```

### Configure with opencode

Add to your opencode config:

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "npm",
      "args": ["run", "mcp", "--", "/path/to/your/project"],
      "cwd": "/path/to/RAGcodeindexing"
    }
  }
}
```

### Start MCP Server

```bash
npm run mcp -- /path/to/your/project
```

---

## 📚 API Reference

### Programmatic Usage

```typescript
import { indexer } from './dist/indexer.js';

// Initialize
await indexer.initialize();

// Index a directory
const stats = await indexer.index({
  targetDir: '/path/to/project',
  forceReindex: false,  // Incremental indexing
  concurrency: 10       // Parallel workers
});

console.log(stats);
// {
//   filesScanned: 42,
//   filesChanged: 12,
//   chunksExtracted: 156,
//   chunksIndexed: 156,
//   errors: 0,
//   duration: 3240
// }

// Search
const results = await indexer.search('authentication function', 5);

console.log(results[0]);
// {
//   id: 1,
//   file_path: 'src/auth.ts',
//   chunk_text: 'export async function authenticateUser...',
//   start_line: 42,
//   end_line: 58,
//   similarity: 0.92
// }

// Cleanup
await indexer.shutdown();
```

**See [API.md](API.md) for complete API documentation.**

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | SQLite database location | `./codeindexer.db` |

### Indexer Options

```typescript
interface IndexerOptions {
  targetDir: string;       // Directory to index (required)
  forceReindex?: boolean;  // Re-index all files (default: false)
  concurrency?: number;    // Parallel embedding workers (default: 10)
}
```

### Supported File Types

- `.js` - JavaScript
- `.ts` - TypeScript
- `.tsx` - TypeScript with JSX

### Ignored Directories

- `node_modules/`
- `.git/`
- `dist/`, `build/`
- `coverage/`

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npx tsc --noEmit

# Run
npm start

# Run MCP server
npm run mcp -- /path/to/project
```

### Project Structure

```
src/
├── main.ts              # CLI entry point
├── indexer.ts           # Main orchestrator
├── database.ts          # SQLite + vector storage
├── embedder.ts          # ML model for embeddings
├── fileScanner.ts       # File discovery
├── semanticChunker.ts   # Tree-sitter parsing
├── mcpServer.ts         # MCP protocol server
└── mcpClient.ts         # MCP test client
```

---

## 🤝 Contributing

We love contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- 🐛 Reporting bugs
- 💡 Requesting features
- 🔧 Submitting pull requests
- 📝 Improving documentation

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] Support for more languages (Python, Go, Rust)
- [ ] Web UI for search
- [ ] Code navigation (go to definition)
- [ ] Import analysis and dependency graphs
- [ ] Team collaboration features
- [ ] Cloud sync option

---

## ❓ FAQ

<details>
<summary><strong>How is this different from grep or IDE search?</strong></summary>

Traditional search looks for exact text matches. Code Indexer understands the *meaning* of your code using AI embeddings. A search for "login" will find authentication functions, even if they're named `authenticateUser` or `validateCredentials`.
</details>

<details>
<summary><strong>Is my code sent to any external servers?</strong></summary>

No. Everything runs locally on your machine. The ML model runs in your Node.js process, and all data stays in your local SQLite database.
</details>

<details>
<summary><strong>How accurate is the semantic search?</strong></summary>

Accuracy depends on the quality of your code comments and naming conventions. Well-named functions and good documentation improve results. The tool uses cosine similarity on 384-dimensional vectors, which is effective for semantic matching.
</details>

<details>
<summary><strong>Can I use this with large codebases?</strong></summary>

Yes! The tool uses incremental indexing (only processes changed files) and parallel processing. It's been tested on codebases with 1000+ files.
</details>

<details>
<summary><strong>What's the performance impact?</strong></summary>

- **First run**: Downloads ML model (~70MB), then indexes all files
- **Subsequent runs**: Only re-indexes changed files
- **Search**: Returns results in milliseconds
- **Memory**: ~200MB for ML model + embeddings cache
</details>

<details>
<summary><strong>Can I use this with non-JavaScript projects?</strong></summary>

Currently, the tool only supports JavaScript, TypeScript, and TSX files. Support for other languages (Python, Go, Rust) is on the roadmap.
</details>

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Xenova](https://huggingface.co/Xenova) for Transformers.js
- [Tree-sitter](https://tree-sitter.github.io/) for code parsing
- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector search
- [Model Context Protocol](https://modelcontextprotocol.io/) for LLM integration

---

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/kokoyroy/RAGcodeindexing/issues)
- 💬 [Discussions](https://github.com/kokoyroy/RAGcodeindexing/discussions)

---

<div align="center">

**[⬆ Back to Top](#code-indexer)**

Made with ❤️ by [kokoyroy](https://github.com/kokoyroy)

</div>
