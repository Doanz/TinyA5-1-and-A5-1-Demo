# TinyA5/1 & A5/1 — Stream Cipher Simulator

Dự án học tập mô phỏng hai hệ mã dòng **TinyA5/1** và **A5/1**. Người dùng nhập bản rõ **P** và khóa **K** ở dạng nhị phân, quan sát trạng thái ba thanh ghi qua từng chu kỳ và nhận kết quả mã hóa **C = P XOR S**, giải mã **P = C XOR S**.

## 1. Yêu cầu
- Máy tính có trình duyệt Chrome, Edge hoặc Firefox.
- Cài **Python 3** nếu muốn chạy website bằng HTTP server hoặc chạy demo Python.

## 2. Tải dự án
1. Mở repository GitHub.
2. Chọn **Code → Download ZIP**.
3. Giải nén file ZIP vào thư mục trên máy.
4. Mở thư mục vừa giải nén bằng **VS Code**.

Nếu đã có Git:
```powershell
git clone https://github.com/Doanz/TinyA5-1-and-A5-1-Demo.git
cd TinyA5-1-and-A5-1-Demo
```

## 3. Chạy website
Mở Terminal trong VS Code, đảm bảo bạn đang ở thư mục gốc dự án, rồi chạy:
cd a5_cipher_lab/web
py -m http.server 8000
Mở trình duyệt và truy cập http://localhost:8000.

## 4. Hướng dẫn sử dụng website
1. Chọn **TinyA5/1** hoặc **A5/1**.
2. Nhập **P** (bản rõ) dưới dạng chuỗi chỉ gồm `0` và `1` (tối đa 256 bit).
3. Nhập **K** (khóa) dưới dạng chuỗi nhị phân không có khoảng trắng:
   - **TinyA5/1:** đúng **20 bit**, chia thành X = 5, Y = 7, Z = 8 bit.
   - **A5/1 theo slide:** đúng **64 bit**, chia thành X = 19, Y = 22, Z = 23 bit.
4. Nhấn **Chạy mô phỏng**.
5. Theo dõi bảng từng chu kỳ: các bit điều khiển, MAJ, thanh ghi được quay, bit phản hồi và `sᵢ`.
6. Xem kết quả **dòng khóa S**, **bản mã C** và **bản rõ sau giải mã**.