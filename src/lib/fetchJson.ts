/** Avoid `response.json()` throwing when the server returns HTML (502 pages, error boundaries). */
export async function readFetchJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    throw new Error(
      `Unexpected server response (${response.status}). Please try again.`,
    );
  }
  if (!text.trim()) {
    throw new Error(
      `Empty response from server (${response.status}). Please try again.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Could not read JSON from server."
        : `Unexpected server response (${response.status}). Please try again.`,
    );
  }
}
