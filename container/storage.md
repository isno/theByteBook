# 7.5 持久化存储设计的演进

:::tip 容器内部的存储

容器是镜像的运行实例，在 7.3 节，我们详细分析过镜像的原理，作为不可变的基础设施，要求同一份镜像能复制出完全一致的镜像实例，这就意味着在容器内写入的任何数据是无法真正写入镜像内。

容器启动时后的 rootfs，本质是利用 UnionFS（Union File System，联合文件系统） 实现的一个堆叠的文件系统。容器内部的进程在这个堆叠系统内写入数据的，是写在了利用 CoW（Copy-on-write，写时复制）技术创建一个可写层内。当容器被销毁，读写层也随之销毁，内部的数据也必然会随着容器的消逝而消失。

:::

在计算机体系中，硬盘被定义为外设，如果要使用硬盘，得先添加（Attach）一块磁盘（Volume），然后再挂载（Mount）到某个目录。设计容器目的是实现操作系统的虚拟化，Volume 和 Mount 的设计自然也被继承到容器系统中。

为理解容器/容器编排系统的存储设计，我们先从 Docker 看起。目前，Docker 支持 3 中挂载的方式：

:::center
  ![](../assets/types-of-mounts-volume.webp)<br/>
:::

Bind mount 是 Docker 最早支持的挂载类型，

```
docker run -v /usr/share/nginx/html:/data nginx:lastest
```
上面的命令实际上就是下面的 MS_BIND 类型的 mount 系统调用。

```
// 将宿主机中的 /usr/share/nginx/html 挂载到 rootfs 指定的挂载点 /data 上
mount("/usr/share/nginx/html","rootfs/data", "none", MS_BIND, nulll)
```

这种挂载的方式显然有非常明显的缺陷：**通过映射的方式挂载宿主机中的一个绝对路径，这就跟操作系统强相关**。这意味着 Bind mount 无法写在 dockerfile 中，不然镜像有可能无法启动。其次，宿主机中的目录虽然被挂载，但其他非 Docker 的进程也可以进行读写，存在安全隐患。

其次，虽然容器被广泛使用，**容器存储绝对不是简单的映射关系那么简单**，存储位置不限于宿主机（还有可能是网络存储）、存储的介质不限于磁盘（还可能是 tmpfs）、存储的类型也不仅仅是文件系统（还有可能是块设备或者对象存储），而且**存储也并不是都需要先挂载到操作系统，再挂载到容器某个目录，如果 Docker 想越过操作系统，就需要知道使用何种协议（譬如块存储 iSCSI、网络存储 NFS 协议）**。

为此 Docker 提供全新的挂载类型 Volume，它首先在宿主机开辟了一块属于 Docker 空间（Linux 中该目录是 /var/lib/docker/volumes/），这样就解决了 Bind mount 映射宿主机绝对路径的问题。考虑存储的类型众多，仅靠 Docker 自己实现并不现实，为此 Docker 提出了 Volume Driver 的概念，借助社区力量丰富 Docker 的存储驱动种类。这样用户只要通过 docker plugin install 安装额外的第三方卷驱动，就能使用网络存储或者各类云厂商提供的存储。


我们从 Docker 返回到 Kubernetes 中，同 Docker 类似，Kubernetes 也抽象出了数据卷（Volume）来解决持久化存储，也具有相同的操作目录，也设计了存储驱动（Volume Plugin）扩展出众多的存储类型。

如下图所示。Kubernetes 支持的 Volume 的类型。

:::center
  ![](../assets/volume-list.png)<br/>
:::

乍一看，这么多的类型，这么多的操作，实在难以下手。然而，总结起来其实主要有 3 种类型：

- 普通的 Volume
- 特殊的 Volume（譬如 Secret、Configmap，将 Kubernetes 集群的配置信息以 Volume 方式挂载到 Pod 中，并实现 POSIX 接口来访问这些对象中的数据）
- 持久化的 Volume

## 普通的 Volume

设计普通 Volume 的目标并不是为了持久地保存数据，而是为同一个 Pod 中多个容器提供可共享的存储资源。

:::center
  ![](../assets/volume.svg)<br/>
:::

