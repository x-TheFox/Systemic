import { NextResponse } from "next/server";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 🔒 basic validation
        if (!body?.githubHandle) {
            return NextResponse.json(
                { error: "GitHub handle required" },
                { status: 400 }
            );
        }

        const prompt = `
You are a strict career analyst.

Rules:
- Minimum 3 strengths
- Minimum 3 weaknesses
- Career path must be multi-step
- Companies must not be empty
- Return ONLY valid JSON (no explanation, no markdown)

Format:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "careerPath": "...",
  "companies": ["...", "...", "..."]
}

Profile:
GitHub: ${body.githubHandle}
Stats: ${JSON.stringify(body.stats)}
Projects: ${JSON.stringify(body.projects)}
Streaks: ${JSON.stringify(body.streaks)}
`;

        const result = await generateText({
            model: groq("llama-3.1-8b-instant"), // ✅ working model
            prompt,
        });

        const text = result.text;

        console.log("RAW AI:", text);

        let parsed;

        try {
            parsed = JSON.parse(text);
        } catch {
            // 🧠 fallback if AI returns bad JSON
            parsed = {
                strengths: ["Shows potential in development", "Learning phase developer", "Capable of growth"],
                weaknesses: ["Needs more real-world projects", "Low visible activity", "Needs consistency"],
                careerPath: text,
                companies: ["Startups", "Zoho", "Freshworks"]
            };
        }

        return NextResponse.json(parsed);

    } catch (err: any) {
        console.error("AI ERROR FULL:", err);
        return NextResponse.json(
            { error: err.message || "AI failed" },
            { status: 500 }
        );
    }
}