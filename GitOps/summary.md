# 第十章 GitOps 落地实践

现代软件工程领域中，无论是通过服务化的方式进行架构设计，还是使用敏捷开发流程，主要的目的都是提高开发效率，因此应用的构建和部署也要跟得上迭代的脚步。随着云原生技术和 PaaS 平台的普及以及 DevOps 文化的盛行，人们也一直在寻找一种能更好解决云环境中持续部署的最佳实践。在云原生时代继承 DevOps 思想，加速持续集成和持续部署的，这就是 GitOps。


GitOps 起源于 weaveworks 公司在 2017 年发表的一篇博客：​GitOps - Operations by Pull Request[^1]。在这篇文章中，作者 Alexis Richardson 介绍了一种以 Git 为唯一事实来源的软件部署方式。在这种方式下，我们需要将软件设施定义在 Git 仓库中进行管理，这里的软件设施不限于应用本身，也包括 IaaS、Kubernetes 这样的基础设置。每个工程师都可以通过提交 Pull Request 来修改软件设施，然后通过自动化程序（譬如 Flux CD、Argo CD）的方式在线上执行这些修改。

这种方式的交付（使用声明式描述、使用 Git 类似的版本控制系统进行跟踪管理、更优雅的可观测性），开发人员可以更高效地将注意力集中在创建新功能而不是运维相关任务上（例如，应用系统安装、配置、迁移等）。



[^1]: 参见 https://www.weave.works/blog/gitops-operations-by-pull-request


