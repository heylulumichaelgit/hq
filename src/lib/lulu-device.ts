import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEZONE = "Asia/Nicosia";
const MAX_ANSWER_CHARS = 700;
const execFileAsync = promisify(execFile);

export type LuluVoiceRequest = {
  question: string;
  deviceId: string;
  room?: string;
  batteryMv?: number;
  answerFormat?: "wav" | "mp3" | "none";
};

export type LuluVoiceAnswer = {
  transcript: string;
  short: string;
  full: string;
  audioBase64: string | null;
  audioMimeType: string | null;
  audioFormat: "wav" | "mp3" | "none";
};

type TodoRow = {
  title: string;
  due_date: string | null;
  assigned_to: string | null;
};

type EventRow = {
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean | null;
};

function todayInTimezone(timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function localDateRange(timeZone = DEFAULT_TIMEZONE) {
  const today = todayInTimezone(timeZone);
  return {
    today,
    startIso: `${today}T00:00:00.000+02:00`,
    endIso: `${today}T23:59:59.999+02:00`,
  };
}

export function validateLuluDeviceAuth(authHeader: string | null) {
  const configured = (process.env.LULU_DEVICE_API_KEY || process.env.HQ_API_KEY)?.trim();
  if (!configured || !authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7).trim() === configured;
}

async function getFamilySnapshot() {
  try {
    const admin = createAdminClient();
    const { today, startIso, endIso } = localDateRange(process.env.FAMILY_TIMEZONE);

    const [todosResult, eventsResult] = await Promise.all([
      admin
        .from("todos")
        .select("title, due_date, assigned_to")
        .eq("is_completed", false)
        .is("parent_id", null)
        .or(`due_date.is.null,due_date.lte.${today}`)
        .limit(12),
      admin
        .from("family_events")
        .select("title, start_at, end_at, all_day")
        .lt("start_at", endIso)
        .gt("end_at", startIso)
        .order("start_at")
        .limit(8),
    ]);

    const todos = (todosResult.data ?? []) as TodoRow[];
    const events = (eventsResult.data ?? []) as EventRow[];

    const todoLines = todos.length
      ? todos.map((t) => `- ${t.title}${t.assigned_to ? ` (${t.assigned_to})` : ""}${t.due_date ? ` due ${t.due_date}` : ""}`).join("\n")
      : "- No overdue or due-today HQ tasks found.";

    const eventLines = events.length
      ? events.map((e) => `- ${e.title} at ${e.all_day ? "all day" : new Date(e.start_at).toLocaleTimeString("en-GB", { timeZone: process.env.FAMILY_TIMEZONE || DEFAULT_TIMEZONE, hour: "2-digit", minute: "2-digit" })}`).join("\n")
      : "- No family events found for today.";

    return `Today is ${today}.\nHQ tasks:\n${todoLines}\nFamily calendar today:\n${eventLines}`;
  } catch (error) {
    console.error("Lulu snapshot error", error);
    return "HQ snapshot unavailable right now.";
  }
}

function trimForStick(text: string) {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 118) return singleLine;
  return `${singleLine.slice(0, 115).trim()}…`;
}

export async function answerAsLulu(input: LuluVoiceRequest): Promise<Omit<LuluVoiceAnswer, "audioBase64" | "audioMimeType" | "audioFormat">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const snapshot = await getFamilySnapshot();
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create(
    {
      model: process.env.LULU_ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 360,
      system: `You are Lulu Michael, Andrew Michael's family assistant inside HQ. Be warm, sharp, concise, and practical. This response is for a tiny M5StickS3 voice device, so answer conversationally. If asked about family operations, use the HQ snapshot. If you do not know, say so briefly. Do not mention implementation details unless asked. Keep the spoken answer under ${MAX_ANSWER_CHARS} characters.`,
      messages: [
        {
          role: "user",
          content: `Device: ${input.deviceId}\nRoom: ${input.room || "unknown"}\nBattery mV: ${input.batteryMv ?? "unknown"}\n\n${snapshot}\n\nAndrew asked: ${input.question}`,
        },
      ],
    },
    { timeout: 30_000 }
  );

  const full = response.content.find((part) => part.type === "text")?.text?.trim() || "I couldn't get a proper answer together.";
  return {
    transcript: input.question,
    full,
    short: trimForStick(full),
  };
}

