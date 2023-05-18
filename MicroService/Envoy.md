# Envoy

先介绍 Envoy 主要是由于 Istio 本身依赖于 Envoy。Envoy 是 Istio Service Mesh 默认的数据平面，专为云原生应用程序设计。

Envoy 是一个由 C++ 开发的高性能七层代理，通常以 sidecar 的方式和应用服务并行运行，透明地代理应用服务发出/接收的流量。在这种机制下，应用服务只需要和 Envoy 通信，无需知道其他微服务应用在哪里。

现在 Envoy 的功能已经非常完善，核心是一个 L3/L4 代理，以 NetFilter hook 的形式执行 TCP/UDP 的相关任务，例如 TCP 转发，TLS 认证等。在 L3/L4 之上，Envoy 实现了 HTTP L7 代理、HTTP/2、gRPC、服务发现、负载均衡、Tracing、动态配置等等高级功能。	

Envoy有几个核心概念：listeners、cluster，filter chains(过滤链)，其中 listeners 和 cluster 之间的连接和交互是借助于 filter chains 当中的各种 filter 来实现


笔者在本文以静态配置的方式来进一步解读 Envoy 运作流程。

Envoy 配置的第一行定义了正在使用的接口配置，在这里我们将配置静态 API，因此第一行为

```
static_resources:
```

## Listeners

监听器是 Envoy 监听请求的网络配置，例如 IP 地址和端口, 并通过各种过滤规则后转发流量，一个 Envoy 可以启动多个监听器。我们这里的 Envoy 在 Docker 容器内运行，因此它需要监听 IP 地址 0.0.0.0，在这种情况下，Envoy 将在端口 8000 上进行监听

```
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 8000 }
```