从上面的架构图所示，Volume 是包在 Pod 内的，因此其生命周期与挂载它的 Pod 是一致的，当 Pod 因某种原因被销毁时，Volume 也会随之删除。

EmptyDir 就是一种典型的 Non-Persistent Volume。常见的应用方式是一个 sidecar 容器通过 EmtpyDir 来读取另外一个容器的日志文件。另外一种 HostPath，它是将宿主机节点上的文件系统上的文件或目录，直接挂载到 Pod 中。我们使用 Loki 日志系统，第一步就是要 Pod 挂载相同的宿主机 hostPath Volume，这样才能读取到所有 Pod 写入的日志。


## 持久化的 Volume

想要让数据能够持久化，首先就需要将 Pod 和卷的声明周期分离，这也就是引入持久卷 PersistentVolume(PV) 的原因。

PV 为 Kubernete 集群提供了一个如何提供并且使用存储的抽象，如下代码所示，声明了一个 PV 存储对象，并描述了存储能力、访问模式、存储类型、回收策略、后端存储类型等信息。

```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv1
spec:
  capacity:  #容量
    storage: 5Gi
  accessModes:  #访问模式
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Recycle  #回收策略
  storageClassName: slow  
  nfs:
    path: /
    server: 172.17.0.2
```

PV 描述了详细的存储信息，但对应用层的开发者却不太友好，应用层开发者只想知道我有多大的空间、I/O 是否满足要求，并不关心存储底层的配置。这时就需要对存储服务再次进行抽象，把应用开发者关心的逻辑再抽象一层出来，这就是 PVC（Persistent Volume Claim）。


如下声明一个 PVC，与某个 PV 绑定后再被应用（Pod）消费。

```
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 3Gi
```

在 Pod 中使用存储：

```
apiVersion: v1
kind: Pod
metadata:
  name: test-nfs
spec:
  containers:
  - image: nginx:alpine
    imagePullPolicy: IfNotPresent
    name: nginx
    volumeMounts:
    - mountPath: /data
      name: nfs-volume
  volumes:
  - name: nfs-volume
    persistentVolumeClaim:
      claimName: pv-claim
```

此时 NFS 的远端存储就挂载了到 Pod 中 nginx 容器的 /data 目录下。

PVC 和 PV 的设计，其实跟“面向对象”的思想完全一致：
- PVC 可以理解为持久化存储的“接口”，它提供了对某种持久化存储的描述，声明需要的存储类型、大小、访问模式等需求；
- 而这个持久化存储的实现部分则由 PV 负责完成。

作为应用开发者，我们只需要跟 PVC 这个“接口”打交道，而不必关心底层存储实现是 NFS 还是 Ceph。


## 从静态到动态

如果我们只创建 PVC，不创建 PV，那会是什么状况呢？ 

前面通过人工管理 PV 的方式叫作 Static Provisioning，如果是小规模的集群，这种方式倒也不是什么问题。但在一个大规模的 Kubernetes 集群里很可能有成千上万个 Pod，这肯定没办法靠人工的方式提前创建出成千上万个 PVC。所以，Kubernetes 为我们提供了一套可以自动创建 PV 的机制，即：Dynamic Provisioning。

Dynamic Provisioning 机制工作的核心在于 StorageClass 对象，这个对象的作用其实就是创建 PV 的模板，它的定义中包含两类参数：
- provisioner（存储提供者)，前缀为 "kubernetes.io" 并打包在 Kubernetes 中

PV 了名称、存储提供者（provisioner）以及存储的相关参数。

如下示例，定义了一个名为 standard 的 StorageClass，存储提供者为 为 aws-ebs，其存储参数设置了一个 type ，值为 gp2，回收策略为 Retain。

```
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - debug
volumeBindingMode: Immediate
```

StorageClass 被创建之后，当 PVC 的需求来了，它就会自动的去创建 PV，这样 PV 的创建就从静态转向了动态。


现在，基于 StorageClass 的动态资源提供模式已经逐步成为各类云平台的标准存储管理模式。


## Kuberneters 的存储架构


每一个卷在被 Pod 使用时都会经历四个操作，也就是附着（Attach）、挂载（Mount）、卸载（Unmount）和分离（Detach）。


