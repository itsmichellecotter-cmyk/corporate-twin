import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const raw = await file.text();
    // Limit to ~50k chars to stay well within token limits
    const text = raw.slice(0, 50000);

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:
        "You are an expert contract lawyer. Return ONLY valid JSON — no markdown, no explanation, no code fences.",
      messages: [
        {
          role: "user",
          content: `Analyze this contract. Return ONLY a JSON object matching this exact shape:
{
  "riskScore": <integer 0-100, higher = more unfavorable to the weaker party>,
  "summary": "<2-3 sentences: what kind of contract, who are the parties, headline finding>",
  "contractType": "<employment|tenancy|freelance|service|other>",
  "parties": { "party1": "<name or role>", "party2": "<name or role>" },
  "flaggedClauses": [
    {
      "title": "<clause name · §section if identifiable>",
      "body": "<1-2 sentence analysis: what the clause says, how it deviates from market standard, what to negotiate>",
      "severity": "<high|med|low>",
      "peerMatch": "<estimated % of comparable peer contracts that include this clause in this form>"
    }
  ],
  "clauseBreakdown": { "<category>": <integer percentage> },
  "keyTerms": { "<term label>": "<extracted value>" },
  "favorableCount": <integer>,
  "unfavorableCount": <integer>,
  "totalClauses": <integer estimate of distinct clauses in document>
}

Rules:
- flaggedClauses: 4–8 clauses that deviate materially from market standard, ordered high→med→low severity
- clauseBreakdown: 5–7 named categories, percentages must sum to 100
- keyTerms: extract 4–6 key terms (e.g. notice period, jurisdiction, salary, start date, governing law)
- riskScore: reflect number and severity of unfavorable clauses (60+ = significant concerns)
- peerMatch: format as "X% of peers" (e.g. "8% of peers")
- If the document is not a contract or is unreadable, return riskScore 0, empty flaggedClauses, summary explaining the issue

CONTRACT TEXT:
${text}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Strip any accidental markdown fences
    const cleaned = content.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const analysis = JSON.parse(cleaned);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
