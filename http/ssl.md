# 2.5.2 升级 TLS 1.3 协议

HTTPS 连接建立时，TLS 握手通常需要最多 2 次 RTT，导致延迟比 HTTP 高几百毫秒，尤其在弱网环境下更为明显。2018 年发布的 TLS 1.3 协议优化了握手流程，将握手时间缩短至 1 次 RTT，甚至可以复用之前连接时实现零 RTT。

Nginx 中配置 TLS 1.3 协议如下所示。确保 Nginx 版本为 1.13.0 及以上，OpenSSL 版本为 1.1.1 及以上，然后在配置文件中通过 ssl_protocols 指令增加 TLSv1.3 选项。

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