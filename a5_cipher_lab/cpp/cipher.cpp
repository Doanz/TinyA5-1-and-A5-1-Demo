// Reference CLI in C++17 for TinyA5/1 (6-8-9) and A5/1 (GSM key+frame+warmup).
// Educational use only, no secure cryptography guarantees.
// Build: g++ -std=c++17 -O2 cpp/cipher.cpp -o cipher_demo
// Run:   ./cipher_demo tiny 10101110010110110100101 1011
//        ./cipher_demo a5 1223456789ABCDEF 0x134 1011 a2b
#include <array>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

string xorBits(const string& p,const string& s) {
    string out;
    for (size_t i=0;i<p.size();++i) out += char('0'+((p[i]-'0')^(s[i]-'0')));
    return out;
}
void requireBinary(const string& s, size_t len=0) {
    if (s.empty() || (len && s.size()!=len) || s.find_first_not_of("01")!=string::npos)
        throw invalid_argument("Dữ liệu nhị phân không hợp lệ hoặc sai độ dài");
}
int maj(int a,int b,int c) {return a+b+c>=2?1:0;}
int tickTiny(string& reg,initializer_list<int> taps) {
    int t=0; for (int j:taps) t^=reg[j]-'0';
    reg=char('0'+t)+reg.substr(0,reg.size()-1);
    return t;
}
string tiny(const string& k,size_t n) {
    requireBinary(k,23);
    string x=k.substr(0,6),y=k.substr(6,8),z=k.substr(14,9), s;
    for(size_t i=0;i<n;++i){
        int ax=x[1]-'0',ay=y[3]-'0',az=z[3]-'0',m=maj(ax,ay,az);
        if(ax==m)tickTiny(x,{1,3,4});
        if(ay==m)tickTiny(y,{5,6});
        if(az==m)tickTiny(z,{1,6,7});
        s+=char('0'+((x[5]-'0')^(y[7]-'0')^(z[8]-'0')));
    }
    return s;
}
struct A5 {
    array<uint32_t,3> r{0,0,0};
    static constexpr array<uint32_t,3> mask{0x7ffff,0x3fffff,0x7fffff};
    static constexpr array<uint32_t,3> taps{0x72000,0x300000,0x700080};
    static int parity(uint32_t v) {int n=0;while(v){n^=v&1;v>>=1;}return n;}
    static int bit(uint32_t v,int pos) {return (v>>pos)&1;}
    void tick(int j) {r[j]=((r[j]<<1)&mask[j])|parity(r[j]&taps[j]);}
    void tickAll(){for(int j=0;j<3;j++)tick(j);}
    int tickMajority(){
        int a=bit(r[0],8), b=bit(r[1],10), c=bit(r[2],10),m=maj(a,b,c);
        if(a==m)tick(0); if(b==m)tick(1); if(c==m)tick(2);
        return bit(r[0],18)^bit(r[1],21)^bit(r[2],22);
    }
    void init(const array<uint8_t,8>&key,uint32_t frame){
        r={0,0,0};
        for(int i=0;i<64;i++){
            tickAll(); int b=(key[i/8]>>(i%8))&1;
            for(int j=0;j<3;j++)r[j]^=b;
        }
        for(int i=0;i<22;i++){
            tickAll();int b=(frame>>i)&1;
            for(int j=0;j<3;j++)r[j]^=b;
        }
        for(int i=0;i<100;i++)tickMajority();
    }
};
array<uint8_t,8> parseHexKey(const string& input){
    if(input.size()!=16 || input.find_first_not_of("0123456789abcdefABCDEF")!=string::npos)
        throw invalid_argument("Khóa A5/1 phải gồm 16 ký tự HEX (64 bit)");
    array<uint8_t,8> k{};
    for(int i=0;i<8;i++)k[i]=(uint8_t)stoul(input.substr(i*2,2),nullptr,16);
    return k;
}
string a5(const array<uint8_t,8>&key,uint32_t frameStart,size_t n,bool b2a){
    if(frameStart>=1u<<22)throw invalid_argument("Frame phải có 22 bit");
    string out;out.reserve(n);
    for(size_t offset=0,frameIndex=0;offset<n;offset+=114,++frameIndex){
        A5 cipher;cipher.init(key,(frameStart+frameIndex)&0x3fffff);
        if(b2a)for(int i=0;i<114;i++)cipher.tickMajority();
        for(size_t i=0;i<min<size_t>(114,n-offset);i++)out+=char('0'+cipher.tickMajority());
    }
    return out;
}
string a5FrameVector(const array<uint8_t,8>&key,uint32_t frame){
    A5 cipher;cipher.init(key,frame);
    string s;for(int i=0;i<228;i++)s+=char('0'+cipher.tickMajority());
    return s;
}
int main(int argc,char*argv[]){
    try{
        if(argc<2)throw invalid_argument("Dùng: cipher_demo tiny <K23> <Pbits> hoặc a5 <Khex16> <frame> <Pbits> [a2b|b2a]");
        string mode=argv[1],p,s;
        if(mode=="tiny"){
            if(argc!=4)throw invalid_argument("Dùng: cipher_demo tiny <K23> <Pbits>");
            p=argv[3];requireBinary(p);s=tiny(argv[2],p.size());
        }else if(mode=="a5"){
            if(argc<5)throw invalid_argument("Dùng: cipher_demo a5 <Khex16> <frame> <Pbits> [a2b|b2a]");
            auto key=parseHexKey(argv[2]);
            uint32_t frame=(uint32_t)stoul(argv[3],nullptr,0);
            p=argv[4];requireBinary(p);
            string dir=argc>=6?argv[5]:"a2b";
            if(dir!="a2b"&&dir!="b2a")throw invalid_argument("Hướng chỉ hỗ trợ a2b hoặc b2a");
            s=a5(key,frame,p.size(),dir=="b2a");
        } else throw invalid_argument("Hệ mã không hợp lệ");
        string c=xorBits(p,s),r=xorBits(c,s);
        cout<<"P="<<p<<"\nS="<<s<<"\nC="<<c<<"\nRecovered="<<r<<"\nStatus="<<(p==r?"PASS":"FAIL")<<"\n";
    }catch(const exception&e){cerr<<"ERROR: "<<e.what()<<"\n";return 1;}
}
