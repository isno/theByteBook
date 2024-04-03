# 10.3 GitOps 下的 CI/CD 流程

理解了 GitOps 的概念以及声明式、IaC 等关键属性，再来看 GitOps 下的 CI/CD 实践流程，如下图所示：

<div  align="center">
  <img src="../assets/gitops-workflow.webp" width = "550"  align=center />
</div>

- 首先，团队成员都可以 fork 仓库对配置进行更改，然后提交 Pull Request。
- 接下来运行 CI 流水线，进行校验配置文件、执行自动化测试、构建 OCI 镜像、推送到镜像仓库等。
- CI 流水线执行完成后，拥有合并代码权限的人会将 Pull Request 合并到主分支。
- 最后运行 CD 流水线，结合 CD 工具（例如 Argo CD）将变更自动应用到目标集群中。

整个过程中完全自动化且操作透明，通过多人协作和自动化测试来保证了基础设施声明的健壮性。另外由于基础设置配置都存储在 Git 仓库中，当应用出现故障时，也可快速地进行版本回退。


