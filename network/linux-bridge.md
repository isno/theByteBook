# 3.5.3 Linux 网桥

既然有了虚拟网卡，很自然就想到让网卡接入交换机，以实现多个容器间的互相连接。

物理网络中，如果需要连接多个主机，我们会使用网桥（也可以理解为交换机）设备组成一个小型局域网。在 Linux 网络虚拟化系统中，也提供了网桥虚拟实现 Linux Bridge。

Linux Bridge 是 Linux 内核 2.2 版本开始提供的二层转发工具，与物理交换机机制一致，能够接入任何二层的网络设备（无论是真实的物理设备，例如 eth0 或者虚拟设备，例如 veth、tap 等）。不过 Linux Bridge 与普通物理交换机还有有一点不同，普通的交换机只会单纯地做二层转发，Linux Bridge 却还能把发给它的数据包再发送到主机的三层协议栈中。读者们是否还记得 3.3.2 节提到的设置 bridge-nf-call-iptables 参数？就是因为 Linux Bridge 与普通交换机的一点不同。 

部署 Docker 或者 Kubernetes 时，我们在宿主机内看到设备 cni0、docker0 等就是它们创建的 Linux Bridge 设备。

<div  align="center">
    <img src="../assets/linux-bridge.svg" width = "500"  align=center />
    <p>图 3-23 veth 网卡与 Linux Bridge</p>
</div>