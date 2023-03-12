# CNI及网络治理

对于 k8s 来讲，网络属于最重要的功能。服务稳定的前提是网络必须保证稳定，集群内不同节点以及各个pod都需要一个良好的网络环境来运行。

K8s 在设计网络的时候，为了较灵活的实现各种网络底层，自己没有实现太多跟网络相关的操作，而是制定了一个规范标准 CNI （Container Network Interface）。

这个规范其实非常简单，主要是三个点：

- 定义一个配置文件，包含网络插件以及相关的配置信息
- CRI 调用插件，容器运行时与插件进行交互 
- 插件执行结果反馈

由于这种规范的灵活性，所以大家可以自由发挥，实现不同的CNI插件，由此市场上也出现了大量各式各样的网络插件。

比如 flannel，利用的静态路由表配置或者 vxlan 实现的网络通信。再比如 calico，是通过 BGP 协议实现了动态路由。

其他如 Weave，以及 OVN 之类的各种各样的网络插件。

这些插件虽然实现的方法各式各样，但是最终目的只有一个，就是让集群中的各种 pod 之间能自由通信。

## CNI 插件应用及网络治理

容器网络除了让集群正常运行外，还有那些场景呢？ 答案是网络治理！

<div  align="center">
	<img src="/assets/chapter4/cni.png" width = "650"  align=center />
</div>

我们通过以上的图分析，有以下几种业务需求:


- **固定IP**：对于现存虚拟化 / 裸机业务 / 单体应用迁移到容器环境后，都是通过 IP 而非域名进行服务间调用，此时就需要 CNI 插件有固定 IP 的功能，包括 Pod/Deployment/Statefulset
- **网络隔离**：不同租户或不同应用之间，容器组应该是不能互相调用或通信的
- **多集群网络互联**： 对于不同的 Kubernetes 集群之间的微服务进行互相调用的场景，需要多集群网络互联。这种场景一般分为 IP 可达和 Service 互通，满足不同的微服务实例互相调用需求
- **出向限制**：对于容器集群外的数据库 / 中间件，需能控制特定属性的容器应用才可访问，拒绝其他连接请求
- **入向限制**：限制集群外应用对特定容器应用的访问
- **带宽限制**：容器应用之间的网络访问加以带宽限制
- **出口网关访问**：于访问集群外特定应用的容器，设置出口网关对其进行 SNAT 以达到统一出口访问的审计和安全需求

### 开源CNI插件的应用实践

在 CNCF Landscape 中，Flannel、Calico、Cilium

#### 固定 IP

基本上主流 CNI 插件都有自己的 IPAM 机制，都支持固定 IP 及 IP Pool 的分配，并且各个 CNI 插件殊途同归的都使用了 Annotation 的方式指定固定 IP。

对于 Pod，分配固定 IP，对于 Deployment，使用 IP Pool 的方式分配。对于有状态的 Statefulset，使用 IP Pool 分配后，会根据 Pool 的分配顺序记好 Pod 的 IP，以保证在 Pod 重启后仍能拿到同样的 IP

Calico

```
"cni.projectcalico.org/ipAddrs": "[\"192.168.0.1\"]"
```

#### 多集群网络互联

假设多个集群，内部有不同的微服务需要实现互相调用，由于他们都是通过 IP 注册在集群外的 VM 注册中心的，在这种场景下，就需要多集群 Pod 互联互通。

Calico


Cilium 开启多集群网络连接也很简单：

```
cilium clustermesh enable --context $CLUSTER1
cilium clustermesh enable --context $CLUSTER2
```

#### 网络策略

对于 Pod 网络隔离、入向限制、出向限制的网络场景，可以整合成网络策略一同来说。

主流开源 CNI 都支持 Kubernetes NetworkPolicy，通过 Network Policy，可以在 3 层或 4 层做相应的网络安全限制。Network Policy 通过 Ingress 和 Egress 两种进行网络限制，默认都是放行的。也就是说，设置 Kubernetes 网络策略，主要以白名单的形式对集群内的流量进行安全限制。


**Cilium**

Cilium 有两个 CRD，CiliumNetworkPolicy 和 CiliumClusterwideNetworkPolicy，来实现单集群和多集群的网络策略能力。Cilium 支持 3、4、7 层网络策略。并增加 EndPoint Selector 和 Node Selector。除了普通的基于 PodSelector 和 CIDR 的限制，Cilium 可以支持更多种策略，比如：

DNS 限制策略，只允许 app: test-app 的端点通过 53 端口去 kube-system 命名空间的 "K8s:K8s-app": kube-dns 标签的 DNS 服务器访问 my-remote-service.com：

```
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "to-fqdn"
spec:
  endpointSelector:
    matchLabels:
      app: test-app
  egress:
    - toEndpoints:
      - matchLabels:
          "K8s:io.kubernetes.pod.namespace": kube-system
          "K8s:K8s-app": kube-dns
      toPorts:
        - ports:
           - port: "53"
             protocol: ANY
          rules:
            dns:
              - matchPattern: "*"
    - toFQDNs:
        - matchName: "my-remote-service.com"
```

Http 限制策略 , 只允许 org: empire 标签的端点对 deathstar 的 /v1/request-landing 进行 POST 操作：


```
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "rule"
spec:
  description: "L7 policy to restrict access to specific HTTP call"
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/v1/request-landing"
```

kafka 策略控制：


```
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "rule1"
spec:
  description: "enable empire-hq to produce to empire-announce and deathstar-plans"
  endpointSelector:
    matchLabels:
      app: kafka
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: empire-hq
    toPorts:
    - ports:
      - port: "9092"
        protocol: TCP
      rules:
        kafka:
        - role: "produce"
          topic: "deathstar-plans"
        - role: "produce"
          topic: "empire-announce"
```

#### Egress

对于特定业务出集群需不暴露 IP 或符合安全审计需求的场景，需要 Pod IP -> External IP 对外部业务进行访问。Cilium，Kube-OVN，Antrea 都有类似 Egress Gateway/Egress IP 的功能，特定标签的 Pod 通过 SNAT 为 Egress IP 访问集群外服务。

Cilium

```
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: egress-sample
spec:
  selectors:
  - podSelector:
      matchLabels:
        app: snat-pod
        io.kubernetes.pod.namespace: default
  destinationCIDRs:
  - "0.0.0.0/0"
  egressGateway:
    nodeSelector:
      matchLabels:
        node.kubernetes.io/name: node1
    egressIP: 10.168.60.100
```

#### 带宽管理

Cilium

```
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubernetes.io/egress-bandwidth: 10M
...
```
