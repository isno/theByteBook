# Docker镜像与Union FS

Docker 真正的核心创新是容器镜像（Docker Image），这是一种利用联合文件系统UnionFS实现的分层文件系统，再结合Layer Docker由此实现了一种新型的应用打包、分发和运行机制。

容器镜像的方便之处在于可以自由的被分发，复用。例如我们想运行一个Java程序，那直接从DockerHub上pull一个含有Java JDK的基础镜像就可以运行我们的代码了,
我们也可以基于别人的镜像增加自己的改动，新生成一个镜像。另外在Docker镜像的设计中，引入了层（layer）的概念，实现了镜像的复用。

用户制作镜像时的每一步操作（Dockerfile文件中的每一行命令），都会生成一个层。这种分层的能力就是由Union FS提供的，

结合以上，我们再搞明白 Docker中rootfs、image和layer，我们就可以理解Docker镜像是怎么回事了



## rootfs

任何程序运行时都会有依赖，无论是开发语言层的依赖库，还是各种系统lib、操作系统等，不同的系统对库的要求不一样，为了让容器运行时一致，docker将依赖的操作系统、各种lib依赖整合打包在一起, 然后容器启动时，作为它的根目录（根文件系统rootfs），使得容器进程的各种依赖调用都在这个根目录里，这样就做到了环境的一致性。

也就是说rootfs代表一个Docker容器运行阶段内部可见的文件系统视角，该文件系统下含有Docker容器所需要的系统文件、工具、容器文件等。

传统的Linux操作系统内核启动时，内核会挂载一个只读的rootfs，当系统检测其完整性之后，决定是否将其切换为读写模式。

在Docker的架构中，沿用了Linux中这种rootfs思想.

Docker Daemon为容器挂载rootfs时，与传统的Linux内核相似，将其设定为只读模式。

但在rootfs挂载完毕之后， Docker Daemon利用Union Mount技术，在这个只读的rootfs之上，再挂载了一个读写的文件系统。在这里我们可以把Docker文件系统理解为：含有一个只读的rootfs和一个可读写的文件系统。容器中的进程对rootfs中的内容拥有只读权限，对于读写文件系统内容拥有读写权限。


<div  align="center">
    <img src="/assets/chapter4/docker-image.png" width = "500"  align=center />
</div>

通过上图发现，容器虽然只有一个文件系统，但该文件系统由两层构成，分别为读写文件系统和只读文件系统，文件系统即有了层级 “layer”的概念。

Docker利用在前面提到的Union Mount技术将这两个两层挂载。


## Union File System 

Union FS就是把不同物理位置的目录合并 mount 到同一个目录中。比如可以把一张 CD/DVD 和一个硬盘目录给联合 mount 在一起，然后就可以对只读的 CD/DVD 上的文件进行修改，当然修改的文件是存于硬盘上的目录里。它和核心原理有两个：

- 分支管理：它使用 branch 把不同文件系统的文件和目录"透明地"覆盖，形成一个单一一致的文件系统。这些 branch 或者是 read-only 的，或者是 read-write 的，所以当对这个虚拟后的联合文件系统进行写操作的时候，系统是真正写到了一个新的文件中。

- 写时复制：copy-on-write，简写为 CoW。它的思想是如果一个资源是重复的，在没有对资源做出修改前，并不需要立即复制出一个新的资源实例，这个资源被不同的所有者共享使用。当任何一个所有者要对该资源做出修改时，复制出一个新的资源实例给该所有者进行修改，修改后的资源成为其所有者的私有资源。


实现这种Union Mount的技术文件比较常见的有UnionFS、AUFS、OverlayFS、vpf、BrtFS等。

<div  align="center">
    <img src="/assets/chapter4/docker-overlayfs.png" width = "580"  align=center />
</div>

Docker中使用的是OverlayFS，这里我们就以OverlayFS举例联合文件系统的作用：

使用 Docker info查看储驱动

```
$ docker info --format '{{.Driver}}'
overlay2
```

先创建如下目录及文件：

