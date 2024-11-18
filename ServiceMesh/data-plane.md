# 8.3 数据平面技术：对应用透明

数据平面由轻量级的网络代理（如 Envoy 或 Linkerd Proxy）组成，核心职责是在不可靠的网络环境中确保服务间通信的可靠性。确保服务间通信的可靠性并不是什么高深的技术，服务网格之所以被追捧的原因在于，实现上述目标的整个过程无需手动配置，对应用完全透明。

接下来，我们将从 SideCar 自动注入、流量透明劫持、实现可靠通信三个方面讨论数据平面的工作原理。

## 8.3.1 Sidecar 自动注入

只要用过 Istio 的读者一定知道，带有 istio-injection: enabled 标签的命名空间中创建 Pod，Kubernetes 会自动为创建的 Pod 注入一个名为 istio-proxy 的 Sidecar 容器。

实现自动注入 Sidecar 的核心在于 Kubernetes 的准入控制器。

:::tip 准入控制器
准入控制器会拦截 Kubernetes API Server 收到的请求，在资源对象被持久化到 etcd 之前，对这些对象进行校验和修改。准入控制器分为两类：Mutating 和 Validating：
- Validating 类型的准入控制器用于校验请求，它们不能修改对象，但是可以拒绝不符合特定策略的请求；
- Mutating 类型的准入控制器在对象被创建或更新时可以修改它们。
:::

Istio 预先在 Kubernetes 集群中注册了一个类型为 Mutating 类型的准入控制器，它包含以下内容：

- Webhook 服务地址：指向运行注入逻辑的 Webhook 服务（如 Istio 的 istio-sidecar-injector）。
- 匹配规则：定义哪些资源和操作会触发此 Webhook，例如针对 Pod 的创建请求。
- 注入条件：通过 Label 或 Annotation 决定是否对某些 Pod 进行注入。

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: sidecar-injector
webhooks:
  - name: sidecar-injector.example.com
    admissionReviewVersions: ["v1"]
    clientConfig:
      service:
        name: sidecar-injector-service
        namespace: istio-system
        path: "/inject"
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
        operations: ["CREATE"]
    namespaceSelector:
      matchLabels:
        istio-injection: enabled
```

以上配置指示 Kubernetes 在带有 istio-injection: enabled 标签的命名空间中，拦截 Pod 创建请求并触发 Istio 的 Webhook。Webhook 服务会将 Sidecar 容器（如 Envoy）注入到 Pod 配置中。之后，Kubernetes 使用更新后的配置完成资源调度和 Pod 创建流程。


## 8.3.2 流量透明劫持

Isito 在注入边车代理后，还会注入一个初始化容器 istio-init。该容器的配置如下：

```yaml
initContainers:
  - name: istio-init
    image: docker.io/istio/proxyv2:1.13.1
    args: ["istio-iptables", "-p", "15001", "-z", "15006", "-u", "1337", "-m", "REDIRECT", "-i", "*", "-x", "", "-b", "*", "-d", "15090,15021,15020"]
```
上述配置中，istio-init 容器的入口命令是 istio-iptables，该命令设置一系列 iptables 规则，对除了特定的几个端口，如 15090、15021、15020 的流量拦截，重定向到 Istio 的 Sidecar 代理（Envoy）上：
- 对于入站流量，它会将流量重定向到 Sidecar 代理监听的端口（通常是 15006 端口）；
- 对于出站流量，它会将流量重定向到 Sidecar 代理监听的另一个端口（通常是 15001 端口）。

通过 iptables -t nat -L -v 命令查看 istio-iptables 添加的 iptables 规则。

```
# 查看 NAT 表中规则配置的详细信息
$ iptables -t nat -L -v
# PREROUTING 链：用于目标地址转换（DNAT），将所有入站 TCP 流量跳转到 ISTIO_INBOUND 链上
Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
    2   120 ISTIO_INBOUND  tcp  --  any    any     anywhere             anywhere

# INPUT 链：处理输入数据包，非 TCP 流量将继续 OUTPUT 链
Chain INPUT (policy ACCEPT 2 packets, 120 bytes)
 pkts bytes target     prot opt in     out     source               destination

# OUTPUT 链：将所有出站数据包跳转到 ISTIO_OUTPUT 链上
Chain OUTPUT (policy ACCEPT 41146 packets, 3845K bytes)
 pkts bytes target     prot opt in     out     source               destination
   93  5580 ISTIO_OUTPUT  tcp  --  any    any     anywhere             anywhere

