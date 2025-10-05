import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const data = await req.json();
  console.log("data", data);
  const {
    messages,
    analytics,
  }: {
    messages: UIMessage[];
    analytics?: {
      people: number;
      density: number;
    };
  } = data;

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are Eyrie, a helpful AI assistant for a drone-based crowd crush monitoring system that tells you when there is high chance of a crowd crush. You help users understand and analyze drone video feed data.

${analytics ? `\n# of people: ${analytics.people}\nChance of a crowd crush: ${Number(analytics.density * 100).toFixed(1)}%\n` : "(DATA NOT AVAILABLE)"}

When answering questions:
${analytics ? "- Reference the current analytics data when relevant\n- Provide insights about trends in person detection and density\n- If asked about specific metrics, refer to the data above" : ""}
- Be concise and helpful
- Do not markdown or format the response
- Do not assume. If the data is not available, say so in a friendly way.
`,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