根据源码的位置可将 Volume Plugins 分为 In-Tree 和 Out-of-Tree 两类：

- In-Tree 表示源码是放在 Kubernetes 内部的，和 Kubernetes 一起发布、管理与迭代，缺点及时迭代速度慢、灵活性差；
- Out-of-Tree 类的 Volume Plugins 的代码独立于 Kubernetes，它是由存储商提供实现的

PV Controller、AD Controller、Volume Manager 主要是进行操作的调用，而具体操作则是由 Volume Plugins 实现。比如说挂载一个 NAS 的操作 `"mount -t nfs *"`，该命令其实就是在 Volume Plugins 中实现的，它会去调用远程的一个存储挂载到本地。

:::center
  ![](../assets/k8s-volume.svg)<br/>
:::

我们再来看一个带有 PVC 的 Pod 挂载过程。:

1. 用户创建了一个包含 PVC 的 Pod，该 PVC 要求使用动态存储卷。
2. Scheduler 根据 Pod 配置、节点状态、PV 配置等信息，把 Pod 调度到一个合适的 Worker 节点上
3. PV Controller 会不断观察 ApiServer，如果它发现一个 PVC 已经创建完毕但仍然是未绑定的状态，它就会试图把一个 PV 和 PVC 绑定。PV Controller 首先会在集群内部找到一个适合的 PV 进行绑定，如果未找到相应的 PV，就调用 Volume Plugin 去做 Provision。Provision 就是从远端上一个具体的存储介质创建一个 Volume，并且在集群中创建一个 PV 对象，然后将此 PV 和 PVC 进行绑定；

4. 如果有一个 Pod 调度到某个节点之后，它所定义的 PV 还没有被挂载（Attach），此时 AD Controller 就会调用 VolumePlugin，把远端的 Volume 挂载到目标节点中的设备上（如：/dev/vdb）

5. 在 Worker 节点上，当 Volum Manager 发现一个 Pod 调度到自己的节点上并且 Volume 已经完成了挂载，它就会执行 mount 操作，将本地设备（也就是刚才得到的 /dev/vdb）挂载到 Pod 在节点上的一个子目录 `/var/lib/kubelet/pods/[pod uid]/volumes/kubernetes.io~iscsi/[PV name]（以 iscsi 为例）`；
6. Kubelet 通过容器运行时（如 containerd）启动 Pod 的 Containers，用 bind mount 方式将已挂载到本地全局目录的卷映射到容器中。


