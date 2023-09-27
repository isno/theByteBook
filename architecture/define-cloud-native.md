# 1.3 云原生的定义

在今天，当需要回答“什么是云原生”这个问题时，还是会有些困难。在过去几年间，云原生的定义一直在变化和发展演进，不同时期不同的公司对此的理解和诠释也不尽相同，因此往往会带来一些疑惑和误解。在本节，我们一起看看云原生定义在不同时期的变化。

## 1.3.1 Pivotal的定义

:::tip Pivotal 简介
Pivotal 是云原生概念提出的鼻祖，属于云原生的先驱者和探路者。Pivotal 还推出了 Pivotal Cloud Foundry 和 Spring 系列开发框架。2019年，Pivotal 被 VMware 收购。
:::

2015年，来自 Pivotal 公司的技术产品经理 Matt Stine，首次提出了云原生的概念，并结合这个概念包装了自己的新产品 Pivotal Web Service 和 Spring Cloud。 在 Matt Stine 所著的《迁移到云原生应用架构》的电子书中，他对云原生的概念进行了详细的阐述，并提出云原生应用架构应该具备的5个主要特征，如图1-9所示。

<div  align="center">
	<img src="../assets/pivotal-cloud-native.svg" width = "650"  align=center />
	<p>图 1-9 Pivotal云原生定义</p>
</div>

2017年10月，还是 Matt Stine，在接受 InfoQ 采访时，对云原生的定义做了小幅调整，将云原生架构定义为具有以下6个特质，如图1-10所示。

<div  align="center">
	<img src="../assets/pivotal-cloud-native-update.svg" width = "650"  align=center />
	<p>图 1-10 Matt Stine 更新后的云原生定义</p>
</div>

现在，在Pivotal最新的官方网站 https://pivotal.io/cloud-native 上，对cloud native的介绍则是关注如图1-11所示的4个要点，这也是大家最熟悉的版本。

<div  align="center">
	<img src="../assets/cloud-native.png" width = "280"  align=center />
	<p>图 1-11 Pivotal 云原生定义</p>
</div>

可见云原生的定义在 Pivotal 内部也是不断更迭的，很多概念被放弃或者抽象，并且有新的东西加入。

## 1.3.2 CNCF的定义

2015年 CNCF 建立，开始围绕云原生的概念打造云原生生态体系。

:::tip CNCF 简介

CNCF（Cloud Native Computing Foundation，云原生计算基金会）是 Linux 基金会旗下的基金会，可以理解为一个非盈利组织，成立于2015年12月11日。

成立这个组织的初衷或者愿景，简单说：

- 推动云原生计算可持续发展。
- 帮助云原生技术开发人员快速地构建出色的产品。

CNCF 通过建立社区、管理众多开源项目等手段来推广技术和生态系统发展（Kubernetes 是 CNCF 托管的第一个开源项目）。
:::

起初 CNCF 对云原生的定义包含以下三个方面：

- 应用容器化(software stack to be Containerized)
- 面向微服务架构(Microservices oriented)
- 应用支持容器的编排调度(Dynamically Orchestrated)

在2018年，随着社区对云原生理念的广泛认可和云原生生态的不断扩大，还有 CNCF 项目和会员的大量增加，起初的定义已经不再适用，因此 CNCF 对云原生进行了重新定位。

2018年6月，CNCF 正式对外公布了更新之后的云原生的定义v1.0版本，CNCF 的定义如下： 

:::tip <i></i>

云原生技术有利于各组织在公有云、私有云和混合云等新型动态环境中，构建和运行可弹性扩展的应用。云原生的代表技术包括容器、服务网格、微服务、不可变基础设施和声明式API。

这些技术能够构建容错性好、易于管理和便于观察的松耦合系统。结合可靠的自动化手段，云原生技术使工程师能够轻松地对系统作出频繁和可预测的重大变更。

云原生计算基金会（CNCF）致力于培育和维护一个厂商中立的开源生态系统，来推广云原生技术。我们通过将最前沿的模式民主化，让这些创新为大众所用。

官网地址 https://github.com/cncf/toc/blob/main/DEFINITION.md。

:::

图1-12是新定义中描述的代表技术，其中容器和微服务两项在不同时期的不同定义中都有出现，而服务网格这个在2017年才开始被社区接纳的新热点技术被非常醒目的列出来，和微服务并列，而不是我们通常认为的服务网格只是微服务在实施时的一种新的方式。

<div  align="center">
	<img src="../assets/cncf-cloud-native.svg" width = "480"  align=center />
	<p>图 1-12 CNCF 定义的云原生代表技术</p>
</div>

## 1.3.3 云原生定义之外

从上面可以看到，云原生的内容和具体形式随着时间的推移一直在变化，即便是CNCF最新推出的云原生定义也非常明确的标注为v1.0，相信未来我们很有机会看到v1.1、v2版本。而且云原生这个词汇最近被过度使用，混有各种营销色彩，容易发生偏离。因此，云原生的定义是什么并不重要，关键还是云原生定义后面的理念、文化、技术、工具、组织结构和行为方式。

了解云原生的定义之后，1.4节继续讨论云原生技术的目标。
