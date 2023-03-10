# Nginx

Nginx是一款轻量级、高性能HTTP和反向代理的web服务器软件。Nginx使用基于事件驱动的架构能够并发处理百万级别的TCP连接，高度模块化的设计和自由的许可证（最自由的2-clause BSD-like license许可）使得扩展Nginx功能的第三方模块层出不穷，而且优秀的设计带来了极佳的稳定性，因此其作为Web服务器被广泛应用到大流量的网站上。


## Nginx的工作模式

Nginx的工作模式是Master-Worker模式,在这种工作模式下，Master进程的作用读取并验证配置文件nginx.conf；管理worker进程。而Worker进程，都维护一个线程（避免线程切换），处理连接和请求。（Worker进程的个数由配置文件决定，一般和CPU个数相关（降低进程之间上下文切换带来的损耗，配置几个就有几个Worker进程）

<div  align="center">
	<img src="/assets/chapter3/nginx-process-model.png" width = "520"  align=center />
</div>

### Master进程
在这种模式下，Master进程启动以后初始化系统相应的信号量标志位，然后根据配置参数(子进程个数、最大连接数等)通过fork复制创建Worker进程，Worker进程与Master进程具有相同的上下文环境，接下来Master进程和Worker进程进入不同的循环，Master进程保存子进程返回的pid写入文件，接着进入信号处理的循环，监听系统接收到的(例如nginx -reload)信号并进行相关的处理

### Worker工作进程
Master进程fork复制出Worker进程，Worker进程环境变量(监听socket、文件描述符等)都一样，因此各个Worker进程完全等同，在相同的socket端口监听，请求到来时，每个Worker工作进程都会监听到，通过争抢机制最终只会有一个Worker进程会接受并处理。


## Nginx安装

本节对Nginx以源码形式安装，并增加HTTP/2、HTTP/3、TLS1.3、Brotli等完善支持，以供读者在生产环境部署的参考（在实践中可采用更加便捷的Docker方式部署）。

1) 安装zlib，使用Cloudflare优化的版本，比原版具有更高的压缩性能

```
git clone https://github.com/cloudflare/zlib.git zlib
cd zlib
make -f Makefile.in distclean
```

2) 安装OpenSSL1.1.1+版本，用于支持TLS1.3

```
wget https://www.openssl.org/source/openssl-1.1.1s.tar.gz
tar -zxvf openssl-1.1.1k.tar.gz && cd openssl-1.1.1k

./config --prefix=/usr/local/openssl-1.1.1k --openssldir=/usr/local/openssl-1.1.1k --libdir=/lib64 shared zlib-dynamic

make && make install
mv /usr/bin/openssl /usr/bin/openssl-backup
ln -s /usr/local/openssl-1.1.1k/bin/openssl /usr/bin/openssl
```

2) 下载及安装最新的Nginx稳定版本

```
wget https://nginx.org/download/nginx-1.22.1.tar.gz

tar -zxvf nginx-1.22.0.tar.gz && cd nginx-1.22.0

make && make install
```
## Nginx配置

Nginx的主配置文件是nginx.conf，这个配置文件一共由三部分组成，分别为全局块、events块和http块。在http块中，又包含http全局块、多个server块。每个server块中，可以包含server全局块和多个location块。在同一配置块中嵌套的配置块，各个之间不存在次序关系。

<div  align="center">
	<img src="/assets/chapter3/nginx-conf.png" width = "520"  align=center />
</div>

配置文件支持大量可配置的指令，绝大多数指令不是特定属于某一个块的。同一个指令放在不同层级的块中，其作用域也不同，一般情况下，高一级块中的指令可以作用于自身所在的块和此块包含的所有低层级块。如果某个指令在两个不同层级的块中同时出现，则采用“就近原则”，即以较低层级块中的配置为准。

在本节，将讲解部分重要的配置，以便读者了解Nginx性能优化相关的理论。



### 缓冲(buffer)/缓存(cache)
缓冲一般放在内存中，如果不适合放入内存（比如超过了指定大小），则会将响应写入磁盘临时文件中。启用缓冲后，Nginx先将后端的请求响应放入缓冲区中，等到整个响应完成后，再发给客户端。Nginx作为反向代理，缓冲主要是解决后端Server与用户网络不对等的情况，比如Nginx到Server是 100KiB/s, 用户到Nginx是10Kib/s, 这种情况下，如果没有启用buffer，会导致Nginx使用较长的时间处理 用户端与后端Server的连接，在高并发的环境下，会出现大量的连接积压。

