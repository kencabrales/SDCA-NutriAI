import dbConnect from '@/lib/mongodb';
import AIUsageEvent from '@/lib/AIUsageEvent';

export async function recordAIUsage({
  userId = null,
  feature = 'unknown',
  status = 'success',
  inputText = '',
  outputText = '',
  usageMetadata = null,
  errorCode = null,
} = {}) {
  try {
    await dbConnect();
    const estimatedInputTokens = Math.ceil(String(inputText).length / 4);
    const estimatedOutputTokens = Math.ceil(String(outputText).length / 4);
    const hasActualUsage = usageMetadata && (
      Number.isFinite(usageMetadata.promptTokenCount) ||
      Number.isFinite(usageMetadata.candidatesTokenCount) ||
      Number.isFinite(usageMetadata.totalTokenCount)
    );
    const actualPromptTokens = hasActualUsage && Number.isFinite(usageMetadata.promptTokenCount)
      ? usageMetadata.promptTokenCount
      : null;
    const actualOutputTokens = hasActualUsage && Number.isFinite(usageMetadata.candidatesTokenCount)
      ? usageMetadata.candidatesTokenCount
      : null;
    const actualTotalTokens = hasActualUsage && Number.isFinite(usageMetadata.totalTokenCount)
      ? usageMetadata.totalTokenCount
      : (actualPromptTokens !== null && actualOutputTokens !== null
        ? actualPromptTokens + actualOutputTokens
        : null);

    await AIUsageEvent.create({
      userId: userId || null,
      feature,
      status,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
      actualPromptTokens,
      actualOutputTokens,
      actualTotalTokens,
      errorCode: errorCode ? String(errorCode).slice(0, 80) : null,
    });
  } catch (error) {
    // Monitoring must never make food logging or AI features fail.
    console.error('AI usage event could not be saved:', error?.message || error);
  }
}
