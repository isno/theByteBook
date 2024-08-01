# 7.3 容器镜像的原理与应用

前面文章中反复提及一个概念 —— 镜像。那镜像到底是什么呢？

所谓的“容器镜像”，其实就是容器内部通过系统调用 chroot/pivot_root 为进程运行切换的根目录，也就是包含了进程所需的库、资源、配置等完整的 rootfs 文件系统。 

:::tip 额外知识

Linux 操作系统中只有开机启动时会加载指定版本的内核镜像，rootfs 只是一个操作系统包含的文件、目录，并不包含操作系统内核。

因此，同一台宿主机上所有的容器，都共享宿主机操作系统的内核。如果容器内的应用内核进行交互，将会影响宿主机以及其他容器，这是容器相比虚拟机主要缺陷之一。
:::

## 7.3.1 联合文件系统

Docker 镜像并不是粗暴地把所有的依赖文件封包，而是做了一个巧妙的创新：**基于 UnionFS（Union File System，联合文件系统）采用堆叠的方式，对 rootfs 进行分层设计**。

:::tip UnionFS 是什么
UnionFS 技术能够将不同的层整合成一个文件系统，为这些层提供了一个统一视角，这样就隐藏了多层的存在，在用户的角度看来，只存在一个文件系统。
:::

UnionFS 有很多种实现，譬如 OverlayFS、Btrfs、AUFS 等等。在 Linux 内核 3.18 版本中，OverlayFS 代码正式合入 Linux 内核的主分支。这之后，OverlayFS 逐渐成为各个主流 Linux 发行版本里缺省使用的容器文件系统。

下面用代码演示 OverlayFS 的工作原理。

代码中最后一行使用 mount 挂载一个联合文件系统，其他 -t 参数指定挂载后的文件系统类型为 overlay， lowerdir（只读层，可以指定多个目录）、upperdir（读写层）、merged（挂载后，最终呈现给用户视图）等为 overlay 的参数 。

```bash
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

$ sudo mount -t overlay overlay \
 -o lowerdir=./lower,upperdir=./upper,workdir=./work \
 ./merged
```

挂载后的文件系统视图，如图 7-7 所示。

:::center
  ![](../assets/overfs.jpeg)<br/>
  图 7-7 OverlayFS 挂载后的文件系统视图
:::

当在挂载后的 merged 目录里内进行增删改操作时，OverlayFS 驱动会执行 CoW（Copy-On-Write，写时复制）策略。CoW 大致的原理，用如下操作流程说明：

- 新建文件时：文件会出现在 upper 目录中。
- 删除文件时：
  - 如果删除“in_upper.txt”，文件会在 upper 目录中消失。
  - 如果删除“in_lower.txt”, lower 目录里内的 ”in_lower.txt” 文件不会有变化，但 upper 目录中会增加一个特殊文件表示“in_lower.txt”这个文件不能出现在 merged 里了，表示它已经被删除了。
- 修改文件：如果修改“in_lower.txt”，会在 upper 目录中新建一个“in_lower.txt”文件，包含更新后的内容，而 lower 中原来的文件“in_lower.txt”不会改变。

图 7-8 是 Docker 官方的一张描述镜像文件系统的图片，它的结构显示了联合文件系统在镜像层和容器层起到的作用。

