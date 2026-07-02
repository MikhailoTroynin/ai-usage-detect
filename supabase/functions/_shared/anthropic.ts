const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-5";

export class AnthropicConfigError extends Error {}

export async function callClaude(options: {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new AnthropicConfigError("ANTHROPIC_API_KEY is not configured on the server");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Unexpected Anthropic API response shape");
  }
  return text;
}
