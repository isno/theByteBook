# 3.4.2 SSL 层优化指南

HTTPS 请求耗时中 SSL 层处理约占了 50%，这是由于 TLS 握手阶段最长可以花费 2-RTT，SSL 层除去握手延迟外，还有其他的一些「隐形」消耗。不做任何优化措施情况下，网络耗时和加解密耗时影响会让 HTTPS 连接效率比 HTTP 慢上几百毫秒，在高延迟网络环境下，HTTPS 延迟问题会更加明显。

对于 SSL 层的优化，我们可以针对两个方向进行：**协议升级、证书优化**。

## 1. 升级 TLS1.3 协议

优化 SSL 层，效果较为明显的手段是升级最新 TLS1.3 协议。TLS 1.3 放弃了安全性较低的加密功能的支持，并改进了 TLS 握手。TLS 1.3 中的 TLS 握手只需要一次 RTT 而不是两次，如果客户端复用之前连接，TLS 握手的往返次数可以为零。这使 HTTPS 连接更快，减少延迟并改善整体用户体验。

<div  align="center">
	<p>图：TLS1.2 握手流程</p>
	<img src="../assets/tls1.2.png" width = "350"  align=center />
</div>

从上图可以看出，使用 TLS 1.2 需要两次往返（ 2-RTT ）才能完成握手，然后才能发送请求。

<div  align="center">
	<p>图：TLS1.3 握手流程</p>
	<img src="../assets/tls1.3.png" width = "350"  align=center />
</div>

相比 TLS 1.2，TLS 1.3 的握手时间减半。这意味着访问一个移动端网站，使用 TLS 1.3 协议，会降低将近 100ms 的延时。


## 证书优化

除了密钥交换，握手过程中的证书验证也是一个比较耗时的操作，服务器需要把 自己的证书链 全发给客户端，然后客户端接收后再逐一验证。

这里就有两个优化点：**证书传输** 、 **证书验证** 。

###  使用 ECDSA 证书

在使用 ECDSA 证书之前，我们先了解几个概念

- **ECC**：Elliptic Curves Cryptography，椭圆曲线密码编码学
- **ECDSA**：用于数字签名，是ECC与DSA的结合，整个签名过程与DSA类似，所不一样的是签名中采取的算法为ECC，最后签名出来的值也是分为R,S。在使用ECC进行数字签名的时候，需要构造一条曲线，也可以选择标准曲线，例如：prime256v1、secp256r1、nistp256、secp256k1（比特币中使用了该曲线）等等
- **ECDH**：是基于ECC 和 DH（ Diffie-Hellman）密钥交换算法


### 为什么要使用 ECC

ECC(Elliptic curve cryptography), 意为椭圆曲线密码编码学，和RSA算法一样，ECC算法也属于公开密钥算法。最初由Koblitz和Miller两人于1985年提出，其数学基础是利用椭圆曲线上的有理点构成Abel加法群上椭圆离散对数的计算困难性。

ECC 算法可以用较少的计算能力提供比RSA加密算法更高的安全强度，有效地解决了“提高安全强度必须增加密钥长度”的工程实现问题。

<div  align="center">
	<p>图：ECC vs RSA</p>
	<img src="../assets/ecc.png" width = "420"  align=center />
</div>

ECC与RSA相比，拥有突出优势：
* 更适用于移动互联网， ECC 加密算法的密钥长度很短，意味着占用更少的存储空间，更低的CPU开销和占用更少的带宽
* 更好的安全性,ECC 加密算法提供更强的保护，比目前其他加密算法能更好的防止攻击.
* 计算量小，处理速度更快，在私钥的处理速度上（解密和签名），ECC 远比 RSA、DSA 快得多。


椭圆曲线也要选择高性能的曲线，最好是 x25519，次优选择是 P-256。对称加密算法方面，也可以选用 AES_128_GCM ，它能比 AES_256_GCM 略快。


在 Nginx 里可以用 ssl_ciphers、ssl_ecdh_curve 等指令配置服务器使用的密码套件和椭圆曲线，把优先使用的放在前面，例如：

```
ssl_dyn_rec_enable on;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ecdh_curve X25519:P-256;
ssl_ciphers [ECDHE-ECDSA-CHACHA20-POLY1305|ECDHE-RSA-CHACHA20-POLY1305|ECDHE-ECDSA-AES256-GCM-SHA384|ECDHE-RSA-AES256-GCM-SHA384]:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:20m;
ssl_session_timeout 15m;
ssl_session_tickets off;

```

### 算法安全性比较

下表为ECC和RSA的安全性比较

|攻破时间(MIPS年)|RSA/DSA密钥长度| ECC密钥长度|RSA/ECC密钥长度比|
|:---|:---|:---|:---|
|104|512|106|5:1|
|108|768|132|6:1|
|1011|1024|160|7:1|
|1020|2048|210|10:1|
|1078|21000|600|35:1|


## OCSP Stapling

客户端的证书验证其实是个很复杂的操作，除了要公钥解密验证多个证书签名外，因为证书还有可能会被撤销失效，客户端有时还会再去访问 CA，下载 CRL 或者 OCSP 数据，这又会产生 DNS 查询、建立连接、收发数据等一系列网络通信，增加多个 RTT。

OCSP stapling 是 证书校验优化方案之一，将原本需要客户端实时发起的 OCSP 请求转嫁给服务端，它可以让服务器预先访问 CA 获取 OCSP 响应，然后在握手时随着证书一起发给客户端，免去了客户端连接 CA 服务器查询的时间。

在 Nginx 中配置 OCSP stapling 服务
```
server {
    listen 443 ssl;
    server_name  xx.xx.com;
    index index.html;

    ssl_certificate         server.pem;#证书的.cer文件路径
    ssl_certificate_key     server-key.pem;#证书的.key文件

    # 开启 OCSP Stapling 当客户端访问时 NginX 将去指定的证书中查找 OCSP 服务的地址，获得响应内容后通过证书链下发给客户端。
    ssl_stapling on;
    ssl_stapling_verify on;# 启用OCSP响应验证，OCSP信息响应适用的证书
    ssl_trusted_certificate /path/to/xxx.pem;# 若 ssl_certificate 指令指定了完整的证书链，则 ssl_trusted_certificate 可省略。
    resolver 8.8.8.8 valid=60s;#添加resolver解析OSCP响应服务器的主机名，valid表示缓存。
    resolver_timeout 2s；# resolver_timeout表示网络超时时间
```


### 检查证书是否已开启 OCSP Stapling

通过命令 

``` 
openssl s_client -connect sofineday.com:443 -servername sofineday.com -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP" 
```

若显示如下结果，则表示已开启

```
OCSP response:
OCSP Response Data:
    OCSP Response Status: successful (0x0)
    Response Type: Basic OCSP Response
```