开启代理缓冲后，nginx可以用较快的速度尽可能将响应体读取并缓冲到本地内存或磁盘中，然后同时根据客户端的网络质量以合适的网速将响应传递给客户端。
这样既解决了server端连接过多的问题，也保证了能持续稳定的像客户端传递响应。


Nginx使用proxy_buffering指令启用和禁用缓冲，
proxy_buffers 指令设置每个连接读取响应的缓冲区的大小和数量 。默认情况下，缓冲区大小等于一个内存页，4K 或 8K，具体取决于操作系统。

proxy_buffer_size 可以用来设置后端服务器响应的第一部分存储在单独的缓冲区，此部分通常是相对较小的响应headers，通常将其设置成小于默认值。

```
location / {
    proxy_buffers 16 4k;
    proxy_buffer_size 2k;
    proxy_pass http://localhost:8080;
}
```
### 缓存Cache

启用缓存后，nginx将响应保存在磁盘中，返回给客户端的数据首先从缓存中获取，这样子相同的请求不用每次都发送给后端服务器，减少到后端请求的数量。

启用缓存，需要在http上下文中使用 proxy_cache_path 指令，定义缓存的本地文件目录，名称和大小。
缓存区可以被多个server共享，使用proxy_cache 指定使用哪个缓存区。

```
http {
    proxy_cache_path /data/nginx/cache keys_zone=mycache:10m;
    server {
        proxy_cache mycache;
        location / {
            proxy_pass http://localhost:8000;
        }
    }
}
```

缓存目录的文件名是 proxy_cache_key 的MD5值, proxy_cache_key 默认设置如下

```
proxy_cache_key $scheme$proxy_host$uri$is_args$args;
```
当然也可以自定义缓存key

```
proxy_cache_key "$host$request_uri$cookie_user";
```

缓存不应该设置的太敏感，可以使用proxy_cache_min_uses设置相同的key的请求，访问次数超过指定数量才会被缓存。

```
proxy_cache_min_uses 5;
```

缓存设置的示例

```
http {
	proxy_cache_path /var/cache/nginx/data keys_zone=mycache:10m;
	server {
 		location = /html/demo.html {
	        proxy_cache mycache;
	        proxy_cache_valid 200 302 10m;
	        proxy_cache_valid 404      1m;
	        proxy_cache_valid any 5m;

	        proxy_pass http://localhost:8088;  
    	}
 	}
}


```

### 负载均衡

跨多个应用程序实例的负载平衡是一种常用技术，用于优化资源利用率、最大化吞吐量、减少延迟和确保容错配置，Nginx支持6种负载均衡模式

|模式|介绍|
|:--|:--|
|轮循机制|默认机制，以轮循机制方式分发|
|最小连接|将下一个请求分配给活动连接数最少的服务器|
|ip-hash |客户端的 IP 地址将用作哈希键，来自同一个ip的请求会被转发到相同的服务器|
|hash|通用hash，允许用户自定义hash的key，key可以是字符串、变量或组合|
|随机‎‎|每个请求都将传递到随机选择的服务器|
|权重|按照weight参数进行分配 |

在反向代理中，如果后端服务器在某个周期内响应失败次数超过规定值，Nginx会将此服务器标记为失败，并在之后的一个周期不再将请求发送给这台服务器。

在upstream配置中，通过fail_timeout‎‎来设置检查周期，默认为10秒。通过max_fails‎来设置检查失败次数，默认为1次。‎

如：
```
upstream backend {
  server backend.example.domain max_fails=3 fail_timeout=30s; 
} 
```

> 2-clause BSD-like license是BSD许可协议中最宽松的一种，它对开发者再次使用BSD软件只有两个基本的要求：一是如果再发布的产品中包含源代码，则在源代码中必须带有原来代
码中的BSD协议；二是如果再发布的只是二进制类库/软件，则需要在类库/软件的文档和版
权声明中包含原来代码中的BSD协议。
