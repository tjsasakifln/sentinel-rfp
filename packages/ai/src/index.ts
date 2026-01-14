/**
 * @sentinel-rfp/ai
 * LLM Abstraction Layer for Sentinel RFP
 *
 * Based on ADR-006: LLM Provider Abstraction Layer
 */

// Export types
export type {
  Message,
  MessageRole,
  Tool,
  TokenUsage,
  StopReason,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  StreamChunkType,
  EmbeddingRequest,
  EmbeddingResponse,
  LLMProvider,
  RouterConfig,
} from './types';

// Export providers
export type { LLMProvider as ILLMProvider } from './providers/base.provider';
export { AnthropicProvider } from './providers/anthropic.provider';

// Export router and cost tracker (placeholders for now)
export { LLMRouter } from './router';
export { CostTracker } from './cost-tracker';
