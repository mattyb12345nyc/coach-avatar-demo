// Minimal Twilio SMS sender — no SDK, just the REST API. Sends Pulse Alert
// prompts to managers' phones. Degrades gracefully: if creds are missing it
// reports unconfigured instead of throwing, so the event never hard-fails on
// a missing env var.

const SID = process.env.TWILIO_ACCOUNT_SID || "";
const TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const FROM = process.env.TWILIO_FROM || "";

export function isTwilioConfigured(): boolean {
  return Boolean(SID && TOKEN && FROM);
}

export type SmsResult = {
  to: string;
  ok: boolean;
  error?: string;
};

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!isTwilioConfigured()) {
    return { to, ok: false, error: "twilio_not_configured" };
  }
  try {
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: FROM, Body: body }).toString(),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { to, ok: false, error: `twilio_${res.status}: ${text.slice(0, 120)}` };
    }
    return { to, ok: true };
  } catch (err) {
    return { to, ok: false, error: (err as Error).message };
  }
}

// Fan out to many numbers with light concurrency. Returns per-number results.
export async function sendSmsBatch(
  numbers: string[],
  body: string,
): Promise<SmsResult[]> {
  const unique = Array.from(new Set(numbers.filter(Boolean)));
  const results: SmsResult[] = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((n) => sendSms(n, body)))));
  }
  return results;
}
