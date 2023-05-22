# Nydus 镜像

Nydus 是蚂蚁集团、阿里云、字节等共建的开源容器镜像加速服务，是CNCF Dragonfly 的子项目。

Nydus在 OCI Image Spec的基础上重新设计了镜像格式和底层文件系统，它兼容了目前的 OCI 镜像构建、分发、运行时生态,旨在提高大规模集群中容器启动的效率和成功率。 Nydus 运行时由 Rust 编写，它在语言级别的安全性以及在性能、内存和 CPU 的开销方面非常有优势，同时也兼具了安全和高可扩展性。


## Nydus 工作流程


<div  align="center">
	<img src="../assets/nydus.png" width = "550"  align=center />
</div>

Nydus 镜像格式并没有对 OCI 镜像格式在架构上进行修改，而主要优化了其中的 Layer 数据层的数据结构。

Nydus 将原本统一存放在 Layer 层的文件数据和元数据 （文件系统的目录结构、文件元数据等） 分开，分别存放在 “Blob Layer” 和 “Bootstrap Layer” 中。并对 Blob Layer 中存放的文件数据进行分块 （Chunk） ，以便于懒加载 （在需要访问某个文件时，只需要拉取对应的 Chunk 即可，不需要拉取整个 Blob Layer） 。

同时，这些分块信息，包括每个 Chunk 在 Blob Layer 的位置信息等也被存放在 Bootstrap Layer 这个元数据层中。这样，容器启动时，仅需拉取 Bootstrap Layer 层，当容器具体访问到某个文件时，再根据 Bootstrap Layer 中的元信息拉取对应 Blob Layer 中的对应的 Chunk 即可。

## Nydus 优势

<div  align="center">
	<img src="../assets/nydus-performance.png" width = "550"  align=center />
</div>


- 容器镜像按需下载，用户不再需要下载完整镜像就能启动容器。 
- 块级别的镜像数据去重，最大限度为用户节省存储资源。 
- 镜像只有最终可用的数据，不需要保存和下载过期数据。 
- 端到端的数据一致性校验，为用户提供更好的数据保护。 
- 兼容 OCI 分发标准和 artifacts 标准，开箱即可用。 
- 支持不同的镜像存储后端，镜像数据不只可以存放在镜像仓库，还可以放到 NAS 或  者类似 S3 的对象存储上。 
- 与 Dragonfly 的良好集成