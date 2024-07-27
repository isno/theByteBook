# 第十章 GitOps 设计理念及落地实践

:::tip <a/>
there is no silver bullet，but sometimes there are goods arrows.

没有银弹，但有时会有很好的弓箭。
:::right
—— 改自于《没有银弹》[^1]
:::
GitOps 起源于 Weaveworks[^2] 公司在 2017 年发表的一篇博客《GitOps - Operations by Pull Request》[^3]，文中介绍了一种以 Git 为唯一事实来源的软件部署方式。

这种方式下，我们需要将软件设施定义在 Git 仓库中进行管理，这里的软件设施不限于应用本身，也包括 IaaS、Kubernetes 这样的基础设置。每个工程师提交 Pull Request 修改软件设施，项目管理人员 Merge Request 合并修改，然后通过自动化程序（如 Flux CD、Argo CD 等）的方式在线上执行这些修改。

本章我们了解 GitOps 出现的背景以及设计理念，讨论 CI/CD 工具如何选型，然后基于 GitOps 设计理念实施一套包含代码测试、镜像构建、交付运行的 CI/CD 系统。

:::center
  ![](../assets/GitOps.png)<br/>
  图 10-0 本章内容导读
:::


[^1]:《没有银弹：软件工程的本质性与附属性工作》是 IBM 大型机之父 Frederick P. Brooks, Jr. 的著作，内容以《伦敦狼人》之类的电影剧照，引出非银弹则不能成功的传说。没有银弹论述强调由于软件的复杂性本质，使真正的银弹并不存在。
[^2]: 云原生明星创业公司 Weaveworks 在 2024年2月5日宣布倒闭了，但幸运的是其开源的关于 GitOps 的项目 Flux 未来将持续健康发展（因为捐赠给了 CNCF）。
[^3]: 参见 https://www.weave.works/blog/gitops-operations-by-pull-request