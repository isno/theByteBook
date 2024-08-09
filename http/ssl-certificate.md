# 2.5.4 升级数字证书

SSL 层中的证书验证也是一个比较耗时的环节：服务器需要把自己的证书链全发给客户端，客户端接收后再逐一验证。证书环节我们关注两个方面优化：**证书校验** 、 **证书中非对称算法升级** 。

### 1. 证书校验优化

在验证证书时，客户端需要检查证书状态是否被撤销或过期，通常会访问 CA 下载 CRL（证书撤销列表）或查询 OCSP（在线证书状态协议）。这些操作涉及 DNS 查询、建立连接和收发数据，增加了多个 RTT。

改进方法是启用服务端的 OCSP Stapling 功能。OCSP Stapling 将原本由客户端发起的 OCSP 查询转移到服务端进行。服务端预先从 CA 获取 OCSP 响应，并在握手时将其与证书一并发送给客户端，从而免除了客户端连接 CA 服务器的步骤。



### 2. 配置 ECC 证书

在 TLS 协议中，应用数据都是经过对称加密后传输的，传输中所使用的对称密钥，则是在握手阶段通过非对称密钥交换而来。常见的 AES-GCM、ChaCha20-Poly1305 都是对称加密算法。

目前最常用的密钥交换算法有 RSA 和 ECDHE（椭圆曲线 Diffie-Hellman 密钥交换）。RSA 历史悠久，兼容性好，但不支持 PFS （Perfect Forward Secrecy，完美前向保密。保证即使私钥泄露，也无法破解泄露之前通信内容）。而 ECDHE 是使用了 ECC（椭圆曲线）的 DH（Diffie-Hellman）算法，计算速度快，支持 PFS。

内置 ECDSA 公钥的证书一般被称之为 ECC 证书，内置 RSA 公钥的证书就是 RSA 证书。

RSA 证书可以用于 RSA 密钥交换（RSA 非对称加密）或 ECDHE 密钥交换（RSA 非对称签名）；而 ECC 证书只能用于 ECDHE 密钥交换（ECDSA 非对称签名）。

ECC 证书最大的缺点就是兼容性问题，古代的 Windows XP 和 Android2.3 不支持 ECDHE 密钥交换。

好消息是，Nginx 1.11.0 开始提供了对 RSA/ECC 双证书的支持。它的实现原理是：分析在 TLS 握手中双方协商得到的 Cipher Suite，如果支持 ECDSA 就返回 ECC 证书，否则返回 RSA 证书。

使用适当的椭圆曲线生成 ecc 密钥。例如，secp256r1（即 P-256）和 secp384r1（即 P-384）是常用的椭圆曲线。使用更高安全级别的曲线（如 secp384r1）可以提供更强的加密强度，但会增加计算负担。

```bash
# 生成 ECC 私钥
$ openssl ecparam -name secp256r1 -genkey -noout -out ecc_private_key.pem
```
基于私钥 生成 CSR 证书请求文件。
```
# 生成 CSR（证书签名请求）
openssl req -new -key ecc_private_key.pem -out ecc_csr.pem
```

将 CSR 提交给证书颁发机构，获取一个签发的证书。

在 Nginx 里可以用 ssl_ciphers、ssl_ecdh_curve 等指令配置服务器使用的密码套件和协议，把优先使用的放在前面，配置示例：

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    # 选择支持的加密算法
    ssl_protocols TLSv1.2 TLSv1.3;
    # 启用服务器端选择加密套件的优先级
    ssl_prefer_server_ciphers on;

    ssl_ecdh_curve              X25519:P-256:P-384:P-521;

    # 配置证书和密钥
    ssl_certificate /etc/nginx/ssl/example.com.pem; # ECC 证书
    ssl_certificate_key /etc/nginx/ssl/example.com.key; # ECC 密钥


    # 配置密码套件
    ssl_ciphers 'ECDHE+CHACHA20:ECDHE+CHACHA20-draft:ECDSA+AES128:ECDHE+AES128:RSA+AES128:RSA+3DES';
}
```

启用服务器端优先选择加密套件的机制。默认情况下，客户端可以选择加密套件。如果启用该选项，服务器将优先选择其支持的最安全的加密套件，而不是接受客户端的选择。


配置完成之后，使用 https://myssl.com/ 服务测试证书配置，如图 2-20 所示。

:::center
  ![](../assets/ssl-test.png)<br/>
 图 2-20 使用 myssl.com 测试证书
:::


[^1]: CRL（Certificate Revocation List）证书撤销列表，是由 CA 机构维护的一个列表，列表中包含已经被吊销的证书序列号和吊销时间
[^2]: OCSP（Online Certificate Status Protocol）在线证书状态协议，是一种改进的证书状态确认方法，用于减轻证书吊销检查的负载和提高数据传输的私密性，相比于 CRL ，OCSP提供了实时验证证书状态的能力。

