# 第七章：容器编排技术概论

:::tip <a/>

世界上有两个设计软件的方法，一种方法是设计的尽量简单，以至于明显的没有什么缺陷，另外一种方式是使他尽量的复杂，以至于其缺陷不那么明显。

:::right
—— by C.A.R. Hoare[^1]
:::

已经有非常多的著作、文章介绍 Kubernetes，介绍 Kubernetes 的架构设计、各个组件原理，也介绍 Google 几十年来分布式系统开发、部署、管理经验的演进在助推。

但直接切入 Kubernetes 各个工程细节，实际很难感受到 Google 工程师们的思考，也无法体会到 Kubernetes 为何这么设计。Google 在 2006 年陆续公布了几篇论文《Borg, Omega, and Kubernetes》，介绍了开发和运维 Borg、Omega 和 Kubernetes 系统所学习到的经验与教训。

虽然论文是 7 年前的文章，但内容并不过时，尤其能让读者能更清楚地明白 Kubernetes 里的很多架构、功能和设计是怎么来的。

<div  align="center">
  <img src="../assets/container-summary.png" width = "550"  align=center />
</div>

[^1]: Charles Antony Richard Hoare（缩写为 C. A. R. Hoare），著名的计算科学家，图灵奖获得者，以设计了快速排序算法、霍尔逻辑、通信顺序进程闻名。