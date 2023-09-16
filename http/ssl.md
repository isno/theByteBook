# 2.6.2 SSL 层优化实践

HTTPS连接中，TLS握手阶段最长可以花费 2-RTT，SSL层除去握手延迟外，还有其他的一些「隐形」消耗，不做任何优化措施情况下，网络耗时和加解密耗时影响会让 HTTPS 连接效率比 HTTP 慢上几百毫秒，在高延迟网络环境下，HTTPS 延迟问题会更加明显。

对于 SSL 层的优化，我们可以针对两个方向进行：**协议升级、证书优化**。

## 1. 升级 TLS1.3 协议

优化 SSL 层，效果较为明显的手段是升级最新 TLS1.3 协议。

TLS 1.3 放弃了安全性较低的加密功能的支持，并改进了 TLS 握手。TLS 1.3 中的 TLS 握手只需要一次 RTT 而不是两次，如果客户端复用之前连接，TLS 握手的往返次数可以为零，这使 HTTPS 连接更快，能显著减少延迟并改善用户体验。

<div  align="center">
	<img src="../assets/tls1.2.png" width = "350"  align=center />
    <p>图：TLS1.2 握手流程</p>
</div>

从上图可以看出，使用 TLS 1.2 需要两次往返（ 2-RTT ）才能完成握手，然后才能发送请求。

<div  align="center">
	<img src="../assets/tls1.3.png" width = "350"  align=center />
    <p>图：TLS1.3 握手流程</p>
</div>

相比 TLS 1.2，TLS 1.3 的握手时间减半。这意味着访问一个移动端网站，使用 TLS 1.3 协议，会降低将近 100ms 的延时。

## 2.证书优化

除了TLS协议中的密钥交换 RTT时延，SSL层中的证书验证也是一个比较耗时的操作，服务器需要把自己的证书链全发给客户端，然后客户端接收后再逐一验证。证书优化的就有两个部分可以操作：**证书传输** 、 **证书算法优化** 。

### 2.1 证书传输优化

客户端验证证书过程中，需要判断证书是否被被撤销失效等问题，需要再去访问 CA 下载 CRL 或者 OCSP 数据，这又会产生 DNS 查询、建立连接、收发数据等一系列网络通信，增加多个 RTT。

OCSP stapling（Online Certificate Status Protocol stapling）是一种改进的证书状态确认方法，用于减轻证书吊销检查的负载，和提高数据传输的私密性。OCSP stapling将原本需要客户端实时发起的 OCSP 请求转嫁给服务端，服务端通过预先访问 CA 获取 OCSP 响应，然后在握手时随着证书一起发给客户端，免去了客户端连接 CA 服务器查询的时间。

1. 在 Nginx 中配置 OCSP stapling 服务。
```
server {
    listen 443 ssl;
    server_name  thebyte.com.cn;
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


2. 检查服务端是否已开启 OCSP Stapling

通过命令 
``` 
openssl s_client -connect thebyte.com.cn:443 -servername thebyte.com.cn -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP" 
```
若显示如下结果，则表示已开启。
```
OCSP response:
OCSP Response Data:
    OCSP Response Status: successful (0x0)
    Response Type: Basic OCSP Response
```

### 2.2证书算法优化

SSL的证书根据算法不同可分为RSA证书和ECC证书，通常为了兼容性，大部分都使用 RSA 证书，不过在 Nginx 1.11.0 版本开始提供了对 RSA/ECC 双证书的支持。它的实现原理为分析在 TLS 握手中双方协商得到的 Cipher Suite，如果支持 ECDSA（基于ECC的签名算法）就返回 ECC 证书，否则返回 RSA 证书。

ECC与RSA相比，拥有突出优势。

* 更适用于移动互联网， ECC 加密算法的密钥长度很短，意味着占用更少的存储空间，更低的CPU开销和占用更少的带宽
* 更好的安全性,ECC 加密算法提供更强的保护，比目前其他加密算法能更好地防止攻击.
* 计算量小，处理速度更快，在私钥的处理速度上（解密和签名），ECC 远比 RSA、DSA 快得多。

ECC 算法可以用较少的计算能力提供比RSA加密算法更高的安全强度，有效地解决了“提高安全强度必须增加密钥长度”的工程实现问题。

<div  align="center">
    <p>图：ECC vs RSA</p>
    <img src="../assets/ecc.png" width = "420"  align=center />
</div>

密钥交换（ECDH）实现可以选择高性能的曲线实现，例如 x25519 或者 P-256。对称加密算法方面，也可以选用 AES_128_GCM 没有必要用更高长度的算法。

在 Nginx 里可以用 ssl_ciphers、ssl_ecdh_curve 等指令配置服务器使用的密码套件和椭圆曲线，把优先使用的放在前面，例如。

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

## 3.SSL优化效果

SSL 层的优化手段除了软件层面还有一些硬件加速的方案。例如 使用支持 AES-NI 特性的 CPU、或者使用专用 QAT 加速卡。

> 英特尔® Quick Assist Technology （以下简称 QAT）是Intel公司推出的一种专用硬件加速技术，可以用来提高Web服务器中计算密集的公钥加密以及数据压缩解压的吞吐率以及降低CPU负载。


通过对 ECC、RSA、TLS1.2、TLS1.3 等不同维度的测试。

|场景|QPS|Time|单次发出请求数|
|:--|:--|:--|:--|
|RSA证书 + TLS1.2| 316.20| 316.254ms|100|
|RSA证书 + TLS1.2 + QAT| 530.48| 188.507ms|100|
|RSA证书 + TLS1.3| 303.01| 330.017ms|100|
|RSA证书 + TLS1.3 + QAT| 499.29| 200.285ms|100|
|ECC证书 + TLS1.2| 639.39| 203.319ms|100|
|ECC证书 + TLS1.3| 627.39| 159.390ms|100|

> 数据来源于 爱奇艺QLB团队

从对 SSL 加速的结果上看，使用 QAT 对 RSA 证书加速后，能提升40%左右的性能。但不管哪种场景，使用 ECC 证书较 RSA 证书性能提升很多，即使 RSA 使用了 QAT 加速亦是如此。另外 QAT 方案的硬件成本、维护成本较高，综合考虑建议使用 TLS1.3 + ECC 证书方式。

