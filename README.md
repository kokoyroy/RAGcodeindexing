<div align="center">

# Code Indexer MCP

**MCP Server for Semantic Code Search**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Private Package](https://img.shields.io/badge/Package-Private-red.svg)]()

[Installation](#-installation) • [Usage](#-usage) • [Branch Structure](#-branch-structure)

</div>

---

## 🎯 Overview

> **⚠️ This is the `main` branch - the lightweight installer package**

Code Indexer MCP is a **Model Context Protocol (MCP)** server that provides semantic code search capabilities to AI assistants.

**Works with any MCP-compatible client:**
- ✅ **OpenCode** - Open-source AI coding agent
- ✅ **Claude Desktop** - Claude's desktop application  
- ✅ **Claude Code** - Anthropic's coding assistant
- ✅ **Cursor** - AI-powered code editor
- ✅ **VS Code** - With MCP extension
- ✅ **Any MCP client** - Standard MCP protocol

**Key Features:**
- 🔍 **Semantic Search** - Find code by meaning, not just keywords
- 🏠 **100% Local** - No cloud APIs, all processing happens on your machine
- 🔌 **MCP Integration** - Works with any MCP-compatible client
- ⚡ **Easy Installation** - Downloads and installs from GitHub releases
- 🔄 **Auto-Update** - Checks for updates automatically
- 🛠️ **Plug-and-Play** - Minimal configuration required

---

## 📦 Installation

### From GitHub (Recommended)

```bash
# Install globally from GitHub
npm install -g kokoyroy/RAGcodeindexing
```

The package will automatically download and install the full code indexer from the latest GitHub release on first use.

### Quick Setup

```bash
# 1. Install
npm install -g kokoyroy/RAGcodeindexing

# 2. Configure for your MCP client (with project path)
code-indexer-mcp-configure opencode /path/to/your/project

# 3. Restart your MCP client - Done!
```

That's it! The indexer will be available in your MCP client.

---

## 🚀 Usage

### Configure MCP Clients

```bash
# Configure for OpenCode
code-indexer-mcp-configure opencode /path/to/your/project

# Configure for Claude Desktop
code-indexer-mcp-configure claude /path/to/your/project

# Configure for Cursor
code-indexer-mcp-configure cursor /path/to/your/project

# Configure all detected clients
code-indexer-mcp-configure all /path/to/your/project

# Default: OpenCode with current directory
code-indexer-mcp-configure opencode
```

### Command Line

```bash
# Start MCP server for a project
code-indexer-mcp /path/to/your/project

# Check version
code-indexer-mcp --version

# Check for updates
code-indexer-mcp-update

# Force update
code-indexer-mcp-update --force
```

---

## 🌿 Branch Structure

This repository uses a **3-branch architecture**:

| Branch | Purpose | Contents |
|--------|---------|----------|
| **`main`** *(you are here)* | Installer Package | Lightweight installer scripts that download releases |
| **`release`** | Release Builds | Pre-built TypeScript code (downloaded by installer) |
| **`develop`** | Development | Full source code for development and contributions |

### For Users

Use the `main` branch (this one) or install directly:
```bash
npm install -g kokoyroy/RAGcodeindexing
```

### For Contributors

Use the `develop` branch:
```bash
git clone -b develop https://github.com/kokoyroy/RAGcodeindexing.git
cd RAGcodeindexing
npm install
npm run build
npm start
```

### Release Process

1. Code developed in `develop` branch
2. Built code merged to `release` branch
3. GitHub release tagged (e.g., `v1.0.0`)
4. `main` branch installer downloads from release tags

---

## 🔄 Auto-Update System

### Automatic Update Notifications

When you start your MCP client, the indexer checks for updates in the background:

```
[code-indexer-mcp] 🔄 Update available: v1.1.0
[code-indexer-mcp] Current: v1.0.0
[code-indexer-mcp] Run: code-indexer-mcp-update
```

### Update via MCP Tools

```
You: Check if there are updates for code-indexer

Claude: [Uses check_for_updates tool]
An update is available! v1.1.0
Would you like me to install it?
```

### Manual Update (CLI)

```bash
code-indexer-mcp-update
code-indexer-mcp-update --force
```

---

## 🛠️ Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_codebase` | Search code semantically | `query` (string), `limit` (number, optional) |
| `reindex_codebase` | Force full re-index | none |
| `get_index_stats` | Get indexing statistics | none |
| `check_for_updates` | Check if new version is available | none |
| `install_update` | Download and install latest version | none |
| `get_version` | Get current installed version info | none |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | SQLite database location | `./codeindexer.db` |
| `PROJECT_PATH` | Default project path | Current directory |

### Supported File Types

- `.js` - JavaScript
- `.ts` - TypeScript
- `.tsx` - TypeScript with JSX

### Ignored Directories

- `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`

---

## 🔧 Troubleshooting

### Installation Issues

```bash
# Clean reinstall
rm -rf node_modules .indexer
npm install -g kokoyroy/RAGcodeindexing
```

### MCP Server Not Starting

1. Verify the path in your config is absolute
2. Check that Node.js 18+ is installed: `node --version`
3. Run manually to check for errors: `code-indexer-mcp /path/to/project`

### Search Returns No Results

1. Ensure your project has `.js`, `.ts`, or `.tsx` files
2. Run `reindex_codebase` tool to force re-indexing
3. Check `get_index_stats` to verify files were indexed

---

## 🧠 Technology Stack

- **MCP Protocol** - Model Context Protocol for AI integration
- **Transformers.js** - Local ML model inference (all-MiniLM-L6-v2)
- **Tree-sitter** - Code parsing and semantic chunking
- **SQLite + sqlite-vec** - Vector storage and similarity search
- **TypeScript** - Type-safe implementation

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

<div align="center">

**[⬆ Back to Top](#code-indexer-mcp)**

Made with ❤️ by [kokoyroy](https://github.com/kokoyroy)

</div>
