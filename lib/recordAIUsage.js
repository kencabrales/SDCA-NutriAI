import dbConnect from '@/lib/mongodb';
import AIUsageEvent from '@/lib/AIUsageEvent';

export async function recordAIUsage({
  userId = null,
  feature = 'unknown',
  model = String(process.env.AI_PROVIDER || 'gemini').toLowerCase() === 'groq'
    ? (process.env.GROQ_MODEL_ID || 'openai/gpt-oss-20b')
    : (process.env.GEMINI_MODEL_ID || 'gemini-3.6-flash'),
  projectLabel = process.env.GEMINI_USAGE_PROJECT_LABEL || process.env.VERCEL_ENV || 'local',
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
      projectLabel: String(projectLabel).slice(0, 80),
      model: String(model).slice(0, 120),
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
