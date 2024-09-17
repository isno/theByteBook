# 7.9 小结

从 Google 的 Brog 到如今的 Kubernetes，容器化技术的最大益处早就超越了单纯的提高硬件资源使用率的范畴。

Kubernetes 通过无数的扩展/接口，变成外部可扩展的功能，通过 CNI 插件，实现容器间通信，通过 CSI，所有的存储生态。通过 Device Plugin 又把资源扩展到 GPU、FPGA 这类物理设备，正是这种开放性的设计，Kubernetes 乘着整个开源社区的力量不断向前。

最关键的是，Kubernetes 以统一的方式抽象以上资源/基础设施的能力，并将这些抽象以声明式 API 的方式对外暴露，用户只需要关心应用的最终状态，而不是去关注底层的基础设施哪来的、如何实现、如何配置。屏蔽底层细节，为用户提供一种简单/一致/跨平台的方式来管理和部署应用，正是 Kubernetes 设计哲学的精髓所在。

本章参考内容： 

- Kubernetes 官方文档， https://kubernetes.io/zh-cn/docs/
- 张磊,《深入剖析 Kubernetes》
- 《Kubernetes 存储架构及插件使用》https://www.alibabacloud.com/blog/596307
- 《k8s 基于 cgroup 的资源限额》，https://arthurchiao.art/blog/k8s-cgroup-zh
- 《容器镜像格式二十年的螺旋进化之路》，https://linux.cn/article-12442-1.html
- 《从风口浪尖到十字路口，写在 Kubernetes 两周年之际》，https://mp.weixin.qq.com/s/hrgXzt7YKVf6ZCFzJ-WTFA
- 《 500 行的 Linux 容器》，https://blog.lizzie.io/linux-containers-in-500-loc.html
- 《Borg、Omega、K8s：Google 十年三代容器管理系统的设计与思考》，https://queue.acm.org/detail.cfm?id=2898444
- 《How containers work: overlayfs》，https://jvns.ca/blog/2019/11/18/how-containers-work--overlayfs/
-《Large-scale cluster management at Google with Borg》，https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/
