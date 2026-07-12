import { BusinessData } from "./business";
import { buildSystemPrompt } from "./prompt";

/**
 * Builds the full Vapi assistant definition from live business data.
 * Used in two places so phone calls and browser test calls are identical:
 *  - the webhook's `assistant-request` response (inbound phone calls)
 *  - /api/test/assistant (browser web-call test page at /test)
 */
export function buildAssistantConfig(
  data: BusinessData,
  serverUrl: string,
  secret?: string
) {
  const systemPrompt = buildSystemPrompt(data, new Date());
  const server = { url: serverUrl, secret: secret || undefined };

  return {
    name: `${data.name} Receptionist`,
    firstMessage: data.greeting,
    model: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }],
      tools: [
        {
          type: "function",
          async: false,
          function: {
            name: "check_availability",
            description:
              "Check how many of a limited resource (seats, cabins, slots) are currently available. Always call this instead of guessing availability.",
            parameters: {
              type: "object",
              properties: {
                resourceId: {
                  type: "string",
                  description: `Which resource to check. One of: ${data.resources
                    .map((r) => `"${r.id}" (${r.label})`)
                    .join(", ")}. Omit to get all.`,
                },
              },
              required: [],
            },
          },
          server,
          messages: [
            {
              type: "request-start",
              content: "One moment, let me check that for you.",
            },
          ],
        },
        { type: "endCall" },
      ],
    },
    voice: {
      provider: "vapi",
      voiceId: "Neha",
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "multi",
    },
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 600,
    endCallMessage: `Thank you for calling ${data.name}. Goodbye!`,
    server,
    serverMessages: ["tool-calls", "end-of-call-report"],
  };
}
