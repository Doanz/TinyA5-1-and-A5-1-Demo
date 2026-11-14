# Chay PowerShell tai thu muc a5_cipher_lab:
# .\build.ps1
# Can cai Emscripten SDK va kich hoat emsdk_env.bat truoc khi chay.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command em++ -ErrorAction SilentlyContinue)) {
    Write-Error 'Khong tim thay em++. Hay cai Emscripten SDK va chay emsdk_env.bat truoc.'
    exit 1
}
# --no-entry: chuong trinh wasm khong can ham main.
# ccall: JavaScript goi ham extern "C" simulate() cua C++.
& em++ cpp/cipher.cpp -std=c++17 -O2 --no-entry `
  -sMODULARIZE=1 `
  -sEXPORT_NAME=createCipherModule `
  -sEXPORTED_FUNCTIONS=_simulate `
  -sEXPORTED_RUNTIME_METHODS=ccall `
  -sALLOW_MEMORY_GROWTH=1 `
  -o web/cipher.js
if ($LASTEXITCODE -ne 0) { throw 'Bien dich C++ sang WebAssembly that bai.' }
Write-Host 'Da tao web/cipher.js va web/cipher.wasm' -ForegroundColor Green
Write-Host 'Chay: py -m http.server 8000 --directory web'
