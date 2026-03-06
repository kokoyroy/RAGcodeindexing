/**
 * =============================================================================
 * MAIN ENTRY POINT - CLI interface for the Code Indexer
 * =============================================================================
 * 
 * This is the SIMPLEST way to use the code indexer.
 * Run from command line and it will:
 * 1. Index a directory of code
 * 2. Run a test search
 * 3. Display results
 * 
 * USAGE:
 * -----
 * npm start                       # Index current directory
 * npm start -- /path/to/project   # Index specific directory
 * npm start -- . "search query"   # Index and search
 * 
 * =============================================================================
 */

import { indexer } from './indexer.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function c(str: string, color: keyof typeof colors): string {
  return `${colors[color]}${str}${colors.reset}`;
}

async function main() {
  const targetDir = process.argv[2] || process.cwd();
  const testQuery = process.argv[3] || 'function declaration';

  // Pretty header with colors
  console.log(c('═'.repeat(60), 'cyan'));
  console.log(c('  Code Indexer', 'bold') + c(' - RAG-powered Codebase Search', 'cyan'));
  console.log(c('═'.repeat(60), 'cyan'));

  try {
    // ==================== STEP 1: INITIALIZE ====================
    console.log(c('\n[Main]', 'yellow') + ' Initializing indexer...');
    await indexer.initialize();

    // ==================== STEP 2: INDEX ====================
    console.log(c('\n[Main]', 'yellow') + ' Running indexer...');
    
    const stats = await indexer.index({
      targetDir: targetDir,
      forceReindex: false,
    });

    // Display indexing results with colors
    console.log(c('\n[Main]', 'yellow') + ' Indexing Results:');
    console.log(`  ${c('Files scanned:', 'blue')} ${c(String(stats.filesScanned), 'green')}`);
    console.log(`  ${c('Files changed:', 'blue')} ${c(String(stats.filesChanged), 'green')}`);
    console.log(`  ${c('Chunks extracted:', 'blue')} ${c(String(stats.chunksExtracted), 'green')}`);
    console.log(`  ${c('Chunks indexed:', 'blue')} ${c(String(stats.chunksIndexed), 'green')}`);
    console.log(`  ${c('Errors:', 'blue')} ${stats.errors === 0 ? c('0', 'green') : c(String(stats.errors), 'red')}`);
    console.log(`  ${c('Duration:', 'blue')} ${c(String(stats.duration) + 'ms', 'green')}`);

    // ==================== STEP 3: SEARCH ====================
    if (stats.chunksIndexed > 0) {
      console.log(c('\n[Main]', 'yellow') + ' Running test search...');
      console.log(`  ${c('Query:', 'blue')} "${c(testQuery, 'cyan')}"`);
      
      const results = await indexer.search(testQuery, 3);

      // Display search results with colors
      console.log(c('\n[Main]', 'yellow') + ' Search Results:');
      
      if (results.length === 0) {
        console.log(c('  No results found', 'dim'));
      } else {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          
          // File path in magenta
          console.log(`\n  ${c(`[${i + 1}]`, 'green')} ${c(result.file_path, 'magenta')}:${c(`${result.start_line}-${result.end_line}`, 'yellow')}`);
          
          // Similarity with color based on score
          const similarity = (result.similarity ?? 0) * 100;
          const simColor = similarity > 70 ? 'green' : similarity > 40 ? 'yellow' : 'dim';
          console.log(`      ${c('Similarity:', 'blue')} ${c(similarity.toFixed(2) + '%', simColor)}`);
          
          // Preview in dim
          const preview = result.chunk_text.substring(0, 150).replace(/\n/g, ' ');
          console.log(`      ${c('Preview:', 'blue')} ${c(preview + '...', 'dim')}`);
        }
      }
    } else {
      console.log(c('\n[Main] No chunks were indexed. Skipping search.', 'dim'));
    }

    // ==================== STEP 4: CLEANUP ====================
    await indexer.shutdown();
    console.log(c('\n[Main]', 'yellow') + ' ' + c('Done!', 'green') + ' ✓\n');
    
  } catch (error) {
    console.error(c('[Main] Error:', 'red'), error);
    await indexer.shutdown();
    process.exit(1);
  }
}

main();
// test change
