# 7.2.2 Cgroups

Cgroups 全称是 control groups，是Linux内核提供的一种可以限制单个或者多个进程多所使用物理资源的机制，可以对 CPU、内存、I/O、网络等资源实现精准的控制，Kubernetes、Docker 中资源请求和限制都是基于 cgroups 实现虚拟化以及资源弹性计算。
