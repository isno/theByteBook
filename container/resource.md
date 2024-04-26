# 7.5 资源模型



## 资源模型的抽象

与调度关系最密切的物理资源是处理器和内存/显存，根据调度的处理方式的差别，这两类资源又可分为可压缩和不可压缩两类。

可压缩的资源典型的是 CPU，此类资源超限时，容器进程使用 CPU 会被限制，应用表现变得卡顿，业务延迟明显增加，但**容器进程不会被杀掉**。在 Kubernetes 中，一个 Node 节点 CPU 核心数量乘以 1000，得到的就是该 Node 节点总的 CPU 总数量。CPU 的计量单位为毫核（m），计量方式有多种写法：50m、0.5（`1000m*0.5`）。CPU 的计量是绝对值，这意味着无论容器运行在单核、双核机器上，500m CPU 表示的是相同的计算能力。

不可压缩的资源为内存、显存（GPU），容器之间无法共享且完全独占，这也就意味着资源一旦耗尽或者不足，容器进程一定产生 OOM 问题（Out of Memory，内存溢出）并**被杀掉**。内存的计算单位为字节，计量方式有多种写法，譬如使用 M（Megabyte）、Mi（Mebibyte）以及不带单位的数字，以下表达式所代表的是相同的值。

```plain
128974848, 129e6, 129M, 123Mi
```
注意 Mebibyte 和 Megabyte 的区分，123 Mi = `123*1024*1024B` 、123 M = `1*1000*1000 B`。1M < 1Mi，显然使用带小 i 的更准确。

由于每台 node 上会运行 kubelet/docker/containerd 等 Kubernetes 相关基础服务，因此并不是一台 node 的所有资源都能给 Kubernetes 创建 pod 用。 所以，Kubernetes 在资源管理和调度时，需要把这些基础服务的资源使用量和 enforcement 单独拎出来。

为此，Kubernetes 提出了 Node Allocatable Resources 提案。

- SystemReserved：操作系统的基础服务，例如 systemd、journald 等，Kubernetes 不能管理这些资源的分配，但是能管理这些资源的限额。
- KubeReserved：预留 Kubernetes 基础设施服务，包括 kubelet/docker/containerd 等等使用的资源。
- Allocatable：可供 Kubernetes 创建 pod 使用的资源

## 异构资源



