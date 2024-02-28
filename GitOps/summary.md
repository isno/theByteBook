# 第十章 GitOps 落地实践

:::tip <a/>
there is no silver bullet，but sometimes there are goods arrows.

没有银弹，但有时会有很好的弓箭。

— G. Weinberg
:::
GitOps 起源于 weaveworks 公司在 2017 年发表的一篇博客：​GitOps - Operations by Pull Request[^1]。在这篇文章中，作者 Alexis Richardson 介绍了一种以 Git 为唯一事实来源的软件部署方式。在这种方式下，我们需要将软件设施定义在 Git 仓库中进行管理，这里的软件设施不限于应用本身，也包括 IaaS、Kubernetes 这样的基础设置。每个工程师都可以通过提交 Pull Request 来修改软件设施，然后通过自动化程序（譬如 Flux CD、Argo CD）的方式在线上执行这些修改。

这种方式的交付（使用声明式描述、使用 Git 类似的版本控制系统进行跟踪管理），开发人员可以更高效地将注意力集中在创建新功能而不是运维相关任务上（例如应用系统安装、配置、迁移等）。



[^1]: 参见 https://www.weave.works/blog/gitops-operations-by-pull-request


