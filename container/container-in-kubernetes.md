# 容器与 Kubernetes

在前面部分，我们介绍了容器运行原理和常见的运行时实现，Kubernetes 作为今主流的容器编排平台，就需要有使用不同容器运行时的能力 。

在早期 Kubernetes 利用 Docker 作为容器运行时实现，直接调用 Docker API 来创建和管理容器。在 Docker 盛行之后，CoreOS 推出了 rkt 运行时实现，Kubernetes 又实现了对 rkt 的支持，随着容器技术的蓬勃发展，越来越多运行时实现出现，Kubernetes 要重新考虑对所有容器运行时的兼容适配问题了。