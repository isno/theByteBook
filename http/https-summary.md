# 3.4 HTTPS 原理及 SSL 优化实践

HTTPS (HTTP Secure) 并不是新协议，而是 HTTP 先和 SSL（Secure Sockets Layer 安全套接层）/ TLS (Transport Layer Security 安全层传输协议) 通信，再由 SSL/TLS 和 TCP 通信。在 HTTPS 的通信过程中，涉及了大量 TLS 握手、CA、数字证书、对称/非对称加密等信息。