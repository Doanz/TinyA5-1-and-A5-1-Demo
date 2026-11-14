"""Kiem thu native C++ tu thu muc goc a5_cipher_lab: python tests/test_cpp.py"""
import json
import subprocess
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / ("cipher_test.exe" if os.name == "nt" else "cipher_test")

subprocess.run(["g++", "-std=c++17", "-O2", str(ROOT / "cpp" / "cipher.cpp"), "-o", str(OUTPUT)], check=True)

def run(mode, p, k):
    proc = subprocess.run([str(OUTPUT), mode, p, k], capture_output=True, text=True, check=True)
    return json.loads(proc.stdout)

TINY_KEY = "10101110010110110100"
A5_KEY = "1011001100101101010011010011101001101011011001010110101100101011"

for mode, k, s, c in [
    ("tiny", TINY_KEY, "1100", "0111"),
    ("a5", A5_KEY, "1110", "0101"),
]:
    r = run(mode, "1011", k)
    assert r["ok"], r
    assert r["s"] == s, (mode, r["s"])
    assert r["c"] == c, (mode, r["c"])
    assert r["recovered"] == "1011"
    assert len(r["trace"]) == 4
    assert all(len(t["rotated"]) >= 2 for t in r["trace"])
    assert r["trace"][0]["cycle"] == 1
    print(f"PASS {mode}: S={s} C={c}")

# Kiem tra dung quy tac phan hoi va vi tri dich
r = run("tiny", "1011", TINY_KEY)
assert r["initial"] == ["10101", "1100101", "10110100"]
assert r["trace"][0]["after"] == ["11010", "1100101", "01011010"]
assert r["trace"][0]["feedback"] == [1, None, 0]

# Kiem tra dau vao sai
for mode,p,k in [("tiny", "102", TINY_KEY), ("tiny", "1011", "010"), ("a5", "", A5_KEY)]:
    assert run(mode,p,k)["ok"] is False

print("Tat ca test C++ da PASS.")
