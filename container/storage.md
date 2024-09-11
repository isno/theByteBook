# 7.5 容器持久化存储设计


镜像作为不可变的基础设施，要求同一份镜像能复制出完全一致的容器运行实例。这意味着，容器内写入的数据和容器镜像没有任何关联，当容器重启时，写入的任何数据将消失殆尽。

那容器系统怎么实现数据持久化存储呢？我们由浅入深，先从 Docker 看起。

## 7.5.1 Docker 的存储设计

Docker 通过挂载宿主机目录到 Docker 容器内部的方式实现持久化存储。目前，Docker 支持 3 种挂载：bind mount、volume 和 tmpfs mount。

:::center
  ![](../assets/types-of-mounts-volume.webp)<br/>
  图 7-24 Docker 中持久存储的挂载种类
:::

bind mount 是 Docker 最早支持的挂载类型，只要用过 Docker，肯定熟悉下面挂载方式。该命令启动一个 Nginx 容器，并将宿主机的 /usr/share/nginx/html 目录，挂载到容器内 /data 目录。
``` bash
$ docker run -v /usr/share/nginx/html:/data nginx:lastest
```
上述操作实际上就是利用 MS_BIND 类型的 mount 系统调用。

```c
// 将宿主机中的 /usr/share/nginx/html 挂载到 rootfs 指定的挂载点 /data 上
mount("/usr/share/nginx/html","rootfs/data", "none", MS_BIND, nulll)
```
通过 mount 命令挂载宿主机目录实现的数据持久化存储，显然存在明显的缺陷：
- **容器内的目录通过 mount 挂载到宿主机中的一个绝对路径，这就跟操作系统强相关**。这也意味着 bind mount 的方式无法写在 dockerfile 中，不然镜像在其他环境可能无法启动。其次，宿主机中被挂载的目录明面上看不出和 Docker 的关系，操作系统内其他进程有可能误写，存在安全隐患。
- 容器被广泛使用后，**容器存储的需求绝对不是挂载到某个目录就能搞定**。存储位置不限于宿主机（有可能是网络存储）、存储的介质不限于磁盘（可能是 tmpfs）、存储的类型也不仅仅是文件系统（还有可能是块设备或者对象存储）。

此外，如果是网络存储那也没必要先挂载到操作系统，再挂载到容器内某个目录。Docker 完全可以实现类似 iSCSI 存储协议、NFS 存储协议越过操作系统，直接对接网络存储。

为此，Docker 从 1.7 版本起提供全新的挂载类型 Volume（存储卷）：
- 它首先在宿主机开辟了一块属于 Docker 空间（Linux 中该目录是 /var/lib/docker/volumes/），这样就解决了 bind mount 映射宿主机绝对路径的问题；
- 考虑存储的类型众多，仅靠 Docker 自己实现并不现实，Docker 1.10 版本中又设计了 Volume Driver，借助社区力量丰富 Docker 的存储驱动种类。

经过一系列的设计，现在 Docker 用户只要通过 docker plugin install 安装额外的第三方卷驱动，就能使用想要的网络存储或者各类云厂商提供的存储。

## 7.5.2 Kubernetes 的存储卷：Volume

我们从 Docker 返回到 Kubernetes 中，同 Docker 类似的是：
- Kubernetes 也抽象出了 Volume 来解决持久化存储；
- 也开辟了属于 Kubernetes 的空间（该目录是 /var/lib/kubelet/pods/[pod uid]/volumes）；
- 也设计了存储驱动（Volume Plugin）扩展支持出众多的存储类型。

不同的是，作为一个工业级的容器编排系统，Kubernetes Volume 要比 Docker 复杂那么一点以及类型多出一丢丢。

:::center
  ![](../assets/volume-list.png)<br/>
   图 7-25 Kubernetes 中的 Volume 分类
:::

乍一看，这么多 Volume 类型实在难以下手。然而，总结起来就 3 类：

- 普通的 Volume；
- 持久化的 Volume；
- 特殊的 Volume（例如 Secret、Configmap，它们将 Kubernetes 集群的配置信息以 Volume 方式挂载到 Pod 中，这些 Volume 实现了标准的 POSIX 接口，使得容器内部的应用能够像操作本地文件一样访问和操作这些配置信息。严格讲此类 Volume 并不属于存储，笔者就不再展开讨论了）。

## 7.5.3 普通的 Volume

Kubernetes 设计普通 Volume 的初衷并非为了持久化存储数据，而是为了实现容器间数据共享。以下是两种典型的普通 Volume 类型：

