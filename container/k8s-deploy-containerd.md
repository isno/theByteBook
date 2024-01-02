# 容器运行时 containerd 

如果没有隔离或者混部的需求，仅以性能和稳定筛选容器运行时，那么 containerd 就是容器运行时不二之选。


https://www.huaqiang.art/assets/img/kubelet-containerd.png


在 Linux 上，控制组（CGroup）用于限制分配给进程的资源。kubelet 和底层容器运行时都需要对接控制组来强制执行 为 Pod 和容器管理资源 并为诸如 CPU、内存这类资源设置请求和限制。若要对接控制组，kubelet 和容器运行时需要使用一个 cgroup 驱动。关键的一点是 kubelet 和容器运行时需使用相同的 cgroup 驱动并且采用相同的配置。

配置 systemd cgroup 驱动

可用的 cgroup 驱动有两个：

- cgroupfs：当使用 cgroupfs 驱动时，kubelet 和容器运行时将直接对接 cgroup 文件系统来配置 cgroup。
- systemd



在 /etc/containerd/config.toml 中设置

```
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  ...
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
```

debian 系统，centos7 系统，都是使用 systemd 初始化系统的。systemd 这边已经有一套 cgroup 管理器了，如果容器运行时和 kubelet 使用 cgroupfs，此时就会存在 cgroups 和 systemd 两种 cgroup 管理器。也就意味着操作系统里面存在两种资源分配的视图，当操作系统上存在 CPU，内存等等资源不足的时候，将 kubelet 和容器运行时配置为使用 cgroupfs、但为剩余的进程使用 systemd 的那些节点将在资源压力增大时变得不稳定。
