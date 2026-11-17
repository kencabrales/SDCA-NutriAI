# NutriAI AI Provider Configuration

NutriAI can use Groq as its primary text-generation provider and keep Gemini as a fallback.

## Local development

Add these entries to your local `.env.local`. Do not commit this file, paste API keys into chat, or expose them in any `NEXT_PUBLIC_*` variable.

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL_ID=openai/gpt-oss-20b

# Gemini remains available as the fallback provider.
GEMINI_API_KEY=your_existing_gemini_api_key
GEMINI_MODEL_ID=gemini-3.5-flash-lite
GEMINI_DAILY_INSIGHTS_FALLBACK_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODEL_ID=gemini-3.1-flash-lite
```

Restart the Next.js development server after changing environment variables.

## Provider order

When `AI_PROVIDER=groq`, NutriAI attempts:

1. Groq using `GROQ_MODEL_ID` (defaults to `openai/gpt-oss-20b`).
2. Gemini using `GEMINI_MODEL_ID`.
3. The feature-specific Gemini fallback, when configured.

Only temporary provider failures, quota/rate-limit responses, or invalid JSON trigger the next provider. Authentication and invalid-request errors are surfaced rather than silently hidden.

When `AI_PROVIDER=gemini` or the variable is omitted, the existing Gemini-primary behavior remains active.

## Deployment

Set the same variables in the deployment platform's server-side environment settings for each environment (Preview and Production as applicable). Redeploy after changing them. Never use `NEXT_PUBLIC_GROQ_API_KEY`.

## Notes

- Groq and Gemini have separate usage limits. Check the limits shown in each provider's console; they can vary by account and model.
- The model response is parsed as JSON and recorded in NutriAI's existing AI usage events.
- Groq is called through its OpenAI-compatible Chat Completions endpoint. The GPT-OSS model is configured for JSON Object Mode with low reasoning effort and without returning reasoning text.
- A provider fallback improves resilience but does not guarantee availability. If all configured providers are unavailable, NutriAI should keep saved analysis visible and report the failure.
