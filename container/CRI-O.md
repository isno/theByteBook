# CRI-O

当前同样存在一些只实现了 OCI 标准的容器，但是它们可以通过 CRI-O 来作为 Kubernetes 的容器运行时。CRI-O 是 Kubernetes 的 CRI 标准的实现，并且允许 Kubernetes 间接使用 OCI 兼容的容器运行时。

- Clear Containers：由 Intel 推出的兼容 OCI 容器运行时，可以通过 CRI-O 来兼容 CRI。
- Kata Containers：符合 OCI 规范，可以通过 CRI-O 或 Containerd CRI Plugin 来兼容 CRI。
- gVisor：由谷歌推出的容器运行时沙箱 (Experimental)，可以通过 CRI-O 来兼容 CRI。
