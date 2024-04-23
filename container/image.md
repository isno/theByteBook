# 7.2 容器镜像的原理及演进

前面文章中反复提及一个概念: 镜像。那么镜像是什么呢？为什么它能深远影响技术开发的方式？

实际上，挂载在容器根目录的 rootfs（根文件系统），就是所谓的“容器镜像”，rootfs 将进程运行的所有依赖都封装在了一起，进而提供了容器最关键的特性 —— 本地云端一致性。

:::tip 额外知识

需要明确的是，Linux 操作系统中只有开机启动时会加载指定版本的内核镜像，rootfs 只是一个操作系统包含的文件、目录，并不包含操作系统内核。

因此，同一台宿主机上所有的容器，都共享宿主机操作系统的内核。如果应用程序需要配置内核参数、加载内核模块、与内核进行交互，那么是有很大风险的，这也是容器相比虚拟机主要的缺陷之一。

:::

不过 Docker 镜像和 rootfs 还是有一些区别， Docker 镜像并没有沿用以前制作 rootfs 的流程，而是做了一个小小的创新，基于 UnionFS（Union File System，联合文件系统）采用堆叠的方式，对 rootfs 进行分层（layer）设计，这样镜像内的公共部分（层）就可以在不同容器之间复用。

:::tip UnionFS 是什么

UnionFS（联合文件系统）技术能够将不同的层整合成一个文件系统，为这些层提供了一个统一视角，这样就隐藏了多层的存在，在用户的角度看来，只存在一个文件系统。
:::

UnionFS 有很多种实现，例如 OverlayFS、Btrfs 等。在 Linux 内核 3.18 版本中，OverlayFS 代码正式合入 Linux 内核的主分支。在这之后，OverlayFS 也就逐渐成为各个主流 Linux 发行版本里缺省使用的容器文件系统了。

Stripe 工程师 Julia Evans 曾撰写过一篇文章《How containers work: overlayfs》[^1]，文中作者用漫画形式说明容器镜像如何工作。

如下图所示，OverlayFS 工作原理概览。

<div  align="center">
  <img src="../assets/overlay.jpeg"  align=center />
  <p>OverlayFS 工作原理概览</p>
</div>

笔者继续借用 Julia Evans 文章中的代码示例，说明 OverlayFS 的原理。

```
#!/bin/bash

umount ./merged
rm upper lower merged work -r

mkdir upper lower merged work
echo "I'm from lower!" > lower/in_lower.txt
echo "I'm from upper!" > upper/in_upper.txt
# `in_both` is in both directories
echo "I'm from lower!" > lower/in_both.txt
echo "I'm from upper!" > upper/in_both.txt

// 使用 mount 命令即将 lower、upper 挂载到 merged。

sudo mount -t overlay overlay \
 -o lowerdir=./lower,upperdir=./upper,workdir=./work \
 ./merged
```
使用 mount 命令并指定文件系统类型为 overlay，挂载后的文件系统视图如下所示。

<div  align="center">
  <img src="../assets/overfs.jpeg"  align=center />
</div>


指定文件系统为 OverlayFS。这一条命令有几个 overlay 文件系统的关键的参数：lowerdir（只读层）、upperdir（读写层）、merged（挂载后，最终呈现给用户视图）

当在 merged 目录里内进行增删改操作时，存储驱动会执行一个写时复制(CoW)策略：

:::tip copy-on-write

写时复制是一种共享和复制文件的策略，可最大程度地提高效率。如果文件或目录位于镜像的较低层中，而另一层(包括可写层)需要对其进行读取访问，则它仅使用现有的已经存在的文件。另一层第一次需要修改文件时(在构建镜像或运行容器时)，将文件复制到该层并进行修改。这样可以将I/O和每个后续层的大小最小化

:::

写时复制的大致的流程如下。

- 新建文件时：这个文件会出现在 upper 目录中。
- 删除文件时：
  - 如果删除 ”in_upper.txt”，这个文件会在 upper 目录中消失。
  - 如果删除 ”in_lower.txt”, lower 目录里内的 ”in_lower.txt” 文件不会有变化，会在 upper 目录中增加一个特殊文件来告诉 OverlayFS ”in_lower.txt’这个文件不能出现在 merged 里了，这就表示它已经被删除了。
- 修改文件：如果修改”in_lower.txt”，会在 upper 目录中新建一个”in_lower.txt”文件，包含更新的内容，而在lower/中的原来的实际文件”in_lower.txt”不会改变

下面是 Docker 官方的一张描述文件系统的图片，显示了一张联合文件系统在串联镜像层和容器层起到的作用。

<div  align="center">
  <img src="../assets/overlay.png"  align=center />
</div>

