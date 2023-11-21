# 4.4.1 Nginx 代理指南

七层负载均衡的实现相信读者们已经非常熟悉，没错，它就是 Nginx。使用 Nginx 七层负载均衡能识别应用层协议，可以通过对 HTTP 头、URL、Cookie 做复杂的逻辑处理，实现更灵活的控制。互联网技术架构中，通常 7 层负载均衡的核心是 Nginx，结合 Lua 插件技术，如 OpenResty，能扩展实现功能丰富且性能较高的网关方案。



## Nginx 配置指导

Nginx 的主配置文件是 nginx.conf，这个配置文件一共由三部分组成，分别为全局块、events 块和 http 块。

在 http 块中又包含 http 全局块、多个 server 块。每个 server 块中可以包含 server 全局块和多个 location 块，在同一配置块中嵌套的配置块，各个之间不存在次序关系。

<div  align="center">
	<img src="../assets/nginx-conf.png" width = "450"  align=center />
    <p>图4-14 Nginx 配置</p>
</div>

配置文件支持大量可配置的指令，绝大多数指令不是特定属于某一个块的。

同一个指令放在不同层级的块中，其作用域也不同，一般情况下，高一级块中的指令可以作用于自身所在的块和此块包含的所有低层级块。如果某个指令在两个不同层级的块中同时出现，则采用“就近原则”，即以较低层级块中的配置为准。

在本节，将讲解部分重要的配置，以便读者了解 Nginx 性能优化相关的操作。


### 缓冲(buffer)/缓存(cache)

作为反向代理，缓冲主要是解决后端 Server 与用户网络不对等的情况，比如 Nginx 到 Server 是 100KiB/s, 用户到 Nginx 是 10Kib/s, 这种情况下，如果没有启用 buffer，会导致 Nginx 使用较长的时间处理 用户端与后端 Server 的连接，在高并发的环境下会出现大量的连接积压。

开启代理缓冲后 Nginx 可以用较快的速度尽可能将响应体读取并缓冲到本地内存或磁盘中，然后同时根据客户端的网络质量以合适的网速将响应传递给客户端。
这样既解决了 server 端连接过多的问题也保证了能持续稳定地向客户端传递响应。


Nginx 使用 proxy_buffering 指令启用和禁用缓冲，proxy_buffers 指令设置每个连接读取响应的缓冲区的大小和数量，默认情况下缓冲区大小等于一个内存页，4K 或 8K，具体取决于操作系统。

proxy_buffer_size 可以用来设置后端服务器响应的第一部分存储在单独的缓冲区，此部分通常是相对较小的响应 headers，通常将其设置成小于默认值。

```plain
location / {
    proxy_buffers 16 4k;
    proxy_buffer_size 2k;
    proxy_pass http://localhost:8080;
}
```
### 缓存 Cache

启用缓存后，Nginx 将响应保存在磁盘中，返回给客户端的数据首先从缓存中获取，这样子相同的请求不用每次都发送给后端服务器，减少到后端请求的数量。

启用缓存，需要在 http 上下文中使用 proxy_cache_path 指令，定义缓存的本地文件目录，名称和大小。

缓存区可以被多个 server 共享，使用 proxy_cache 指定使用哪个缓存区。
```plain
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

缓存目录的文件名是 proxy_cache_key 的 MD5 值, proxy_cache_key 默认设置如下

```plain
proxy_cache_key $scheme$proxy_host$uri$is_args$args;
```

当然也可以自定义缓存 key
```plain
proxy_cache_key "$host$request_uri$cookie_user";
```

缓存不应该设置的太敏感，可以使用 proxy_cache_min_uses 设置相同的 key 的请求，访问次数超过指定数量才会被缓存。
```plain
proxy_cache_min_uses 5;
```

缓存设置的示例

```plain
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

跨多个应用程序实例的负载平衡是一种常用技术，用于优化资源利用率、最大化吞吐量、减少延迟和确保容错配置，Nginx 支持 6 种负载均衡模式

|模式|介绍|
|:--|:--|
|轮循机制|默认机制，以轮循机制方式分发|
|最小连接|将下一个请求分配给活动连接数最少的服务器|
|ip-hash |客户端的 IP 地址将用作哈希键，来自同一个 ip 的请求会被转发到相同的服务器|
|hash|通用 hash，允许用户自定义 hash 的 key，key 可以是字符串、变量或组合|
|随机‎‎|每个请求都将传递到随机选择的服务器|
|权重|按照 weight 参数进行分配 |

在反向代理中，如果后端服务器在某个周期内响应失败次数超过规定值，Nginx 会将此服务器标记为失败，并在之后的一个周期不再将请求发送给这台服务器。

在 upstream 配置中，通过 fail_timeout‎‎来设置检查周期，默认为 10 秒。通过 max_fails‎来设置检查失败次数，默认为 1 次。‎

如：
```plain
upstream backend {
  server backend.example.domain max_fails=3 fail_timeout=30s; 
} 
```
