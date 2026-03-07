/**
 * =============================================================================
 * EMBEDDER MODULE - Convert text to vector embeddings
 * =============================================================================
 * 
 * This module handles the conversion of text (code chunks, search queries)
 * into numerical vectors (embeddings) that computers can compare mathematically.
 * 
 * WHY DO WE NEED EMBEDDINGS?
 * --------------------------
 * Computers can't understand raw text directly. Embeddings are a way to
 * represent text as a list of numbers (a vector) where:
 * - Similar text → similar vectors (close together in 384-dimensional space)
 * - Different text → different vectors (far apart)
 * 
 * Think of it like GPS coordinates for meaning:
 * - "cat" and "dog" might be at coordinates (10, 5, 3, ...) - close together
 * - "cat" and "spaceship" would be far apart
 * 
 * WHAT IS all-MiniLM-L6-v2?
 * -------------------------
 * - A lightweight machine learning model from Hugging Face
 * - "Mini" = small/fast, "L6" = 6 layers
 * - Converts text into 384 numbers (dimensions)
 * - Runs locally via Transformers.js (no API calls!)
 * - "quantized" = compressed to run faster with less memory
 * 
 * =============================================================================
 */

import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

/**
 * =============================================================================
 * EMBEDDER CLASS - Handles text-to-vector conversion
 * =============================================================================
 */

export class Embedder {
  // The pipeline is our ML model - we'll initialize it lazily
  private pipeline: FeatureExtractionPipeline | null = null;
  
  // Which model to use (this is a popular, fast, good-quality model)
  private modelName: string = 'Xenova/all-MiniLM-L6-v2';
  
  // Track if we've already loaded the model
  private isInitialized: boolean = false;

  /**
   * =============================================================================
   * INITIALIZE - Load the ML model into memory
   * =============================================================================
   * 
   * This must be called ONCE before generating any embeddings.
   * It downloads (once) and loads the model into memory.
   * 
   * WHAT HAPPENS:
   * 1. Checks if already initialized (skip if so)
   * 2. Loads the Transformers.js pipeline for "feature-extraction"
   * 3. "quantized: true" means we use a compressed model
   *    - Smaller file size (~70MB instead of ~300MB)
   *    - Faster inference
   *    - Slightly less accurate but still very good
   * 
   * WHY "feature-extraction"?
   * - This is the task type that extracts numerical features (embeddings)
   * - Other tasks: text-generation, sentiment-analysis, etc.
   * 
   * FIRST RUN:
   * - Downloads model from Hugging Face (cached after first time)
   * - Takes a few seconds
   * - Subsequent runs use cached model
   */
  async initialize(): Promise<void> {
    // Skip if already loaded
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[Embedder] Loading model:', this.modelName);
      
      // Create the feature-extraction pipeline
      // This loads the model and tokenizer
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        // Quantization makes the model smaller and faster
        // Trade-off: slightly less precise but much faster
        quantized: true,
      });
      
      this.isInitialized = true;
      console.log('[Embedder] Model loaded successfully');
    } catch (error) {
      console.error('[Embedder] Failed to load model:', error);
      throw new Error(`Embedder initialization failed: ${error}`);
    }
  }

  /**
   * =============================================================================
   * EMBED - Convert a single piece of text to a vector
   * =============================================================================
   * 
   * THIS IS THE CORE FUNCTION FOR RAG!
   * 
   * Converts any text (code chunk or search query) into a 384-dimensional
   * vector that captures the semantic meaning.
   * 
   * @param text - The text to convert (can be code or natural language)
   * @returns Array of 384 floating-point numbers representing the embedding
   * 
   * WHAT HAPPENS INSIDE:
   * 1. Tokenize: Split text into tokens (words/subwords)
   *    - "hello world" → [0, 1527, 0, 1497, ...]
   * 2. Forward pass: Feed tokens through the neural network
   * 3. Pooling: Combine token embeddings into one vector
   *    - "mean pooling" = average of all token embeddings
   *    - This gives us a single vector for the whole text
   * 4. Normalize: Scale to unit length
   *    - Makes cosine similarity work correctly
   * 
   * EXAMPLE:
   * Input: "function add(a, b) { return a + b; }"
   * Output: [0.12, -0.34, 0.56, ..., 0.01] (384 numbers)
   * 
   * These 384 numbers now represent the "meaning" of the function!
   */
  async embed(text: string): Promise<number[]> {
    // Can't do anything without the model loaded
    if (!this.pipeline) {
      throw new Error('Embedder not initialized. Call initialize() first.');
    }

    try {
      // Run the model on the input text
      const output = await this.pipeline(text, {
        // Mean pooling: average all token embeddings into one
        pooling: 'mean',
        
        // Normalize: scale vector to length 1
        // This makes cosine similarity = dot product (simpler math!)
        normalize: true,
      });

      // Convert the output to a regular JavaScript array
      const embedding = Array.from(output.data) as number[];
      return embedding;
    } catch (error) {
      console.error('[Embedder] Error generating embedding:', error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * =============================================================================
   * EMBED BATCH - Convert multiple texts at once
   * =============================================================================
   * 
   * Convenience function for processing multiple texts.
   * Note: Currently processes sequentially (could be parallelized).
   * 
   * @param texts - Array of text strings to embed
   * @returns Array of embeddings (each a 384-dimensional array)
   * 
   * USE CASE:
   * - When indexing many code chunks at once
   * - More efficient than calling embed() one by one
   * 
   * NOTE:
   * For even better performance, consider using:
   * - Batched inference (pass all texts at once)
   * - Or Web Workers for parallel processing
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process each text
    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * =============================================================================
   * GET EMBEDDING DIMENSION - Return the vector size
   * =============================================================================
   * 
   * all-MiniLM-L6-v2 always outputs 384-dimensional vectors.
   * This is useful for validation and database schema.
   * 
   * @returns Always returns 384
   */
  getEmbeddingDimension(): number {
    return 384;
  }

  /**
   * =============================================================================
   * IS READY - Check if model is loaded
   * =============================================================================
   * 
   * @returns True if initialize() has been called successfully
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * =============================================================================
   * DISPOSE - Clean up resources
   * =============================================================================
   */
  async dispose(): Promise<void> {
    // Model will be garbage collected
    this.pipeline = null;
    this.isInitialized = false;
  }
}

// Singleton instance - one embedder for the whole app
export const embedder = new Embedder();
