# 容器间通信模型与 CNI 生态

这一节，我们走进容器网络通信，去了解容器间通信的逻辑以及 Kubernetes 集群的网络模型设计。如果把 Pod 比作超亲密容器组，那么根据亲密关系的远近，也带来以下几个以距离进行分类的容器通信场景。


kubernetes 集群初始化配置文件 networking 部分如下。

```
...
networking:
  serviceSubnet: "172.18.0.0/20"
  podSubnet: "172.16.0.0/16"
  dnsDomain: "cluster.local"
....
```

整个集群的 Service 和 Pod 的 CIDR 我们分别划分为 172.18.0.0/20、172.16.0.0/16 ，这样我们 65,536 个 Pod 的容量。


根据上面的网络配置模型，Pod 完成了所示的本地通信、同节点通信、跨节点通信。

- 本地通信就是 Pod 内部不同容器间的通信，同一个 Pod 内的容器共享同一个网络命名空间，所以它们之间通过 Loopback 回环接口，保证端口不冲突就能完成通信。
- 同节点之间的通信，Pod 通过 veth 设备全部关联在同一个cni0网桥中，实际上就是虚拟 Linux 网桥内部的通信，和现实中二层局域网内部设备之间通信没有差别。
- 跨节点的通信只能通过宿主机的物理网卡进行，cni0 网桥流转到宿主机的 eth0 接口，再发送给 VPC 路由，VPC 路由到目标节点。flannel 收到数据包之后解封，再发送到 cni0 网桥，然后完成通信。



## 网络插件生态

Kubernetes 本身不实现集群内的网络模型，而是通过将其抽象出来提供了 CNI 接口由更专业的第三方提供商实现，如此，把网络变成外部可扩展的功能，需要接入什么样的网络，设计一个对应的网络插件即可。这样一来节省了开发资源可以集中精力到 Kubernetes 本身，二来可以利用开源社区的力量打造一整个丰富的生态。现如今，支持 CNI 的插件多达二十几种，如下图所示[^1]。

<div  align="center">
	<img src="../assets/cni-plugin.png" width = "500"  align=center />
	<p>CNI 网络插件 </p>
</div>

上述几十种网络插件笔者不可能逐一解释，但跨主机通信不论形式如何变化，总归为以下几种。

- **Overlay 模式**：笔者在 VXLAN 篇已经介绍过 Overlay 网络通信的原理，这是一种虚拟的上层逻辑网络，其优点是不受底层网络限制，只要是三层网络互通，就能完成跨数据中心的网络互联，但弊端是数据封包、解包有一定的计算压力和网络延迟消耗。在一个网络受限的环境中（譬如不允许二层通信，只允许三层转发），那么就意味着只能使用 Overlay 模式网络插件。常见的 Overlay 模式网络插件有 Cilium（VXLAN 模式）、老牌的 Calico（IPIP 模式）以及 Flannel（VXLAN）等。

- **三层路由**，主要是借助 BGP/hostgw 等三层路由协议完成路由传递。这种方案优势是传输率较高，不需要封包、解包，缺点是 BGP 等协议在很多数据中心并不支持，且设置也很麻烦。常见的路由方案网络插件有 Calico（BGP 模式）、Cilium（BGP 模式）。

- **underlay 模式** 基于 macvlan、ipvlan 等，这种模式所配置的容器网络同主机网络在同一个 LAN 里面，可以具有和主机一样的网络能力，并且没有其它诸如 bridge 等方式带来的 bridge 处理和地址翻译的负担，这种方式能最大限度的利用硬件的能力，往往有着最优先的性能表现，但也由于它直接依赖硬件和底层网络环境限制，必须根据软硬件情况部署，没有 overlay 那样开箱即用的灵活性。


此外，对于容器编排系统来说，网络并非孤立的功能模块，还要能提供各类的网络访问策略能力支持，譬如 Kubernetes 的 Network Policy 这种用于描述 Pod 之间访问这类 ACL 策略以及加密通信，这些也明显不属于 CNI 范畴，因此并不是每个 CNI 插件都会支持这些额外的功能。如果你有这方面的需求，那么第一个就要排除 Flannel 了，如果按功能的丰富度而言，受到广泛关注的无疑是 Calico 和 Cilium。


对于插件性能表现方面，笔者引用 cilium 官方的测试数据[^2]，受限于篇幅，笔者给出文章内一部分性能占用表现（运行 32 个并行的 netperf 进程，按 TCP-CRR 的策略测试 cilium 与 Calico 的每秒请求数以及资源占用情况），其结果如下图所示。

:::tip 额外知识

TCP-CRR 表示在一次 TCP 链接中只进行一组 Request/Response 通信即断开，并不断新建 TCP 链接时的响应效率。TCP-CRR 在 Web 服务器访问中较为普遍。

:::

<div  align="center">
	<img src="../assets/bench_tcp_crr_32_processes.png" width = "500" align=center />
	<p>性能表现</p>
</div>

<div  align="center">
	<img src="../assets/bench_tcp_crr_32_processes_cpu.png" width = "500"  align=center />
	<p>资源占用表现</p>
</div>

从结果上看，综合吞出量、延迟表现或者资源占用的表现 Cilium 无疑非常出色。最后，且刨除网络受限环境的影响，假设所有的 CNI 插件我们都可以选择，笔者给到以下建议：如果只是一个小型节点集群，且不关心安全性，那么建议使用最轻最稳定的 Flannel；如果是一个标准化的集群，且看中 CNI 之外的功能（譬如可观测、Network Policy、加密通信），笔者建议就选择势头正劲的 Cilium。

[^1]: 参见 https://landscape.cncf.io/guide#runtime--cloud-native-network
[^2]: 参见 https://cilium.io/blog/2021/05/11/cni-benchmark/