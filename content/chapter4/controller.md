# Kubernetes Controller 介绍

运行容器化应用是Kubernetes最重要的核心功能。为满足不同的业务需要，Kubernetes提供了多种Controller，主要包括Deployment、DaemonSet、Job、CronJob等。

## Kubernetes 创建资源

Kubernetes创建资源有两种方式，一种是通过kubectl命令行，比如使用 kubectl run和kubectl create。 另外一种是用过配置文件，比如使用yaml，使用第二种方式可以更详细的描述配置信息，保留的配置文件也可以在其他集群使用。

## Deployment

