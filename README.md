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

Code Indexer MCP is a **Model Context Protocol (MCP)** server that provides semantic code search capabilities to AI assistants.

**Works with any MCP-compatible client:**
- ✅ **Claude Code** - Anthropic's coding assistant
- ✅ **Claude Desktop** - Claude's desktop application  
- ✅ **OpenCode** - Open-source AI coding agent
- ✅ **Cursor** - AI-powered code editor
- ✅ **VS Code** - With MCP extension
- ✅ **Any MCP client** - Standard MCP protocol

**Key Features:**
- 🔍 **Semantic Search** - Find code by meaning, not just keywords
- 🏠 **100% Local** - No cloud APIs, all processing happens on your machine
- 🔌 **MCP Integration** - Works with any MCP-compatible client
- ⚡ **Easy Installation** - Downloads and installs the full indexer automatically
- 🔄 **Auto-Update** - Checks for updates and can update automatically
- 🛠️ **Config Helper** - Easy setup for Claude Desktop and OpenCode

---

## 🔌 MCP Protocol - Universal Compatibility

This tool uses the **Model Context Protocol (MCP)**, an open standard for connecting AI assistants to external tools and data sources. This means:

✅ **Works Everywhere** - Any MCP-compatible client can use this tool  
✅ **Future-Proof** - As more clients adopt MCP, they automatically work with this tool  
✅ **Standard Interface** - Same configuration works across different AI assistants  

**Supported MCP Clients:**
| Client | Type | Status |
|--------|------|--------|
| Claude Code | Coding Assistant | ✅ Supported |
| Claude Desktop | Desktop App | ✅ Supported |
| OpenCode | Coding Agent | ✅ Supported |
| Cursor | Code Editor | ✅ Supported |
| VS Code | Code Editor (with MCP extension) | ✅ Supported |
| Zed | Code Editor | ✅ Supported |
| Continue | VS Code Extension | ✅ Supported |
| Any MCP Client | Any app supporting MCP | ✅ Supported |

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

### Quick Setup (Recommended)

```bash
# Install globally
npm install -g code-indexer-mcp

# Auto-configure for your MCP client
npm run configure

# Or specify a client
npm run configure claude     # For Claude Code / Claude Desktop
npm run configure opencode   # For OpenCode
npm run configure cursor     # For Cursor
npm run configure all        # Configure all detected clients
```

### With Claude Code

**Method 1: Auto-Configure (Recommended)**
```bash
npm run configure claude
# Edit the config file to set your project path
# Restart Claude Code
```

**Method 2: Manual Config**

Add to your Claude Code MCP config:

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

### With Claude Desktop

**Method 1: Auto-Configure (Recommended)**
```bash
npm run configure claude
# Restart Claude Desktop
```

**Method 2: Manual Config**

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

**Method 1: Auto-Configure (Recommended)**
```bash
npm run configure opencode
# Restart OpenCode
```

**Method 2: Manual Config**

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

## 🔄 Auto-Update System

Code Indexer uses a **hybrid auto-update system** with background notifications and MCP tools for full control.

### Automatic Update Notifications

When you start your MCP client (Claude, OpenCode, etc.), the indexer automatically checks for updates in the background:

```
[code-indexer-mcp] 🔄 Update available: v1.1.0
[code-indexer-mcp] Current: v1.0.0
[code-indexer-mcp] Ask Claude to install or run: npm run update
```

This check is:
- ⚡ **Non-blocking** - Doesn't delay startup
- 🔕 **Silent on failure** - Won't interrupt if check fails
- ⏱️ **5-second timeout** - Fast and lightweight

### Update via MCP Tools

You can manage updates directly from your AI assistant using these MCP tools:

**Check for Updates:**
```
You: Check if there are updates for code-indexer

Claude: [Uses check_for_updates tool]
An update is available!
Current: v1.0.0
Latest: v1.1.0
Would you like me to install it?
```

**Install Updates:**
```
You: Install the code-indexer update

Claude: [Uses install_update tool]
Successfully updated to v1.1.0!
⚠️  Please restart Claude/OpenCode for the update to take effect.
```

**Check Current Version:**
```
You: What version of code-indexer is installed?

Claude: [Uses get_version tool]
Package Version: 1.0.0
Indexer Version: v1.0.0
Indexer Installed: true
```

### Manual Update (CLI)

You can also update from the command line:

```bash
# Check for and install updates
npm run update

# Force update (reinstall even if already up to date)
npm run update -- --force
```

Updates are downloaded from the GitHub repository's releases (tags) only.

---

## 🛠️ Available Tools

Once installed, the MCP server provides these tools to AI assistants:

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_codebase` | Search code semantically | `query` (string), `limit` (number, optional) |
| `reindex_codebase` | Force full re-index | none |
| `get_index_stats` | Get indexing statistics | none |
| `check_for_updates` | Check if new version is available | none |
| `install_update` | Download and install latest version | none |
| `get_version` | Get current installed version info | none |

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

**Checking for Updates:**
```
You: Is there an update available for code-indexer?

Claude: [Uses check_for_updates tool]
Yes! An update is available.
Current version: v1.0.0
Latest version: v1.1.0
Would you like me to install it?
```

**Installing Updates:**
```
You: Yes, install the update

Claude: [Uses install_update tool]
Successfully updated to v1.1.0!
⚠️  IMPORTANT: Please restart Claude for the update to take effect.
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
