# 10.7 小结

本章，通过介绍 GitOps 理念，并扩展讨论如何在 Pod 内构建镜像、如何使用 Pod 组织 CI 流水线、如何通过 Argo CD 实施持续交付。相信，你已理解如何构建基于 Kubernetes 为底座的 CI/CD 系统。

至于产生落地中，你或许想要 Argo CD 换成 Flux CD、Tekton 换成 Jenkins X，还有那些代码质量检测、渐进式交付的集成等等，这对你而言，肯定也不再是什么困难的事情。

参考文档：
- https://www.gitops.tech/
- 《利用 Tekton + ArgoCD 打造云原生 GitSecOps》 https://majinghe.github.io/devsecops/gitops/
- 《Enhance your Docker image build pipeline with Kaniko》https://medium.com/01001101/enhance-your-docker-image-build-pipeline-with-kaniko-567afb6cf97c
- 《Creating CI Pipelines with Tekton》https://www.arthurkoziel.com/creating-ci-pipelines-with-tekton-part-1/