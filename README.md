<div align="center">

# Code Indexer MCP

**MCP Server for Semantic Code Search**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

[Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration) • [Develop Branch](#-develop-branch)

</div>

---

## 🎯 Overview

Code Indexer MCP is a **Model Context Protocol (MCP)** server that provides semantic code search capabilities to AI assistants like Claude, OpenCode, ChatGPT, and more.

**Key Features:**
- 🔍 **Semantic Search** - Find code by meaning, not just keywords
- 🏠 **100% Local** - No cloud APIs, all processing happens on your machine
- 🔌 **MCP Integration** - Works with Claude Desktop, OpenCode, VS Code, and other MCP clients
- ⚡ **Easy Installation** - Downloads and installs the full indexer automatically
- 🔄 **Auto-Update** - Checks for updates and can update automatically
- 🛠️ **Config Helper** - Easy setup for Claude Desktop and OpenCode

---

## 📦 Installation

### Via npm (Recommended)

```bash
npm install -g code-indexer-mcp
```

The package will automatically download and install the full code indexer from the `develop` branch on first use.

### Easy Configuration

Use the configure script to automatically set up Claude Desktop or OpenCode:

```bash
# Configure for Claude Desktop
npm run configure

# Configure for OpenCode
npm run configure opencode

# Configure for both
npm run configure both
```

The script will guide you through the setup process and update your config files.

### From Source

```bash
git clone -b main https://github.com/kokoyroy/RAGcodeindexing.git
cd RAGcodeindexing
npm install
```

---

## 🚀 Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "code-indexer-mcp",
      "args": ["/path/to/your/project"]
    }
  }
}
```

### With OpenCode

Add to your OpenCode config:

```json
{
  "mcpServers": {
    "code-indexer": {
      "command": "code-indexer-mcp",
      "args": ["/path/to/your/project"]
    }
  }
}
```

### Command Line

```bash
# Start MCP server for a project
code-indexer-mcp /path/to/your/project

# Check version
code-indexer-mcp --version

# Check for updates
npm run update

# Force update
npm run update --force
```

---

## 🔄 Auto-Update

The package automatically checks for updates when you run `--version`. You can also manually update:

```bash
# Check for and install updates
npm run update

# Force update (reinstall even if already up to date)
npm run update -- --force
```

Updates are downloaded from the GitHub repository's releases or develop branch.

---

## 🛠️ Available Tools

Once installed, the MCP server provides these tools to AI assistants:

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_codebase` | Search code semantically | `query` (string), `limit` (number, optional) |
| `reindex_codebase` | Force full re-index | none |
| `get_index_stats` | Get indexing statistics | none |

### Example Usage

**In Claude Desktop:**
```
You: Search my codebase for authentication logic

Claude: I'll search your codebase for authentication-related code.
[Uses search_codebase tool]

Found 5 relevant code sections:
1. src/auth/login.ts:authenticateUser() - 95% match
2. src/middleware/auth.ts:verifyToken() - 89% match
...
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | SQLite database location | `./codeindexer.db` |

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

## 🌿 Branch Structure

This repository uses a dual-branch structure:

- **`main`** (you are here) - Lightweight MCP server installer
- **`develop`** - Full source code and development environment

### For Development

If you want to:
- Contribute to the project
- Modify the indexer
- Run the CLI directly
- Access the full source code

👉 **Switch to the `develop` branch:**

```bash
git clone -b develop https://github.com/kokoyroy/RAGcodeindexing.git
cd RAGcodeindexing
npm install
npm run build
npm start
```

See the [develop branch README](https://github.com/kokoyroy/RAGcodeindexing/tree/develop) for full documentation.

---

## 📋 How It Works

### Installation Flow

```
npm install code-indexer-mcp
         ↓
Post-install script runs
         ↓
Downloads code from develop branch
         ↓
Installs dependencies
         ↓
Builds TypeScript
         ↓
Ready to use!
```

### Search Flow

```
AI Assistant receives query
         ↓
Calls search_codebase tool
         ↓
Query embedded to vector (384-dim)
         ↓
Cosine similarity search in SQLite
         ↓
Returns ranked results
```

---

## 🧠 Technology Stack

- **MCP Protocol** - Model Context Protocol for AI integration
- **Transformers.js** - Local ML model inference
- **Tree-sitter** - Code parsing and semantic chunking
- **SQLite + sqlite-vec** - Vector storage and similarity search
- **TypeScript** - Type-safe implementation

---

## 🔧 Troubleshooting

### Installation Issues

**Problem:** Installation fails or hangs

**Solution:** 
```bash
# Clean install
rm -rf node_modules .indexer
npm install
```

### MCP Server Not Starting

**Problem:** MCP server doesn't appear in your AI client

**Solution:**
1. Verify the path in your config is absolute
2. Check that Node.js 18+ is installed
3. Run `code-indexer-mcp /path/to/project` manually to check for errors

### Search Returns No Results

**Problem:** Search tool returns empty results

**Solution:**
1. Make sure your project has `.js`, `.ts`, or `.tsx` files
2. Run `reindex_codebase` tool to force re-indexing
3. Check `get_index_stats` to see if files were indexed

---

## 🤝 Contributing

Contributions are welcome! Please see the [develop branch](https://github.com/kokoyroy/RAGcodeindexing/tree/develop) for:
- Source code
- Development setup
- Contribution guidelines

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for LLM integration
- [Xenova](https://huggingface.co/Xenova) for Transformers.js
- [Tree-sitter](https://tree-sitter.github.io/) for code parsing
- [sqlite-vec](https://github.com/asg017/sqlite-vec) for vector search

---

## 📞 Support

- 🐛 [Issue Tracker](https://github.com/kokoyroy/RAGcodeindexing/issues)
- 💬 [Discussions](https://github.com/kokoyroy/RAGcodeindexing/discussions)
- 📖 [Full Documentation](https://github.com/kokoyroy/RAGcodeindexing/tree/develop)

---

<div align="center">

**[⬆ Back to Top](#code-indexer-mcp)**

Made with ❤️ by [kokoyroy](https://github.com/kokoyroy)

</div>
