export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "Server returned an empty response."
        : `Request failed (${response.status}). The server may be misconfigured — try again shortly.`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned invalid JSON (HTTP ${response.status}).`);
  }
}
