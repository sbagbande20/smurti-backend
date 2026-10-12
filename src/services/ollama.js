import { config } from '../config.js';

export async function checkOllama(fetchImpl = fetch) {
  const url = `${config.ai.ollamaBaseUrl}/api/tags`;

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      signal: AbortSignal.timeout(1500)
    });

    if (!response.ok) {
      return {
        available: false,
        service: 'ollama',
        localOnly: true,
        model: config.ai.ollamaModel,
        reason: 'ollama_unavailable'
      };
    }

    const payload = await response.json();
    const models = Array.isArray(payload.models) ? payload.models : [];
    const modelAvailable = models.some((model) => model.name === config.ai.ollamaModel);

    return {
      available: modelAvailable,
      service: 'ollama',
      localOnly: true,
      model: config.ai.ollamaModel,
      reason: modelAvailable ? null : 'model_missing'
    };
  } catch (_error) {
    return {
      available: false,
      service: 'ollama',
      localOnly: true,
      model: config.ai.ollamaModel,
      reason: 'ollama_unavailable'
    };
  }
}
