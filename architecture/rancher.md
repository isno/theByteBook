# 1.2.4 使用 Rancher 开源方案

Rancher 是一家容器产品及解决方案服务商。Rancher 最初目标就是为了支持多种容器编排引擎而构建。随着 Kubernetes 的兴起， Rancher 2.x 也开始彻底转向了 Kubernetes。

使用 Rancher 可以选择使用 RKE （Rancher Kubernetes Engine）创建Kubernetes 集群，也可以使用 TKE、ACK、AKS 等云厂商的 Kubernetes 服务。由于 Rancher 仅需要主机有CPU、内存、本地磁盘和网络资源，因此可以使用任何公有云或者本地主机资源。

## Rancher 的特点

- 基础设施编排：Rancher 为容器化的应用提供了灵活的基础设施服务，包括网络、存储、负载均衡、DNS模块。
- 容器编排和调度：Rancher 包含 Docker Swarm、Kubernetes、Mesos 等主要的编排调度引擎，用户可以基于需要创建多种集群。
- 企业级权限管理：支持 Active Directory、LDAP、RBAC 的权限管理。
- CI/CD：提供简易的 CD/CD 流水线，同时支持与企业已有的流线线对接。

