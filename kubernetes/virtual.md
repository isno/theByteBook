# 8.5.1  物理资源抽象

Kubernetes 将管理的物理资源抽象成指定的类型和对应的计量单位。 这些资源可以分类两类，可压缩资源和不可压缩资源。

- 可压缩资源：例如 CPU、GPU。当此类资源超限时，Pod 中进程使用 CPU 会被限制，但不会被杀掉。
- 不可压缩资源，例如 内存、磁盘。当资源不足时，会产生 OOM 问题（Out of Memory，内存溢出）。

## 1. CPU 资源

在 Kubernetes 中，一个 CPU 等于 1 个物理 CPU 核 或者 1 个虚拟核，取决于节点是一台物理主机还是运行在某物理主机上的虚拟机。

CPU 的计量单位为毫核(m)，一个 Node 节点 CPU 核心数量乘以 1000，得到的就是该 Node 节点总的 CPU 总数量。例如一个 Node 节点有两个核，那么该 Node 节点的 CPU 总量为 2000m，无论容器运行在单核、双核机器上，500m CPU 表示的是大约相同的计算能力。

CPU 资源的设定也可以表达带小数 CPU 的请求。当设置为 0.5 时，所请求的 CPU 资源为 1.0 CPU 时的一半。对于 CPU 资源单位，数量表达式 0.1 等价于表达式 100m，可以看作 “100 millicpu”。 

## 2. 内存 资源

内存的约束和请求以字节为单位，你可以使用普通的不带单位的字节，或者带有具体单位的数字来表示内存：E、P、T、G、M、k。 你也可以使用对应的 2 的幂数：Ei、Pi、Ti、Gi、Mi、Ki。 例如，以下表达式所代表的是大致相同的值：

```plain
128974848, 129e6, 129M, 123Mi
```

注意 `123 Mi = 123*1204*1204B = 129 M`

什么是 2 的幂数？举个例子 M（（Megabyte）） 和 Mi（Mebibyte） ，1M 就是`1*1000*1000` 字节，1Mi 就是`1*1024*1024`字节，所以 1M < 1Mi，显然带这个小 i 的更准确。


以上的资源信息有 Node 节点中的 kubelet 负责上报，节点内定义了固定的资源总和、Kubernetes 可分配资源信息等。

## 3. Node 资源抽象

在 kubernetes 中把资源分为 allocatable（宿主机上 pods 资源）、eviction-threshold（节点驱逐阈值）、system-reserved（节点资源预留值）、kube-reserved（kubernetes 守护进程如 kubelet 等），调度器会根据每个节点上 node allocatable 的使用情况分配 pod，调度器不会超额申请过多的资源。

通过 kubectl describe node 命令查看 Node 中资源配置信息。

- Capacity 是 Node 资源总量，例如上面的输出显示，这台 node 有 4 CPU、7 GB 内存等。
- Allocatable 为可供 Kubernetes 分配的总资源量。显然，Allocatable 不会超过 Capacity。
- Allocated resources 为目前已经分配出去的资源量。注意其中的 message ：node 可能会超分。

```plain
$ kubectl describe node `<node>`

Capacity:
  cpu:                4
  ephemeral-storage:  61202244Ki
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  memory:             8048960Ki
  pods:               110
Allocatable:
  cpu:                4
  ephemeral-storage:  61202244Ki
  hugepages-1Gi:      0
  hugepages-2Mi:      0
  memory:             8048960Ki
  pods:               110
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests    Limits
  --------           --------    ------
  cpu                960m (24%)  0 (0%)
  memory             280Mi (3%)  170Mi (2%)
  ephemeral-storage  0 (0%)      0 (0%)
  hugepages-1Gi      0 (0%)      0 (0%)
  hugepages-2Mi      0 (0%)      0 (0%)
```

一个节点中的资源分配公式如下:

Allocatable = Node Capacity - （kube-reserved） - （system-reserved） - （eviction-threshold）

