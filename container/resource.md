# 7.7.1 资源模型

## 1. 资源的分类
与调度最具有紧密关系的资源就是 CPU 和内存，根据资源不足表现的差异，这两类资源又可分为：

- **可压缩的资源**：典型的是 CPU，此类资源超限时，容器进程使用 CPU 会被限制，应用表现变得卡顿，业务延迟明显增加，但**容器进程不会被杀掉**。CPU 资源其实准确来讲，指的是 CPU 时间。所以它的基本单位为 millicores，1 个核等于 1000 millicores。也代表了 kubernetes 可以将单位 CPU 时间细分为 1000 份。

- **不可压缩的资源**：典型的是内存，这类资源容器之间无法共享，完全独占。这也就意味着资源一旦耗尽或者不足，容器进程一定产生 OOM 问题（Out of Memory，内存溢出）并**被杀掉**。内存基本单位是字节，计量方式有多种写法，譬如使用 M（Megabyte）、Mi（Mebibyte）以及不带单位的数字，以下表达式所代表的是相同的值。

```plain
128974848, 129e6, 129M, 123Mi
```
注意 Mebibyte 和 Megabyte 的区分，123 Mi = `123*1024*1024 B` 、123 M = `1*1000*1000 B`，显然使用带小 i 的更准确。

## 2. 扩展资源

当容器运行需要一些特殊资源，Kubernetes 就无能为力了。

```bash
PATCH /api/v1/nodes/<your-node-name>/status HTTP/1.1
Accept: application/json
Content-Type: application/json-patch+json
Host: k8s-master:8080

[
  {
    "op": "add",
    "path": "/status/capacity/example.com~1dongle",
    "value": "4"
  }
]
```

输出展示了刚才扩展的 dongle 资源：

```bash
$ kubectl describe node <your-node-name>
...
Capacity:
  cpu: 2
  memory: 2049008Ki
  example.com/dongle: 4
...
```

接下来就可以在 Pod 中使用扩展资源了。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
    - name: cuda-container
      image: nvidia/cuda:10.0-base
      resources:
        limits:
          nvidia.com/gpu: 1
```

Kubernetes 在 1.8 版本中引入了 Device Plugin 机制，支持以插件化的方式将第三方的设备接入到 kubernetes 体系中，类似 CPU、MEM 方式进行调度、使用。例如 GPU 设备，设备厂商只需要开发一个配套的 Device Plugin 组件，并且以 DaemonSet 的方式将其运行在集群当中，Kubelet 通过 gRPC 接口与 Device Plugin 组件交互，实现设备发现、状态更新、资源上报等。

最后，应用通过 resource request、limit 显示声明使用即可，如同 CPU、MEM 一样。


就像存储资源，存储有读写方式、存储空间大小、回收策略等等，而这些异构资源 GPU、FPGA、ASIC、智能网卡设备等，也肯定不能仅用一个增减的数字代表。而且这些设备在系统拓扑层面是紧密协作的，这就要求在分配扩展资源时，还需要感知硬件拓扑，尽可能就近分配这种设备。

Kubernetes 从 v1.26 开始引入 DRA（Dynamic Resource Allocation，动态资源分配）机制，用于解决现有 Device Plugin 机制的不足。相比于现有的 Device Plugin ，DRA 更加开放和自主，能够满足一些复杂的使用场景。

## 3. 节点资源分配控制

由于每台 Node 上会运行 kubelet/docker/containerd 等 Kubernetes 相关基础服务，Kubernetes 资源管理和调度时，需要把这些基础服务的资源使用量预留出来。

预留的资源通过下面的参数控制：

- --kube-reserved=[cpu=100m][,][memory=100Mi][,][ephemeral-storage=1Gi]：控制预留给 kubernetes 集群组件的 CPU、memory 和存储资源。
- --system-reserved=[cpu=100mi][,][memory=100Mi][,][ephemeral-storage=1Gi]：预留给系统的 CPU、memory 和存储资源。

预留之外的资源才是 Pod 真正能使用的，考虑到驱逐机制，kubelet 会保证节点上的资源使用率不会真正到 100%，因此 Pod 的实际可使用资源会稍微再少一点。

最终，一个 Node 节点的资源逻辑分配如下图所示。

:::center
  ![](../assets/k8s-resource.svg)<br/>
  图 7-1 Node 资源逻辑分配图
:::

Node Allocatable Resource（节点的可用资源 ）= Node Capacity - Kube Reserved - System Reserved - Eviction-Threshold。




