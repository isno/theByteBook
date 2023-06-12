# 容器镜像

容器镜像是云原生的基础设施之一，作为容器运行时文件系统视图基础，从它诞生到现在，衍生出了镜像构建、存储、分发到运行时的整个镜像生命周期的各种生态。

容器提供给了应用一个快速、轻量且有着基本隔离环境的运行时，而镜像提供给了容器 RootFS，也就是容器内能看到的整个 Filesystem 视图，其中至少包括了文件目录树结构、文件元数据以及数据部分。镜像的特点如下：

- 易于传输，例如通过网络以 HTTP 的方式从 Registry 上传或下载。
- 易于存储，例如可以打包成 Tar Gzip 格式，存储在 Registry 上。
- 具备不可变特性，整个镜像有一个唯一 Hash，只要镜像内容发生变化，镜像 Hash 也会被改变。


早期的镜像格式是由 Docker 设计的，经历了从 Image Manifest V1、V2 Scheme 1到 V2 Scheme 2的演进。后来出现了诸如 CoreOS 推出的其他容器运行时后，为了避免竞争和生态混乱，OCI 标准化社区成立。它定义了容器在运行时、镜像以及分发相关的实现标准，我们目前用的镜像格式基本都是 OCI 兼容。

## 容器镜像的组成

镜像主要是由镜像层和容器配置两大部分组成。

<div  align="center">
  <img src="../assets/oci-image.png" width = "200"  align=center />
</div>


什么是镜像层呢？可以回想下平时写的 Dockerfile 文件：每条 ADD、COPY、RUN 指令都可能会产生新的镜像层，新层包含的是在旧层的基础上，新增加或修改的文件 （包含元数据和数据） ，或被删除的文件 。

简单来说镜像的每一层存储的是 Lower 与 Upper 之间的 Diff，非常类似 Git Commit。这层 Diff 通常会被压缩成 Tar Gzip 格式后上传到 Registry。

在运行时，所有 Diff 堆叠起来后，就组成了提供给容器的整个文件系统视图，也就是 RootFS。

镜像的另外一部分是容器运行时配置，这部分包含了命令、环境变量、端口等信息。

镜像层和运行时配置各自有一个唯一 Hash （通常是 SHA256），这些 Hash 会被写进一个叫 Manifest的 JSON 文件里，在 Pull 镜像时实际就是先拉取 Manifest 文件，然后再根据 Hash 去 Registry 拉取对应的镜像层/容器运行时配置。


## OCI 镜像标准规范

OCIv1 镜像主要包括以下几块内容：

- Image Manifest：提供了镜像的配置和文件系统层定位信息，可以看作是镜像的目录，文件格式为 json 。
- Image Layer Filesystem Changeset：序列化之后的文件系统和文件系统变更，它们可按顺序一层层应用为一个容器的 rootfs，因此通常也被称为一个 layer（与下文提到的镜像层同义），文件格式可以是 tar ，gzip 等存档或压缩格式。
- Image Configuration：包含了镜像在运行时所使用的执行参数以及有序的 rootfs 变更信息，文件类型为 json。


使用 skopeo 工具，将 Docker 中 redis 镜像转换为 OCI 镜像

```
skopeo --override-os linux copy docker://redis oci:redis
```

我们查看 redis 的OCI 镜像目录

```
$ tree redis
.
├── blobs
│   └── sha256
│       ├── 08769906aa59a6b44a9adc62fc0e0679e3448eaab13317401034f390435c14bf
│       ├── 376e1ba47d221972f7eb9dd659c50d8e42bcfd0e58382d755794a23a8b80976a
│       ├── 37e84c7a626f560a60b27167c9fa9e6c983d3edf548d84419ab018191dc37ae1
│       ├── 635073d8ccd5742db583464e12fc522108ebbe64081f03326fcdf1d6afd1ce5b
│       ├── 806c192e03757340ba67f7ba9b03152f70324d86b62f0d691f53d16438a5f6cf
│       ├── 8db26c5e84351f9ea1f32f57b0c6073bd96d345f3f21574b64e787a725d50f72
│       ├── 94e8d834f31956b2a827b6abb6631bc43c5a3c3402a59f509a30e6762e83deb3
│       └── f03b40093957615593f2ed142961afb6b540507e0b47e3f7626ba5e02efbbbf1
├── index.json
└── oci-layout
```

OCI 镜像的规范是在 Docker image 基础上建立的，相似性很大，我们查看具体的内容。

### oci-layout

oci-layout 是 OCI image的布局文件，主要说明它所遵循的镜像规范标准。

```
$ cat oci-layout | jq
{
  "imageLayoutVersion": "1.0.0"
}
```
此处可以看到，该镜像遵循的标准为 OCI 1.0.0 布局规范。

### index.json

```
$ cat index.json | jq 
{
  "schemaVersion": 2,
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "digest": "sha256:376e1ba47d221972f7eb9dd659c50d8e42bcfd0e58382d755794a23a8b80976a",
      "size": 1186
    }
  ]
}
```
从它的内容可以看到 mediaType 和 Docker image 类型形式相似，只不过 docker 换成了 oci。 从这个配置中，看到第一个 blob 是 sha256:376e1ba47d221972f7eb9dd659c50d8e42bcfd0e58382d755794a23a8b80976a。


这个入口文件描述了 OCI 镜像的实际配置和其中 Layer的 信息，如果有多层，那么layers 也会相应增加，我们看看它的内容

```
$ cat blobs/sha256/376e1ba47d221972f7eb9dd659c50d8e42bcfd0e58382d755794a23a8b80976a | jq
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.manifest.v1+json",
  "config": {
    "mediaType": "application/vnd.oci.image.config.v1+json",
    "digest": "sha256:94e8d834f31956b2a827b6abb6631bc43c5a3c3402a59f509a30e6762e83deb3",
    "size": 6587
  },
  "layers": [
    {
      "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
      "digest": "sha256:f03b40093957615593f2ed142961afb6b540507e0b47e3f7626ba5e02efbbbf1",
      "size": 31403586
    },
    {
      "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
      "digest": "sha256:8db26c5e84351f9ea1f32f57b0c6073bd96d345f3f21574b64e787a725d50f72",
      "size": 1733
    },
    ...
  ]
}
```

其中，layers mediaType 使用了 application/vnd.oci.image.layer.v1.tar+gzip，说明内容经过可 gzip 压缩。

我们解压第一层，我们会发现是一个 rootfs，这也印证了我们前面所说 镜像的本质。

```
$ tar xzvf f03b40093957615593f2ed142961afb6b540507e0b47e3f7626ba5e02efbbbf1 -C test

$ cd test && ls 
bin	dev	home	lib64	mnt	proc	run	srv	tmp	var
boot	etc	lib	media	opt	root	sbin	sys	usr
```







