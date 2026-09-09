// The AI API key powers image/PDF-to-schedule conversion. It is stored in its own localStorage
// key — deliberately NOT part of AppData — so it never gets swept into an exported backup file
// (which schools may share or store insecurely) and never gets sent anywhere except Google's Gemini API.
const AI_KEY_STORAGE = 'jadwal-gemini-key-v1';

export function getAiApiKey(): string {
  try {
    return localStorage.getItem(AI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setAiApiKey(key: string) {
  try {
    if (key.trim()) localStorage.setItem(AI_KEY_STORAGE, key.trim());
    else localStorage.removeItem(AI_KEY_STORAGE);
  } catch {
    // Storage unavailable — the key just won't persist across reloads this session.
  }
}
