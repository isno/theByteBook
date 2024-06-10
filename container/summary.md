# 第七章：容器编排技术概论

:::tip <a/>

世界上有两个设计软件的方法，一种方法是设计的尽量简单，以至于明显的没有什么缺陷，另外一种方式是使他尽量的复杂，以至于其缺陷不那么明显。

:::right
—— by C.A.R. Hoare[^1]
:::

Kubernetes 除强大功能外，还其因非常陡峭的学习曲线而闻名，它的设计源于对操作系统的抽象，在这之上又是一层分布式系统基础设施的封装，这些设计目的是为了构建标准化的基础平台，这也导致 Kubernetes 的设计理念与它的最终使用者 - 业务开发工程师，中间存在云计算以及运维两个鸿沟。包括官方文档，绝大部分介绍 Kubernetes 的内容都直面各个工程细节，并不解释缘由。如果笔者再循规蹈矩地了解一些“是什么”、“怎么做”等内容，一则重复前人的工作，二则也无法真正解释清楚 Kubernetes 为何这么设计。

Google 在 2016 年陆续公布了几篇论文《Borg, Omega, and Kubernetes》，介绍了开发和运维 Borg、Omega 和 Kubernetes 系统所学习到的经验与教训，我们从这一篇论文着手，了解 Google 内部系统是怎么演变的，再来体会关于计算、网络、存储逻辑中的各类精妙设计。

<div  align="center">
  <img src="../assets/container-summary.png" width = "550"  align=center />
</div>

[^1]: Charles Antony Richard Hoare（缩写为 C. A. R. Hoare），著名的计算科学家，图灵奖获得者，以设计了快速排序算法、霍尔逻辑、通信顺序进程闻名。