P = input("Nhap ban ro P: ").strip()
K = input("Nhap khoa K: ").strip()
if not P or any(bit not in "01" for bit in P):
    raise ValueError("P phai la chuoi nhi phan khong rong")
if len(K) != 23 or any(bit not in "01" for bit in K):
    raise ValueError("K phai gom dung 23 bit nhi phan")
X = K[0:6]
Y = K[6:14]
Z = K[14:23]
def quay(thanh_ghi, taps):
    t = 0
    for vi_tri in taps:
        t = t ^ int(thanh_ghi[vi_tri - 1])
    thanh_ghi_moi = str(t) + thanh_ghi[:-1]
    return thanh_ghi_moi, t
def majority(a, b, c):
    if a + b + c >= 2:
        return 1
    else:
        return 0
S = ""
for i in range(len(P)):
    print("\n===== CHU KY", i + 1, "=====")
    x1 = int(X[1])
    y3 = int(Y[3])
    z3 = int(Z[3])

    m = majority(x1, y3, z3)
    print("Bit dieu khien:")
    print("x1 =", x1, "| y3 =", y3, "| z3 =", z3)
    print("Maj =", m)

    thanh_ghi_quay=[]

    if x1 == m:
        X, tx = quay(X, (2, 4, 5))
        thanh_ghi_quay.append("X")
        print("X quay, bit moi =", tx)
    else:
        print("X khong quay")

    if y3 == m:
        Y, ty = quay(Y, (6, 7))
        thanh_ghi_quay.append("Y")
        print("Y quay, bit moi =", ty)
    else:
        print("Y khong quay")

    if z3 == m:
        Z, tz = quay(Z, (2, 7, 8))
        thanh_ghi_quay.append("Z")
        print("Z quay, bit moi =", tz)
    else:
        print("Z khong quay")

    print("Trang thai thanh ghi sau khi quay:")
    print("X =", X)
    print("Y= ", Y)
    print("Z =", Z)

    x5 = int(X[5])
    y7 = int(Y[7])
    z8 = int(Z[8])

    si = x5 ^ y7 ^ z8

    S = S + str(si)

    print("Sinh bit dong khoa:")
    print("si =", x5, "XOR", y7, "XOR", z8, "=", si)
    print("Dong khoa S hien tai =", S)

C = ""
for p, s in zip(P, S):
    bit_ma = int(p) ^ int(s)
    C = C + str(bit_ma)

print("KET QUA TINY A5/1")
print("Ban ro P =", P)
print("Khoa K =", K)
print("Dong khoa S =", S)
print("Ban ma C =", C)

P_giai_ma = ""
for c, s in zip(C, S):
    P_giai_ma += str(int(c) ^ int(s))
print("Ban ro sau giai ma =", P_giai_ma)

if P_giai_ma == P:
    print("Pass")
else:
    print("Fail")
    