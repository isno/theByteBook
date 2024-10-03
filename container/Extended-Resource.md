# 7.7.2 扩展资源与 Device Plugin

在 Kubernetes 中，宿主机中的标准资源（如 CPU、内存、存储等）是由 Kubelet 自动报告的。但某些情况下，宿主机可能会有一些异构资源（如 GPU、FPGA、RDMA 或者某些硬件加速器），Kubernetes 本身并没有识别和管理。

## 1. 扩展资源

作为一个通用型的容器编排平台，自然要与各类异构资源集成，满足不同用户的需求。为此，Kubernetes 提供了 Extended Resource（扩展资源）机制，用于让集群管理员声明、管理和使用除标准资源之外的自定义资源。

如果为某个宿主机节点发布新的扩展资源，需要发送一个 HTTP PATCH 请求到 Kubernetes API Server。例如，某个宿主机节点中带有 4 个 gpu 资源。下面是一个 PATCH 请求的示例，该请求为`/<your-node-name>`节点发布 4 个 gpu 资源。

```bash
PATCH /api/v1/nodes/<your-node-name>/status HTTP/1.1
Accept: application/json
Content-Type: application/json-patch+json
Host: k8s-master:8080
[
  {
    "op": "add",
    "path": "/status/capacity/nvidia.com~1gpu",
    "value": "4"
  }
]
```
需要注意的是，上面的 PATCH 请求只是告诉 Kubernetes 某宿主机节点 `<your-node-name>`拥有 4 个称之为 gpu 的东西。Kubernetes 并不了解 gpu 资源的含义和用途。

此外，为了能让调度器知道自定义资源在每台宿主机的可用量，宿主机节点必须能够访问 API Server 汇报自定义资源情况。在 Kubernetes 中，各种资源可用量可在 Node Status 内容查看。如下所示，使用 kubectl describe node 命令查看宿主机节点资源情况，可以看到输出了刚才扩展的 nvidia.com/gpu 资源，容量（capacity）为 4。

```bash
$ kubectl describe node <your-node-name>
...
Status
  Capacity:
  	cpu: 2
  	memory: 2049008Ki
  	nvidia.com/gpu: 4
...
```

如此，配置一个 Pod 对象时，便可以像配置标准资源一样，配置自定义资源的 request 和 limits。以下是一个带有申请 nvidia.com/gpu 资源的 Pod 配置示例。

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
        request:
          nvidia.com/gpu: 1
```
可以看到，上面 Pod 资源配置中，GPU 的资源名称为 nvidia.com/gpu，它的配额是 1 个该资源。这意味着调度器会将这个 Pod 分配到一个有足够 nvidia.com/gpu 资源的节点上。

当 Pod 被顺利调度到宿主机节点后，再挂载宿主机节点的 GPU 驱动，便能直接使用 GPU 资源了。

## 2. Device Plugin

在生产环境中，如果没什么特别的情况，用户并不需要用手动的方式操作扩展资源。在 Kubernetes 中，对各类异构资源进行管理的操作，都有一种称为 Device Plugin 的插件负责。

Device Plugin 的设计思想就是通过提供一个可插拔的框架，让硬件供应商可以方便地为特定硬件编写插件。Kubelet 通过 gRPC 接口与设备插件交互，实现设备发现、状态更新、资源上报等。最后，Pod 通过 request、limit 显示声明使用即可使用异构资源，如同 CPU、内容一样。

Device Plugin 定义了以下 gRPC 接口：

```protobuf
service DevicePlugin {
	// 返回设备插件的配置选项。
	rpc GetDevicePluginOptions(Empty) returns (DevicePluginOptions) {}
	// 实时监控设备资源的状态变化，并将设备资源信息上报至 Etcd 中。
	rpc ListAndWatch(Empty) returns (stream ListAndWatchResponse) {}
	// 执行特定设备的初始化操作，并告知 kubelet 如何使设备在容器中可用。
	rpc Allocate(AllocateRequest) returns (AllocateResponse) {}

	// 从一组可用的设备中返回一些优选的设备用来分配。
	rpc GetPreferredAllocation(PreferredAllocationRequest) returns (PreferredAllocationResponse) {}

	// 在容器启动之前调用，用于特定于设备的初始化操作。确保容器能够正确地访问和使用特定的硬件资源。
	rpc PreStartContainer(PreStartContainerRequest) returns (PreStartContainerResponse) {}
}
```

只要按照上述 gRPC 实现接口，Kubernetes 便可感知和使用这些硬件资源。图 3-7 展示了 Device Plugin 的工作原理。

:::center
  ![](../assets/DevicePlugin.svg)<br/>
  图 7-33 Device Plugin 工作原理
:::

首先，Device Plugin 作为一个独立的进程（以 DaemonSet 方式）运行在 Kubernetes 节点上。当节点启动时，Device Plugin 会向 Kubernetes 的 kubelet 组件注册自己，告知 kubelet 该节点上有哪些特殊硬件资源可用。注册信息通常包括资源名称、资源数量、设备健康状态等。例如，一个 GPU Device Plugin 可能会注册资源名称为 “nvidia.com/gpu”，并告知 kubelet 该节点上有多少个 GPU 可用。

然后，Device Plugin 会持续监测（图中的 ListAndWatch）节点上的特殊硬件资源状态，当资源数量发生变化（如硬件故障、热插拔等）或资源健康状态发生改变时，会及时向 kubelet 发送更新信息。

当用户创建一个 Pod 并请求特殊硬件资源时，Kubernetes 的调度器会根据节点上的资源状态和 Pod 的资源需求进行调度决策。一旦 Pod 被调度到某个节点上并分配了特殊硬件资源，kubelet 会通过容器运行时（如 Docker、Containerd 等）将特殊硬件设备映射到容器内部，使得容器内的应用程序可以直接访问这些设备。


目前，社区中已经出现了很多 Device Plugin。例如，NVIDIA GPU 、Intel GPU、AMD GPU、FPGA、RDMA 等。

:::tip 问题

你注意到扩展资源与 Device Plugin 的问题了么？

Pod 只能过“nvidia.com/gpu:2”这种简单的“计数形式”，来申请 2 块 GPU。但是，2 个 GPU 分别是什么型号、是否拓扑最优、是否共享/独享等等内容，都没有能力进行选择。

在这些特殊场景的催化下，Nvidia、Intel 等头部厂商联合推出了 DRA（Dynamic Resource Allocation，动态资源分配）机制，用于解决现有 Device Plugin 的不足。此部分内容笔者就不再扩展讨论了，有兴趣的读者可以查阅其他资料。
:::