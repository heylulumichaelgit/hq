#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export LULU_DEVICE_API_KEY="${LULU_DEVICE_API_KEY:-$(python3 - <<'PY'
import re
from pathlib import Path
config = Path('firmware/sticks3-lulu/include/config.h')
if config.exists():
    m = re.search(r'#define LULU_DEVICE_API_KEY "([^"]+)"', config.read_text())
    if m:
        print(m.group(1))
PY
)}"

export LULU_LOCAL_TRANSCRIBE_CMD="${LULU_LOCAL_TRANSCRIBE_CMD:-/Users/heylulu/tools/transcribe.sh}"
export ELEVENLABS_LULU_VOICE_ID="${ELEVENLABS_LULU_VOICE_ID:-OYTbf65OHHFELVut7v2H}"
export ELEVENLABS_FALLBACK_VOICE_ID="${ELEVENLABS_FALLBACK_VOICE_ID:-cgSgspJ2msm6clMCkdW9}"
export LULU_LOCAL_TTS_FALLBACK="${LULU_LOCAL_TTS_FALLBACK:-1}"

# Optional local secret source for ELEVENLABS_API_KEY and other keys.
if [[ -f /Users/heylulu/.openclaw/.env.local ]]; then
  set -a
  source /Users/heylulu/.openclaw/.env.local
  set +a
fi

exec npm run dev -- --hostname 0.0.0.0
