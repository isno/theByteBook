# Kubernetes 系统架构

Kubernetes 是典型的主从架构，其管理者被称为 Control Plane（控制平面）、被管理者称为 Node （节点）。Control Plane 在逻辑上只有一个，包含 ApiServer、Scheduler、Controller Manager，它负责管理所有的 Node 和 Kubernetes Object。 Node 可以有多个，上面部署了 Kubelet 和 Proxy，它负责管理自身节点资源和 Pod。

## Control Plane

Control Plane 是集群的管理者，它的目标就是使得用户创建的各种 Kubernetes对象 按照其配置所描述的状态运行。Control Plane 既要对节点进行统一管理，又要调度资源并操作 Pod，以满足 Kubernetes对象 运行的需求。

Control Plane 由多个组件组合而成，每个组件时隔独立运行的进程。Kubernetes 启动脚本通常会在一个计算机中启动所有的 Control Plane 组件，按照习惯的称呼，我们把该计算机称之为 Master 节点。

