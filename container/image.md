# 7.3 离完美还只差一步



```
$ mkdir -p $HOME/{bin,lib64,root}
$ cp /bin/bash new-root/bin
$ cp /lib64/{ld-linux-x86-64.so*,libc.so*,libdl.so.2,libreadline.so*,libtinfo.so*} new-root/lib64
$ sudo chroot new-root

```
我们在子进程的 shell 里面输入 top、ps 等命令，还是可以看到所有的进程，

最完整的依赖库实际上就是操作系统本身的所有文件和目录。


可以看到 即使使用了 Mount ，容器进程看到的文件系统也好宿主机一样。

这是因为 Mount 只是隔离了子进程的 Mount，对于操作系统原有的 Mount 并不可见，

这个挂载操作系统是无感知的额，那可想而知，只要在进程启动之间挂载整个根目录 /，就可以让容器随意折腾而不影响宿主机。

对 Docker 项目来说，它最核心的原理实际上有以下三点：

- 创建一个新的 mount namespace
- 在新的 mount namespace 中，挂载需要的文件系统。例如 /etc、/bin、/proc
- 使用 chroot() 系统调用将进程的根目录更改为新的根目录

这样，一个完整的容器就诞生了。

需要明确的是，rootfs 只是一个操作系统所包含的文件、配置和目录，并不包括操作系统内核。

Docker 公司在实现 Docker 镜像时并没有沿用以前制作 rootfs 的标准流程，而是做了一个小小的创新




在 Linux 系统中，提供了 chroot 命名实现这个功能，它专门用于将当前进程的根目录更改到指定目录。

比如刚才的容器 “/bin/sh” ，我们可以通过 chroot $certain_path /bin/bash 来指定根目录为 $certain_path。

这个挂载在容器根目录为容器进程提供隔离后的文件系统，就是容器镜像，或者成为 rootfs。

常见的 rootfs 还包含 /etc、/bin、/proc 等路径。

完整的容器就诞生了。



不过，正是由于 rootfs 的存在，容器才有了一个被反复宣传至今的重要特性：一致性。由于 rootfs 里打包的不只是应用，而是整个操作系统的文件和目录，也就意味着，应用以及它运行所需要的所有依赖，都被封装在了一起。




容器镜像简单理解就是个特殊文件系统，内部包含了容器运行时所需的程序、库、资源、配置等。镜像的底层技术是使用 unionfs 的多层文件系统，它允许将多个文件系统层叠在一起，形成一个统一的文件系统视图。每个容器镜像都可以由多个文件系统层组成，包括基础镜像层、中间镜像层和容器特定的可写层。

在 OCI 标准镜像出台之前，其实有两套广泛使用的镜像规范，分别是 appc 和 docker v2.2，但合久必分、分久必合，两者的规范也在各自的发展中逐步同化，所以 OCI 组织顺水推舟地在 docker v2.2 的基础上推出了 oci image format spec，规定了对于符合规范的镜像，允许开发者只要对容器打包和前面一次，就可以在所有的容器引擎中运行该容器。

## 7.4.1 容器镜像的组成

镜像主要是由镜像层和运行时配置两大部分组成。镜像层和运行时配置各自有一个唯一 Hash，这些 Hash 会被写进一个叫 Manifest 的 JSON 文件里，在 Pull 镜像时实际就是先拉取 Manifest 文件，然后再根据 Hash 去 Registry 拉取对应的镜像层/容器运行时配置。

<div  align="center">
  <img src="../assets/oci-image.png" width = "200"  align=center />
</div>

## 7.4.2 镜像标准规范

OCIv1 镜像主要包括以下几块内容：

- Image Manifest：提供了镜像的配置和文件系统层定位信息，可以看作是镜像的目录，文件格式为 json 。
- Image Layer Filesystem Changeset：序列化之后的文件系统和文件系统变更，它们可按顺序一层层应用为一个容器的 rootfs，因此通常也被称为一个 layer（与下文提到的镜像层同义），文件格式可以是 tar ，gzip 等存档或压缩格式。
- Image Configuration：包含了镜像在运行时所使用的执行参数以及有序的 rootfs 变更信息，文件类型为 json。


