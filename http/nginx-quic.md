# 基于 Nginx 部署HTTP/3服务

对于Nginx来说，支持HTTP/3目前有两种方案可以选择：

- 基于 Cloudflare 的分支版本 Nginx
- Nginx官方 Nginx-quic 项目

本文将会以部署nginx-quic的方式来让Nginx支持HTTP3.0/QUIC。

## boringSSL

BoringSSL 是谷歌创建的 OpenSSL 分支，用于支持 TLS1.3 UDP协议 0-RTT 数据传输的加密算法。

```
git clone https://boringssl.googlesource.com/boringssl
mkdir boringssl/build
cd boringssl/build
cmake ..
make
```

## 安装 nginx-quic

```
cd nginx-quic/
./auto/configure 
--prefix=/usr/local/nginx-quic
--with-http_ssl_module 
--with-http_v2_module 
--with-http_v3_module 
--with-cc-opt="-I../boringssl-master/include" 
--with-ld-opt="-L../boringssl-master/build/ssl -L../boringssl-master/build/crypto"

make 
make install
```

## 启用 HTTP/3

```
server {
    listen 443 ssl http2;              # TCP listener for HTTP/2
    listen 443 http3 reuseport;  # UDP listener for QUIC+HTTP/3

    ssl_protocols       TLSv1.3; # QUIC requires TLS 1.3
    ssl_certificate     ssl/www.example.com.crt;
    ssl_certificate_key ssl/www.example.com.key;

    add_header Alt-Svc 'quic=":443"; h3-27=":443";h3-25=":443"; h3-T050=":443"; h3-Q050=":443";h3-Q049=":443";h3-Q048=":443"; h3-Q046=":443"; h3-Q043=":443"'; # Advertise that QUIC is available
}
```

在以上配置中，使用TLSv1.3版本，并且当浏览器不支持http3时，可以选择http2。 

另外，add_header Alt-Svc添加这个返回头不可缺少，Alt-Svc 全称为“Alternative-Service”，直译为“备选服务”。

该头部列举了当前站点备选的访问方式列表，让服务器可以告诉客户端 “看，我在这个主机的这个端口用这个协议提供相同的服务”。一般用于在提供 “QUIC” 等新兴协议支持的同时，实现向下兼容。