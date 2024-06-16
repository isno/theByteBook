# 7.8 小结

现在，围绕 Kubernetes 建立的云原生技术体系，已经彻底打破了原先企业级基础设施的良莠不齐。

这其中，最关键的是以
这种思想，以一言以蔽之，就是“以应用为中心”。

正是因为以应用为中心，云原生技术体系才会无限强调“原先通过应用层中间封装的各类基础设施能力”，从应用层下沉到基础设施层、以更高效方式为应用“输送”基础设施能力，让应用回归业务。

应用开发者和应用运维团队无需再关心机器和操作系统等底层细节。

Kubernetes 他的专注点是“如何标准化的接入来自于底层，无论是容器、虚机、负载均衡各种各样的一个能力，然后通过声明式 API 的方式去暴露给用户”。


本章参考内容： 
- 《Kubernetes 存储架构及插件使用》https://www.alibabacloud.com/blog/596307
- 《k8s 基于 cgroup 的资源限额》，https://arthurchiao.art/blog/k8s-cgroup-zh
- 《容器镜像格式二十年的螺旋进化之路》，https://linux.cn/article-12442-1.html
- 《从风口浪尖到十字路口，写在 Kubernetes 两周年之际》，https://mp.weixin.qq.com/s/hrgXzt7YKVf6ZCFzJ-WTFA
- 《 500 行的 Linux 容器》，https://blog.lizzie.io/linux-containers-in-500-loc.html
- 《Borg、Omega、K8s：Google 十年三代容器管理系统的设计与思考》，https://queue.acm.org/detail.cfm?id=2898444
- 《How containers work: overlayfs》，https://jvns.ca/blog/2019/11/18/how-containers-work--overlayfs/
-《Large-scale cluster management at Google with Borg》，https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/
- 张磊《深入剖析 Kubernetes》