我们把一个 Redis 解压之后，查看其目录结构，可以看到 有 oci-layout、index.json 以及 blobs 下 layer 配置信息等。

```plain
$ tree redis
.
├── blobs
│   └── sha256
│       ├── 08769906aa59a6b44a9adc62fc0e0679e3448eaab13317401034f390435c14bf
│       ├── 376e1ba47d221972f7eb9dd659c50d8e42bcfd0e58382d755794a23a8b80976a
│       ├── 37e84c7a626f560a60b27167c9fa9e6c983d3edf548d84419ab018191dc37ae1
│       ...
├── index.json
└── oci-layout
```

其中，oci-layout 是 OCI 镜像的布局文件，主要说明它所遵循的镜像规范标准。

```plain
$ cat oci-layout | jq
{
  "imageLayoutVersion": "1.0.0"
}
```
此处可以看到，该镜像遵循的标准为 OCI 1.0.0 布局规范。index.json 描述了 OCI 镜像的实际配置和其中 Layer 的信息，对其中 blobs 第一个 layer 进行解压查看，会发现是这一个 rootfs 目录，这也印证了我们前面所说镜像的本质。

```plain
$ tar xzvf f03b40093957615593f2ed142961afb6b540507e0b47e3f7626ba5e02efbbbf1 -C test

$ cd test && ls 
bin	dev	home	lib64	mnt	proc	run	srv	tmp	var
boot	etc	lib	media	opt	root	sbin	sys	usr
```

在我们使用 docker run 命令时，便是将镜像中的各个层和配置组织起来从而启动一个新的容器。镜像就是一系列文件和配置的组合，它是静态的、只读的、不可修改的，而容器则是镜像的实例化，它是可操作的、动态的、可修改的。


## 镜像分发加速

容器云平台达到一定规模之后，镜像分发就可能成为整个平台的性能瓶颈。举例说明：在生产实践中，较大尺寸的容器镜像有多方面的问题（见过 12G 的镜像文件），其一影响容器启动效率，其二在应对瞬时高峰启动几百、几千 Pod 时，受带宽、镜像仓库服务瓶颈等影响，会存在较长的耗时。笔者见过多次所有的环节准备完毕，唯独遗漏了镜像下载服务，有时候甚至流量高峰已过，集群还没有扩展完毕。

如果你也有过此类的困扰，那么可以看看 Dragonfly。Dragonfly 是阿里巴巴开源的容器镜像分发系统，目标是解决容器镜像分发效率低下和镜像共享依赖公共镜像仓库等问题。它的核心思想是基于 P2P 的镜像分发模型，以提高镜像传输速度和并发性，减少公共镜像仓库的依赖。


Dragonfly 是一种无侵入的解决方案，并不需要修改 Docker 等源码，下图为 Dragonfly 的架构图，在每一个节点上会启动一个 dfdaemon 和 dfget, dfdaemon 是一个代理程序，他会截获 dockerd 上传或者下载镜像的请求，dfget 是一个下载客户端工具。每个 dfget 启动后 将自己注册到 supernode 上。supernode 超级节点以被动 CDN 的方式产生种子数据块，并调度数据块分布。

<div  align="center">
	<img src="../assets/dragonfly.png" width = "550"  align=center />
</div>

通过镜像加速下载的场景，解析其中运作原理：

- dfget-proxy 拦截客户端 docker 发起的镜像下载请求（docker pull）并转换为向 SuperNode 的 dfget 下载请求。
- SuperNode 从镜像源仓库下载镜像并将镜像分割成多个 block 种子数据块。
- dfget 下载数据块并对外共享已下载的数据块，SuperNode 记录数据块下载情况，并指引后续下载请求在结点之间以 P2P 方式进行数据块下载。
- dfdaemon 将将镜像分片文件组成完整的镜像。


