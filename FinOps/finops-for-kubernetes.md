# FinOps 成本管控实践


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