# POSTROUTING 链：所有数据包流出网卡时都要先进入POSTROUTING 链，内核根据数据包目的地判断是否需要转发出去，我们看到此处未做任何处理
Chain POSTROUTING (policy ACCEPT 41199 packets, 3848K bytes)
 pkts bytes target     prot opt in     out     source               destination

# ISTIO_INBOUND 链：将所有目的地为 9080 端口的入站流量重定向到 ISTIO_IN_REDIRECT 链上
Chain ISTIO_INBOUND (1 references)
 pkts bytes target     prot opt in     out     source               destination
    2   120 ISTIO_IN_REDIRECT  tcp  --  any    any     anywhere             anywhere             tcp dpt:9080

# ISTIO_IN_REDIRECT 链：将所有的入站流量跳转到本地的 15006 端口，至此成功的拦截了流量到 Envoy 
Chain ISTIO_IN_REDIRECT (1 references)
 pkts bytes target     prot opt in     out     source               destination
    2   120 REDIRECT   tcp  --  any    any     anywhere             anywhere             redir ports 15006

# ISTIO_OUTPUT 链：选择需要重定向到 Envoy（即本地） 的出站流量，所有非 localhost 的流量全部转发到 ISTIO_REDIRECT。为了避免流量在该 Pod 中无限循环，所有到 istio-proxy 用户空间的流量都返回到它的调用点中的下一条规则，本例中即 OUTPUT 链，因为跳出 ISTIO_OUTPUT 规则之后就进入下一条链 POSTROUTING。如果目的地非 localhost 就跳转到 ISTIO_REDIRECT；如果流量是来自 istio-proxy 用户空间的，那么就跳出该链，返回它的调用链继续执行下一条规则（OUPT 的下一条规则，无需对流量进行处理）；所有的非 istio-proxy 用户空间的目的地是 localhost 的流量就跳转到 ISTIO_REDIRECT
Chain ISTIO_OUTPUT (1 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 ISTIO_REDIRECT  all  --  any    lo      anywhere            !localhost
   40  2400 RETURN     all  --  any    any     anywhere             anywhere             owner UID match istio-proxy
    0     0 RETURN     all  --  any    any     anywhere             anywhere             owner GID match istio-proxy	
    0     0 RETURN     all  --  any    any     anywhere             localhost
   53  3180 ISTIO_REDIRECT  all  --  any    any     anywhere             anywhere

# ISTIO_REDIRECT 链：将所有流量重定向到 Envoy（即本地） 的 15001 端口
Chain ISTIO_REDIRECT (2 references)
 pkts bytes target     prot opt in     out     source               destination
   53  3180 REDIRECT   tcp  --  any    any     anywhere             anywhere             redir ports 15001
```

根据图 8-10 进一步理解上述 iptables 自定义链（以 ISTIO_开头）处理流量的逻辑，

:::center
  ![](../assets/istio-iptables.svg)<br/> 
  图 8-10 Istio 透明流量劫持示意图
:::


使用 iptables 实现流量劫持是最经典的方式。不过，客户端 Pod 到服务端 Pod 之间的网络数据路径，至少要来回进入 TCP/IP 堆栈 3 次（出站、客户端 Sidecar Proxy 到服务端 Sidecar Proxy、入站）。如何降低流量劫持的延迟和资源消耗，是服务网格未来的主要研究方向。在 8.5 节，笔者将介绍 Proxyless 模式、Sidecarless 模式、Ambient Mesh 模式。

## 8.3.3 实现可靠通信

通过 iptables 劫持流量，转发至 Sidecar 后，Sidecar 根据配置接管应用程序之间的通信。

传统的代理（如 HAProxy 或者 Nginx）依赖静态配置文件来定义各种资源以及数据转发规则。而 Envoy 几乎所有配置都可以通过订阅来动态获取。

Envoy 将代理转发行为所涉及的配置抽象为三类资源：Listener、Cluster、Router。并以此为基础，定义了一系列标准数据面 API 用来发现和操作这些资源。

这套标准数据面 API 叫 xDS。xDS 是指 "X Discovery Service"，这里的 "X" 代指多种服务发现协议。

| 简写 |                全称                |        描述        |
| :--: | :--------------------------------: | :----------------: |
| LDS  |     Listener Discovery Service     |   监听器发现服务   |
| RDS  |      Route Discovery Service       |    路由发现服务    |
| CDS  |     Cluster Discovery Service      |    集群发现服务    |
| EDS  |     Endpoint Discovery Service     |  集群成员发现服务  |
| ADS  |    Aggregated Discovery Service    |    聚合发现服务    |
| HDS  |      Health Discovery Service      |   健康度发现服务   |
| SDS  |      Secret Discovery Service      |    密钥发现服务    |
|  MS  |           Metric Service           |      指标服务      |
| RLS  |         Rate Limit Service         |    限流发现服务    |
| LRS  |       Load Reporting service       |    负载报告服务    |
| RTDS |     Runtime Discovery Service      |   运行时发现服务   |
| CSDS |  Client Status Discovery Service   | 客户端状态发现服务 |
| ECDS | Extension Config Discovery Service |  扩展配置发现服务  |
| xDS  |        X Discovery Service         | 以上诸多API的统称  |

具体到每个 xDS 协议都包含大量的内容，笔者不再详述。但通过这些协议操作的资源，可大致说清楚它们的工作原理。

- **Listener**：Listener 可以理解为 Envoy 打开的一个监听端口，用于接收来自 Downstream（下游服务，即客户端）连接。每个 Listener 配置中核心包括监听地址、Filter 链（filter_chains）等。Envoy 支持多个 Listener，不同 Listener 之间几乎所有的配置都是隔离的。
	
	Listener 对应发现服务称之为 LDS（Listener Discovery Service）。LDS 是 Envoy 正常工作的基础，没有 LDS，Envoy 就不能实现端口监听，其他所有 xDS 服务也失去了作用。
- **Cluster**：在 Envoy 中，每个 Upstream（上游服务，即业务后端）被抽象成一个 Cluster。Cluster 包含该服务的连接池、超时时间端口、类型等等。上游服务即处理业务的后端，具体到 Kubernetes 中，则对应到某个 Service 服务。

	Cluster 对应的发现服务称之为 CDS（Cluster Discovery Service）。一般情况下，CDS 服务会将其发现的所有可访问服务全量推送给 Envoy。与 CDS 紧密相关的另一种服务称之为 EDS。CDS 服务负责 Cluster 资源的推送。当该 Cluster 类型为 EDS 时，说明该 Cluster 的所有 endpoints 需要由 xDS 服务下发，而不使用 DNS 等去解析。下发 endpoints 的服务就称之为 EDS。
- **Router**：Listener 接收来自下游的连接，Cluster 将流量发送给具体的上游服务，而 Router 定义了数据分发的规则，决定 Listener 在接收到下游连接和数据之后，应该将数据交给哪一个 Cluster 处理。虽然说 Router 大部分时候都可以默认理解为 HTTP 路由，但是 Envoy 支持多种协议，如 Dubbo、Redis 等，所以此处 Router 泛指所有用于桥接 Listener 和后端服务（不限定HTTP）的规则与资源集合。
	Route 对应的发现服务称之为 RDS（Route Discovery Service）。Router 中最核心配置包含匹配规则和目标 Cluster。此外，也可能包含重试、分流、限流等等。


Envoy 的另一项重要设计是其可扩展的 Filter 机制，通俗地讲就是 Envoy 的插件系统。Envoy 的许多核心功能都基于 Filter 实现，例如，针对 HTTP 流量和服务的治理主要依赖于两个插件：HttpConnectionManager（网络 Filter，负责协议解析）和 Router（负责流量分发）。通过 Filter 机制，Envoy 理论上能够支持任意协议，实现协议间的转换，并对请求流量进行全面的修改和定制。

Filter 并没有独立的 xDS 服务来进行配置发现，其所有配置都嵌套在其他 xDS 服务中，例如 LDS（Listener Discovery Service）、RDS（Route Discovery Service）和 CDS（Cluster Discovery Service）等

:::center
  ![](../assets/envoy-resource.png)<br/>
  图 8-11 Envoy 的动态配置示例
 
:::

最后，笔者用一个静态配置例子说明上述资源工作原理：

```yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        config:
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/service1" }
                route: { cluster: service1_cluster }
              - match: { prefix: "/service2" }
                route: { cluster: service2_cluster }
          http_filters:
          - name: envoy.filters.http.router

  clusters:
  - name: service1_cluster
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: service_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: service1.example.com, port_value: 80 }
  - name: service2_cluster
  	...
```

当客户端发送一个请求到 `http://<envoy-ip>:8080/service1` 时，Envoy 的 Listener 将接收该请求，使用路由规则将其转发到 service1_cluster。类似地，`http://<envoy-ip>:8080/service2` 的请求将被转发到 service2_cluster。