:::center
  ![](../assets/pvc-flow.png)<br/>

  [图片来源](https://www.huweihuang.com/article/kubernetes-notes/principle/flow/pvc-flow/)
:::


上面流程的每个步骤，其实就对应了 CSI 提供的标准接口，云存储厂商只需要按标准接口实现自己的云存储插件，即可与 K8s 底层编排系统无缝衔接起来，提供多样化的云存储、备份、快照(snapshot)等能力。


得益 Kubernetes 的开放性设计，通过下图感受支持 CSI 的存储生态，基本上包含了市面上所有的存储供应商。

:::center
  ![](../assets/CSI.png)<br/>

  CNCF 下的 Kubernetes 存储生态
:::

上述众多的存储系统实在无法一一展开，但无论是内置的存储插件还是第三方存储插件，总结其提供的存储类型来说无外乎 3 种：文件存储、块存储和对象存储。

### 块存储

块存储是最接近物理介质的，这些存储的介质不关心也无法关心数据的组织方式以及结构，那就用最简单粗暴的组织方式把所有数据按照固定的大小分块，每一块赋予一个用于寻址的编号，然后再通过与块设备匹配的协议（SCSI、SATA、SAS、FCP、FCoE、iSCSI..）进行读写。

我们最熟悉的块设备就是硬盘，以大家比较熟悉的机械硬盘为例，一块就是一个扇区，老式硬盘是512字节大小，新硬盘是4K字节大小。为了方便管理，硬盘这样的块设备通常可以划分为多个逻辑块设备，也就是我们熟悉的硬盘分区（Partition）。反过来，单个介质的容量、性能有限，可以通过某些技术手段把多个物理块设备组合成一个逻辑块设备，例如各种级别的 RAID，JBOD，某些操作系统的卷管理系统（Volume Manager）如 Windows 的动态磁盘、Linux的 LVM 等。

块存储本身处于整个存储软件栈的底层，不经过 OS 缓存，因此**具有超低的时延和超高的吞吐**。但缺陷是每个块是独立的，如果是多个系统对其操作，缺乏一个集中的控制机制来解决数据冲突和同步的问题，导致**块存储设备通常是不能共享**，无法被多个客户端（节点）挂载，在 Kubernetes 中类型为块存储的 Volume 访问模式都要求必须是 RWO（ReadWriteOnce，可读可写，但只支持被单个节点挂载）。

不关心数据的组织方式/内容，接口朴素简单，所以块存储并不是提供给自然人，而是提供给专门的文件系统以及专业的备份管理软件、分区软件以及数据库使用。

### 文件存储

块设备存储的是最原始的 0 和 1的二进制数据，这对于人类用户来说实在是过于难以使用、难以管理。

因此我们用“文件”这个概念对这些数据进行组织，所有用于同一用途的数据，按照不同应用程序要求的结构方式组成不同类型的文件（通常用不同的后缀来指代不同的类型），然后我们给每一个文件起一个方便理解记忆的名字。而当文件很多的时候，我们按照某种划分方式给这些文件分组，每一组文件放在同一个目录，所有的文件、目录形成一个树状结构。

把存储介质上的数据组织成目录-子目录-文件这种形式的数据结构，再这个数据结构之中加入其他控制信息，就能很方便地扩展出更多的高级功能，比如除了文件占用的块地址信息外，在表中再加上文件的逻辑位置就形成了目录，加上文件的访问标志就形成了权限，我们还可以再加上文件的名称、创建时间、所有者、修改者等一系列的元数据信息。人们把定义文件分配表应该如何实现、储存哪些信息、提供什么功能的标准称为文件系统（File System），很常用的文件系统如 FAT32、NTFS、exFAT、ext2/3/4、XFS、BTRFS 等等。

绝大多数文件系统都是基于块存储之上去实现的，但文件存储的访问不像块存储因设备差异有五花八门的协议，其 POSIX 接口（Portable Operating System Interface，POSIX）已经成为事实标准，诸如 Open、Write、Read 等许多操作数据的接口都能在上述文件系统中被找到。

而在网络存储中，底层数据并非存储在本地的存储介质，而是另外一台服务器上，不同的客户端都可以用类似文件系统的方式访问这台服务器上的文件，这样的系统叫网络文件系统（Network File System），常见的网络文件系统有 Windows 网络的CIFS（也叫SMB）、类 Unix 系统网络的 NFS 等。而文件存储除了网络文件系统外，FTP、HTTP 其实也算是文件存储的某种特殊实现，都是可以通过某个 url 来访问一个文件。

### 对象存储

文件存储的树状结构以及路径访问方式虽然方便人类理解、记忆和访问，但计算机需要把路径进行分解，然后逐级向下查找，最后才能查找到需要的文件，对于应用程序来说既没必要，也很浪费性能。而块存储呢，虽然性能出色，但难以理解且无法共享。选择困难症发作的同时，我们思考是否能有一种兼具性能、还要实现共享、同时满足大规模扩展需求的新型存储系统呢？这就是对象存储。

对象存储中的“对象”可以理解为一个元数据及与其配对的一个逻辑数据块的组合，元数据提供了对象所包含的上下文信息，比如数据的类型、大小、权限、创建人、创建时间，等等，数据块则存储了对象的具体内容。所有的数据都在同一个层次中，通过数据的唯一地址标识来识别并查找数据。

当然，对于不同的软件系统来说，一次访问需要获取的不一定是单个我们传统意义上的文件，根据不同的需要可能只是一个/组值，某个文件的一部分，也可能是多个文件的组合，甚至是某个块设备，统称为对象。

从设计之初衷（一般的对象存储都是基于哈希环之类的技术来实现），对象存储就可以非常简单的扩展到超大规模，因此非常适合数据量大、增速又很快的非结构化的数据（视频、图像等）。

公有云的的对象存储服务如 AWS S3、腾讯云的 COS、阿里云的 OSS 等，开源的产品有 Ceph、Minio、Swift 等。

