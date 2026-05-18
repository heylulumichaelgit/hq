# Lulu StickS3 Voice Remote

First vertical slice for the M5Stack StickS3:

1. Button A records a short WAV question from the built-in MEMS mic.
2. The StickS3 posts it to HQ: `POST /api/lulu/voice`.
3. HQ transcribes, answers as Lulu with today's HQ context, generates ElevenLabs audio, and returns JSON.
4. The StickS3 shows the short answer and plays the returned WAV through the built-in speaker.

## Hardware target

M5Stack StickS3 / SKU K150:

- ESP32-S3-PICO-1-N8R8
- 8MB Flash / 8MB PSRAM
- ES8311 audio codec
- MEMS mic
- AW8737 amp + 8Ω 1W speaker
- 135x240 LCD

## Server env vars

Set these on HQ/Vercel/local `.env.local`:

```bash
LULU_DEVICE_API_KEY=long-random-secret
# Use OPENAI_API_KEY on Vercel, or LULU_LOCAL_TRANSCRIBE_CMD for local Mac mini hosting.
OPENAI_API_KEY=...
LULU_LOCAL_TRANSCRIBE_CMD=/Users/heylulu/tools/transcribe.sh
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_LULU_VOICE_ID=OYTbf65OHHFELVut7v2H
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
LULU_LOCAL_TTS_FALLBACK=1 # local Mac server only; uses macOS say if ElevenLabs quota is exhausted
```

If `LULU_DEVICE_API_KEY` is not set, the endpoint falls back to `HQ_API_KEY`.

## Firmware setup

```bash
cd firmware/sticks3-lulu
cp include/config.example.h include/config.h
# edit Wi-Fi, endpoint, and device key
pio run -t upload
pio device monitor
```

For local testing, set `LULU_ENDPOINT` to your Mac's LAN address, e.g.:

```c
#define LULU_ENDPOINT "http://192.168.1.23:3000/api/lulu/voice"
```

Then run HQ locally:

```bash
npm run dev
```

## API smoke test

Text-only test without the StickS3:

```bash
curl -s -X POST "$HQ_URL/api/lulu/voice" \
  -H "Authorization: Bearer $LULU_DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is on today?","deviceId":"curl-test","answerFormat":"none"}'
```

Audio test:

```bash
curl -s -X POST "$HQ_URL/api/lulu/voice" \
  -H "Authorization: Bearer $LULU_DEVICE_API_KEY" \
  -F device_id=stick-s3-kitchen \
  -F room=kitchen \
  -F answer_format=wav \
  -F audio=@question.wav
```

## Current caveats

- Firmware is a scaffold until compiled/flashed against the real StickS3 libraries. PlatformIO is not installed on this Mac, so the server has been build-verified but firmware compile is still a hardware-toolchain gate.
- Returned audio is WAV-wrapped 16kHz PCM from ElevenLabs because that is much easier to play on ESP32 than MP3.
- Volume is capped below the StickS3 battery brownout warning threshold.
