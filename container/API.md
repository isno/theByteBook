# 7.2 基础设施的进化

Kubernetes 的核心在于提供了一种标准的编程接口（API）用来定义基础设施。为了进一步理解，回顾一下 Kubernetes 出现之前的场景。


- 云厂商只提供了计算实例、块存储、虚拟网络和对象存储等基础构建模块，开发者需要像拼图一样将它们拼出一个相对完整的基础设施方案。
- 对于其他云厂商，重复过程 1，因为各家的 API、结构和语义并不相同，甚至差异很大。

虽然 Terraform 等工具供了一种跨厂商的通用格式，但原始的结构和语义仍然是五花八门，例如针对 AWS 编写的 Terraform descriptor 无法用到 Azure。

现在再来看 Kubernetes 从一开始就提供的东西：描述各种资源需求的标准 API。例如，

- 描述 pod、container 等计算需求的 API。
- 描述 service、ingress 等虚拟网络功能的 API。
- 描述 volumes 之类的持久存储的 API。
- 甚至还包括 service account 之类的服务身份的 API 等等。

这些 API 是跨公有云/私有云和各家云厂商的，各云厂商会将 Kubernetes 结构和语义对接到它们各自的原生 API，因此我们可以说 Kubernetes 提供了一种管理软件定义基础设施（也就是云）的标准接口。

提供一套跨厂商的标准结构和语义来声明核心基础设施（pod/service/volume/serviceaccount...）是 Kubernetes 成功的基础。

在此基础上，它又通过 CRD 将这个结构扩展到任何/所有基础设施资源。

:::tip 什么是 CRD

CRD（Custom Resource Define，自定义资源）是 Kubernetes（v1.7+）为提高可扩展性，让开发者去自定义资源的一种方式。CRD 资源可以动态注册到集群中，注册完毕后，用户可以通过 kubectl 来创建访问这个自定义的资源对象，类似于操作 Pod 一样。不过需要注意的是 CRD 仅仅是资源的定义而已，还需要编写 Controller 去监听 CRD 的各种事件来实现自定义的业务逻辑。

:::

有了 CRD，用户不仅能声明 Kubernetes API 预定义的计算、存储、网络服务，还能声明数据库、task runner、消息总线、数字证书等等任何云厂商能想到的东西！

随着 Kubernetes 资源模型越来越广泛的传播，现在已经能够用一组 Kubernetes 资源来描述一整个软件定义计算环境。就像用 docker run 可以启动单个程序一样，用 kubectl apply -f 就能部署和运行一个分布式应用，而无需关心是在私有云还是公有云以及具体哪家云厂商上。