## 镜像启动加速

SUSE 的工程师 Aleksa Sarai 也专门写过一篇文章 来讨论这个话题，除了 tar 格式本身的标准化问题外，大家对当前的镜像的主要不满集中在

- **内容冗余**：不同层之间相同信息在传输和存储时都是冗余内容，在不读取内容的时候无法判断到这些冗余的存在。
- **无法并行**：单一层是一个整体，对同一个层既无法并行传输，也不能并行提取。
- **无法进行小块数据的校验** 只有完整的层下载完成之后，才能对整个层的数据做完整性校验。

上述这些问题核心是镜像的基本单位是 layer。但实际上，容器的运行整个镜像并不会被充分利用，然而，镜像的数据的实际使用率是很低的，Cern 在《Making containers lazy with Docker and CernVM-FS》的论文中就提到[^2]，一般镜像只有 6% 的内容会被实际用到。为了解决上面这些问题，我们就考虑实现一种新型的镜像结构，对镜像存储利用率、启动速度等更进一步优化，而这些就是 Nydus 要做的工作。


Nydus 是阿里云发起的基于延迟加载原理的镜像加速项目，配合 Dragonfly 做 P2P 加速，能够极大缩短镜像下载时间、提升效率，从而让用户能够更安全快捷地启动容器应用。

Nydus 提供了容器镜像按需加载的能力，在生产环境支撑了每日百万级别的加速镜像容器创建，在启动性能，镜像空间优化，端到端数据一致性，内核态支持等方面相比 OCIv1 有巨大优势。Nydus 符合 OCI 标准，与 containerd、CRI-O、Kata-containers 等流行的运行时有良好的兼容性。

<div  align="center">
	<img src="../assets/nydus.png" width = "550"  align=center />
</div>

Nydus 镜像格式并没有对 OCI 镜像格式在架构上进行修改，主要优化了其中的 Layer 数据层的数据结构。Nydus 将原本统一存放在 Layer 层的文件数据和元数据 （文件系统的目录结构、文件元数据等） 分开，分别存放在 `Blob Layer` 和 `Bootstrap Layer` 中。并对 `Blob Layer` 中存放的文件数据进行分块，以便于延迟加载 （在需要访问某个文件时，只需要拉取对应的 Chunk 即可，不需要拉取整个 Blob Layer） 。

同时，这些分块信息，包括每个 Chunk 在 Blob Layer 的位置信息等也被存放在 Bootstrap Layer 这个元数据层中。这样，容器启动时，仅需拉取 Bootstrap Layer 层，当容器具体访问到某个文件时，再根据 Bootstrap Layer 中的元信息拉取对应 Blob Layer 中的对应的 Chunk 即可。


总结，使用 Nydus 的优势如下：

- 容器镜像按需下载，用户不再需要下载完整镜像就能启动容器。
- 块级别的镜像数据去重，最大限度为用户节省存储资源。
- 镜像只有最终可用的数据，不需要保存和下载过期数据。
- 端到端的数据一致性校验，为用户提供更好的数据保护。
- 兼容 OCI 分发标准和 artifacts 标准，开箱可用。
- 支持不同的镜像存储后端，镜像数据不只可以存放在镜像仓库，还可以放到 NAS 或者类似 S3 对象存储中。
- 与 Dragonfly 良好集成。


用户部署了 Nydus 镜像服务后，由于使用了按需加载镜像数据的特性，容器的启动时间明显缩短。在官网的测试数据中，Nydus 能够把常见镜像的启动时间，从数分钟缩短到数秒钟。理论上来说，容器镜像越大，Nydus 体现出来的效果越明显。

<div  align="center">
	<img src="../assets/nydus-performance.png" width = "550"  align=center />
</div>

[^1]: 参见 https://www.cyphar.com/blog/post/20190121-ociv2-images-i-tar
[^2]: 参见 https://indico.cern.ch/event/567550/papers/2627182/files/6153-paper.pdf