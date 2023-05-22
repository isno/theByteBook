# Nydus 镜像

Nydus 镜像加速框架是 Dragonfly 的子项目，它提供了容器镜像按需加载的能力，在生产环境支撑了每日百万级别的加速镜像容器创建，在启动性能，镜像空间优化，端到端数据一致性，内核态支持等方面相比 OCIv1 有巨大优势。

Nydus 运行时由 Rust 编写，它在语言级别的安全性以及在性能、内存和 CPU 的开销方面非常有优势，同时也兼具了安全和高可扩展性。


## Nydus 工作流程


<div  align="center">
	<img src="../assets/nydus.png" width = "550"  align=center />
</div>

Nydus 镜像格式并没有对 OCI 镜像格式在架构上进行修改，而主要优化了其中的 Layer 数据层的数据结构。

Nydus 将原本统一存放在 Layer 层的文件数据和元数据 （文件系统的目录结构、文件元数据等） 分开，分别存放在 “Blob Layer” 和 “Bootstrap Layer” 中。并对 Blob Layer 中存放的文件数据进行分块 （Chunk） ，以便于懒加载 （在需要访问某个文件时，只需要拉取对应的 Chunk 即可，不需要拉取整个 Blob Layer） 。

同时，这些分块信息，包括每个 Chunk 在 Blob Layer 的位置信息等也被存放在 Bootstrap Layer 这个元数据层中。这样，容器启动时，仅需拉取 Bootstrap Layer 层，当容器具体访问到某个文件时，再根据 Bootstrap Layer 中的元信息拉取对应 Blob Layer 中的对应的 Chunk 即可。

## Nydus 优势


### 容器启动速度变快


用户部署了 Nydus 镜像服务后，由于使用了按需加载镜像数据的特性，容器的启动时间明显缩短。在官网的测试数据中，Nydus 能够把常见镜像的启动时间，从数分钟缩短到数秒钟。理论上来说，容器镜像越大，Nydus 体现出来的效果越明显。

<div  align="center">
	<img src="../assets/nydus-performance.png" width = "550"  align=center />
</div>

### 提供运行时数据一致校验

在传统的镜像中，镜像数据会先被解压到本地文件系统，再由容器应用去访问使用。解压前，镜像数据是完整校验的。但是解压之后，镜像数据不再能够被校验。这带来的一个问题就是，如果解压后的镜像数据被无意或者恶意地修改， 用户是无法感知的。而 Nydus 镜像不会被解压到本地，同时可以对每一次数据访问进行校验，如果数据被篡改，则可以从远端数据源重新拉取。