```
[root@VM-12-12-centos demo]# tree .
.
├── lower
│   ├── b
│   └── c
├── merged
├── upper
│   ├── a
│   └── b
└── work
```

现在我们使用 OverlayFS mount 把 lowerdir 和 upperdir 目录合并挂载到 merge 目录中

```
sudo mount -t overlay overlay -o lowerdir=lower,upperdir=upper,workdir=work merged
```

在 OverlayFS 中，存在 Lower 和 Upper 的概念，overlay 其实是“覆盖…上面”的意思，表示一个文件系统覆盖在另一个文件系统上面，也就是将 upperdir 参数指定的目录覆盖到 lowerdir 参数指定的目录之上，并且挂载到 merged 目录里面.

```
[root@VM-12-12-centos merged]#  tree .
.
├── a
├── b
└── c
```
```
[root@VM-12-12-centos merged]#  echo hi >> c
[root@VM-12-12-centos merged]#  echo hello >> b
```


从上面可以看出 merged 目录里面的东西就是合并的结果，对 b 文件修改则, 可见生效的是upper的b文件, 对 c文件进行修改，则会在upper目录中进行CoW操作，lower目录中C文件并不进行修改。


在 overlay 中，upperdir 参数指定的文件系统通常是可写的；lowerdir 参数指定的文件系统通常是只读。也就是说，当我们对 overlay 文件系统做任何的变更，都只会修改 upperdir 文件系统中的文件，lowerdir 参数指定的文件不会变化，这也是 Docker中 layer的机制所在。


联合文件系统是 Docker 镜像的基础。

镜像可以通过分层来进行继承，基于基础镜像可以制作各种具体的应用镜像，不同 Docker 容器就可以共享一些基础的文件系统层，同时再加上自己独有的改动层，大大提高了存储的效率。

Docker实现容器文件系统Union Mount时，提供多种具体的问价系统解决方案，现在Docker版本中使用的通常是overlay2。


<div  align="center">
    <img src="/assets/chapter4/union-mount.png" width = "600"  align=center />
</div>


通过命令可以查看指定容器的文件系统驱动及挂载信息

```
docker inspect <container_id>

    "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/7497b70ff8c79a1dc636ce437a9083f617baa068b560ba80fd75588b9f73be09-init/diff,
                "MergedDir": "/var/lib/docker/overlay2/7497b70ff8c79a1dc636ce437a9083f617baa068b560ba80fd75588b9f73be09/merged",
                "UpperDir": "/var/lib/docker/overlay2/7497b70ff8c79a1dc636ce437a9083f617baa068b560ba80fd75588b9f73be09/diff",
                "WorkDir": "/var/lib/docker/overlay2/7497b70ff8c79a1dc636ce437a9083f617baa068b560ba80fd75588b9f73be09/work"
            },
            "Name": "overlay2"
        },
```



## 镜像的分层存储

因为镜像包含操作系统完整的 root 文件系统，体积往往很庞大，因此在 Docker 设计时，就充分利用 Union FS 的技术，将其设计为分层存储的架构。

以Centos的为例，虽然通过overlay2可以实现rootfs与读写系统的合并，但考虑到rootfs自身接近200MB的大小，如果以这个粒度实现容器的创建和管理，是否会稍显笨重？而且若用户希望拥有一个centos7.9的rootfs，是否有必要创建一个全新的rootfs，毕竟Centos7和Centos7.9有很多一致的内容。

Docker中Image的概念，则解决了上面的问题，简单的解释image，它就是Docker容器中只读rootfs中的一部分，换而言之，Docker容器的rootfs可以由多个image来构成，多个image构成rootfs依旧沿用Union Mount的技术。将其设计为分层存储的架构。

多个image构成rootfs如图所示：

<div  align="center">
    <img src="/assets/chapter4/image.png" width = "500"  align=center />
</div>

基于以上的概念 Docker Image又抽象出两种概念：父镜像以及基础镜像，除了容器rootfs最底层的镜像，其余镜像都依赖于底下的一个或多个镜像。