async function transcribeWithLocalCommand(file: File, command: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "lulu-audio-"));
  const inputPath = path.join(dir, file.name || "question.wav");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    const [cmd, ...baseArgs] = command.split(" ").filter(Boolean);
    if (!cmd) throw new Error("LULU_LOCAL_TRANSCRIBE_CMD is empty");

    const { stdout } = await execFileAsync(cmd, [...baseArgs, inputPath], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });

    const text = stdout.trim();
    if (!text) throw new Error("Local transcription returned no text");
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function transcribeAudio(file: File) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const localCommand = process.env.LULU_LOCAL_TRANSCRIBE_CMD;
    if (localCommand) return transcribeWithLocalCommand(file, localCommand);
    throw new Error("OPENAI_API_KEY or LULU_LOCAL_TRANSCRIBE_CMD is required for transcription");
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "stick-s3.wav");
  formData.append("model", process.env.LULU_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
  formData.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${detail}`);
  }

  const json = (await response.json()) as { text?: string };
  const text = json.text?.trim();
  if (!text) throw new Error("Transcription returned no text");
  return text;
}

function wavHeader(byteLength: number, sampleRate = 16_000, channels = 1, bitsPerSample = 16) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + byteLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(byteLength, 40);
  return buffer;
}

async function callElevenLabs(apiKey: string, voiceId: string, text: string, outputFormat: string) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.46,
        similarity_boost: 0.78,
        style: 0.2,
        use_speaker_boost: true,
        speed: 1.15,
      },
    }),
  });
}

async function synthesizeWithMacSay(text: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "lulu-tts-"));
  const outputPath = path.join(dir, "reply.wav");

  try {
    await execFileAsync("say", ["-o", outputPath, "--data-format=LEI16@16000", text], {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return { buffer: await readFile(outputPath), mimeType: "audio/wav" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function synthesizeLuluVoice(text: string, format: "wav" | "mp3") {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const primaryVoiceId = process.env.ELEVENLABS_LULU_VOICE_ID;
  const fallbackVoiceId = process.env.ELEVENLABS_FALLBACK_VOICE_ID || "cgSgspJ2msm6clMCkdW9"; // Jessica premade voice.
  if ((!apiKey || !primaryVoiceId) && process.env.LULU_LOCAL_TTS_FALLBACK === "1" && format === "wav") {
    return synthesizeWithMacSay(text);
  }
  if (!apiKey || !primaryVoiceId) throw new Error("ElevenLabs is not configured");

  const outputFormat = format === "wav" ? "pcm_16000" : "mp3_44100_128";
  const voiceIds = Array.from(new Set([primaryVoiceId, fallbackVoiceId].filter(Boolean)));
  let lastError = "";
  let response: Response | null = null;

  for (const voiceId of voiceIds) {
    response = await callElevenLabs(apiKey, voiceId, text, outputFormat);
    if (response.ok) break;

    lastError = await response.text();
    if (!lastError.includes("paid_plan_required")) break;
  }

  if (!response?.ok) {
    if (process.env.LULU_LOCAL_TTS_FALLBACK === "1" && format === "wav") {
      console.warn("ElevenLabs failed; falling back to local macOS say", lastError);
      return synthesizeWithMacSay(text);
    }
    throw new Error(`ElevenLabs failed: ${response?.status ?? "unknown"} ${lastError}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (format === "wav") {
    return {
      buffer: Buffer.concat([wavHeader(audio.length), audio]),
      mimeType: "audio/wav",
    };
  }

  return { buffer: audio, mimeType: "audio/mpeg" };
}
