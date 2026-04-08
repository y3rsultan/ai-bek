export async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  const formData = new FormData();
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg";
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "whisper-large-v3");
  formData.append("language", "ru");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.text || "";
}
