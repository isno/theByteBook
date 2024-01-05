# 容器运行时 containerd 

如果没有隔离或者混部的需求，仅以性能和稳定选择容器运行时，containerd 就是唯一之选。这一节，继续延续惯例，先说明流程原理再进行实践操作。

首先，Kubelet 通过 CRI 接口管理节点上的容器，CRI 实际上就是基于 gRPC 定义了 RuntimeService 和 ImageService 等两个 gRPC 服务 [^1]，分别用于容器运行时和镜像的管理，所以 Kubelet 从本质上是 CRI 接口的 gRPC Client。早期，各类容器运行时没并没有实现 CRI 接口（gRPC Server） ，由此出现了各类垫片，譬如对接 Docker 的 Dockershim，对接 containerd 的 cri-containerd，这也是早期在 Node 节点部署各类 shim 的原因。

现在，作为 CNCF 毕业项目的 containerd 目标就是完全融入 Kubernetes 的生态，自然早早地在 1.1 版本起就将 cri-containerd 内置在 containerd 中了，如图所示。


<div  align="center">
	<img src="../assets/containerd-cri.png" width = "550"  align=center />
</div>

containerd 内置的 CRI 插件管理容器和镜像，并通过 CNI 插件给 Pod 配置网络。举一个例子，Kubelet 通过 cri 接口创建 pod 说明这个工作流程。

<div  align="center">
	<img src="../assets/cri-architecture.png" width = "550"  align=center />
</div>

- Kubeletcri通过 CRI 运行时服务 API 调用插件来创建 pod；
- cri创建 pod 的网络命名空间，然后使用 CNI 配置它；
- cri使用containerd内部创建并启动一个特殊的 pause container （沙盒容器）并将该容器放入 pod 的 cgroup 和命名空间中
- Kubelet 通过 ImageService 拉取应用程序容器镜像
- cri如果节点上不存在镜像，则进一步使用containerd来拉取镜像；
- kubelet 调用 RuntimeService ，使用拉取的容器镜像在 pod 内创建并启动应用程序容器；
- cri最后使用containerd内部创建应用程序容器，将其放入pod的cgroup和命名空间中，然后启动pod的新应用程序容器。

经过这些步骤，一个 pod 及其对应的应用程序容器就被创建并运行了。


1. 安装 containerd

```
wget https://github.com/containerd/containerd/releases/download/v1.7.11/containerd-1.7.11-linux-amd64.tar.gz

```

2. 安装 runc

runc 是底层容器运行时（真正创建容器的程序），containerd 二进制包中并没有内置，需要单独安装。

```
wget https://github.com/opencontainers/runc/releases/download/v1.1.11/runc.amd64

chmod +x runc.amd64
mv runc.amd64 /usr/local/bin/runc
```

2. 创建配置文件

```
mkdir -p /etc/containerd/
containerd config default > /etc/containerd/config.toml
```

3. 修改 cgroup 驱动为 systemd

在 /etc/containerd/config.toml 中设置

```
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  ...
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
```

kubelet 和底层容器运行时都需要对接 cgroup 为 Pod 设置 CPU、内存资源的请求和限制，目前 cgroup 驱动有两种：

- cgroupfs：当使用 cgroupfs 驱动时，kubelet 和容器运行时将直接对接 cgroup 文件系统来配置 cgroup。
- systemd：systemd 也是对于 cgroup 接口的一个封装。systemd 以 PID 1 的形式在系统启动的时候运行，并提供了一套系统管理守护程序、库和实用程序，用来控制、管理 Linux 计算机操作系统资源。

debian、centos7 系统，都是使用 systemd 初始化系统的。systemd 这边已经有一套 cgroup 管理器了，如果容器运行时和 kubelet 使用 cgroupfs，此时就会存在 cgroups 和 systemd 两种 cgroup 管理器。也就意味着操作系统里面存在两种资源分配的视图。我们将 kubelet 和 容器运行时的 cgroup 驱动统一改为 Systemd。


4. 创建 containerd 的 systemd service 文件

```
https://raw.githubusercontent.com/containerd/containerd/main/containerd.service

# Copyright The containerd Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd

Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5

# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity

# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
```


[^1]: 参见 https://github.com/kubernetes/cri-api/blob/master/pkg/apis/runtime/v1/api.proto

