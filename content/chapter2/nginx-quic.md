# 基于Nginx部署HTTP/3服务


对于Nginx来说，支持HTTP/3目前有两种方案可以选择：

- 基于Cloudflare的分支版本Nginx
- Nginx官方Nginx-quic项目

本文将会以部署nginx-quic的方式来让Nginx支持HTTP3.0/QUIC。

安装库文件支持

```
sudo yum install build-essential mercurial psmisc lsb-release cmake golang libunwind-dev git libpcre3-dev zlib1g-dev

```

### boringSSL安装

对于Nginx来说，在编译时需要配置对于的SSL库，不管是HTTP3.0还是HTTP2.0，始终都要基于HTTPS，而加密算法这块主要有OpenSSL来提供，而BoringSSL是谷歌创建的OpenSSL分支，用于支持TLS1.3的UDP协议0-RTT数据传输的加密算法

```
cd boringssl-master/
mkdir build
cd build
cmake ../
make

```

执行之后，可以在build/crypto，和build/ssl下获得对应的文件。

### 安装 Nginx

```
cd nginx-quic/
./auto/configure --prefix=/root/nginx --with-http_ssl_module --with-http_v2_module --with-http_v3_module --with-cc-opt="-I../boringssl-master/include" --with-ld-opt="-L../boringssl-master/build/ssl -L../boringssl-master/build/crypto"
make 
make install
```

执行命令之后，会在/root/nginx目录下生成对应的nginx可执行文件

### 修改配置文件支持HTTP/3

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

其中，要求使用TLSv1.3版本，并且当浏览器不支持http3时，可以选择http2。 另外，add_header Alt-Svc添加这个返回头不可缺少。

Alt-Svc 全称为“Alternative-Service”，直译为“备选服务”。该头部列举了当前站点备选的访问方式列表，让服务器可以告诉客户端 “看，我在这个主机的这个端口用这个协议提供相同的服务”。一般用于在提供 “QUIC” 等新兴协议支持的同时，实现向下兼容。


**验证HTTP3生效**

由于目前浏览器对HTTP3.0/QUIC的支持性有限，可以通过https://http3check.net/来验证站点启用HTTP3是否成功。