:::center
  ![](../assets/overlay_constructs.webp)<br/>
  图 7-8 使用联合文件系统的 Docker 镜像结构 [图片来源](https://docs.docker.com/storage/storagedriver/overlayfs-driver/)
:::

## 7.3.2 Docker 镜像的分层设计

Docker 镜像启动后的容器视图如 7-9 所示，该容器从下往上由 6 个层构成：
- 最下层的是基础镜像 debian stretch；
- 往上 3 层为 Dockerfile 通过指令 ADD、ENV、CMD 等生成的只读层；
- Init Layer 夹在只读层和可写层之间，主要存放可能会被修改的 /etc/hosts、/etc/resolv.conf 等文件，这些文件本来属于 debian 镜像，但容器启时，用户往往会写入一些指定的配置，所以 Docker 单独生成了这个层；
- 最上面的是利用 CoW 技术创建的可写层（Read/Write Layer）。容器内部的任何增、删、改都发生在这里，但该层的数据不具备持久性，当容器被销毁时，写入的数据也随之消失。

:::center
  ![](../assets/docker-file-system.png)<br/>
  图 7-9 容器镜像层概览
:::

最终，这 6 个层被联合挂载到 /var/lib/docker/overlay/mnt 目录中，表现为一个带有 JAVA JDK 的 debian 操作系统供容器使用。

## 7.3.3 构建足够小的镜像

构建镜像最有挑战性之一的就是使用镜像尽可能小，小的镜像不论在大规模集群部署、故障转移、存储成本方面都有巨大的优势。

构建足够小的镜像，效果明显的方式有两种：**选用精简的基础镜像以及使用多阶段构建**。

```dockerfile
# 第 1 阶段
FROM skillfir/alpine:gcc AS builder01
RUN wget https://nginx.org/download/nginx-1.24.0.tar.gz -O nginx.tar.gz && \
tar -zxf nginx.tar.gz && \
rm -f nginx.tar.gz && \
cd /usr/src/nginx-1.24.0 && \
 ./configure --prefix=/app/nginx --sbin-path=/app/nginx/sbin/nginx && \
  make && make install
  
# 第 2 阶段 只打包最终可执行文件
FROM skillfir/alpine:glibc
RUN apk update && apk upgrade && apk add pcre openssl-dev pcre-dev zlib-dev 

COPY --from=builder01 /app/nginx /app/nginx
WORKDIR /app/nginx
EXPOSE 80
CMD ["./sbin/nginx","-g","daemon off;"]
```

使用 docker build 命令构建镜像，并查看镜像产物，可以看到生成的镜像大小只有 23.4 MB。

```bash
$ docker build -t alpine:nginx .
$ docker images 
REPOSITORY                TAG             IMAGE ID       CREATED          SIZE
alpine                    nginx           ca338a969cf7   17 seconds ago   23.4MB
```

## 7.3.4 镜像下载加速

使用镜像文件时，得从远程仓库下载，那么镜像下载的效率会受带宽、镜像仓库瓶颈的影响，这也直接影响到容器的启动时间。思考如何提高镜像下载的效率？你大概率会想到 P2P 网络加速。

Dragonfly 就是基于 P2P 网络实现的容器镜像分发加速系统。

:::tip 什么是 Dragonfly
Dragonfly 是一款基于 P2P 技术的文件分发和镜像加速系统，它旨在提高大规模文件传输的效率，最大限度地利用网络带宽。在镜像分发、文件分发、日志分发、AI 模型分发以及 AI 数据集分发等领域被大规模使用。
:::

Dragonfly 提供了一种无侵入（不用修改容器、仓库等源码）的镜像下载加速解决方案，它的工作流程如图 7-10 所示。

当下载一个镜像或文件时，通过 Peer（类似 p2p 的节点） 中的 HTTP Proxy 将下载请求代理到 Dragonfly。Peer 首先会 Scheduler（类似 p2p 调度器）注册 task。Scheduler 会查看 Task 的信息，判断 Task 是否在 P2P 集群内第一次下载。

- 第一次下载优先触发 Seed Peer 进行回源下载，并且下载过程中对 Task 基于 Piece 级别切分。Peer 每下载成功一个 Piece，都将信息上报给 Scheduler 供下次调度使用。
- 如果 Task 在 P2P 集群内非第一次下载，那么 Scheduler 会调度其他 Peer 加速当前的 Peer 中的下载。

最后，Peer 从不同的 Peer 下载 Piece，拼接并返回整个文件，整个 P2P 下载流程就结束了。

:::center
  ![](../assets/dragonfly.png)<br/>
  图 7-10 Dragonfly 是怎么工作的 [图片来源](https://d7y.io/zh/docs/)
:::

## 7.3.5 镜像启动加速

容器镜像的大小直接影响容器启动的时间，一些大型软件的镜像会在数 GB 以上。例如用于机器学习的 TensorFlow 的镜像有 1.83 GB，冷启动该镜像至少需要 3 分钟的时间。

大的镜像一则启动慢，二则镜像内的文件也并不会被充分利用[^1]。如果能实现镜像内文件按需加载，肯定能大幅降低容器启动时间，这便是 Nydus 出现的背景。

Nydus 是蚂蚁集团、阿里云和字节等共建的开源容器镜像加速项目。Nydus 主要优化了镜像中 Layer 数据层的数据结构，将容器镜像文件系统的数据 (blobs）和元数据 (bootstrap) 分离，由于元数据被单独分离出来，因此对于元数据的访问不需拉取对应的 blob 数据，拉取的数据量要小很多，I/O 效率更高。

最后再利用 FUSE 技术（Filesystem in Userspace，用户态文件系统）重写文件系统，实现了容器启动后，按需从远端（镜像中心）拉取镜像内的数据。

:::center
  ![](../assets/nydus.png)<br/>
  图 7-11 Nydus 是怎么工作的 [图片来源](https://d7y.io/zh/blog/2022/06/06/evolution-of-nydus/)
:::

由于使用了按需加载镜像数据，容器的启动时间明显缩短。从官网给到的性能测试数据中，Nydus 能够把常见镜像的启动时间，从数分钟缩短到数秒钟。

:::center
  ![](../assets/nydus-performance.png)<br/>
  图 7-12 OCIv1 与 Nydus 镜像启动时间对比
:::

如此，使用 P2P 的方式加速镜像下载，再结合 Nydus 容器启动延迟加载技术实现瞬时启动几百、几千 Pod 的能力，对于大规模集群或者对冷启动扩容延迟要求较高的场景（大促扩容、游戏服务器扩容、函数计算）来说，不仅能大幅降低容器启动时间，还能大量节省网络/存储开销。

[^1]: 业内有研究证明一般镜像只有 6% 的内容会被实际用到 https://indico.cern.ch/event/567550/papers/2627182/files/6153-paper.pdf