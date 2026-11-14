// ================================================================
// Cipher Lab - lo i thuat toan C++ (TinyA5/1 va A5/1 theo bai giang)
// Bien dich sang WebAssembly bang Emscripten de goi tu JavaScript.
// Co the bien dich native bang g++ de kiem thu tren Terminal.
// ================================================================
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <stdexcept>

struct Spec {
    std::string name;
    int len[3];
    int control[3];
    int output[3];
    std::vector<int> taps[3];
};

// Tat ca chi so trong code C++ bat dau tu 0, tinh tu TRAI qua PHAI.
// Tiny: bit x1 trong de = X[0], x2 = X[1], ...
// A5:   bit x0 trong slide = X[0], x8 = X[8], ...
Spec getSpec(const std::string &algorithm) {
    if (algorithm == "tiny") {
        return {"TinyA5/1", {5, 7, 8}, {0, 2, 2}, {4, 6, 7},
                {{1, 3, 4}, {5, 6}, {1, 6, 7}}};
    }
    if (algorithm == "a5") {
        // Day la mo phong TRUC TIEP CHIA K theo slide (khong phai GSM day du).
        // Output theo slide: x8 XOR y10 XOR z10, lay SAU khi quay.
        return {"A5/1 theo slide", {19, 22, 23}, {8, 10, 10}, {8, 10, 10},
                {{13, 16, 17, 18}, {20, 21}, {7, 20, 21, 22}}};
    }
    throw std::invalid_argument("Thuat toan khong hop le (tiny hoac a5).");
}

bool isBinary(const std::string &s) {
    if (s.empty()) return false;
    for (char bit : s) if (bit != '0' && bit != '1') return false;
    return true;
}

// Ham maj: gia tri xuat hien it nhat 2 lan trong 3 bit.
int majority(int a, int b, int c) { return (a + b + c >= 2) ? 1 : 0; }

// Ham quay: lay XOR cac bit trong taps, chen bit phan hoi t vao BEN TRAI,
// cac bit con lai dich sang PHAI, bo bit cuoi cung.
std::pair<std::string, int> rotateRegister(const std::string &reg,
                                           const std::vector<int> &taps) {
    int t = 0; // CAN khoi tao t = 0 de tranh UnboundLocalError nhu Python.
    for (int index : taps) t ^= (reg[index] - '0');
    return {std::string(1, char('0' + t)) + reg.substr(0, reg.size() - 1), t};
}

// C++ tao chuoi JSON de JavaScript phan tich bang JSON.parse().
// Tat ca gia tri tu nguoi dung deu duoc kiem tra chi chua bit 0 va 1.
std::string jsonString(const std::string &value) { return "\"" + value + "\""; }

std::string jsonArray(const std::vector<std::string> &a) {
    std::ostringstream s;
    s << "[";
    for (size_t i = 0; i < a.size(); ++i) {
        if (i) s << ",";
        s << jsonString(a[i]);
    }
    s << "]";
    return s.str();
}

std::string jsonIntArray(const int a[3], bool nullable = false) {
    std::ostringstream s;
    s << "[";
    for (int i = 0; i < 3; ++i) {
        if (i) s << ",";
        if (nullable && a[i] < 0) s << "null";
        else s << a[i];
    }
    s << "]";
    return s.str();
}

std::string simulateImpl(const std::string &algorithm,
                         const std::string &P, const std::string &K) {
    Spec spec = getSpec(algorithm);
    int required = spec.len[0] + spec.len[1] + spec.len[2];

    if (!isBinary(P)) throw std::invalid_argument("P phai la day bit 0/1 khong rong.");
    if (P.size() > 256) throw std::invalid_argument("P toi da 256 bit de de quan sat.");
    if (static_cast<int>(K.size()) != required || !isBinary(K)) {
        throw std::invalid_argument("K phai gom dung " + std::to_string(required) + " bit 0/1.");
    }

    std::vector<std::string> regs = {
        K.substr(0, spec.len[0]),
        K.substr(spec.len[0], spec.len[1]),
        K.substr(spec.len[0] + spec.len[1], spec.len[2])
    };
    std::vector<std::string> initial = regs;
    std::string S;
    std::ostringstream trace;
    trace << "[";

    for (size_t cycle = 0; cycle < P.size(); ++cycle) {
        std::vector<std::string> before = regs;
        int control[3];
        for (int i = 0; i < 3; ++i) control[i] = regs[i][spec.control[i]] - '0';
        int maj = majority(control[0], control[1], control[2]);

        int feedback[3] = {-1, -1, -1}; // -1 = khong quay (JSON null)
        std::string rotated;
        for (int i = 0; i < 3; ++i) {
            if (control[i] == maj) {
                auto result = rotateRegister(regs[i], spec.taps[i]);
                regs[i] = result.first;
                feedback[i] = result.second;
                rotated += char('X' + i); // X, Y, Z
            }
        }

        int outputBits[3];
        int si = 0;
        for (int i = 0; i < 3; ++i) {
            outputBits[i] = regs[i][spec.output[i]] - '0';
            si ^= outputBits[i];
        }
        S += char('0' + si);

        if (cycle) trace << ",";
        trace << "{\"cycle\":" << (cycle + 1)
              << ",\"before\":" << jsonArray(before)
              << ",\"controls\":" << jsonIntArray(control)
              << ",\"majority\":" << maj
              << ",\"rotated\":" << jsonString(rotated)
              << ",\"feedback\":" << jsonIntArray(feedback, true)
              << ",\"after\":" << jsonArray(regs)
              << ",\"outputBits\":" << jsonIntArray(outputBits)
              << ",\"s\":" << si << "}";
    }
    trace << "]";

    // Ma hoa: C = P XOR S; Giai ma: C XOR S = P.
    std::string C, recovered;
    for (size_t i = 0; i < P.size(); ++i) {
        C += char('0' + ((P[i] - '0') ^ (S[i] - '0')));
        recovered += char('0' + ((C[i] - '0') ^ (S[i] - '0')));
    }

    std::ostringstream result;
    result << "{\"ok\":true,\"algorithm\":" << jsonString(algorithm)
           << ",\"p\":" << jsonString(P)
           << ",\"k\":" << jsonString(K)
           << ",\"initial\":" << jsonArray(initial)
           << ",\"s\":" << jsonString(S)
           << ",\"c\":" << jsonString(C)
           << ",\"recovered\":" << jsonString(recovered)
           << ",\"trace\":" << trace.str() << "}";
    return result.str();
}

// Ham C API de Emscripten/JavaScript goi thong qua Module.ccall().
extern "C" const char *simulate(const char *algorithm, const char *p,
                                 const char *k) {
    static std::string json; // Giu bo nho cho con tro tra ve den lan goi tiep theo.
    try {
        json = simulateImpl(algorithm ? algorithm : "", p ? p : "", k ? k : "");
    } catch (const std::exception &e) {
        // Error messages do not include user-controlled free text.
        json = std::string("{\"ok\":false,\"error\":") + jsonString(e.what()) + "}";
    }
    return json.c_str();
}

// Cho phep kiem tra C++ native truoc khi bien dich WebAssembly:
// g++ -std=c++17 cpp/cipher.cpp -o cipher_test
// ./cipher_test tiny 1011 10101110010110110100
#ifndef __EMSCRIPTEN__
int main(int argc, char *argv[]) {
    if (argc != 4) {
        std::cerr << "Usage: cipher_test <tiny|a5> <P> <K>\n";
        return 1;
    }
    std::cout << simulate(argv[1], argv[2], argv[3]) << std::endl;
    return 0;
}
#endif
