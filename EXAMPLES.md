# Code Indexer Examples

This guide provides detailed, real-world examples of using Code Indexer for various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Real-World Scenarios](#real-world-scenarios)
- [Advanced Searches](#advanced-searches)
- [Integration Examples](#integration-examples)
- [Performance Tips](#performance-tips)

---

## Basic Usage

### Example 1: Index a New Project

**Scenario**: You just joined a team and want to understand their Express.js API.

```bash
# Clone the project
git clone https://github.com/company/api-server.git
cd api-server

# Index it
npm start -- /path/to/api-server

# Output:
══════════════════════════════════════════════════════════════
  Code Indexer - RAG-powered Codebase Search
══════════════════════════════════════════════════════════════

[Indexer] Found 87 TypeScript files
[Indexer] Reading files: [██████████████████] 100% (87/87)
[Indexer] Extracted 342 code chunks
[Indexer] Generating embeddings: [████████████] 100% (342/342)
[Indexer] ✅ Complete in 4.2s

Results:
  Files scanned: 87
  Chunks indexed: 342
```

### Example 2: Find Authentication Logic

**Scenario**: You need to understand how the authentication system works.

```bash
npm start -- . "user authentication and login"

# Results:
[Main] Search Results:

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

  [3] src/routes/auth.ts:23-45 (85% match)
      router.post('/login', async (req, res) => {
        try {
          const { email, password } = req.body;
          const result = await authService.login(email, password);
          res.json(result);
        } catch (error) {
          res.status(401).json({ error: error.message });
        }
      });
```

### Example 3: Find Database Operations

**Scenario**: You need to find all database queries related to users.

```bash
npm start -- . "database queries for user operations"

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
# Search for file upload handling
npm start -- . "file upload error handling"

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
# Find all error responses
npm start -- . "API error response handling"

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
# Find SQL query construction
npm start -- . "SQL query string construction"

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
# Find middleware implementations
npm start -- . "Express middleware implementation"

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
# Find similar code patterns
npm start -- . "dependency injection pattern"

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
# Find React hooks
npm start -- . "React hooks state management"

# Find async/await error handling
npm start -- . "async await try catch error"

# Find type definitions
npm start -- . "TypeScript interface type definition"

# Find environment configuration
npm start -- . "environment variables configuration"
```

### Combine Multiple Concepts

```bash
# Find authentication + database
npm start -- . "authentication database user lookup"

# Find API + validation
npm start -- . "API request validation schema"

# Find logging + errors
npm start -- . "error logging and monitoring"
```

### Search by Intent

```bash
# Security-related code
npm start -- . "security validation sanitization"

# Performance optimization
npm start -- . "caching performance optimization"

# Testing code
npm start -- . "unit test mock stub"
```

---

## Integration Examples

### Example 1: Use in CI/CD

**Scenario**: Ensure new code follows existing patterns.

```bash
#!/bin/bash
# ci-check-patterns.sh

# Index the codebase
npm start -- . > /dev/null 2>&1

# Search for anti-patterns
RESULT=$(npm start -- . "SQL string concatenation" | grep -c "concatenation")

if [ $RESULT -gt 0 ]; then
  echo "❌ Found potential SQL injection vulnerabilities!"
  exit 1
fi

echo "✅ No SQL injection patterns found"
```

### Example 2: Generate Documentation

**Scenario**: Auto-generate API documentation.

```typescript
import { indexer } from './dist/indexer.js';

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
import { indexer } from './dist/indexer.js';
import * as fs from 'fs';

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

// Usage: node review-assistant.js src/newFeature.ts
reviewAssistant(process.argv[2]);
```

### Example 4: MCP Integration with Claude

**Scenario**: Use Claude to explore your codebase.

```bash
# Start MCP server
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
# First run: indexes everything (slow)
npm start -- /path/to/large/project
# Time: 15 seconds

# Second run: only changed files (fast)
npm start -- /path/to/large/project
# Time: 0.5 seconds (if no files changed)
```

### Tip 2: Force Re-index

```bash
# If you think the index is stale
rm codeindexer.db
npm start -- /path/to/project
```

### Tip 3: Adjust Concurrency

```typescript
// In your code
await indexer.index({
  targetDir: '/path/to/project',
  concurrency: 20  // Increase for faster indexing on powerful machines
});
```

### Tip 4: Search Optimization

```bash
# More specific queries are faster
npm start -- . "user authentication login JWT validation"  # Good
npm start -- . "auth"  # Too broad, many results

# Limit results
const results = await indexer.search('query', 5);  // Only top 5
```

### Tip 5: Database Location

```bash
# Put database on fast storage
DB_PATH=/tmp/codeindexer.db npm start -- /path/to/project

# Or on SSD
DB_PATH=~/codeindexer.db npm start -- /path/to/project
```

---

## Common Patterns

### Pattern 1: Daily Workflow

```bash
# Morning: Update index
npm start -- .

# During work: Search as needed
npm start -- . "function I'm looking for"

# End of day: Index is already up to date
npm start -- .  # Fast incremental update
```

### Pattern 2: Project Exploration

```bash
# Start broad
npm start -- . "main entry point"

# Then narrow down
npm start -- . "API routes"
npm start -- . "database models"
npm start -- . "authentication flow"
```

### Pattern 3: Bug Investigation

```bash
# 1. Find the error
npm start -- . "error message or type"

# 2. Find related code
npm start -- . "function that calls the error"

# 3. Find similar issues
npm start -- . "similar error handling"
```

---

## Troubleshooting Examples

### Issue: No Results Found

```bash
# Try broader queries
npm start -- . "auth"  # Instead of "JWT token validation middleware"

# Check if files are indexed
npm start -- . "anything"
# If no results, try reindexing
rm codeindexer.db
npm start -- .
```

### Issue: Wrong Results

```bash
# Be more specific
npm start -- . "user authentication login"  # Better than just "user"

# Use technical terms
npm start -- . "Promise async await"  # Instead of "asynchronous code"
```

---

## Pro Tips

1. **Index Multiple Projects**: Create separate databases for different projects:
   ```bash
   DB_PATH=~/project1.db npm start -- /path/to/project1
   DB_PATH=~/project2.db npm start -- /path/to/project2
   ```

2. **Combine with grep**: Use semantic search to find areas, then grep for details:
   ```bash
   # Find the area
   npm start -- . "database connection"
   # Then grep for specifics
   grep -r "pool_size" src/database/
   ```

3. **Save Common Searches**: Create aliases:
   ```bash
   alias search-auth='npm start -- . "authentication login"'
   alias search-db='npm start -- . "database query"'
   ```

4. **Use with Git**: Find code in specific branches:
   ```bash
   git checkout feature-branch
   npm start -- . "new feature code"
   ```

---

## Next Steps

- Read the [API Reference](API.md) for programmatic usage
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- See [LEARN.md](LEARN.md) for deep dives into how it works

---

<div align="center">

**[⬆ Back to Top](#code-indexer-examples)**

</div>
