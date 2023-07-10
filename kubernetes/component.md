# Kubernetes 系统架构

Kubernetes 是典型的主从架构，管理者被称为 Control Plane（控制平面）、被管理者称为 Node（节点）。Control Plane 在逻辑上只有一个，它负责管理所有的 Node 和 Kubernetes 资源，内部包含 API Server、Scheduler、Controller Manager 等核心组件。 Node 可以有多个，上面部署了 Kubelet 和 Kube-Proxy，它负责管理自身节点资源和 Pod。

<div  align="center">
	<img src="../assets/k8s.png" width = "650"  align=center />
</div>

## Control Plane

Control Plane 是集群管理者，对节点进行统一管理，调度资源并操作 Pod，它的目标就是使得用户创建的各种 Kubernetes 对象按照其配置所描述的状态运行。

Control Plane 由多个组件组合而成，每个组件是隔独立运行的进程。Kubernetes 启动脚本通常会在一个计算机中启动所有的 Control Plane 组件，按照习惯称呼，我们亦可把该计算机称之为 Master 节点。

### API Server

API Server 提供了资源操作的唯一入口，并提供认证、授权、访问控制、API 注册和发现等机制。

### scheduler

负责资源的调度，按照预定的调度策略将 Pod 调度到相应的机器上



### 

## Node

### kubelet
kubelet 是 Kubernetes 在 Node 节点上运行的代理，Kubelet 周期性地从 API Server 接受新的或者修改的 Pod 规范并保证节点上的 Pod 和 其中容器正常运行。

负责维护容器的生命周期，同时也负责 Volume（CVI）和网络（CNI）的管理


### Kube-proxy
Kube-proxy 是 Node 节点中运行的网络代理，它是实现 Kubernetes Service 的通信与负载均衡机制的重要组件。kube-proxy 负责为 Pod 创建代理服务，从 API Server获取所有Service信息，并根据Service信息创建代理服务，实现 Service到 Pod 的请求路由和转发，从而实现 Kubernetes 层级的虚拟转发网络。