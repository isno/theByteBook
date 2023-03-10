# 使用 DPVS 替换 LVS

内容来自于 爱奇艺 QLB团队， dpvs github

DPVS是一个基于DPDK的高性能四层负载均衡器（Layer-4 load balancer），DPVS的名字来源于DPDK+LVS(阿里巴巴改进版LVS 增加 Full-NAT)。

<div  align="center">
	<img src="/assets/chapter3/dpvs.png" width = "600"  align=center />
</div>

根据官方给出的架构和特点, DPVS 高性能的主要技术包括:

- Kernel by-pass （内核旁路，用户态实现）
- Share-nothing, per-CPU for key data （SNA架构：无锁、无竞争、无CPU切换）
- RX Steering and CPU affinity (CPU亲和性)
- Batching TX/RX （DPDK SIMD 批处理 ）
- Zero Copy （零拷贝）
- Polling instead of interrupt. 

## 用户态实现

DPVS主要的任务都是在用户态完成的，可以极大地提高效率。

官方声称DPVS的包处理速度，1个工作线程可以达到 2.3Mpps，6个工作线程可以达到万兆网卡小包的转发线速（约 12Mpps)。

这主要是因为DPVS绕过了内核复杂的协议栈，并采用轮询的方式收发数据包，避免了锁、内核中断、上下文切换、内核态和用户态数据拷贝产生的性能开销。

<div  align="center">
	<img src="/assets/chapter3/dpvs-1.png" width = "500"  align=center />
</div>

实际上四层负载均衡并不需要完整的协议栈，但是需要基本的网络组件，以便完成和周围设备的交互（ARP/NS/NA）、确定分组走向 （Route）、回应 Ping 请求、健全性检查（分组完整性，Checksum校验）、以及 IP 地址管理等基本工作。使用 DPDK 提高了收发包性能，但也绕过了内核协议栈，DPVS 依赖的协议栈需要自己实现。


## Master/Worker模型

这一点和nginx一样，使用M/S模型，Master 处理控制平面，比如参数配置、统计获取等；Worker 实现核心负载均衡、调度、数据转发功能。

另外，DPVS 使用多线程模型，每个线程绑定到一个 CPU 物理核心上，并且禁止这些 CPU 被调度。这些 CPU 只运行 DPVS 的 Master 或者某个 Worker，以此避免上下文切换，别的进程不会被调度到这些 CPU，Worker 也不会迁移到其他 CPU 造成缓存失效。

<div  align="center">
	<img src="/assets/chapter3/dpvs-3.png" width = "400"  align=center />
</div>

## 网卡队列/CPU绑定

现在的服务器网卡绝大多数都是多队列网卡，支持多个队列同时收发数据，让不同的 CPU 处理不同的网卡队列的流量，分摊工作量，DPVS将其和CPU进行绑定，利用DPDK 的 API 实现一个网卡的一个收发队列对应一个CPU核心和一个Worker进程，实现一一对应和绑定，从而实现了处理能力随CPU核心、网卡队列数的增加而线性增长，并且很好地实现了并行处理和线性扩展。

<div  align="center">
	<img src="/assets/chapter3/dpvs-5.png" width = "500"  align=center />
</div>

## 关键数据无锁化

内核性能问题的一大原因就是资源共享和锁。所以，被频繁访问的关键数据需要尽可能的实现无锁化，其中一个方法是将数据做到 per-cpu 化，即每个CPU核心只处理自己本地的数据，不需要访问其他CPU的数据，这样就可以避免加锁。对于DPVS而言，连接表，邻居表，路由表等频繁修改或者频繁查找的数据，都做到了 per-cpu 化。但是在具体 per-cpu 的实现上，连接表和邻居表、路由表两者的实现方式并不相同。

连接表在高并发的情况下会被频繁的CRUD。DPVS中每个CPU核心维护的是不相同的连接表，不同的网络数据流（TCP/UDP/ICMP）按照 N 元组被定向到不同的CPU核心，在此特定的CPU核心上创建、查找、转发、销毁。同一个数据流的包，只会出现在某个CPU核心上，不会落到其他的CPU核心上。这样就可以做到不同的CPU核心只维护自己本地的表，无需加锁。

对于邻居表和路由表这种每个CPU核心都要使用的全局级别的操作系统数据，默认情况下是使用”全局表+锁保护“的方式。DPVS通过让每个CPU核心有同样的视图，也就是每个CPU核心需要维护同样的表，从而做到了per-cpu。对于这两个表，虽然在具体实现上有小的差别（路由表是直接传递信息，邻居是克隆数据并传递分组给别的 CPU），但是本质上都是通过跨CPU通信来实现的跨CPU无锁同步，从而将表的变化同步到每个CPU，最后实现了无锁化。

## 跨CPU无锁通信

面的关键数据无锁化和这一点实际上是殊途同归的。首先，虽然采用了关键数据 per-cpu等优化，但跨CPU还是需要通信的，比如:

- Master 获取各个 Worker 的各种统计信息
- Master 将路由、黑名单等配置同步到各个 Worker
- Master 将来自DPVS的KNI网卡的数据发送到 Worker（只有 Worker 能操作DPDK网卡接口来发送数据）

既然需要通信，就不能存在互相影响、相互等待的情况，因为那会影响性能。DPVS的无锁通信还是主要依靠DPDK提供的无锁rte_ring库实现的，从底层保证通信是无锁的，并且我们在此之上封装一层消息机制来支持一对一，一对多，同步或异步的消息。

