/**
 * Anthropic Provider Implementation
 * Based on ADR-006: LLM Provider Abstraction Layer
 */

import Anthropic from '@anthropic-ai/sdk';

import type {
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../types';

/**
 * Anthropic LLM Provider
 *
 * Supports Claude models:
 * - claude-3-5-sonnet-20241022 (primary - fast, good reasoning)
 * - claude-3-opus-20240229 (fallback - best quality)
 * - claude-3-haiku-20240307 (fallback - cost-optimized)
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ];

  private _client: Anthropic;

  constructor(apiKey: string) {
    this._client = new Anthropic({ apiKey });
  }

  /**
   * Generate text completion
   * TODO: Implement message mapping and error handling
   */
  async complete(_request: CompletionRequest): Promise<CompletionResponse> {
    // TODO: Implementar conforme ADR-006
    // 1. Map messages to Anthropic format
    // 2. Call this.client.messages.create()
    // 3. Map response back to CompletionResponse
    // 4. Track latency and usage
    throw new Error('Not implemented yet - see ADR-006 for implementation guide');
  }

  /**
   * Generate streaming text completion
   * TODO: Implement streaming with AsyncGenerator
   */
  async *stream(_request: CompletionRequest): AsyncGenerator<StreamChunk> {
    // TODO: Implementar streaming conforme ADR-006
    // 1. Call this.client.messages.stream()
    // 2. Yield delta chunks as they arrive
    // 3. Yield final usage stats when done

    // Temporary stub to satisfy interface - yields error chunk
    yield {
      type: 'delta' as const,
      content: 'Not implemented yet - see ADR-006 for implementation guide',
    };
    throw new Error('Not implemented yet - see ADR-006 for implementation guide');
  }

  /**
   * Generate embeddings
   * Note: Anthropic doesn't provide embedding models yet
   * This should either throw or delegate to OpenAI provider
   */
  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error(
      'Anthropic does not provide embedding models. Use OpenAI provider for embeddings.',
    );
  }
}
