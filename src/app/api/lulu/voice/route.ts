import { NextRequest, NextResponse } from "next/server";
import {
  answerAsLulu,
  synthesizeLuluVoice,
  transcribeAudio,
  validateLuluDeviceAuth,
  type LuluVoiceRequest,
} from "@/lib/lulu-device";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 1_500_000;
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "application/octet-stream",
]);

function asAnswerFormat(value: FormDataEntryValue | string | null): "wav" | "mp3" | "none" {
  if (value === "mp3" || value === "none") return value;
  return "wav";
}

function safeString(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function parseRequest(request: NextRequest): Promise<LuluVoiceRequest> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Partial<LuluVoiceRequest>;
    if (!body.question?.trim()) throw new Error("question is required");
    return {
      question: body.question.trim(),
      deviceId: body.deviceId || "stick-s3-unknown",
      room: body.room,
      batteryMv: body.batteryMv,
      answerFormat: body.answerFormat || "wav",
    };
  }

  const formData = await request.formData();
  const deviceId = safeString(formData.get("device_id"), "stick-s3-unknown");
  const room = safeString(formData.get("room"), undefined as unknown as string);
  const batteryRaw = safeString(formData.get("battery_mv"));
  const answerFormat = asAnswerFormat(formData.get("answer_format"));
  const textQuestion = safeString(formData.get("question"));

  if (textQuestion) {
    return {
      question: textQuestion,
      deviceId,
      room: room || undefined,
      batteryMv: batteryRaw ? Number(batteryRaw) : undefined,
      answerFormat,
    };
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("audio file or question is required");
  if (audio.size > MAX_AUDIO_BYTES) throw new Error("audio file is too large");
  if (audio.type && !SUPPORTED_AUDIO_TYPES.has(audio.type)) {
    throw new Error(`unsupported audio type: ${audio.type}`);
  }

  const question = await transcribeAudio(audio);
  return {
    question,
    deviceId,
    room: room || undefined,
    batteryMv: batteryRaw ? Number(batteryRaw) : undefined,
    answerFormat,
  };
}

export async function POST(request: NextRequest) {
  if (!validateLuluDeviceAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await parseRequest(request);
    const baseAnswer = await answerAsLulu(parsed);

    let audioBase64: string | null = null;
    let audioMimeType: string | null = null;
    let audioError: string | null = null;
    const answerFormat = parsed.answerFormat || "wav";

    if (answerFormat !== "none") {
      try {
        const audio = await synthesizeLuluVoice(baseAnswer.full, answerFormat);
        audioBase64 = audio.buffer.toString("base64");
        audioMimeType = audio.mimeType;
      } catch (error) {
        // A TTS provider/billing outage should not make the device useless.
        // Return the text answer and let the Stick show it on-screen.
        audioError = error instanceof Error ? error.message : "Voice synthesis failed";
        console.error("Lulu TTS error", error);
      }
    }

    return NextResponse.json({
      ok: true,
      ...baseAnswer,
      audio_base64: audioBase64,
      audio_mime_type: audioMimeType,
      audio_format: audioBase64 ? answerFormat : "none",
      audio_error: audioError,
    });
  } catch (error) {
    console.error("Lulu voice endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lulu voice request failed" },
      { status: 400 }
    );
  }
}
