# 8.4 数据平面技术




## 流量劫持

```bash
$ /usr/local/bin/istio-iptables -p 15001 -z 15006 -u 1337 -m REDIRECT -i '*' -x "" -b * -d "15090,15201,15020"
```
该容器存在的意义就是让 Envoy 代理可以拦截所有的进出 Pod 的流量，即将入站流量重定向到 Sidecar，再拦截应用容器的出站流量经过 Sidecar 处理后再出站。

Init 容器通过向 iptables nat 表中注入转发规则来劫持流量的，下图显示的是三个 reviews 服务示例中的某一个 Pod，其中有 init 容器、应用容器和 sidecar 容器，图中展示了 iptables 流量劫持的详细过程。


:::center
  ![](../assets/istio-iptables.svg)<br/>
 
:::



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

使用 iptables 实现流量劫持是最经典的方式。不过，iptables 重定向流量。如何降低流量劫持的延迟和资源消耗，是未来服务网格的主要研究方向。在 8.5 节，笔者将介绍 Proxyless 模式、Sidecarless 模式、Ambient Mesh 模式。

## 可靠通信

通过 iptables 劫持流量，转发至 sidecar 后，sidecar 根据配置接管应用程序之间的通信，并进行处理。

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


Envoy 另外一个重要的设计是可扩展的 Filter 机制，通俗地讲就是 Envoy 的插件机制。

在 Envoy 中，很多核心功能都使用 Filter 来实现。比如对于 Http 流量和服务的治理就是依赖 HttpConnectionManager（Network Filter，负责协议解析）以及 Router（负责流量分发）两个插件来实现。利用 Filter 机制，Envoy 理论上可以实现任意协议的支持以及协议之间的转换，对请求流量进行全方位的修改和定制。

Filter 本身并没有专门的 xDS 服务来发现配置。Filter 所有配置都是嵌入在上述 LDS、RDS 以及 CDS（Cluster Network Filter）中的。

:::center
  ![](../assets/envoy-resource.png)<br/>
 
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