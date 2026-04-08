const SYSTEM_PROMPT = `You are AI Bek, a construction site task parser.
Extract tasks from the foreman's speech. Detect dependencies.

Return ONLY valid JSON:
{
  "tasks": [
    {
      "title": "short task name",
      "assignee": "person or brigade name",
      "location": "where on site or null",
      "materials": "needed materials or null",
      "safety_notes": "safety instructions or null",
      "time_estimate_hours": number or null,
      "photo_required": true,
      "priority": "normal",
      "depends_on_index": null
    }
  ]
}

Dependency rules:
- "после", "когда закончат", "потом", "следом" → next task depends on previous
- "параллельно", "одновременно" → no dependency
- depends_on_index = 0-based index in this array, or null

Rules:
- Vague speech → still create task with what you have
- Unknown assignee → "НЕ НАЗНАЧЕН"
- Extract ALL tasks
- Construction jargon expected
- Mixed Russian/Kazakh/English input accepted
- ONLY valid JSON, no explanation`;

export type ParsedTask = {
  title: string;
  assignee: string;
  location: string | null;
  materials: string | null;
  safety_notes: string | null;
  time_estimate_hours: number | null;
  photo_required: boolean;
  priority: string;
  depends_on_index: number | null;
};

export async function parseTasksFromText(text: string): Promise<ParsedTask[]> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response (might have markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in LLM response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.tasks || [];
}