再来概览容器的文件系统，启动一个容器(或来自同一镜像的多个容器)时，使用 layer 层复用，并使用 cow 创建薄薄的可写容器层。如此，不仅节省空间，还缩短了启动时间。

<div  align="center">
  <img src="../assets/docker-file-system.png"  align=center />
  <p>镜像文件系统概览</p>
</div>

## 镜像下载加速

镜像文件是从远程仓库下载而来，那么镜像下载的效率会受带宽、镜像仓库瓶颈的影响。

如果讨论提高镜像下载的效率？你一定能想到 P2P 网络加速。而 Dragonfly 就是基于这一网络模型的容器镜像分发系统。

:::tip 什么是 Dragonfly

Dragonfly 是一款基于 P2P 技术的文件分发和镜像加速系统，它旨在提高大规模文件传输的效率，最大限度地利用网络带宽。在镜像分发、文件分发、日志分发、AI 模型分发以及 AI 数据集分发等领域被大规模使用。

目前 Dragonfly 在 CNCF 托管作为孵化级项目。
:::

Dragonfly 提供了一种无侵入（不修改容器、仓库等源码）的镜像下载加速解决方案，它的工作流程如下图所示。当下载一个镜像或文件时，通过 Peer（类似 p2p 的节点） 的 HTTP Proxy 将下载请求代理到 Dragonfly。Peer 首先会 Scheduler（类似 p2p 调度器）注册 task。Scheduler 会查看 Task 的信息，判断 Task 是否在 P2P 集群内第一次下载

- 第一次下载优先触发 Seed Peer 进行回源下载，并且下载过程中对 Task 基于 Piece 级别切分。Peer 每下载成功一个 Piece， 会将信息上报给 Scheduler 供下次调度使用。
- 如果 Task 在 P2P 集群内非第一次下载，那么 Scheduler 会调度其他 Peer 给当前 Peer 下载。

Peer 从不同的 Peer 下载 Piece，拼接并返回整个文件，那么 P2P 下载就完成了。

<div  align="center">
	<img src="../assets/dragonfly.png" width = "550"  align=center />
	<p>Dragonfly 怎么运行的</p>
</div>

## 镜像启动加速

容器镜像的大小会影响容器启动的时间，例如 tensorflow 的镜像有 1.83 GB，启动这个镜像的时间要用 3 分钟。在一篇《Making containers lazy with Docker and CernVM-FS》[^3]的论文中就提到容器运行期间整个镜像内容并不会被充分利用，一般镜像只有 6% 的内容会被实际用到。

如果能实现按需加载，肯定能大幅降低容器启动时间，这便是 Nydus 出现的背景。

:::tip Nydus 是什么
Nydus 是蚂蚁集团、阿里云和字节等共建的开源容器镜像加速项目，是 CNCF Dragonfly 的子项目，Nydus 优化了现有的 OCIv1 容器镜像架构，设计了 RAFS (Registry Acceleration File System) 磁盘格式，最终呈现为一种“文件系统”的容器镜像格式的镜像加速实现。

:::

Nydus 主要优化了镜像中 Layer 数据层的数据结构，将容器镜像文件系统的数据 (blobs）和元数据 (bootstrap) 分离，让原来的镜像层（layer）只存储文件的数据部分，并且把文件以 chunk 为粒度分割，每层 blob 存储对应的 chunk 数据。

由于元数据被单独分离出来合为一处，因此对于元数据的访问不需拉取对应的 blob 数据，需要拉取的数据量要小很多，I/O 效率更高。

最后再利用 FUSE（Filesystem in Userspace，用户态文件系统）重写文件系统，实现了容器启动后，按需从远端（镜像中心）拉取镜像数据。

<div  align="center">
	<img src="../assets/nydus.png" width = "550"  align=center />
	<p>Nydus 工作流程</p>
</div>

由于使用了按需加载镜像数据的特性，容器的启动时间明显缩短。在官网给到的数据中，Nydus 能够把常见镜像的启动时间，从数分钟缩短到数秒钟。

<div  align="center">
	<img src="../assets/nydus-performance.png" width = "550"  align=center />
	<p>OCIv1 与 Nydus 镜像启动时间对比</p>
</div>

如此，使用 P2P 的方式加速镜像下载，再结合 Nydus 容器启动延迟加载技术实现瞬时启动几百、几千 Pod 的能力，对于大规模集群或者对冷启动扩容延迟要求较高的场景（大促扩容、游戏服务器扩容、函数计算）来说，不仅能大幅降低容器启动时间，还能大量节省网络/存储开销。

[^1]: 参见 https://jvns.ca/blog/2019/11/18/how-containers-work--overlayfs/
[^2]: 参见 https://www.cyphar.com/blog/post/20190121-ociv2-images-i-tar
[^3]: 参见 https://indico.cern.ch/event/567550/papers/2627182/files/6153-paper.pdf