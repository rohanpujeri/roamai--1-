/**
 * Recommended Gemini model configuration following Google AI Studio specifications
 */

export const PREFERRED_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash'
];

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
