/**
 * LLM Abstraction Layer - Type Definitions
 * Based on ADR-006: LLM Provider Abstraction Layer
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * Tool definition for function calling
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Stop reason for completion
 */
export type StopReason = 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence';

/**
 * Request for text completion
 */
export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: Tool[];
  metadata?: {
    tenantId: string;
    requestId: string;
    feature: string;
  };
}

/**
 * Response from text completion
 */
export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: TokenUsage;
  stopReason: StopReason;
  latencyMs: number;
}

/**
 * Stream chunk types
 */
export type StreamChunkType = 'delta' | 'done';

/**
 * Chunk from streaming completion
 */
export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  usage?: TokenUsage;
}

/**
 * Request for embedding generation
 */
export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  metadata?: {
    tenantId: string;
    requestId: string;
  };
}

/**
 * Response from embedding generation
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: TokenUsage;
}

/**
 * LLM Provider interface
 * All LLM providers must implement this interface
 */
export interface LLMProvider {
  readonly name: string;
  readonly supportedModels: string[];

  /**
   * Generate text completion
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate streaming text completion
   */
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;

  /**
   * Generate embeddings
   */
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  anthropicKey?: string;
  openaiKey?: string;
  fallbackChain: string[];
  maxRetries?: number;
  retryDelayMs?: number;
}
