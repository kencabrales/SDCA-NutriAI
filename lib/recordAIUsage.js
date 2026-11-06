import dbConnect from '@/lib/mongodb';
import AIUsageEvent from '@/lib/AIUsageEvent';

export async function recordAIUsage({
  userId = null,
  feature = 'unknown',
  status = 'success',
  inputText = '',
  outputText = '',
  errorCode = null,
} = {}) {
  try {
    await dbConnect();
    const estimatedInputTokens = Math.ceil(String(inputText).length / 4);
    const estimatedOutputTokens = Math.ceil(String(outputText).length / 4);
    await AIUsageEvent.create({
      userId: userId || null,
      feature,
      status,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
      errorCode: errorCode ? String(errorCode).slice(0, 80) : null,
    });
  } catch (error) {
    // Monitoring must never make food logging or AI features fail.
    console.error('AI usage event could not be saved:', error?.message || error);
  }
}
