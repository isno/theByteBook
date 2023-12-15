# 7.4 从 OCI 到 CRI

作为容器技术早期的项目 Docker，以一个“好点子”（镜像）引爆了一个时代，不过这个”好点子“也并不是特别复杂的技术，笔者相信就算没有 Docker 也会有 Cocker 或者 Eocker 的出现，而 Kubernetes 的成功不仅有 Google 深厚的技术功底作支撑，有领先时代的设计理念，更加关键的是 Kubernetes 的出现符合所有云计算大厂的切身利益，有着业界巨头不遗余力的广泛支持，它的成功便是一种必然。

Kubernetes 与 Docker 两者的关系十分微妙，把握住两者关系的变化过程，是理解 Kubernetes 架构演变与 CRI、OCI 规范的良好线索。