- EmptyDir：这种 Volume 类型常用于 Sidecar 模式，例如日志收集容器通过 EmptyDir 访问业务容器的日志文件。
- HostPath：与 EmptyDir 不同，HostPath 使同一节点上的所有容器能够共享宿主机的本地存储。例如，在 Loki 日志系统中，通过设置 Pod 挂载宿主机的 HostPath Volume，Loki 能够收集并读取宿主机上所有 Pod 生成的日志。

如图 7-26 所示，EmptyDir 类型的 Volume 被包含在 Pod 内，生命周期与挂载它的 Pod 是一致的，当 Pod 因某种原因被销毁时，这类 Volume 也会随之删除。如果是 HostPath，Pod 被调度到另外一台节点时，对 Pod 而言也相当 HostPath 内的数据被删除了。 

:::center
  ![](../assets/volume.svg)<br/>
  图 7-26 EmptyDir 类型的 Volume 不具备持久性
:::

## 7.5.4 持久化的 Volume

由于 Pod 可能会根据 Kubernetes 的调度策略被迁移到不同的节点，如果需要实现数据的持久化存储，通常需要依赖网络存储解决方案。这就是引入 PV（PersistentVolume，持久卷）的原因。

如下，一个 PV 资源的 yaml 配置示例，其 spec 部分详细描述了存储容量（5Gi）、访问模式（ReadWriteOnce，即允许单个节点读写）、远程存储类型（如 NFS）、以及 PV 在被释放时的数据回收策略（Recycle，即在 PV 不再被使用时，自动清除其上的数据以供再次使用）等关键信息。

```yaml
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
  storageClassName: manual  
  nfs:
    path: /
    server: 172.17.0.2
```

由于使用 PV 时，需要详细描述存储的配置信息，所以对应用开发者并不友好。应用开发者只想知道我有多大的空间、I/O 是否满足要求，并不关心存储底层的配置细节。

为了解决这个问题，Kubernetes 把存储服务再次抽象，把应用开发者关心的逻辑再抽象一层出来，这就是 PVC（Persistent Volume Claim，持久卷声明）。有了 PVC，应用开发者只需要跟 PVC “接口”打交道，而不必关心底层存储是怎么配置或者实现的。

如下，一个 PVC 资源的 yaml 配置示例，可以看到，里面没有任何与存储实现相关的细节。

```yaml
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

但这里还有一个问题“**PV 和 PVC 两者之间并没有明确相关的绑定参数，那它们是怎么绑定的？**”，它们的绑定实际是一个自动过程，这个过程主要依赖于以下几个关键因素：

- Spec 参数匹配：Kubernetes 会自动寻找与 PVC 声明的规格相匹配的 PV。这包括存储容量的大小、所需的访问模式（例如 ReadWriteOnce、ReadOnlyMany 或 ReadWriteMany），以及存储的类型（如文件系统或块存储）；
- 存储类匹配：PV 和 PVC 必须具有相同的 storageClassName。这个类名定义了 PV 的存储类型和特性，确保 PVC 请求的存储资源与 PV 提供的存储资源在类别上一致。

如下 yaml 配置所示，在 Pod 中使用 PVC，一旦 PVC 成功匹配到 PV，NFS 远程存储就会被挂载到 Pod 中的指定目录，例如 nginx 容器内的 /data 目录。这样，Pod 内部的应用就能够访问和使用这个远程存储资源，就像使用本地存储一样方便。

```yaml
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

## 7.5.5 PV 的使用：从手动到自动

在 Kubernetes 中，如果系统中没有合适的 PV 满足 PVC 的需求，PVC 将一直处于 Pending 状态，直到系统里产生了一个合适的 PV，这期间 Pod 将无法正常启动。

如果是一个小规模的集群，可以预先创建多个 PV 等待 PVC 匹配即可。但一个大规模的 Kubernetes 集群里很可能有成千上万个 Pod，这肯定没办法靠人工的方式提前创建出成千上万个 PV。

为此，Kubernetes 提供了一套可以自动创建 PV 的机制 —— Dynamic Provisioning（相对的，前面通过人工创建 PV 的方式叫作 Static Provisioning）。

