P = input("Nhap ban ro P (nhi phan): ").strip()
K = input("Nhap khoa K (64 bit nhi phan): ").strip()

if not P or any(bit not in "01" for bit in P):
    raise ValueError("P phai la chuoi nhi phan khong rong!")
if len(K) != 64 or any(bit not in "01" for bit in K):
    raise ValueError("K phai gom dung 64 bit nhi phan!")

X = K[0:19]
Y = K[19:41]
Z = K[41:64]

print("\n========== TRANG THAI BAN DAU ==========")
print("Ban ro P =", P)
print("Khoa K   =", K)
print("X =", X, "(19 bit)")
print("Y =", Y, "(22 bit)")
print("Z =", Z, "(23 bit)")

def quay(thanh_ghi, taps):
    t = 0
    for vi_tri in taps:
        t ^= int(thanh_ghi[vi_tri])
    thanh_ghi_moi = str(t) + thanh_ghi[:-1]
    return thanh_ghi_moi, t

def majority(a, b, c):
    if a + b + c >= 2:
        return 1
    else:
        return 0
S = ""
for i in range(len(P)):

    print("\n========== CHU KY", i + 1, "==========")

    x8 = int(X[8])
    y10 = int(Y[10])
    z10 = int(Z[10])

    m = majority(x8, y10, z10)
    print("Bit dieu khien:")
    print("x8 =", x8, "| y10 =", y10, "| z10 =", z10)
    print("MAJ =", m)

    thanh_ghi_quay = []

    if x8 == m:
        X, tx = quay(X, (13, 16, 17, 18))
        thanh_ghi_quay.append("X")
        print("X quay")
        print("Bit phan hoi tX =", tx)
    else:
        print("X khong quay")
    if y10 == m:
        Y, ty = quay(Y, (20, 21))
        thanh_ghi_quay.append("Y")
        print("Y quay")
        print("Bit phan hoi tY =", ty)
    else:
        print("Y khong quay")
    if z10 == m:
        Z, tz = quay(Z, (7, 20, 21, 22))
        thanh_ghi_quay.append("Z")
        print("Z quay")
        print("Bit phan hoi tZ =", tz)
    else:
        print("Z khong quay")

    print("\nTrang thai cac thanh ghi sau khi quay:")
    print("X =", X)
    print("Y =", Y)
    print("Z =", Z)
    print("Thanh ghi quay:", ", ".join(thanh_ghi_quay))

    x8_moi = int(X[8])
    y10_moi = int(Y[10])
    z10_moi = int(Z[10])

    si = x8_moi ^ y10_moi ^ z10_moi
    S += str(si)

    print("\nSinh bit dong khoa:")
    print(
        "si =", x8_moi, "XOR",
        y10_moi, "XOR", z10_moi, "=", si
    )
    print("Dong khoa S hien tai =", S)

C = ""

for p, s in zip(P, S):
    bit_ma = int(p) ^ int(s)
    C += str(bit_ma)

print("          KET QUA A5/1")
print("Ban ro P    =", P)
print("Khoa K      =", K)
print("Dong khoa S =", S)
print("Ban ma C    =", C)

P_giai_ma = ""
for c, s in zip(C, S):
    P_giai_ma += str(int(c) ^ int(s))
print("\nBan ro sau giai ma =", P_giai_ma)

if P_giai_ma == P:
    print("KIEM THU: PASS")
else:
    print("KIEM THU: FAIL")
