# FinOps 成本管控实践

传统数据中心的成本比较固定，但云上环境就不一样了。云上服务大部分按量计费，开发人员如果不注意，云成本就可能会出现意料之外的变化，另外由于计费规则复杂，业务扩容对成本的影响也变得难以预测。对于许多特殊的云上资源，云服务商并未提供很好的成本分析手段，Kubernetes 集群成本就是其中之一。


## Kubernetes 成本分析

 Kubernetes 集群本身并不提供成本拆分的能力，只能查到集群的整体成本、每个节点组的成本等这样粗粒度的成本信息，缺乏细粒度的成本分析能力。此外，Kubernetes 集群是一个动态的运行环境，节点的数量、节点规格、Pod 所在的节点/Zone/Region，都可能会随着时间动态变动，这为成本分析带来了更大的困难。

这就导致我们很难回答这些问题：每条业务线、每个产品分别花了多少钱？是否存在资源浪费？有何优化手段？ 我们可以尝试基于 FinOps，通过工程化分析、可视化成本分析等手段来分析与管控 Kubernetes 的成本 

做好 Kubernetes 成本工作，有如下三个要点：

- 理解 Kubernetes 成本构成，准确分析 Kubernetes 成本有哪些难点
- 寻找优化 Kubernetes 集群、业务服务手段
- 确定 Kubernetes 集群的成本拆分手段，建立能快速高效地分析与管控集群成本的流程


## Kubernetes 的成本构成

以 阿里云的 ACK 为例，它的成本有这些组成部分：


|类别|说明|
|:--|:--|
| ACK 费用 |本身集群费用 ￥0.64/h|
| 节点费用 | ACK 的所有节点会收对应的 ECS 实例运行费用 |
| 存储费用 | ACK 中使用的 PV 会带来 EBS 数据卷的费用|
| 跨区流量费 | 所有节点之间的通讯如果跨区，则产生跨区流量费用|
| NAT 网关费用 | ACK 中的容器如果要访问因特网，就需要通过 NAT 网关，产生 NAT 费用|
| SLB 费用 | 服务如果要对外提供访问，最佳实践是通过 ali-load-balancer-controller 绑定 阿里云 SLB, 这里会产生 SLB 费用|
| 监控成本 | |


总结下，其实就是三部分成本：计算、存储、网络。其中计算与存储成本是相对固定的，而网络成本就比较动态，跟是否跨区、是否通过 NAT 等诸多因素有关。

## Kubernetes 资源分配方式

Kubernetes 提供了三种资源分配的方式，即服务质量 QoS，不同的分配方式，成本的计算难度也有区别

- Guaranteed resource allocation(保证资源分配): 即将 requests 与 limits 设置为相等，确保预留所有所需资源
	- 最保守的策略，服务性能最可靠，成本最高
	- 这种方式分配的资源，拆分起来是最方便的，因为它的计算成本是静态的
- Burstable resource allocation(突发性能)：将 requests 设置得比 limits 低，这样相差的这一部分就是服务的可 Burst 资源量
	- 最佳实践，选择合适的 requests 与 limits，可达成性能与可靠性之间的平衡
	- 这种资源，它 requests 的计算成本是静态的，Burstable 部分的计算成本是动态的
- Best effort resource allocation(尽力而为):只设置 limits，不设置 requests，让 Pod 可以调度到任何可调度的节点上
	- 这个选项会导致服务的性能无法保证，通常只在开发测试等资源受限的环境使用
	- 这种方式分配的资源，完全依赖监控指标进行成本拆分

## 安装 Kubecost

安装 Kubecost 建议使用 Helm 进行安装，使用以下命令：
```
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm repo update
helm upgrade --install kubecost kubecost/cost-analyzer --namespace kubecost --create-namespace
```

几分钟后，检查以确保 Kubecost 已启动并运行：

```
kubectl get pods -n kubecost

# Connect to the Kubecost dashboard UI

kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

现在可以打开浏览器并指向 http://127.0.0.1:9090 以打开 Kubecost UI。 在 Kubecost UI 中，选择群集以查看成本分配信息。