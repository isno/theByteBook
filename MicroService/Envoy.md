# Envoy

先介绍 Envoy 主要是由于 Istio 本身依赖于 Envoy。Envoy 是 Istio Service Mesh 默认的数据平面，专为云原生应用程序设计。



Envoy 是一个由 C++ 开发的高性能七层代理，和 Nginx 的技术架构相似，也采用了 多线程 + 非阻塞 + 异步 IO（Libevent） 的架构。Envoy 核心是一个 L3/L4 代理，以 NetFilter hook 的形式执行 TCP/UDP 的相关任务，例如 TCP 转发，TLS 认证等。现在 Envoy 的功能已经非常完善 在 L3/L4 之上，Envoy 实现了 HTTP L7 代理、HTTP/2、gRPC、服务发现、负载均衡、Tracing、动态配置等等高级功能。	

Envoy 通常以 sidecar 的方式和应用服务并行运行，透明地代理应用服务发出/接收的流量。在这种机制下，应用服务只需要和 Envoy 通信，无需知道其他微服务应用在哪里。

## Envoy 关键组件

Proxy 有四个关键组件

- **监听器（Listener）：** 监听器定义了 Envoy 如何处理入站请求，目前 Envoy 仅支持基于 TCP 的监听器。一旦建立连接之后，就会将该请求传递给一组过滤器（filter）进行处理。
- **过滤器（Filter）：** 过滤器是处理入站和出站流量的链式结构的一部分。在过滤器链上可以集成很多特定功能的过滤器，例如，通过集成 GZip 过滤器可以在数据发送到客户端之前压缩数据。
- **路由（Router）：** 路由用来将流量转发到具体的目标实例，目标实例在 Envoy 中被定义为集群。
- **集群（Cluster）：** 集群定义了流量的目标端点，同时还包括一些其他可选配置，如负载均衡策略等

## Envoy 的运作流程

笔者在本文以静态配置的方式来进一步解读 Envoy 运作流程。

Envoy 配置的第一行定义了正在使用的接口配置，在这里我们将配置静态 API，因此第一行为

```plain
static_resources:
```

### 配置 Listeners

一个 Envoy 可以启动多个监听器，下面的配置项将创建一个新的监听器并将其绑定到 8080 端口。

```plain
listeners:
- name: listener_0
  address:
   	socket_address: { address: 0.0.0.0, port_value: 8000 }
```

这里不需要定义 server_name，域名将会交给过滤器来处理。

### 配置 过滤器

通过 Envoy 监听传入的流量，下一步是定义如何处理这些请求。每个监听器都有一组过滤器，并且不同的监听器可以具有一组不同的过滤器。

```plain
filter_chains:
- filters:
  - name: envoy.http_connection_manager
    config:
      codec_type: auto
      stat_prefix: ingress_http
      route_config:
        name: local_route
        virtual_hosts:
        - name: backend
          domains:
          	 - "thebyte.com.cn"
          routes:
          - match:
              prefix: "/"
            route:
              cluster: targetCluster
      http_filters:
      - name: envoy.router
```

该过滤器使用了 envoy.http_connection_manager，这是为 HTTP 连接设计的一个内置过滤器, 除了该过滤器，Envoy 中还内置了一些其他过滤器，包括 Redis、Mongo、TCP 等。

- route_config：路由配置
	- routes：如果 URL 前缀匹配，则一组路由规则定义了下一步将发生的状况。/ 表示匹配根路由。
	- cluster: 将要处理请求的集群名称，下面会有相应的实现。
- http_filters: 该过滤器允许 Envoy 在处理请求时去适应和修改请求

### 配置集群

Nginx upstream 配置项在 Envoy 中被定义为 Cluster。

Cluster 中的 hosts 列表用来处理被过滤器转发的流量，其中 hosts 的访问策略（例如超时）也在 Cluster 中进行配置，这有利于更精细化地控制超时和负载均衡。

```plain
clusters:
- name: targetCluster
  connect_timeout: 0.25s
  type: STRICT_DNS
  dns_lookup_family: V4_ONLY
  lb_policy: ROUND_ROBIN
  hosts: [
    { socket_address: { address: 127.0.0.1, port_value: 8082 }},
    { socket_address: { address: 127.0.0.1, port_value: 8083 }}
  ]
```

当使用 STRICT_DNS 类型的服务发现时，Envoy 将持续并异步地解析指定的 DNS 目标。DNS 结果中每个返回的 IP 地址将被视为上游集群中的显式主机。这意味着如果查询返回三个 IP 地址，Envoy 将假定该集群有三台主机，并且所有三台主机应该负载均衡。


### 管理模块

Envoy 提供了一个管理视图，可以让我们去查看配置、统计信息、日志以及其他 Envoy 内部的一些数据。

我们可以通过添加其他的资源定义来配置 admin，其中也可以定义管理视图的端口，不过需要注意该端口不要和其他监听器配置冲突。

```plain
admin:
  access_log_path: /tmp/admin_access.log
  address:
    socket_address: { address: 0.0.0.0, port_value: 9901 }
```


## 启动 Envoy Proxy

将以上的配置保存在 envoy.yaml 中，并启用 8082、8083 Server，准备测试 Envoy！

下面的命令将通过容器启动 Envoy Proxy，该命令将 Envoy 容器暴露在 80 端口上以监听入站请求，但容器内的 Envoy Proxy 监听在 8080 端口上,

```plain
$ docker run --name=envoy -p 80:8080 \
	--user 1000:1000 \
	-v /root/envoy.yaml:/etc/envoy/envoy.yaml \
	envoyproxy/envoy:latest

```

启动后，我们可以在本地的 80 端口上去访问应用 curl 来测试代理是否成功

```plain
 curl -H "Host: thebyte.com.cn" localhost -i
```

