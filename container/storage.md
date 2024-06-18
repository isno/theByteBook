# 7.5 容器持久化存储设计

:::tip <a/>
镜像作为不可变的基础设施，要求同一份镜像能复制出完全一致的镜像实例，这就意味着在容器内写入的任何数据是无法真正写入镜像内。
:::

那么容器系统怎么解决持久化存储呢？我们由浅入深，先从 Docker 看起。

## 7.5.1 Docker 的存储设计

Docker 通过挂载宿主机目录到 Docker 内部的方式，实现持久化存储。目前，Docker 支持 3 中挂载方式：bind mount、volume、tmpfs mount。

:::center
  ![](../assets/types-of-mounts-volume.webp)<br/>
  图 7-24 Docker 中持久存储的挂载种类
:::

bind mount 是 Docker 最早支持的挂载类型，只要用过 Docker，肯定熟悉下面挂载方式。
``` bash
$ docker run -v /usr/share/nginx/html:/data nginx:lastest
```
上面的命令实际上就是 MS_BIND 类型的 mount 系统调用。

```c
// 将宿主机中的 /usr/share/nginx/html 挂载到 rootfs 指定的挂载点 /data 上
mount("/usr/share/nginx/html","rootfs/data", "none", MS_BIND, nulll)
```
这种挂载的方式显然有明显的缺陷：
- **通过映射的方式挂载宿主机中的一个绝对路径，这就跟操作系统强相关**。这意味着 bind mount 的方式无法写在 dockerfile 中，不然镜像在其他环境可能无法启动。其次，宿主机中被挂载的目录明面上看不出和 Docker 的关系，操作系统内其他进程有可能误写，存在安全隐患。
- 容器被广泛使用后，**容器存储的需求绝对不是简单的映射关系就能搞定**，存储位置不限于宿主机（有可能是网络存储）、存储的介质不限于磁盘（可能是 tmpfs）、存储的类型也不仅仅是文件系统（还有可能是块设备或者对象存储）。如果是**网络存储完全没必要先挂载到操作系统，再挂载到容器某个目录，Docker 完全可以实现类似 iSCSI 协议、NFS 协议越过操作系统，对接这些网络存储**。

为此，Docker 从 1.7 版本起提供全新的挂载类型 Volume（存储卷）：
- 它首先在宿主机开辟了一块属于 Docker 空间（Linux 中该目录是 /var/lib/docker/volumes/），这样就解决了 bind mount 映射宿主机绝对路径的问题；
- 考虑存储的类型众多，仅靠 Docker 自己实现并不现实，Docker 1.10 版本中又增加了对 Volume Driver 的支持，借助社区力量丰富 Docker 的存储驱动种类。

经过一系列的设计，用户只要通过 docker plugin install 安装额外的第三方卷驱动，就能使用想要的网络存储或者各类云厂商提供的存储。

## 7.5.2 Kubernetes 的存储设计

我们从 Docker 返回到 Kubernetes 中，同 Docker 类似的是：
- Kubernetes 也抽象出了 Volume 来解决持久化存储；
- 也开辟了属于 Kubernetes 的空间（该目录是 /var/lib/kubelet/pods/[pod uid]/volumes）；
- 也设计了存储驱动（Volume Plugin）扩展支持出众多的存储类型。

不同的是，作为一个工业级的容器编排系统，Kubernetes Volume 的实现要比 Docker 复杂那么一点以及类型多出一丢丢。

:::center
  ![](../assets/volume-list.png)<br/>
   图 7-25 Kubernetes 中的 Volume 分类
:::

乍一看，这么多 Volume 类型难以下手。然而，总结起来就 3 类：

- 普通的 Volume。
- 持久化的 Volume。
- 特殊的 Volume（譬如 Secret、Configmap，将 Kubernetes 集群的配置信息以 Volume 方式挂载到 Pod 中，并实现 POSIX 接口来访问这些对象中的数据。严格讲此类 Volume 并不属于存储，所以本节就不再展开讨论）。

## 7.5.3 普通的 Volume

**设计普通 Volume 的目标并不是为了持久地保存数据，而是为同一个 Pod 中多个容器提供可共享的存储资源**。普通 Volume 代表有：

