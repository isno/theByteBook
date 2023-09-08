# 1.6.1 微服务

## 1.微服务出现的背景

在过去很长一段时间内，传统软件大部分是各种独立单体应用，单体应用的问题总结来说扩展性差、可靠性不高、维护成本高。随着软件开发技术的发展，以及面向服务体系架构（SOA）的引入，上述问题在一定程度上得到了缓解，但由于SOA早期使用的是总线模式，与技术栈有一定的强绑关系，导致很多企业遗留系统很难对接，且切换时间长、成本高，新系统稳定性的收敛也需要一定时间。

为了摆脱这一困境，微服务被提出。
## 2.什么是微服务

微服务的概念被提出之后，在很长的一段时间内并没有被普及，直到2014年，微服务架构由Martin Fowler（《MicroServices》作者）、Adrian Cockcroft（Netflix架构师）、Neal ford（《卓有成效的程序员》作者） 等人持续介绍、完善、演进、实践之后，微服务的概念才算是一种真正丰满、独立的架构风格。

对于微服务的解释，我们援引 Netflix 云架构师 Adrian Cockcroft 的观点。
:::tip <i></i>
A microservices architecture as a service‑oriented architecture composed of loosely coupled elements that have bounded contexts.

**作者注** Netflix 是业界微服务和DevOps组织的先驱，有大规模生产级微服务的成功实践，并为Spring Cloud Netflix 社区贡献了大量优秀的开源软件，例如Eureka（服务注册与发现）、Zuul（服务网关）、Ribbon（负载均衡）、Hystrix（熔断限流）等等。

:::

Adrian Cockcroft 的观点中有两个核心概念：Loosely Coupled（松耦合）和Bounded Context（限界上下文）。
1. Loosely Coupled 意味着每个服务可以独立的更新，更新一个服务无需要求改变其他服务。
2. Bounded Contexts 意味着每个服务要有明确的边界性，你可以只关注自身软件的发布，而无需考虑谁在依赖你的发布版本。微服务和它的消费者严格通过 API 进行交互，不共享数据结构、数据库、POJO 等等。

综合上述，也就说微服务要实现独立部署，拥有独立的技术栈、界定上下文，明确所有权等。

如下图，单体服务（Monolith Application）与微服务（MicroServices）的形象对比。

<div  align="center">
	<img src="../assets/Monolith-vs-MicroService.png" width = "480"  align=center />
	<p>图 1-6 单体服务和微服务的对比</p>
</div>

单体服务就是把所有的东西放在一个大盒子里，这个大盒子里面什么都有。微服务更像是集装箱，每个箱子里面包含特定的功能模块，所有的东西可以很灵活的拆分和组装。

## 3.后微服务时代

CI/CD 基础设施即代码的出现和发展，使得基础设施管理逐步简化，功能迭代也更加快速和高效。

:::tip 后微服务时代（Cloud Native）

从软件层面独力应对微服务架构问题，发展到软、硬一体，合力应对架构问题的时代，此即为“后微服务时代”。
:::
