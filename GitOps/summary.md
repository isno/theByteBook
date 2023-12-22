# 第十章 GitOps 落地实践

工欲善其事必先利其器，软件研发的管理是一件非常复杂的事情。业务系统有多么复杂，研发管理就有多么复杂

随着 DevOps 文化的盛行，人们也一直在寻找一种能更好解决云环境中持续部署的最佳实践。

GitOps 起源于 weaveworks 公司在 2017 年发表的一篇博客：​GitOps - Operations by Pull Request[^1]。在这篇文章中，作者 Alexis Richardson 介绍了一种以 Git 为唯一事实来源的软件部署方式。在这种方式下，我们需要将软件设施定义在 Git 仓库中进行管理，这里的软件设施不限于应用本身，也包括 IaaS、Kubernetes 这样的基础设置。每个工程师都可以通过提交 Pull Request 来修改软件设施，然后通过自动化程序（譬如 Flux CD、Argo CD）的方式在线上执行这些修改。

这种方式的交付（使用声明式描述、使用 Git 类似的版本控制系统进行跟踪管理、更优雅的可观测性）不仅缩短了构建过程、提高部署速度，更为



[^1]: 参见 https://www.weave.works/blog/gitops-operations-by-pull-request


