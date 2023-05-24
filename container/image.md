# 容器镜像

镜像的本质是利用联合文件系统（Union File System）实现的分层文件系统，配合 OCI 规范 解包成一个 runtime bundle，再从中可以根据运行时标准运行容器。此外，结合镜像仓库（Repository ），自动构建技术，大大简化了应用分发、部署、升级流程。这些都是容器技术流行的的重要因素。

本篇文章主要介绍 OCI image spec 部分，OCI 目前的镜像标准版本为 V1，由 docker V2 演化而来，两者之间可以借助工具相互转换。

## 镜像的内容

OCIv1 镜像主要包括以下几块内容：

- **文件系统**：以 layer 保存的文件系统，每个 layer 保存了和上层之间变化的部分，layer 应该保存哪些文件，怎么表示增加、修改和删除的文件等
- **config 文件**：保存了文件系统的层级信息（每个层级的 hash 值，以及历史信息），以及容器运行时需要的一些信息（比如环境变量、工作目录、命令参数、mount 列表），指定了镜像在某个特定平台和系统的配置。比较接近我们使用 `docker inspect <image_id>` 看到的内容
- **manifest 文件**：镜像的 config 文件索引，有哪些 layer，额外的 annotation 信息，manifest 文件中保存了很多和当前平台有关的信息
- **index 文件**：可选的文件，指向不同平台的 manifest 文件，这个文件能保证一个镜像可以跨平台使用，每个平台拥有不同的 manifest 文件，使用 index 作为索引


## 什么是联合文件系统

联合文件系统（Union File System）也叫 UnionFS，主要的功能是将多个不同位置的目录联合挂载（union mount）到同一个目录下。

下面以 overlay 实现为例演示联合挂载的效果

```
$ tree .
.
├── lower
│   ├── b
│   └── c
├── merged
├── upper
│   ├── a
│   └── b
└── work
```

在 OverlayFS 中，存在 Lower 和 Upper 的概念，overlay 是“覆盖…上面”的意思，表示一个文件系统覆盖在另一个文件系统上面，也就是将 upperdir 参数指定的目录覆盖到 lowerdir 参数指定的目录之上，并且挂载到 merged 目录里面.

使用 mount 命令把 lowerdir 和 upperdir 目录合并挂载到 merged 目录中

```
$ mount -t overlay overlay -o lowerdir=lower,upperdir=upper,workdir=work merged
$ cd merged && tree .
.
├── a
├── b
└── c
```

```
$ echo hi >> c
$ echo hello >> b
```

从上面可以看出 merged 目录里面的东西就是合并的结果，对 b 文件修改则, 可见生效的是 upper 的 b 文件, 对 c 文件进行修改，则会在 upper 目录中进行 CoW 操作，lower 目录中 c 文件并不进行修改。（因为 B 在挂载时位于更上层）

## 镜像转化


## 容器的读写效率问题

为了最小化 I/O 以及缩减镜像体积，容器的联合文件系统在读写文件时会采取写时复制策略（copy-on-write），如果一个文件或目录存在于镜像中的较低层，而另一个层（包括可写层）需要对其进行读取访问时，会直接访问较低层的文件。当另一个层第一次需要写入该文件时（在构建镜像或运行容器时），该文件会被复制到该层并被修改。这一举措大大减少了容器的启动时间（启动时新建的可写层只有很少的文件写入），但容器运行后每次第一次修改某个文件都需要先将整个文件复制到 container layer 中。

以上原因导致容器运行时的读写效率不如原生文件系统（尤其是写入效率），在 container layer 中不适合进行大量的文件读写，通常建议将频繁写入的数据库、日志文件或目录等单独挂载出去，如使用 Docker 提供的 Volume，此时目录将通过绑定挂载（Bind Mount）直接挂载在可读写层中，绕过了写时复制带来的性能损耗。