Dynamic Provisioning 核心在于 StorageClass 对象，它的作用其实就是创建 PV 的模板，使 PV 可以自动创建。StorageClass 对象在声明时，必须明确两类关键信息：
- **PV 的属性**：定义了 PV 的特征，包括存储空间的大小、读写模式（如 ReadWriteOnce、ReadOnlyMany 或 ReadWriteMany）、以及回收策略（如 Retain、Recycle 或 Delete）等。
- **Provisioner 的属性**：即确定存储供应商（也称 Volume Plugin，存储插件）及参数信息。Kubernetes 支持两种类型的存储插件：
  - In-Tree 插件：这些插件是Kubernetes源码的一部分，通常以前缀“kubernetes.io”命名，如kubernetes.io/aws、kubernetes.io/azure等。它们直接集成在Kubernetes项目中，为特定的存储服务提供支持；
  - Out-of-Tree 插件：这些插件是根据 Kubernetes 提供的存储接口由第三方存储供应商实现的，代码独立于 Kubernetes 核心代码。Out-of-Tree 插件允许更灵活地集成各种存储解决方案，以适应不同的存储需求。 

以下是一个 Kubernetes StorageClass 资源的配置示例。该 StorageClass 指定了使用 AWS Elastic Block Store（aws-ebs）作为存储供应商。在存储参数设置中，定义了一个 type 属性，其值被设置为 gp2，这表示使用 AWS 的通用型 SSD 卷。

此外，该 StorageClass 的回收策略被设置为 Retain，这意味着当 PV 被释放时，其上的数据将被保留，而不是被删除。

