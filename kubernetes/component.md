# Kubernetes 系统架构

Kubernetes 是典型的主从架构，其管理者被称为 Control Plane（控制平面）、被管理者称为 Node （节点）。Control Plane 在逻辑上只有一个，包含 ApiServer、Scheduler、Controller Manager，它负责管理所有的 Node 和 Kubernetes Object。 Node 可以有多个，上面部署了 Kubelet 和 Proxy，它负责管理自身节点资源和 Pod。