function ruleBasedSummary(error: unknown, attempt: number, maxAttempts: number) {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : String(error);
  const rootCause = message.includes("timeout")
    ? "Timeout or request latency issue"
    : message.includes("network")
    ? "Network or external service failure"
    : message.includes("syntax")
    ? "Payload or handler formatting issue"
    : "Unexpected failure during job execution";
  const retryInfo =
    attempt >= maxAttempts
      ? "No further retries will be attempted."
      : `Retrying attempt ${attempt + 1} of ${maxAttempts} based on queue retry policy.`;
  return `${rootCause}: ${message}. ${retryInfo}`;
}

export async function generateFailureSummary(error: unknown, attempt: number, maxAttempts: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return ruleBasedSummary(error, attempt, maxAttempts);

  try {
    const prompt = `Summarize the following error for operators and include retry guidance. Error: ${String(error)} Attempt: ${attempt} of ${maxAttempts}`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return String(text).trim();
    return ruleBasedSummary(error, attempt, maxAttempts);
  } catch {
    return ruleBasedSummary(error, attempt, maxAttempts);
  }
}

export default generateFailureSummary;
