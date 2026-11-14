# A5/1 Cipher Lab — Giao diện sáng, dễ sử dụng

Đây là phiên bản giao diện **đơn giản hơn** của website mô phỏng hai hệ mã dòng theo bài giảng. Trang web tách thành **4 bước**:

1. **Chọn hệ mã**: TinyA5/1 hoặc A5/1 theo slide.
2. **Nhập P, K** (bên trái) và đọc **giải thích thuật toán** (bên phải).
3. **Xem bảng từng vòng quay**, nhấp vào một hàng để xem X/Y/Z trước và sau khi dịch.
4. **Xem kết quả mã hóa C và bản rõ sau giải mã** trong hai ô lớn cuối trang.

Website dùng HTML/CSS cho giao diện, JavaScript cho tương tác. Khi biên dịch bằng Emscripten, lõi C++ chạy trực tiếp trong trình duyệt qua WebAssembly. **Nếu chưa biên dịch C++, website vẫn chạy được với JavaScript**, sử dụng cùng quy tắc tính toán để bạn xem thử.

## 1. Cấu trúc thư mục

```text
a5_cipher_lab_light/
├── web/
│   ├── index.html      # Giao diện sáng, bố cục 4 bước
│   ├── style.css       # Màu sắc và hiển thị trên điện thoại
│   ├── app.js          # Xử lý input, hiển thị kết quả, gọi C++ qua WASM
│   └── cipher.js       # File placeholder, build C++ sẽ ghi đè
├── cpp/
│   └── cipher.cpp      # Thuật toán TinyA5/1 và A5/1 theo slide
├── tests/
│   └── test_cpp.py     # Kiểm thử lõi C++
├── build.ps1           # Biên dịch C++ sang WebAssembly trên Windows
├── build.sh            # Biên dịch trên Linux/macOS
└── README.md
```

## 2. Chạy website trong VS Code trên Windows

Mở thư mục project trong VS Code, chọn **Terminal → New Terminal**, đứng ở thư mục `a5_cipher_lab_light` rồi chạy:

```powershell
py -m http.server 8000 --directory web
```

Truy cập **http://localhost:8000** bằng trình duyệt. Nếu cổng 8000 đang được dùng, có thể thay `8000` bằng `8001` ở cả lệnh và địa chỉ truy cập.

- Nếu góc phải trên hiện **JavaScript · sẵn sàng**: website đã hoạt động ở chế độ mô phỏng JavaScript.
- Nếu hiện **C++ / WebAssembly**: website đã tải bản biên dịch C++.

> Không cần chỉnh lại Python TinyA5/1 và A5/1 cũ. Bộ website này hoạt động độc lập.

## 3. Nhập dữ liệu đúng cách

**Chọn TinyA5/1**

- P là chuỗi bit nhị phân, tối đa 256 bit, ví dụ `1011`.
- K gồm **đúng 20 bit**: 5 bit cho X, 7 bit cho Y, 8 bit cho Z.
- Ví dụ K: `10101110010110110100`.
- Khi bấm **Chạy mô phỏng**: dòng khóa `S = 1100`, bản mã `C = 0111`, giải mã `1011`.

**Chọn A5/1 theo slide**

- P là chuỗi bit nhị phân, tối đa 256 bit, ví dụ `1011`.
- K gồm **đúng 64 bit**: 19 bit cho X, 22 bit cho Y, 23 bit cho Z.
- Ví dụ K: `1011001100101101010011010011101001101011011001010110101100101011`.
- Dòng khóa `S = 1110`, bản mã `C = 0101`, giải mã `1011`.

**Lưu ý:** P và K chỉ chứa **0**, **1**, không có dấu cách, chữ cái hoặc dấu `0b`. Có thể nhấn **Điền dữ liệu mẫu** để xem nhanh một ví dụ chính xác.

## 4. Biên dịch C++ thành WebAssembly (tùy chọn)

Để dùng lõi C++ trong trình duyệt, bạn cần cài [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html). Sau khi thiết lập môi trường và kiểm tra `em++ --version` hoạt động, chạy tại thư mục dự án:

```powershell
.\build.ps1
```

Hoặc dùng lệnh trực tiếp nếu PowerShell không cho chạy script:

```powershell
em++ cpp/cipher.cpp -std=c++17 -O2 --no-entry -sMODULARIZE=1 -sEXPORT_NAME=createCipherModule -sEXPORTED_FUNCTIONS=_simulate -sEXPORTED_RUNTIME_METHODS=ccall -sALLOW_MEMORY_GROWTH=1 -o web/cipher.js
```

Lệnh sinh `web/cipher.js` và `web/cipher.wasm`. Hãy tải lại trang web để sử dụng C++/WebAssembly. Nên chạy qua `http.server` như bước 2, thay vì mở tệp HTML trực tiếp.

## 5. Kiểm thử C++

Nếu máy có trình biên dịch `g++`:

```powershell
py tests/test_cpp.py
```

Bộ kiểm thử sẽ kiểm tra hai dữ liệu mẫu, các trạng thái thanh ghi và việc giải mã khôi phục bản rõ.

## 6. Đưa lên GitHub

Có thể lưu thư mục `a5_cipher_lab_light` cạnh các thư mục Python `tiny_a5_1` và `a5_1` đã có. Đứng tại thư mục gốc repository và chạy:

```powershell
git add a5_cipher_lab_light
git commit -m "style: redesign cipher simulator with light interface"
git push origin main
```

> Nếu đưa website lên GitHub Pages và muốn chạy C++/WebAssembly, bạn cần build và triển khai **cả `cipher.js` và `cipher.wasm`**. GitHub Pages cần trỏ tới thư mục chứa file `index.html`.

## 7. Phạm vi học thuật

- TinyA5/1 là mô hình thu nhỏ, sử dụng công thức phản hồi và majority theo tài liệu lớp học, các vị trí bit đánh số từ **1** (từ trái sang phải).
- A5/1 trong website là **mô phỏng theo slide**: chia trực tiếp khóa 64 bit thành X/Y/Z, đánh số bit từ **0** (từ trái sang phải), lấy đầu ra ở `x8`, `y10`, `z10` sau khi quay.
- A5/1 chuẩn GSM có khâu nạp khóa, frame, 100 chu kỳ khởi động và bit đầu ra khác, **không đồng nhất** với mô phỏng A5/1 theo slide.
- `PASS` nghĩa là giải mã nhận lại đúng P, **không phải** chứng nhận an toàn mật mã. Không dùng demo để bảo vệ dữ liệu thực tế.