通过image的形式，原来较为臃肿的rootfs被逐渐打散成轻便的多层，除了轻便的特性之外，image还用于前面提到的只读特性，如此一来，不同的rootfs中的image完全可以拿来复用。


<div  align="center">
    <img src="/assets/chapter4/image-tree.png" width = "400"  align=center />
</div>



镜像构建时，会一层层构建，前一层是后一层的基础。每一层构建完就不会再发生改变，后一层上的任何改变只发生在自己这一层。比如，删除前一层文件的操作，实际不是真的删除前一层的文件，而是仅在当前层标记为该文件已删除。在最终容器运行的时候，虽然不会看到这个文件，但是实际上该文件会一直跟随镜像。因此，在构建镜像的时候，需要额外小心，每一层尽量只包含该层需要添加的东西，任何额外的东西应该在该层构建结束前清理掉。

分层存储的特征还使得镜像的复用、定制变的更为容易。甚至可以用之前构建好的镜像作为基础层，然后进一步添加新的层，以定制自己所需的内容，构建新的镜像。




docker中的镜像是层级结构，当我们创建一个新的容器时，会在镜像层加一个新的可写层。

接下来我们以 Docker 和 nginx 为例探索一个镜像的实际内容。

拉取一个最新版本的 nginx 镜像将其 save 为 tar 包后解压：

```
docker pull nginx
$ docker save nginx -o nginx-img.tar
$ mkdir nginx-img
$ tar -xf nginx-img.tar --directory=nginx-img

```

得到 nginx-img 目录中的内容如下：


首先查看 manifest.json 文件的内容，即该镜像的 Image Manifest, 可以看到该镜像有6个layer。

```
[
    {
        "Config": "ac8efec875ce36b619cb41f91d9db579487b9d45ed29393dc957a745b1e0024f.json",
        "Layers": [
            "a356b844cf84ff8455dae4626c4ef37fd61e370778b11022fca1c668f5776e35/layer.tar",
            "c93b489abcbba46cfd9e474d97df4954bd328ef848b70f3f3e3105f2e5e0d7e8/layer.tar",
            "dd464e08983bd1703921d9f2d387de0fa7f3be5ff305516151fb6d07706db6fc/layer.tar",
            "2f9b075c47fc1c2ad0dfe9de7e8e9dc7b930ff1654e1dcd07bcb7ebcfcf454e8/layer.tar",
            "fa56e289edf425fb98698304846ef0bf6db3d69fd46cfc72d7354238d181fac3/layer.tar",
            "e20a840554aa51d9cd4825638e32a2e15a693d19a9648c3d474718076c9bdb1d/layer.tar"
        ],
        "RepoTags": [
            "nginx:latest"
        ]
    }
]
```

## layer
在Docker中，layer是一个与image较为接近的词，容器镜像的rootfs是容器只读的文件系统，rootfs又由多个只读的image构成，rootfs中每个只读的image都可以称为layer
，除了只读的image外，docker daemon在创建容器时，会在容器的rootfs之上，再挂载一层读写的文件系统，而这一层文件系统也称之为容器的一个layer，通常被称呼为top layer， 实际情况下，docker还会在rootfs和top layer之间再挂载一个layer，这个layer中主要包含 /etc/hosts, /etc/hostname、/etc/resolv.conf, 这个layer一般被称为 init layer

另外在操作中，top layer也可以转变为image， 在Docker操作中，都可以对容器进行commit，将所有的toplayer内容打包为一个image。构成一个新的镜像。

不仅docker commit的原理如此，基于dockerfile的 docker build的核心思想也是不断将容器的top layer转化为image。

我们下载一个Redis的镜像，可以看到内部对于镜像的复用（Redis的第一层layer 3f4ca61aafcd， 已经在其他镜像中存在，可以直接复用，无需下载）

```
isno@isnodeMacBook-Pro ~ % docker pull redis
Using default tag: latest
latest: Pulling from library/redis
3f4ca61aafcd: Already exists 

```
