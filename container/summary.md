# 第七章：以容器构建分布式系统底座

:::tip <a/>

世界上有两个设计软件的方法，一种方法是设计的尽量简单，以至于明显的没有什么缺陷，另外一种方式是使他尽量的复杂，以至于其缺陷不那么明显。

:::right
—— by C.A.R. Hoare[^1]
:::

2014 年 6月 6 日，Kubernetes 的首个分支被推送到 Github。谁也没能预见，十年后的今天，Kubernetes 将成为迄今为止最大的开源项目之一，拥有超过 88,000 名来自 8,000 多家公司、遍及 44 个国家的贡献者。

在过去 10 年的发展中，Kubernetes 逐渐成为 AI/机器学习/复杂分布式系统的基座，解决复杂问题的同时，Kubernetes 自身也成为最复杂的软件系统之一。包括官方文档，绝大部分介绍 Kubernetes 的内容都直面各个工程细节，并不解释缘由。如果笔者再循规蹈矩地了解一些“是什么”、“怎么做”等表面内容，一则重复前人的工作，二则也无法真正解释清楚 Kubernetes 为何这么设计。

Google 在 2015 起陆续公布了《Borg, Omega, and Kubernetes》以及《Large-scale cluster management at Google with Borg》等论文，论文介绍了开发和运维 Borg、Omega 和 Kubernetes 系统的经验与教训。我们从这几篇论文着手，了解在 Google 内部，容器系统是怎么演变的，再来学习 Kubernetes 中关于计算/网络/存储的设计原理和应用。本章内容安排如图 7-0 所示。

:::center
  ![](../assets/container-summary.png)<br/>
  图 7-0 本章内容导图
:::

[^1]: Charles Antony Richard Hoare（缩写为 C. A. R. Hoare），著名的计算科学家，图灵奖获得者，以设计了快速排序算法、霍尔逻辑、通信顺序进程闻名。