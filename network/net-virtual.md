# 2.5 Linux 网络虚拟化

虚拟化的本质是现实世界的映射，Linux 网络虚拟化的主要技术是 Network namespace，以及各类虚拟设备，例如 veth、Linux Bridge、tap/tun 等。这些虚拟设备像现实世界中的物理设备一样彼此协作，将各个独立的 namespace 连接起来，构建出不受物理环境局限的各类网络拓扑架构。