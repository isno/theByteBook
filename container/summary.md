# 第七章：容器技术概论

容器技术典型的代表是 Docker，在 Docker 之外还有 CoreOS rkt、Mesos、LXC 等容器引擎，但直到 Docker 引擎的出现，创新性地提出容器镜像、仓库以及一次编译，随处运行的口号，这才真正意义上降低了容器技术复杂性，让容器技术在现代应用中大放异彩。

发展到云原生时代，OCI 容器技术标准规范逐步成为行业共识，再之后应对各类场景的容器运行时 runc、containerd、Kata Containers 不断涌现，再之后 Kubbernetes 成为容器编排的事实标准。照本宣科地介绍 Kubernetes 架构如何新颖、设计如何优秀，相信并不能给读者们留有什么深刻印象，教条式介绍睡过一觉不会有多少人记起，故事让内容变得有趣，**在容器技术变革的浪潮中，曾发生过一场”史诗大战“，业界称之为 ”容器编排之争（Container Orchestration Wars）“**。

容器技术篇节我们就从回顾这段历史开始，先从宏观角度去观察 Kubernetes 的诞生与演变的驱动力。


<div  align="center">
  <img src="../assets/container-summary.png" width = "550"  align=center />
</div>