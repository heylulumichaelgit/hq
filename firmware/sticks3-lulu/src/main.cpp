#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>

#include "config.h"

namespace {
constexpr uint32_t SAMPLE_RATE = 16000;
constexpr uint32_t RECORD_SECONDS = 6;
constexpr size_t PCM_BYTES = SAMPLE_RATE * RECORD_SECONDS * sizeof(int16_t);
constexpr size_t WAV_BYTES = PCM_BYTES + 44;

uint8_t *wavBuffer = nullptr;
uint8_t *audioBuffer = nullptr;
size_t audioCapacity = 0;
String lastAnswer;

void drawStatus(const String &line1, const String &line2 = "") {
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(2);
  M5.Display.setCursor(8, 24);
  M5.Display.println(line1);
  if (line2.length()) {
    M5.Display.setTextSize(1);
    M5.Display.setCursor(8, 72);
    M5.Display.println(line2);
  }
}

void drawAnswer(const String &answer) {
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setTextColor(TFT_GREEN, TFT_BLACK);
  M5.Display.setTextSize(1);
  M5.Display.setCursor(6, 8);
  M5.Display.println("Lulu:");
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setCursor(6, 28);
  M5.Display.setTextWrap(true);
  M5.Display.println(answer);
}

void writeWavHeader(uint8_t *buffer, uint32_t pcmBytes) {
  const uint16_t channels = 1;
  const uint16_t bitsPerSample = 16;
  const uint32_t byteRate = SAMPLE_RATE * channels * bitsPerSample / 8;
  const uint16_t blockAlign = channels * bitsPerSample / 8;

  memcpy(buffer, "RIFF", 4);
  uint32_t chunkSize = 36 + pcmBytes;
  memcpy(buffer + 4, &chunkSize, 4);
  memcpy(buffer + 8, "WAVEfmt ", 8);
  uint32_t subchunk1Size = 16;
  uint16_t audioFormat = 1;
  memcpy(buffer + 16, &subchunk1Size, 4);
  memcpy(buffer + 20, &audioFormat, 2);
  memcpy(buffer + 22, &channels, 2);
  memcpy(buffer + 24, &SAMPLE_RATE, 4);
  memcpy(buffer + 28, &byteRate, 4);
  memcpy(buffer + 32, &blockAlign, 2);
  memcpy(buffer + 34, &bitsPerSample, 2);
  memcpy(buffer + 36, "data", 4);
  memcpy(buffer + 40, &pcmBytes, 4);
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  drawStatus("WiFi...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
    M5.Display.print(".");
  }

  if (WiFi.status() != WL_CONNECTED) {
    drawStatus("No WiFi", "Check config.h");
    return false;
  }

  drawStatus("Ready", WiFi.localIP().toString());
  return true;
}

bool recordQuestion() {
  if (!wavBuffer) {
    wavBuffer = static_cast<uint8_t *>(ps_malloc(WAV_BYTES));
  }
  if (!wavBuffer) {
    drawStatus("No RAM", "PSRAM alloc failed");
    return false;
  }

  writeWavHeader(wavBuffer, PCM_BYTES);
  memset(wavBuffer + 44, 0, PCM_BYTES);

  drawStatus("Listening", "release after beep");
  M5.Speaker.tone(880, 80);
  delay(120);

  // StickS3 audio is half-duplex in M5Unified examples: stop speaker before recording.
  M5.Speaker.end();
  M5.Mic.begin();

  // M5Unified captures signed 16-bit PCM into the provided buffer on StickS3.
  // Keep this deliberately short: it fits in PSRAM and uploads quickly.
  const bool ok = M5.Mic.record(reinterpret_cast<int16_t *>(wavBuffer + 44), PCM_BYTES / sizeof(int16_t), SAMPLE_RATE);

  M5.Mic.end();
  M5.Speaker.begin();
  M5.Speaker.tone(440, 80);

  if (!ok) {
    drawStatus("Mic failed", "Check firmware/lib");
    return false;
  }
  return true;
}

String buildMultipartBody(const String &boundary) {
  String body;
  body.reserve(WAV_BYTES + 1024);

  auto addField = [&](const String &name, const String &value) {
    body += "--" + boundary + "\r\n";
    body += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
    body += value + "\r\n";
  };

  addField("device_id", LULU_DEVICE_ID);
  addField("room", LULU_ROOM);
  addField("answer_format", "wav");

  body += "--" + boundary + "\r\n";
  body += "Content-Disposition: form-data; name=\"audio\"; filename=\"question.wav\"\r\n";
  body += "Content-Type: audio/wav\r\n\r\n";
  body.concat(reinterpret_cast<const char *>(wavBuffer), WAV_BYTES);
  body += "\r\n--" + boundary + "--\r\n";
  return body;
}

int base64Value(char c) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;
  if (c == '+') return 62;
  if (c == '/') return 63;
  return -1;
}

