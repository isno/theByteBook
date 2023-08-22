# 1.3.2 企业 PaaS 层方案

在云原生时代，应用从原来有状态的单体架构逐渐演变成微单元化的无状态微服务架构。技术架构朝向服务无状态化、容器化，并且结合 DevOps 方向发展。

伴随着容器技术和 Kubernetes 技术的兴起，云原生技术体系
为 PaaS（Platform as a Service，平台即服务）的实现提供了一种新的方式。通过 Kubernetes 底层能力屏蔽了各 IaaS 差异，提供了混合云之上的 PaaS 层服务，新的 PaaS 层架构将对管理对象从资源升级到服务，结合自动化编译构建以及自动化运维等操作，继而构建出新型的直接面向服务、运维和管理的标准化系统平台。

<div  align="center">
	<img src="../assets/PaaS.png" width = "480"  align=center />
	<p>图 PaaS 技术架构</p>
</div>



容器技术兴起之后，各大云厂商也推出了自己的商业化容器服务。Amazon Elastic Container Service (Amazon ECS)、Azure Kubernetes Service (AKS)、Alibaba Cloud Container Service for Kubernetes (ACK)。

## 2 使用 Rancher 等开源方案

Rancher 是一家容器产品及解决方案服务商。Rancher 最初目标就是为了支持多种容器编排引擎而构建。随着 Kubernetes 的兴起， Rancher 2.x 也开始彻底转向了 Kubernetes。

使用 Rancher 可以选择使用 RKE（Rancher Kubernetes Engine）创建Kubernetes 集群，也可以使用 TKE、ACK、AKS 等云厂商的 Kubernetes 服务。由于 Rancher 仅需要主机有CPU、内存、本地磁盘和网络资源，因此可以使用任何公有云或者本地主机资源。

### Rancher 的特点

- 基础设施编排：Rancher 为容器化的应用提供了灵活的基础设施服务，包括网络、存储、负载均衡、DNS模块。
- 容器编排和调度：Rancher 包含 Docker Swarm、Kubernetes、Mesos 等主要的编排调度引擎，用户可以基于需要创建多种集群。
- 企业级权限管理：支持 Active Directory、LDAP、RBAC 的权限管理。
- CI/CD：提供简易的 CD/CD 流水线，同时支持与企业已有的流线线对接。


## 3. 方案对比

看完 Rancher、ACK 等开源及公有云容器方案后，可能有些读者感觉并没有一个方案可以完全满足自己的业务场景，这时候也可以选择自研 Kubernetes 集群。自研方案可以完全从业务需求场景作为出发点，同时选择容器方案大都涉及从传统虚拟机向容器化转型，因为自研方案可以更好地兼容现在系统，实现平滑过渡。

选择何种方案，更多取决于当前团队所处的环境，包括是否有影响的资源投入（人力、时间），是否能忍受自研方案初期的可靠性阵痛问题等。下表整理了各个方案的对比，供读者参考。

|对比项| 开源方案| 公有云服务|自研方案|
|:--|:--|:--|:--|
| 接入适配度| 中| 低| 高：根据自身需求定制开发|
|运行成本| 低| 高，如和已有数据中心打通，则成本相对较高 | 低 |
|可运维性| 中| 高|高：可完全融入自有运维体系|
|可靠性| 中：开源方案质量参差不齐| 高：方案成熟|低：自研系统早期必经历阵痛期|
|人力成本| 低：开箱即用| 低：开通即用| 高|

