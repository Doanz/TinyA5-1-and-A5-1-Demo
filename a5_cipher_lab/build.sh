#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v em++ >/dev/null || { echo 'Chua co em++ (Emscripten SDK)' >&2; exit 1; }
em++ cpp/cipher.cpp -std=c++17 -O2 --no-entry \
  -sMODULARIZE=1 \
  -sEXPORT_NAME=createCipherModule \
  -sEXPORTED_FUNCTIONS=_simulate \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  -sALLOW_MEMORY_GROWTH=1 \
  -o web/cipher.js
echo 'Xong: web/cipher.js + web/cipher.wasm'
echo 'Chay: python3 -m http.server 8000 --directory web'