size_t decodedBase64Length(const char *input) {
  const size_t len = strlen(input);
  size_t padding = 0;
  if (len >= 1 && input[len - 1] == '=') padding++;
  if (len >= 2 && input[len - 2] == '=') padding++;
  return (len / 4) * 3 - padding;
}

size_t decodeBase64(const char *input, uint8_t *output) {
  size_t out = 0;
  int val = 0;
  int valb = -8;
  for (const char *p = input; *p; ++p) {
    if (*p == '=') break;
    const int d = base64Value(*p);
    if (d < 0) continue;
    val = (val << 6) + d;
    valb += 6;
    if (valb >= 0) {
      output[out++] = static_cast<uint8_t>((val >> valb) & 0xFF);
      valb -= 8;
    }
  }
  return out;
}

bool askLulu() {
  if (!ensureWifi()) return false;
  if (!recordQuestion()) return false;

  drawStatus("Thinking...");

  const String boundary = "----LuluStickS3Boundary" + String(millis());
  String body = buildMultipartBody(boundary);

  HTTPClient http;
  http.setTimeout(60000);
  http.begin(LULU_ENDPOINT);
  http.addHeader("Authorization", String("Bearer ") + LULU_DEVICE_API_KEY);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  const int status = http.POST(reinterpret_cast<uint8_t *>(body.begin()), body.length());
  if (status <= 0) {
    drawStatus("HTTP failed", http.errorToString(status));
    http.end();
    return false;
  }

  const String response = http.getString();
  http.end();

  if (status != 200) {
    drawStatus("Server error", String(status));
    Serial.println(response);
    return false;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    drawStatus("Bad JSON", error.c_str());
    Serial.println(response);
    return false;
  }

  lastAnswer = doc["short"].as<String>();
  const char *audioB64 = doc["audio_base64"] | "";
  drawAnswer(lastAnswer);

  if (strlen(audioB64) == 0) return true;

  const size_t decodedMax = decodedBase64Length(audioB64);
  if (!audioBuffer || decodedMax > audioCapacity) {
    if (audioBuffer) free(audioBuffer);
    audioBuffer = static_cast<uint8_t *>(ps_malloc(decodedMax));
    audioCapacity = audioBuffer ? decodedMax : 0;
  }
  if (!audioBuffer) {
    drawStatus("No audio RAM", "answer shown");
    return true;
  }

  const size_t decodedLen = decodeBase64(audioB64, audioBuffer);
  M5.Mic.end();
  M5.Speaker.begin();
  M5.Speaker.setVolume(180); // below ~75% to avoid battery brownouts.
  M5.Speaker.playWav(audioBuffer, decodedLen);
  return true;
}
} // namespace

void setup() {
  auto cfg = M5.config();
  cfg.serial_baudrate = 115200;
  cfg.output_power = true;
  cfg.internal_mic = true;
  cfg.internal_spk = true;
  M5.begin(cfg);

  M5.Display.setRotation(1);
  M5.Speaker.begin();
  M5.Mic.begin();

  ensureWifi();
  drawStatus("Ask Lulu", "Btn A: hold/tap ask");
}

void loop() {
  M5.update();

  if (M5.BtnA.wasPressed()) {
    askLulu();
  }

  if (M5.BtnB.wasPressed()) {
    if (lastAnswer.length()) {
      drawAnswer(lastAnswer);
    } else {
      drawStatus("Ask Lulu", "Btn A: ask");
    }
  }

  delay(20);
}