- EmptyDir，常见的应用方式一个 sidecar 容器通过 EmtpyDir 来读取另外一个容器的日志文件。
- 另外一种是 HostPath，和 EmptyDir 的区别是 HostPath 的 Volume 可以被宿主机内所有的 Pod 共享。使用 Loki 日志系统，第一步要 Pod 挂载相同的宿主机 HostPath Volume，这样才能读取到宿主机内所有 Pod 写入的日志。

如图 7-26 所示，EmptyDir 类型的 Volume 被包含在 Pod 内，生命周期与挂载它的 Pod 是一致的，当 Pod 因某种原因被销毁时，这类 Volume 也会随之删除。

:::center
  ![](../assets/volume.svg)<br/>
  图 7-26 EmptyDir 类型的 Volume 示例
:::

## 7.5.2 持久化的 Volume

对于一个编排系统而言，Pod 随时可能被调度到另外一台 Node 节点，如果想要数据持久化，肯定不能存储在本地，网络存储是最合适的方式，这也就是引入 PV（PersistentVolume，持久卷）的原因。

PV 为 Kubernete 集群提供了一个使用远程存储的抽象，如下代码所示。

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
  storageClassName: slow  
  nfs:
    path: /
    server: 172.17.0.2
```
以上的 yaml 配置中声明了一个 PV 存储对象，并描述了存储能力（5Gi）、访问模式（ReadWriteOnce）、存储类型（nfs）、回收策略（Recycle）等信息。

PV 描述了详细的存储信息，但对应用层的开发者却不太友好，应用层开发者只想知道我有多大的空间、I/O 是否满足要求，并不关心存储底层的配置。于是，Kubernetes 把存储服务再次进行抽象，把应用开发者关心的逻辑再抽象一层出来，这就是 PVC（Persistent Volume Claim，持久卷声明）。

PVC 和 PV 的设计，跟“面向对象”的思想一致：
- PVC 是持久化存储的“接口”，它提供了对某种持久化存储**使用描述**，描述存储类型、大小、访问模式等需求；
- PV **实现持久化存储的底层配置信息**，如持久化存储的驱动、远程地址等配置信息。

作为应用开发者，我们只需要跟 PVC “接口”打交道，而不必关心底层存储是怎么配置或者实现的。如下一个 PVC 声明示例（没有 nfs 具体的配置信息）。

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

细心的读者到这里可能会有一个疑问：**PV 和 PVC 两者之间并没有明确相关的绑定参数**。它们的绑定实际是一个自动过程：

- 第一个条件：当然是 PV 和 PVC 的 spec 参数，譬如存储的大小
- 第二个条件：则是 PV 和 PVC 的 storageClassName 必须一致（稍后介绍）。

当 PVC 匹配到 PV 之后，就可以在 Pod 中使用了。

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
此时 NFS 的远端存储就挂载了到 Pod 中 nginx 容器的 /data 目录下。

## 7.5.3 PV 的使用：从静态到动态

存储的资源是固定的，Pod 使用存储的原则是：**先规划，后申请，再使用**。

如果在系统中没有满足 PVC 要求的 PV，PVC 则一直处于 Pending 状态，直到系统里产生了一个合适的 PV，这期间 Pod 将无法正常启动。

如果是一个小规模的集群，可以预先创建多个 PV 等待 PVC 匹配即可。但一个大规模的 Kubernetes 集群里很可能有成千上万个 Pod，这肯定没办法靠人工的方式提前创建出成千上万个 PV。为此，Kubernetes 提供了一套可以自动创建 PV 的机制 —— Dynamic Provisioning（相对的，前面通过人工创建 PV 的方式叫作 Static Provisioning）。

Dynamic Provisioning 核心在于 StorageClass 对象，它的作用其实就是创建 PV 的模板，StorageClass 的声明中有两类关键信息：
- **PV 的属性**：譬如存储空间的大小、读写模式、回收策略等
- **Provisioner 的属性**：即声明采用何种存储插件以及插件的参数信息，存储插件有两类：
  - 一种内置在 Kubernetes 源码中，这种类型的插件称为 In-Tree 类型，前缀一般为 "kubernetes.io"；
  - 另外一种根据 Kubernetes 提供的存储接口，由第三方的存储供应商实现，代码独立于 Kubernetes，这种类型的插件被称为 Out-of-Tree 类型。 

如下示例，定义了一个名为 standard 的 StorageClass，存储提供者为 aws-ebs，其存储参数设置了一个 type ，值为 gp2，回收策略为 Retain。

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

StorageClass 被创建之后，当 PVC 的需求来了，它就会自动的去创建 PV，这样 PV 的创建就从静态转向了动态。

## 7.5.4 Kuberneters 的存储系统设计

相信大部分读者对于如何使用 Volume 没什么疑问了，下面我们再了解存储系统是如何接入、以及如何与 Pod 关联的。

在这之前，我们得先预备一些关于操作设备的前置知识。Kubernetes 将新增或者卸载存储设备分解为以下三个操作：

- 首先，得 Provision（准备）哪种设备，Provision 类似给操作系统准备一块新的硬盘，这一步确定了接入存储设备的类型、容量等基本参数。它的逆向操作是 delete（移除）设备。
- 然后，将准备好的存储附加（Attach）到系统中，Attach 可类比为将存储设备接入操作系统，此时尽管设备还不能使用，但你已经可以用操作系统的 fdisk -l 命令查看到设备，这一步确定存储设备的名称、驱动方式等面向系统侧的信息，它的逆向操作是 Detach（分离）设备。
- 最后，将附加好的存储挂载（Mount）到系统中，Mount 可类比为将设备挂载到系统的指定位置，也就是操作系统中 mount 命令的作用，它的逆向操作是 卸载（Unmount）存储设备。

:::tip <i/>
如果 Pod 中使用的是 EmptyDir、HostPath 这类非网络存储型的 Volume，这些 Volume 并不会经历附着和分离的操作，它们只会被挂载和卸载到某一个 Pod 中。
:::

Volume 的创建和管理在 Kubernetes 中主要由卷管理器 VolumeManager 、AttachDetachController 和 PVController 三个组件负责，前面提到的 Provision、Delete、Attach、Detach、Mount、Unmount 由 Volume Plugin 实现。

如图 7-27 所示，一个带有 PVC 的 Pod 创建过程。

:::center
  ![](../assets/k8s-volume.svg)<br/>
  图 7-27 Pod 挂载持久化 Volume 的过程
:::

1. 用户创建了一个包含 PVC 的 Pod，该 PVC 要求使用动态存储卷。
2. kube-scheduler 根据 Pod 配置、节点状态、PV 配置等信息，把 Pod 调度到一个合适的 node 节点。
3. PV Controller 会不断观察 ApiServer，如果它发现一个 PVC 已经创建完毕但仍然是未绑定的状态，就尝试把一个 PV 和 PVC 进行绑定。PV Controller 首先会在集群内部找到一个适合的 PV 进行绑定，如果未找到相应的 PV，就调用 Volume Plugin 去做 Provision。Provision 就是从远端上一个具体的存储介质创建一个 Volume，并且在集群中创建一个 PV 对象，然后将此 PV 和 PVC 进行绑定；

4. 如果有一个 Pod 调度到某个节点之后，它所定义的 PV 还没有被挂载（Attach），AD Controller 就会调用 VolumePlugin，把远端的 Volume 挂载到目标节点中的设备上（如：/dev/vdb）

5. 在 node 节点，当 Volum Manager 发现一个 Pod 调度到自己的节点上并且 Volume 已经完成了挂载，它就会执行 mount 操作，将本地设备（也就是刚才得到的 /dev/vdb）挂载到 Pod 在节点上的一个子目录 `/var/lib/kubelet/pods/[pod uid]/volumes/kubernetes.io~iscsi/[PV name]（以 iscsi 为例）`；
6. kubelet 通过容器运行时（如 containerd）启动 Pod 的 Containers，用 bind mount 方式将已挂载到本地全局目录的卷映射到容器中。

上面流程的每个步骤，其实就对应了 CSI 提供的标准接口，云存储厂商只需要按标准接口实现自己的云存储插件，即可与 Kubernetes 底层编排系统无缝衔接起来，提供多样化的云存储、备份、快照（snapshot）等能力。

## 7.5.5 Kubernetes 的 CSI 存储生态

得益 Kubernetes 的开放性设计，通过图 7-28 感受支持 CSI 的存储生态，基本上包含了市面上所有的存储供应商。

:::center
  ![](../assets/CSI.png)<br/>
  图 7-28 CNCF 下的 Kubernetes 存储生态
:::

上述众多的存储系统无法一一展开，但就作为业务开发工程师而言，直面的问题是应该选择哪种存储类型？无论是内置的存储插件还是第三方存储插件，总结提供的存储类型就 3 种：文件存储、块存储和对象存储。

### 1. 块存储

块存储是最接近物理介质的，这些存储介质（最常见的介质硬盘就属于块设备）不关心也无法关心数据的组织方式以及结构，那就用最简单粗暴的组织方式把所有数据按照固定的大小分块，每一块赋予一个用于寻址的编号，然后再通过与块设备匹配的协议（SCSI、SATA、SAS、FCP、FCoE、iSCSI..）进行读写。

块存储本身处于整个存储软件栈的底层，不经过操作系统，因此**具有超低的时延和超高的吞吐**。但缺陷是每个块是独立的，如果是多个系统对其操作，缺乏一个集中的控制机制来解决数据冲突和同步的问题，导致**块存储设备通常是不能共享**，无法被多个客户端（节点）挂载。因此，Kubernetes 中类型为块存储的 Volume 访问模式都要求必须是 RWO（ReadWriteOnce，可读可写，但只支持被单个节点挂载）。

不关心数据的组织方式/内容，接口朴素简单，所以块存储并不是提供给自然人，而是提供给专门的文件系统以及专业的备份管理软件、分区软件以及数据库使用。

### 2. 文件存储

块设备存储的是最原始的 0 和 1 的二进制数据，这对于人类用户来说实在是过于难以使用、难以管理。

因此我们用“文件”这个概念对这些数据进行组织，所有用于同一用途的数据，按照不同应用程序要求的结构方式组成不同类型的文件（通常用不同的后缀来指代不同的类型），然后给每一个文件起一个方便理解记忆的名字。而当文件很多的时候，按照某种划分方式给这些文件分组，所有的文件、目录形成一个树状结构。在这个数据组织之中加入控制信息形成了权限，还可以加上文件的名称、创建时间、所有者、修改者等一系列的元数据信息

人们把定义文件分配、应该如何实现、储存哪些信息、提供什么功能的标准称为文件系统（File System），很常用的文件系统如 FAT32、NTFS、exFAT、ext2/3/4、XFS、BTRFS 等等。这些文件系统大部分基于块存储之上实现，但文件存储的访问不像块存储因设备差异有五花八门的协议，其 POSIX 接口（Portable Operating System Interface，POSIX）已经成为事实标准，操作数据的接口（Open、Write、Read 等）都能在上述文件系统中被找到。

而在网络存储中，底层数据存储在另外一台服务器，不同的客户端用类似文件系统的方式访问这台服务器上的文件，这样的系统叫网络文件系统，常见的网络文件系统有 Windows 网络的 CIFS（Common Internet File System，又称 SMB）、类 Unix 系统网络的 NFS（Network File System）等。

### 3. 对象存储

文件存储的树状结构以及路径访问方式方便人类理解、记忆和访问，但计算机需要把路径进行分解，逐级向下查找，最后才能查找到需要的文件，对于应用程序来说既没必要，也浪费性能。块存储呢，性能出色，但难以理解且无法共享。

选择困难症发作的同时，思考是否能有一种兼具性能、还要实现共享、同时满足大规模扩展需求的新型存储系统呢？这就是对象存储。

对象存储中的“对象”可以理解为一个元数据及与其配对的一个逻辑数据块的组合，元数据提供了对象所包含的上下文信息，比如数据的类型、大小、权限、创建人、创建时间等等，数据块则存储了对象的具体内容。所有的数据都在同一个层次中，通过数据的唯一地址标识来识别并查找数据。

从设计之初衷（一般的对象存储都是基于哈希环之类的技术来实现），对象存储就可以非常简单的扩展到超大规模，因此非常适合数据量大、增速又很快的非结构化的数据（视频、图像等）。

比较出名的对象存储服务是 AWS S3，你也可以通过开源的产品 Ceph、Minio、Swift 自建对象存储服务。