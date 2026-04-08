import { NextRequest, NextResponse } from "next/server";
import { parseTasksFromText } from "@/lib/groq/parser";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
    }

    const tasks = await parseTasksFromText(text);
    return NextResponse.json({ tasks });
  } catch (e: any) {
    console.error("Parse API error:", e);
    return NextResponse.json({ error: e.message || "Ошибка разбора" }, { status: 500 });
  }
}
