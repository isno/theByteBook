# 2.5.3 开启 OCSP Stapling

HTTPS 首次请求时，需要向 CA 发起 OCSP（在线证书状态协议）请求，确认证书是否被撤销或过期。如果 OCSP 的服务器在国外，由于网络延迟，会导致产生 2s ~ 3s 不等的请求阻塞。

OCSP Stapling（一般翻译为 OCSP 装订）就是将查询 OCSP 接口的工作交给服务器来做，服务器通过低频次查询，将查询结果缓存到服务器中（默认缓存时间60分钟）。

OCSP Stapling 的工作原理如图所示，当有客户端向服务器发起 TLS 握手请求时，服务器将证书的 OCSP 信息随证书链一同发送给客户端，从而避免了客户端验证证书时产生的阻塞问题。

:::center
  ![](../assets/OCSP-Stapling.png)<br/>
 图 2-24 OCSP Stapling 工作原理
:::

以 Nginx 配置 OCSP Stapling 为例，配置如下所示。

```nginx configuration
server {
    listen 443 ssl;
    server_name  thebyte.com.cn;
    index index.html;

    ssl_certificate         server.pem; #证书的.cer文件路径
    ssl_certificate_key     server-key.pem; #证书的.key文件

    # 开启 OCSP Stapling 当客户端访问时 NginX 将去指定的证书中查找 OCSP 服务的地址，获得响应内容后通过证书链下发给客户端。
    ssl_stapling on;
    ssl_stapling_verify on;# 启用 OCSP 响应验证，OCSP 信息响应适用的证书
    ssl_trusted_certificate /path/to/xxx.pem;# 若 ssl_certificate 指令指定了完整的证书链，则 ssl_trusted_certificate 可省略。
    resolver 8.8.8.8 valid=60s;# 添加resolver解析OSCP响应服务器的主机名，valid表示缓存。
    resolver_timeout 2s;# resolver_timeout表示网络超时时间
}
```

配置完成之后，使用 openssl 测试服务端是否已开启 OCSP Stapling 功能。

```bash 
$ openssl s_client -connect thebyte.com.cn:443 -servername thebyte.com.cn -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP" 
OCSP response:
OCSP Response Data:
    OCSP Response Status: successful (0x0)
    Response Type: Basic OCSP Response
```
若结果中存在“successful”关键字，则表示已开启 OCSP Stapling 服务。