import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, agentType, context } = await req.json();

  const systemPrompt = `You are an AI coding assistant inside INSPIRE LAB, a collaborative developer workspace.
Current project context: ${context || "No context provided."}
Be concise, helpful, and provide working code when asked.`;

  if (agentType === "CLAUDE") {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({
      content: response.content[0].type === "text" ? response.content[0].text : "",
    });
  }

  return NextResponse.json({ error: "Agent type not supported" }, { status: 400 });
}