## 丰富的功能

从转发模式上看：DPVS 支持 DirectRouting（DR）、NAT、Tunnel、Full-NAT、SNAT五种转发模式，可以灵活适配各种网络应用场景

从协议支持上看：DPVS 支持 IPv4和 IPv6 协议、且最新版本增加了 NAT64的转发功能，实现了用户从 IPv6网络访问 IPv4服务

从设备支持上看：DPVS支持主流的硬件网卡设备，同时还支持了Bonding（mode 0 and 4 ）, VLAN, kni, ipip/GRE等虚拟设备

从管理工具上看：可以使用包括 ipvsadm、keepalived、dpip等工具对DPVS进行配置和管理，也支持使用进行 quagga 集群化部署


从上面列出的几个DPVS的主要特点我们不难发现，DPVS的主要设计思路就是通过减少各种切换和避免加锁来提高性能，具体的实现上则主要依赖了DPDK的许多功能特性以及使用了常用的几个开源负载均衡软件（ipvsadm、keepalived、dpip等），结合用户态的轻量级网络协议栈（只保留了四层负载均衡所必须的），就实现了超强性能的四层负载均衡系统。

<div  align="center">
	<img src="/assets/chapter3/dpvs-2.png" width = "650"  align=center />
</div>

## 安装实践

```
git clone https://github.com/iqiyi/dpvs.git
$ cd dpvs
```

### 安装 DPDK

当前 DPVS 推荐使用dpdk-stable-20.11.1，将不再支持早于dpdk-20.11的dpdk版本。

```
$ wget https://fast.dpdk.org/rel/dpdk-20.11.1.tar.xz   # download from dpdk.org if link failed.
$ tar xf dpdk-20.11.1.tar.xz
```

安装 DPDK 补丁, 非必须

如果您想支持DPVS需要的额外功能。比如 DPDK的kni驱动有一个硬件组播的补丁，如果你要在kni设备上启动ospfd，则要安装 kni 补丁。

```
$ cd <path-of-dpvs>
$ cp patch/dpdk-stable-20.11.1/*.patch dpdk-stable-20.11.1/
$ cd dpdk-stable-20.11.1/
$ patch -p1 < 0001-kni-use-netlink-event-for-multicast-driver-part.patch
$ patch -p1 < 0002-pdump-change-dpdk-pdump-tool-for-dpvs.patch
```

0001号补丁主要是用于在kni网卡上开启硬件多播功能，比如在kni设备上启动ospfd
0002号补丁主要是使用dpvs的UOA模块的时候需要用到


编译dpdk

使用 meson-ninja 来构建 DPDK 库, 并导出环境变量 PKG_CONFIG_PATH

```
$ cd dpdk-stable-20.11.1
$ mkdir dpdklib                 # user desired install folder
$ mkdir dpdkbuild               # user desired build folder
$ meson -Denable_kmods=true -Dprefix=dpdklib dpdkbuild
$ ninja -C dpdkbuild
$ cd dpdkbuild; ninja install
$ export PKG_CONFIG_PATH=$(pwd)/../dpdklib/lib64/pkgconfig/
```

### 配置hugepage

和其他的一般程序不同，dpvs使用的dpdk并不是从操作系统中索要内存，而是直接使用大页内存（hugepage），极大地提高了内存分配的效率。

官方的配置过程中使用的是2MB的大页内存，这里的8192指的是分配了8192个2MB的大页内存，也就是一个node对应16GB的内存，一共分配了32GB的内存，这里的内存可以根据机器的大小来自行调整。但是如果小于1GB可能会导致启动报错。

```
$ # for NUMA machine
$ echo 8192 > /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages
$ echo 8192 > /sys/devices/system/node/node1/hugepages/hugepages-2048kB/nr_hugepages

$ mkdir /mnt/huge
$ mount -t hugetlbfs nodev /mnt/huge
```


安装内核模块，用uio_pci_generic驱动绑定网卡

```
$ modprobe uio_pci_generic

$ cd dpdk-stable-20.11.1
$ insmod dpdkbuild/kernel/linux/kni/rte_kni.ko carrier=on

$ ./usertools/dpdk-devbind.py --status
$ ifconfig eth0 down          # assuming eth0 is 0000:06:00.0
$ ./usertools/dpdk-devbind.py -b uio_pci_generic 0000:06:00.0
```

dpdk-devbind.py -u 可以用来解除对驱动的绑定，并将其切换回Linux驱动，如ixgbe。
你也可以使用lspci或ethtool -i eth0来检查 NIC PCI bus-id。

### 安装 DVPS

```
$ export PKG_CONFIG_PATH=<path-of-libdpdk.pc>  # normally located at dpdklib/lib64/pkgconfig/
$ cd <path-of-dpvs>

$ make              # or "make -j" to speed up
$ make install

$ ls bin/
dpip  dpvs  ipvsadm  keepalived

```

## 启动 DVPS

```
$ cp conf/dpvs.conf.single-nic.sample /etc/dpvs.conf
$ ./bin/dpvs &
# 如果安装成功并且成功运行了，执行命令就可以看到
$ ./bin/dpip link show
1: dpdk0: socket 0 mtu 1500 rx-queue 8 tx-queue 8
    UP 10000 Mbps full-duplex auto-nego
    addr A0:36:9F:9D:61:F4 OF_RX_IP_CSUM OF_TX_IP_CSUM OF_TX_TCP_CSUM OF_TX_UDP_CSUM
```
