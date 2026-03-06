# Code Indexer Examples

This guide provides detailed, real-world examples of using Code Indexer for various scenarios.

> **📍 Important**: All `npm start` commands should be run from the **RAGcodeindexing directory** (the repository root).

## Table of Contents

- [Basic Usage](#basic-usage)
- [Real-World Scenarios](#real-world-scenarios)
- [Advanced Searches](#advanced-searches)
- [Integration Examples](#integration-examples)
- [Performance Tips](#performance-tips)

---

## Basic Usage

### Where to Run Commands

All commands should be executed from the RAGcodeindexing directory:

```bash
# Navigate to codeindexer repository
cd /path/to/RAGcodeindexing

# Now you can run npm start
npm start [path-to-project] [search-query]
```

### Path Argument Behavior

- **No path provided**: Indexes the **current directory** (RAGcodeindexing project itself)
- **Path provided**: Indexes the specified project

```bash
# Index the codeindexer project itself (default behavior)
npm start

# Index a specific project
npm start -- /path/to/your/project

# Index and search in one command
npm start -- /path/to/your/project "search query"
```

---

## Basic Examples

### Example 1: Index the Code Indexer Project

**Scenario**: You want to test the indexer on itself.

```bash
# From the RAGcodeindexing directory
cd /path/to/RAGcodeindexing
npm start

# Output:
══════════════════════════════════════════════════════════════
  Code Indexer - RAG-powered Codebase Search
══════════════════════════════════════════════════════════════

[Indexer] Found 8 TypeScript files
[Indexer] Reading files: [██████████████████] 100% (8/8)
[Indexer] Extracted 45 code chunks
[Indexer] Generating embeddings: [████████████] 100% (45/45)
[Indexer] ✅ Complete in 2.5s

Results:
  Files scanned: 8
  Chunks indexed: 45
  Duration: 2,500ms
```

### Example 2: Index a Different Project

**Scenario**: You want to index your Express.js API.

```bash
# From the RAGcodeindexing directory
cd /path/to/RAGcodeindexing
npm start -- ~/projects/my-express-api

# Output:
[Indexer] Found 87 TypeScript files
[Indexer] Reading files: [██████████████████] 100% (87/87)
[Indexer] Extracted 342 code chunks
[Indexer] Generating embeddings: [████████████] 100% (342/342)
[Indexer] ✅ Complete in 4.2s

Results:
  Files scanned: 87
  Chunks indexed: 342
  Duration: 4,200ms
```

### Example 3: Index and Search in One Command

**Scenario**: Index a project and immediately search for authentication code.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "user authentication and login"

# Results:
[Main] Searching for: "user authentication and login"

  [1] src/auth/authService.ts:45-78 (94% match)
      export class AuthService {
        async login(email: string, password: string): Promise<AuthResult> {
          const user = await this.userRepository.findByEmail(email);
          if (!user) {
            throw new AuthenticationError('Invalid credentials');
          }
          const isValid = await this.validatePassword(password, user.passwordHash);
          if (!isValid) {
            throw new AuthenticationError('Invalid credentials');
          }
          const token = this.generateJWT(user);
          return { user, token };
        }
      }

  [2] src/middleware/authMiddleware.ts:12-34 (89% match)
      export function authMiddleware(req: Request, res: Response, next: NextFunction) {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
        try {
          const decoded = verifyJWT(token);
          req.user = decoded;
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
```

### Example 4: Search an Already-Indexed Project

**Scenario**: You've already indexed a project and want to search it again.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "database queries for user operations"

# Results:
[1] src/repositories/userRepository.ts:23-45 (91%)
    async findByEmail(email: string): Promise<User | null> {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await this.db.query(query, [email]);
      return result.rows[0] || null;
    }

[2] src/repositories/userRepository.ts:67-89 (88%)
    async createUser(data: CreateUserDTO): Promise<User> {
      const query = `
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await this.db.query(query, [data.email, data.passwordHash, data.name]);
      return result.rows[0];
    }
```

---

## Real-World Scenarios

### Scenario 1: Debugging an Error

**Problem**: Users report getting 500 errors when uploading files.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "file upload error handling"

# Results point to:
[1] src/controllers/uploadController.ts:34-56 (92%)
    async uploadFile(req: Request, res: Response) {
      try {
        const file = req.file;
        if (!file) {
          throw new ValidationError('No file uploaded');
        }
        const result = await this.uploadService.processFile(file);
        res.json(result);
      } catch (error) {
        // Found it! Missing error response
        console.error(error);
        // Bug: No res.status(500).json() here!
      }
    }
```

### Scenario 2: Refactoring

**Problem**: You want to refactor all API error responses to use a standard format.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "API error response handling"

# Results:
[1] src/controllers/userController.ts:78-82
    res.status(400).json({ error: 'Invalid input' });

[2] src/controllers/authController.ts:45-49
    res.status(401).json({ error: 'Unauthorized' });

[3] src/middleware/errorHandler.ts:12-28
    export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
      res.status(500).json({ error: err.message });
    }

# Now you know where to apply the standard error format!
```

### Scenario 3: Security Audit

**Problem**: You need to find all SQL queries to check for injection vulnerabilities.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "SQL query string construction"

# Results:
[1] src/repositories/productRepository.ts:45-67 (89%)
    async searchProducts(query: string) {
      // ⚠️ Potential SQL injection!
      const sql = `SELECT * FROM products WHERE name LIKE '%${query}%'`;
      return this.db.query(sql);
    }

[2] src/repositories/orderRepository.ts:89-101 (87%)
    async getOrdersByUser(userId: string) {
      // ✅ Safe - parameterized query
      const sql = 'SELECT * FROM orders WHERE user_id = $1';
      return this.db.query(sql, [userId]);
    }
```

### Scenario 4: Feature Implementation

**Problem**: You need to add rate limiting. Find existing middleware patterns.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "Express middleware implementation"

# Results:
[1] src/middleware/rateLimiter.ts:12-34 (88%)
    export function rateLimiter(options: RateLimitOptions) {
      const limiter = new RateLimiter(options);
      return async (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip;
        try {
          await limiter.consume(key);
          next();
        } catch (error) {
          res.status(429).json({ error: 'Too many requests' });
        }
      };
    }

# Great! There's already a rate limiter you can use!
```

### Scenario 5: Code Review

**Problem**: You're reviewing a PR and need to understand the codebase context.

```bash
# From the RAGcodeindexing directory
npm start -- ~/projects/my-express-api "dependency injection pattern"

# Results show how DI is used elsewhere:
[1] src/services/paymentService.ts:12-28
    export class PaymentService {
      constructor(
        private stripeClient: StripeClient,
        private logger: Logger,
        private config: Config
      ) {}
    }

# Now you can check if the PR follows the same pattern
```

---

## Advanced Searches

### Search for Specific Patterns

```bash
# From the RAGcodeindexing directory

# Find React hooks
npm start -- ~/projects/my-react-app "React hooks state management"

# Find async/await error handling
npm start -- ~/projects/my-express-api "async await try catch error"

# Find type definitions
npm start -- ~/projects/my-typescript-lib "TypeScript interface type definition"

# Find environment configuration
npm start -- ~/projects/my-app "environment variables configuration"
```

### Combine Multiple Concepts

```bash
# From the RAGcodeindexing directory

# Find authentication + database
npm start -- ~/projects/my-express-api "authentication database user lookup"

# Find API + validation
npm start -- ~/projects/my-express-api "API request validation schema"

# Find logging + errors
npm start -- ~/projects/my-express-api "error logging and monitoring"
```

### Search by Intent

```bash
# From the RAGcodeindexing directory

# Security-related code
npm start -- ~/projects/my-express-api "security validation sanitization"

# Performance optimization
npm start -- ~/projects/my-express-api "caching performance optimization"

# Testing code
npm start -- ~/projects/my-express-api "unit test mock stub"
```

---

## Integration Examples

### Example 1: Use in CI/CD

**Scenario**: Ensure new code follows existing patterns.

```bash
#!/bin/bash
# ci-check-patterns.sh
# Run this script from the RAGcodeindexing directory

PROJECT_PATH="/path/to/your/project"

# Index the codebase (suppress output)
npm start -- "$PROJECT_PATH" > /dev/null 2>&1

# Search for anti-patterns
RESULT=$(npm start -- "$PROJECT_PATH" "SQL string concatenation" | grep -c "concatenation")

if [ $RESULT -gt 0 ]; then
  echo "❌ Found potential SQL injection vulnerabilities!"
  exit 1
fi

echo "✅ No SQL injection patterns found"
```

### Example 2: Generate Documentation

**Scenario**: Auto-generate API documentation.

```typescript
// generate-api-docs.ts
// Run from RAGcodeindexing directory: node generate-api-docs.js

import { indexer } from './dist/indexer.js';

const PROJECT_PATH = '/path/to/your/project';

async function generateAPIDocs() {
  await indexer.initialize();
  
  // Find all API route handlers
  const routes = await indexer.search('API route handler endpoint', 100);
  
  console.log('# API Endpoints\n');
  
  for (const route of routes) {
    console.log(`## ${route.file_path}:${route.start_line}`);
    console.log('```typescript');
    console.log(route.chunk_text);
    console.log('```\n');
  }
  
  await indexer.shutdown();
}

generateAPIDocs();
```

### Example 3: Code Review Assistant

**Scenario**: Build a tool to help with code reviews.

```typescript
// review-assistant.ts
// Run from RAGcodeindexing directory: node review-assistant.js /path/to/changed/file.ts

import { indexer } from './dist/indexer.js';
import * as fs from 'fs';

const PROJECT_PATH = '/path/to/your/project';

async function reviewAssistant(changedFile: string) {
  await indexer.initialize();
  
  // Read the changed file
  const code = fs.readFileSync(changedFile, 'utf-8');
  
  // Extract function names (simplified)
  const functions = code.match(/function\s+(\w+)/g) || [];
  
  console.log('🔍 Similar code found in codebase:\n');
  
  for (const func of functions) {
    const funcName = func.replace('function ', '');
    const results = await indexer.search(funcName, 3);
    
    if (results.length > 0) {
      console.log(`Function: ${funcName}`);
      console.log(`Similar code in: ${results[0].file_path}:${results[0].start_line}`);
      console.log('');
    }
  }
  
  await indexer.shutdown();
}

reviewAssistant(process.argv[2]);
```

### Example 4: MCP Integration with Claude

**Scenario**: Use Claude to explore your codebase.

```bash
# From the RAGcodeindexing directory
npm run mcp -- /path/to/your/project

# In Claude Desktop, you can now ask:
# "Search for all database connection code"
# "Find where user authentication is implemented"
# "Show me error handling patterns in the API"
```

Claude will automatically use the `search_codebase` tool to find relevant code.

---

## Performance Tips

### Tip 1: Incremental Indexing

```bash
# From the RAGcodeindexing directory

# First run: indexes everything (slower)
npm start -- ~/projects/large-project
# Time: 15 seconds

# Second run: only changed files (fast)
npm start -- ~/projects/large-project
# Time: 0.5 seconds (if no files changed)
```

### Tip 2: Force Re-index

```bash
# From the RAGcodeindexing directory

# If you think the index is stale
rm codeindexer.db
npm start -- ~/projects/my-project
```

### Tip 3: Adjust Concurrency

```typescript
// In your code (run from RAGcodeindexing directory)
await indexer.index({
  targetDir: '/path/to/project',
  concurrency: 20  // Increase for faster indexing on powerful machines
});
```

### Tip 4: Search Optimization

```bash
# From the RAGcodeindexing directory

# More specific queries are faster
npm start -- ~/projects/my-project "user authentication login JWT validation"  # Good
npm start -- ~/projects/my-project "auth"  # Too broad, many results

# Limit results programmatically
const results = await indexer.search('query', 5);  // Only top 5
```

### Tip 5: Database Location

```bash
# From the RAGcodeindexing directory

# Put database on fast storage
DB_PATH=/tmp/codeindexer.db npm start -- ~/projects/my-project

# Or on SSD
DB_PATH=~/codeindexer.db npm start -- ~/projects/my-project
```

---

## Common Patterns

### Pattern 1: Daily Workflow

```bash
# From the RAGcodeindexing directory

# Morning: Update index
npm start -- ~/projects/my-project

# During work: Search as needed
npm start -- ~/projects/my-project "function I'm looking for"

# End of day: Index is already up to date
npm start -- ~/projects/my-project  # Fast incremental update
```

### Pattern 2: Project Exploration

```bash
# From the RAGcodeindexing directory

# Start broad
npm start -- ~/projects/my-project "main entry point"

# Then narrow down
npm start -- ~/projects/my-project "API routes"
npm start -- ~/projects/my-project "database models"
npm start -- ~/projects/my-project "authentication flow"
```

### Pattern 3: Bug Investigation

```bash
# From the RAGcodeindexing directory

# 1. Find the error
npm start -- ~/projects/my-project "error message or type"

# 2. Find related code
npm start -- ~/projects/my-project "function that calls the error"

# 3. Find similar issues
npm start -- ~/projects/my-project "similar error handling"
```

---

## Troubleshooting Examples

### Issue: No Results Found

```bash
# From the RAGcodeindexing directory

# Try broader queries
npm start -- ~/projects/my-project "auth"  # Instead of "JWT token validation middleware"

# Check if files are indexed
npm start -- ~/projects/my-project "anything"
# If no results, try reindexing
rm codeindexer.db
npm start -- ~/projects/my-project
```

### Issue: Wrong Results

```bash
# From the RAGcodeindexing directory

# Be more specific
npm start -- ~/projects/my-project "user authentication login"  # Better than just "user"

# Use technical terms
npm start -- ~/projects/my-project "Promise async await"  # Instead of "asynchronous code"
```

---

## Pro Tips

1. **Index Multiple Projects**: Create separate databases for different projects:
   ```bash
   # From the RAGcodeindexing directory
   DB_PATH=~/project1.db npm start -- ~/projects/project1
   DB_PATH=~/project2.db npm start -- ~/projects/project2
   ```

2. **Combine with grep**: Use semantic search to find areas, then grep for details:
   ```bash
   # From the RAGcodeindexing directory
   # Find the area
   npm start -- ~/projects/my-project "database connection"
   # Then grep for specifics in the project directory
   cd ~/projects/my-project
   grep -r "pool_size" src/database/
   ```

3. **Save Common Searches**: Create aliases in your shell config:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias search-auth='npm start -- ~/projects/my-express-api "authentication login"'
   alias search-db='npm start -- ~/projects/my-express-api "database query"'
   
   # Then run from anywhere (must be in RAGcodeindexing directory)
   cd /path/to/RAGcodeindexing
   search-auth
   ```

4. **Use with Git**: Find code in specific branches:
   ```bash
   # In your project directory
   cd ~/projects/my-project
   git checkout feature-branch
   
   # Back to codeindexer directory
   cd /path/to/RAGcodeindexing
   npm start -- ~/projects/my-project "new feature code"
   ```

---

## Quick Reference

```bash
# Navigate to codeindexer
cd /path/to/RAGcodeindexing

# Index current directory (codeindexer itself)
npm start

# Index a specific project
npm start -- /path/to/project

# Index and search
npm start -- /path/to/project "search query"

# Run MCP server
npm run mcp -- /path/to/project
```

---

## Next Steps

- See [LEARN.md](LEARN.md) for deep dives into how it works
- Check [README.md](README.md) for full documentation
- Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute

---

<div align="center">

**[⬆ Back to Top](#code-indexer-examples)**

</div>
