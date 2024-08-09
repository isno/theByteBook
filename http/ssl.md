# 2.5.2 升级 TLS 1.3 协议

在 HTTPS 连接建立过程中，TLS 握手通常需要最多 2 次 RTT，导致 HTTPS 的延迟比 HTTP 高出几百毫秒。特别是在弱网环境下，HTTPS 的延迟更为明显。

2018 年，IETF 发布的 TLS 1.3 协议改进了握手流程，并取消了部分安全性较低的加密功能。使用 TLS 1.3，握手只需 1 次 RTT，甚至可以在复用之前连接时实现零 RTT。

:::center
  ![](../assets/tls1.3.png)<br/>
 图 2-18 TLS 1.3 协议的握手过程
:::

在 Nginx 中配置 TLS 1.3，确保 Nginx 版本为 1.13.0 及以上，OpenSSL 版本为 1.1.1 及以上。然后在配置文件的 server 块中设置以下参数即可。

```nginx
server {
    listen 443 ssl;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 选择支持的加密套件
    ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256';

    # 其他 SSL 配置...
}
``` 