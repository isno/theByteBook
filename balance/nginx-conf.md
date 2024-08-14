# 4.4.1 七层代理配置指南

Nginx 是七层负载均衡的典型实现相信，常见的网关 OpenResty、Kong 核心都是基于 Nginx，它们的配置也基本延续 Nginx 的配置规范。本节，笔者选取部分代理相关的参数配置进行说明，以便读者了解 Nginx 或以 Nginx 为核心的网关配置操作。

Nginx 的主配置文件是 nginx.conf，这个配置文件一共由三部分组成：main、event 和 http。http 中又嵌套虚拟机。它们的嵌套关系如图 4-14所示。

:::center
  ![](../assets/nginx-conf.png)<br/>
  图 4-14 Nginx 配置
:::

## 1. Buffer 配置

在反向代理中，Buffer（缓冲）主要解决后端服务器与用户网络不对等的情况。如 Nginx 到后端服务器是 100KiB/s，用户到 Nginx 是 10Kib/s。这种情况下，如果没有启用 Buffer，会导致 Nginx 使用较长的时间处理用户端与后端服务器的连接，高并发下容易出现连接积压。

配置正确的 Buffer，将后端服务器的响应缓冲到 Nginx 服务器，Nginx 根据客户端的网络质量以匹配的网速将响应传递给客户端。这样既解决了连接积压问题，也实现了持续稳定地向客户端传递响应。Nginx 配置 Buffer 的示例如下：

```nginx
location / {
    proxy_buffering on;
    proxy_buffers 4 32k;
    proxy_buffer_size 2k;
    # 其他 nginx 配置
}
```
proxy_buffers 指令设置了为每个请求分配的 Buffer 大小和数量，4 指定了每个请求的 Buffer 数量，32K 指定了每个 Buffer 的大小（一个接口的响应一般在 32k）。proxy_buffer_size 指令设置了为处理响应头部分（HTTP header 部分）分配的 Buffer 的大小。


## 2. Cache 配置

缓存静态内容（如图片、CSS、JS 文件）可加速静态内容的访问，缓存动态内容可减少对后端服务器的请求次数，降低后端服务器的压力。

启用缓存后，Nginx 将响应保存在磁盘中，返回给客户端的数据首先从缓存中获取，这样子相同的请求不用每次都发送给后端服务器，减少到后端请求的数量。

启用缓存，需要在 http 上下文中使用 proxy_cache_path 指令，定义缓存的本地文件目录，名称和大小。缓存区可以被多个 server 共享，使用 proxy_cache 指定使用哪个缓存区。

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

缓存目录的文件名是 proxy_cache_key 的 MD5 值, proxy_cache_key 默认设置如下。

```plain
proxy_cache_key $scheme$proxy_host$uri$is_args$args;
```

当然也可以自定义缓存 key。
```plain
proxy_cache_key "$host$request_uri$cookie_user";
```

缓存不应该设置的太敏感，可以使用 proxy_cache_min_uses 设置相同的 key 的请求，访问次数超过指定数量才会被缓存。
```plain
proxy_cache_min_uses 5;
```

缓存设置的示例。

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

## 3. 七层负载均衡模式

跨多个应用程序实例的负载平衡是一种常用技术，用于优化资源利用率、最大化吞吐量、减少延迟和确保容错配置，Nginx 支持 6 种负载均衡模式：

|模式|介绍|
|:--|:--|
|轮循机制|默认机制，以轮循机制方式分发|
|最小连接|将下一个请求分配给活动连接数最少的服务器|
|ip-hash |客户端的 IP 地址将用作哈希键，来自同一个 ip 的请求会被转发到相同的服务器|
|hash|通用 hash，允许用户自定义 hash 的 key，key 可以是字符串、变量或组合|
|随机‎‎|每个请求都将传递到随机选择的服务器|
|权重|按照 weight 参数进行分配 |

作为反向代理，如果后端服务器在某个周期内响应失败次数超过规定值，Nginx 会将此服务器标记为失败，并在之后的一个周期不再将请求发送给这台服务器。在 upstream 配置中：
- 通过 fail_timeout‎‎ 来设置检查周期，默认为 10 秒；
- 通过 max_fails‎ 来设置检查失败次数，默认为 1 次。‎

配置案例如下所示。
```plain
upstream backend {
  server backend.thebyte.com.cn max_fails=3 fail_timeout=30s; 
} 
```
