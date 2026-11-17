"""Compile and check the independent C++ reference against learning/reference vectors."""
import subprocess
import pathlib
import tempfile
import sys

root = pathlib.Path(__file__).resolve().parents[1]
src = root / "cpp" / "cipher.cpp"
with tempfile.TemporaryDirectory() as tmp:
    output = pathlib.Path(tmp) / ("cipher_demo.exe" if sys.platform == "win32" else "cipher_demo")
    subprocess.run(["g++", "-std=c++17", "-O2", str(src), "-o", str(output)], check=True)

    def test(*args):
        return subprocess.run([str(output), *args], check=True, text=True, capture_output=True).stdout

    tiny = test("tiny", "10101110010110110100101", "1011")
    assert "S=0110" in tiny and "C=1101" in tiny and "Status=PASS" in tiny
    a5 = test("a5", "1223456789ABCDEF", "0x134", "0" * 114, "a2b")
    s = a5.split("S=")[1].splitlines()[0]
    assert int(s + "000000", 2).to_bytes(15, "big").hex() == "534eaa582fe8151ab6e1855a728c00"
    a5b = test("a5", "1223456789ABCDEF", "0x134", "0" * 114, "b2a")
    s = a5b.split("S=")[1].splitlines()[0]
    assert int(s + "000000", 2).to_bytes(15, "big").hex() == "24fd35a35d5fb6526d32f906df1ac0"
    multi = test("a5", "1223456789ABCDEF", "0x134", "10110101" * 150, "a2b")
    assert "Status=PASS" in multi and "Recovered=" + "10110101" * 150 in multi
    print("PASS: C++ Tiny23, A5 reference 114-bit x2, multi-frame")
