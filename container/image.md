# 7.4 容器镜像

容器镜像简单理解就是个 Gzip 压缩的特殊文件系统，内部包含了容器运行时所需的程序、库、资源、配置等。作为容器运行时文件系统视图基础，容器镜像衍生出了构建、存储、分发到运行时的整个镜像生命周期各种生态。早期的镜像格式是由 Docker 设计，现在镜像格式基本都遵循了 OCI 标准。

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






