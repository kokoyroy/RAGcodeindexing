# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0] - 2026-03-01

### Added
- Initial release of Code Indexer
- Semantic chunking using Tree-sitter for JavaScript, TypeScript, and TSX
- Vector embeddings using Xenova/all-MiniLM-L6-v2 (384 dimensions)
- SQLite database with sqlite-vec for efficient vector similarity search
- Incremental indexing with MD5 hash-based change detection
- Parallel embedding generation with configurable concurrency
- Real-time progress bars with percentage and time estimates
- MCP (Model Context Protocol) server for LLM integration
- CLI commands for indexing, searching, and statistics
- Multi-repo support with absolute paths
- Two-hash system (file_hash + content_hash) for efficient updates
- Batch database inserts for improved performance
- ANSI color support for better CLI UX

### Fixed
- Tree-sitter 32KB parsing limit by upgrading to v0.25.0
- Duplicate path issues in multi-repo scenarios
- Progress bar jumping by using proper async handling

### Security
- No hardcoded secrets or credentials
- Safe database queries using parameterized statements

[Unreleased]: https://github.com/yourusername/code-indexer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/code-indexer/releases/tag/v1.0.0
