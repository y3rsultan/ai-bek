import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/groq/whisper";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json({ error: "Нет аудио" }, { status: 400 });
    }

    const arrayBuf = await file.arrayBuffer();
    const text = await transcribeAudio(arrayBuf, file.type);

    if (!text.trim()) {
      return NextResponse.json({ error: "Речь не обнаружена" }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (e: any) {
    console.error("Voice API error:", e);
    return NextResponse.json({ error: e.message || "Ошибка распознавания" }, { status: 500 });
  }
}
