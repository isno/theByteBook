# 第七章：容器编排技术概论

:::tip <a/>

世界上有两个设计软件的方法，一种方法是设计的尽量简单，以至于明显的没有什么缺陷，另外一种方式是使他尽量的复杂，以至于其缺陷不那么明显。

:::right
—— by C.A.R. Hoare[^1]
:::

已经有非常多的著作、文章介绍 Kubernetes 的架构设计、各个组件原理，但这些内容大部分直面 Kubernetes 各个工程细节。如果笔者再循规蹈矩地了解一些「是什么」、「怎么做」等内容，一则重复前人的工作，二则读者们也很难体会到 Kubernetes 为何这么设计。

Google 在 2006 年陆续公布了几篇论文《Borg, Omega, and Kubernetes》，介绍了开发和运维 Borg、Omega 和 Kubernetes 系统所学习到的经验与教训。本章内容，我们先了解 Google 内部系统是怎么演变的，学习他们的经验教训，能让我们更深入的理解到「为什么」，也能真正体会到如何在不断迭代优化中设计系统。

<div  align="center">
  <img src="../assets/container-summary.png" width = "550"  align=center />
</div>

[^1]: Charles Antony Richard Hoare（缩写为 C. A. R. Hoare），著名的计算科学家，图灵奖获得者，以设计了快速排序算法、霍尔逻辑、通信顺序进程闻名。