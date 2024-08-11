# 2.5.2 HTTPS 优化实践

HTTPS 的延迟要比 HTTP 高几百毫秒，尤其弱网环境下 HTTPS 的延迟问题更为明显。接下来，笔者介绍通过级 TLS 协议、选择合适的密码套件和开启 OCSP Stapling 等手段，来加速 HTTPS 请求。

## 1. 升级 TLS1.3 

HTTPS 连接建立时，TLS 握手通常需要最多 2 次 RTT，导致延迟比 HTTP 高几百毫秒。2018 年发布的 TLS 1.3 协议优化了握手流程，将握手时间缩短至 1 次 RTT，甚至可以复用之前连接时实现零 RTT。

以 Nginx 配置为例，确保 Nginx 版本为 1.13.0 及以上，OpenSSL 版本为 1.1.1 及以上，然后在配置文件中通过 ssl_protocols 指令增加 TLSv1.3 选项即可。

```
server {
	listen 443 ssl;
	ssl_protocols TLSv1.2 TLSv1.3;

	# 其他 SSL 配置...
}
```

## 2. 选择合适的密码套件

```nginx
server {
    listen 443 ssl;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 配置密码套件
    ssl_ciphers 'ECDHE+CHACHA20:ECDHE+CHACHA20-draft:ECDSA+AES128:ECDHE+AES128:RSA+AES128:RSA+3DES';

    # 其他 SSL 配置...
}
```

ssl_prefer_server_ciphers on 设置协商加密算法时，优先使用我们服务端的加密套件，而不是客户端浏览器的加密套件。

ssl_ciphers 指令用于选择密码套件，大多数密码套件包含以下内容：
- 密钥交换算法：常见的有 RSA 和 ECDHE 算法。两者的区别是：RSA 历史悠久，兼容性好，但不支持 PFS （Perfect Forward Secrecy，完美前向保密。保证密钥泄露时，不会影响过去或未来的会话密钥）。而 ECDHE 则基于椭圆曲线的 Diffie-Hellman (ECC-DH) 算法，计算速度更快，并且支持 PFS。
- 对称加密算法：例如 AES_128_GCM，对网络间传输的数据进行加密。
- 信息验证码算法（Mac）：例如使用 SHA256 散列算法来生成消息认证码，可确保数据完整性，验证数据在传输过程中未被篡改。

```bash
$ openssl ciphers -V 'ECDHE+CHACHA20:ECDHE+CHACHA20-draft:ECDSA+AES128:ECDHE+AES128:RSA+AES128:RSA+3DES' | column -t
0x13,0x02  -  TLS_AES_256_GCM_SHA384         TLSv1.3  Kx=any   Au=any    Enc=AESGCM(256)             Mac=AEAD
0x13,0x03  -  TLS_CHACHA20_POLY1305_SHA256   TLSv1.3  Kx=any   Au=any    Enc=CHACHA20/POLY1305(256)  Mac=AEAD
0x13,0x01  -  TLS_AES_128_GCM_SHA256         TLSv1.3  Kx=any   Au=any    Enc=AESGCM(128)             Mac=AEAD
0xCC,0xA9  -  ECDHE-ECDSA-CHACHA20-POLY1305  TLSv1.2  Kx=ECDH  Au=ECDSA  Enc=CHACHA20/POLY1305(256)  Mac=AEAD
0xCC,0xA8  -  ECDHE-RSA-CHACHA20-POLY1305    TLSv1.2  Kx=ECDH  Au=RSA    Enc=CHACHA20/POLY1305(256)  Mac=AEAD
0xC0,0x2B  -  ECDHE-ECDSA-AES128-GCM-SHA256  TLSv1.2  Kx=ECDH  Au=ECDSA  Enc=AESGCM(128)             Mac=AEAD
```
例如，TLS_AES_256_GCM_SHA384 这样的套件，AESGCM 256 128 位加密和AEAD。注意，TLS1.3 协议改为使用公钥加密（如 ECDHE 或 RSA）来生成共享密钥。在这种模式下，密钥交换是由协议本身自动处理的，因此不需要额外指定密钥交换算法。


## 3. 调整 https 会话缓存

- ssl_session_cache shared:SSL:10m; 设置ssl/tls会话缓存的类型和大小。shared:SSL:10m 表示所有的 nginx 工作进程共享 ssl 会话缓存，官网介绍 1M 可以存放约 4000 个 sessions。
- ssl_session_timeout 客户端可以重用会话缓存中 ssl 参数的过期时间。

## 4. 开启 OCSP stapling

OCSP stapling（一般翻译为 OCSP 装订）是一项 TLS 的拓展。客户端首次下载数字证书时需要向 CA 发起 OCSP（在线证书状态协议）请求，确认证书是否被撤销或过期。由于网络延迟，这个操作会导致产生 2s ~ 3s 不等的请求阻塞。

OCSP Stapling 将查询 OCSP 接口的工作交给服务器来做，服务器通过低频次查询，将查询结果缓存到服务器中（默认缓存时间60分钟）。当有客户端向服务器发起 TLS 握手请求时，服务器将证书的 OCSP 信息随证书链一同发送给客户端，从而避免了客户端验证证书时产生的阻塞问题。

:::center
  ![](../assets/OCSP-Stapling.png)<br/>
 图 2-24 OCSP Stapling 工作原理
:::

```
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /path/to/xxx.pem;
resolver 8.8.8.8 valid=60s;# 
resolver_timeout 2s;
``` 
要注意的是如果你的 CA 提供的 OCSP 需要验证的话，必须用 ssl_trusted_certificate 指定 CA 的中级证书和根证书（PEM 格式，放在一个文件中）的位置，否则会报错 ：[error] 17105#17105: OCSP_basic_verify() failed。

配置完成之后，使用 openssl 测试服务端是否已开启 OCSP Stapling 功能。

```bash 
$ openssl s_client -connect thebyte.com.cn:443 -servername thebyte.com.cn -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP" 
OCSP response:
OCSP Response Data:
    OCSP Response Status: successful (0x0)
    Response Type: Basic OCSP Response
```
若结果中存在“successful”关键字，则表示已开启 OCSP Stapling 服务。

## 5. 优化效果

HTTPS 优化手段除了软件层面，还有一些硬件加速的方案，如使用 QAT 加速卡（Quick Assist Technology，Intel 公司推出的一种专用硬件加速技术）。

通过对不同的证书（ECC 和 RSA），不同的 TLS 协议（TLS1.2、TLS1.3）进行压测，测试结果如表 2-2 所示。

:::center
表 2-2 HTTPS 性能基准测试
:::
|场景|QPS|Time|单次发出请求数|
|:--|:--|:--|:--|
|RSA 证书 + TLS1.2| 316.20| 316.254ms|100|
|RSA 证书 + TLS1.2 + QAT| 530.48| 188.507ms|100|
|RSA 证书 + TLS1.3| 303.01| 330.017ms|100|
|RSA 证书 + TLS1.3 + QAT| 499.29| 200.285ms|100|
|ECC 证书 + TLS1.2| 639.39| 203.319ms|100|
|ECC 证书 + TLS1.3| 627.39| 159.390ms|100|

从 SSL 加速的结果上看，使用 ECC 证书明显比 RSA 证书性能提升很多，即使 RSA 使用了 QAT 加速，比起 ECC 还是存在差距。此外，QAT 方案也存在硬件成本高、维护成本高的缺陷，不再推荐使用。

所以，推荐 HTTPS 设置使用 TLS1.3 协议 + ECC 证书方式。