```yaml
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
StorageClass 资源提交到 Kubernetes 集群后，Kubernetes 将根据 StorageClass 定义的模板和 PVC 的请求规格，自动创建一个新的 PV 实例。新创建的 PV 将被自动绑定到 PVC 上，使得 PVC 的状态从 Pending 变为 Bound，表示存储资源已经准备就绪。

随后，Pod 就能够利用 PVC 声明的存储资源，无论是用于数据持久化还是其他存储需求。


## 7.5.6 Kuberneters 的存储系统设计

相信大部分读者对于如何使用 Volume 没什么疑问了，接下来，我们继续探讨存储系统与 Kubernetes 的集成以及它们是如何与 Pod 相关联的。在进入这些高级主题之前，我们需要先掌握一些关于操作存储设备的基础知识。

Kubernetes 继承了操作系统接入外置存储的设计，将新增或者卸载存储设备分解为以下三个操作：

- 首先，得 Provision（准备）哪种设备，Provision 类似给操作系统准备一块新的硬盘，这一步确定了接入存储设备的类型、容量等基本参数。它的逆向操作是 delete（移除）设备。
- 然后，将准备好的存储附加（Attach）到系统中，Attach 可类比为将存储设备接入操作系统，此时尽管设备还不能使用，但你已经可以用操作系统的 fdisk -l 命令查看到设备，这一步确定存储设备的名称、驱动方式等面向系统侧的信息，它的逆向操作是 Detach（分离）设备。
- 最后，将附加好的存储挂载（Mount）到系统中，Mount 可类比为将设备挂载到系统的指定位置，也就是操作系统中 mount 命令的作用，它的逆向操作是 卸载（Unmount）存储设备。

:::tip <i/>
如果 Pod 中使用的是 EmptyDir、HostPath 这类普通 Volume，并不会经历附着/分离的操作，它们只会被挂载/卸载到某一个 Pod 中。
:::

Kubernetes 中的 Volume 创建和管理主要由 VolumeManager（卷管理器）、AttachDetachController（挂载控制器）和 PVController（PV 生命周期管理器）负责。前面提到的 Provision、Delete、Attach、Detach、Mount 和 Unmount 操作由具体的 VolumePlugin（第三方存储插件）实现。

如图 7-27 所示，一个带有 PVC 的 Pod 创建过程。

:::center
  ![](../assets/k8s-volume.svg)<br/>
  图 7-27 Pod 挂载持久化 Volume 的过程
:::

1. 首先，用户创建了一个包含 PVC 的 Pod，该 PVC 要求使用动态存储卷。
2. 默认调度器 kube-scheduler 根据 Pod 配置、节点状态、PV 配置等信息，把 Pod 调度到一个合适的节点中。
3. PVController 会持续监测 ApiServer，当发现一个 PVC 已创建但仍处于未绑定状态时，它会尝试将一个 PV 与该 PVC 进行绑定。首先，PVController 会在集群内查找适合的 PV 进行绑定；如果找不到相应的 PV，它会调用 Volume Plugin 进行 Provision。Provision 过程包括从远程存储介质创建一个 Volume，并在集群中创建一个 PV 对象，然后将此 PV 与 PVC 绑定；

4. 如果有一个 Pod 调度到某个节点之后，它所定义的 PV 还没有被挂载，ADController 就会调用 VolumePlugin，把远端的 Volume 挂载到目标节点中的设备上（如：/dev/vdb）。

5. 在节点中，当 VolumManager 发现一个 Pod 调度到自己的节点上并且 Volume 已经完成了挂载，它就会执行 mount 操作，将本地设备（也就是刚才得到的 /dev/vdb）挂载到 Pod 在节点上的一个子目录 `/var/lib/kubelet/pods/[pod uid]/volumes/kubernetes.io~iscsi/[PV name]（以 iscsi 为例）`。
6. Kubelet 通过容器运行时（如 containerd）启动 Pod 的容器，并使用 bind mount 方式将已挂载到本地目录的卷映射到容器中。

上述流程的每个步骤都对应 CSI（容器存储接口）提供的标准接口。云存储厂商只需按此标准接口实现自己的云存储插件，即可无缝衔接 Kubernetes 底层编排系统，提供多样化的云存储、备份和快照等能力。

## 7.5.7 存储的类型

得益 Kubernetes 的开放性设计，通过图 7-28 感受支持 CSI 的存储生态，基本上包含了市面上所有的存储供应商。

:::center
  ![](../assets/CSI.png)<br/>
  图 7-28 CNCF 下的 Kubernetes 存储生态
:::

上述众多的存储系统无法一一展开，但作为业务开发工程师而言，直面的问题是“业务开发中，我应该选择哪种存储类型？”。无论是内置的存储插件还是第三方存储插件，总结提供的存储类型就 3 种：块存储（Block Storage）、文件存储（File Storage）和对象存储（Object Storage）。这三种存储类型特点与区别，笔者介绍如下：

- **块存储**：块存储是最接近物理介质的一种存储方式，常见的硬盘就属于块设备。块存储不关心数据的组织方式和结构，只是简单地将所有数据按固定大小分块，每块赋予一个用于寻址的编号。数据的读写通过与块设备匹配的协议（如 SCSI、SATA、SAS、FCP、FCoE、iSCSI 等）进行。

  块存储处于整个存储软件栈的底层，不经过操作系统，因此具有超低时延和超高吞吐。但其缺点是每个块是独立的，缺乏集中控制机制来解决数据冲突和同步问题。因此，块存储设备通常不能共享，无法被多个客户端（节点）同时挂载。在 Kubernetes 中，块存储类型的 Volume 的访问模式必须是 RWO（ReadWriteOnce），即可读可写，但只能被单个节点挂载。

  由于块存储不关心数据的组织方式或内容，接口简单朴素，因此主要用于文件系统、专业备份管理软件、分区软件以及数据库，而非直接提供给普通用户。

- **文件存储**：块设备存储的是最原始的二进制数据（0 和 1），对于人类用户来说，这样的数据既难以使用也难以管理。因此，我们使用“文件”这一概念来组织这些数据。所有用于同一用途的数据按照不同应用程序要求的结构方式组成不同类型的文件，并用不同的后缀来指代这些类型。每个文件有一个便于理解和记忆的名称。当文件数量较多时，可以通过某种划分方式对这些文件进行分组，所有文件和目录形成一个树状结构。在这个数据组织中加入控制信息、权限、文件名称、创建时间、所有者、修改者等元数据信息。

  这种定义文件分配、实现方式、存储信息和提供功能的标准被称为文件系统（File System）。常见的文件系统有 FAT32、NTFS、exFAT、ext2/3/4、XFS、BTRFS 等等。

  如果将文件存储在网络服务器中，使用客户端以类似文件系统的方式访问该服务器上的文件，这样的系统称为网络文件系统。常见的网络文件系统有 Windows 网络的 CIFS（Common Internet File System，也称 SMB）和类 Unix 系统的 NFS（Network File System）。

- **对象存储**：文件存储的树状结构和路径访问方式便于人类理解、记忆和访问，但计算机需要逐级分解路径并查找，最终定位到所需文件，这对于应用程序而言既不必要，也浪费性能。块存储则性能出色，但难以理解且无法共享。选择困难症出现的同时，人们思考是否可以有一种既具备高性能、实现共享、又能满足大规模扩展需求的新型存储系统，这就是对象存储。

  对象存储中的“对象”可以理解为元数据与逻辑数据块的组合。元数据提供了对象的上下文信息，如数据类型、大小、权限、创建人、创建时间等，而数据块则存储了对象的具体内容。对象存储中，所有数据都在同一个层次中，通过唯一地址标识来识别和查找数据。由于设计初衷（一般基于哈希环等技术），因此对象存储可以非常简单地扩展到超大规模，非常适合处理数据量大、增速快的非结构化数据（如视频、图像等）。

  著名的对象存储服务有 AWS S3，此外，你还可以通过开源产品如 Ceph、Minio 和 Swift 自建对象存储服务。