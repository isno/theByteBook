# 第九章：服务网格概论

:::tip <a/>
计算机科学中的所有问题都可以通过增加一个间接层来解决。如果不够，那就再加一层。

:::right
—— by David Wheeler
:::


Kubernetes 的崛起标志着微服务时代的新篇章，通过基础设施层解决分布式架构问题，微服务服务治理也开启了全新的进化，并衍生服务间通信的基础设施层 ServiceMesh。2018年，Bilgin lbryam 在 InfoQ 发了一篇名为 《MicroService in a Post-Kubernetes Era 》的文章，文章虽然没有明确“ 后 Kubernetes 时代的微服务” 是什么，但从文章也能看出作者的观点是：在后 Kubernetes 时代，服务网格技术已经完全取代了通过使用软件库来实现网络运维的方式。

当非侵入性的 ServiceMesh 技术从萌芽走向成熟，当 Istio 横空出世，并如此那般的与 Kubernetes 天生契合，人们惊觉：原来微服务治理的实现还能如此优雅。