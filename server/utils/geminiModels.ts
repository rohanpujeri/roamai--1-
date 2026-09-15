/**
 * Recommended Gemini model configuration following Google AI Studio specifications
 */

export const PREFERRED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-2.5-pro'
];

export function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  );
}

export function formatGenAiError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed.error?.message) {
        return `[Code ${parsed.error.code || 500}]: ${parsed.error.message}`;
      }
    } catch {
      // not JSON
    }
    return err.message;
  }
  return String(err);
}

