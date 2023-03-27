# VxLan 组网实践

在了解 VxLan 的必要背景知识后，我们将通过几个例子说明如何搭建基于 VxLan 的 overlay 网络。

## 点对点网络组建

```
ip link add vxlan0 type vxlan \
	id 1024 \
	dstport 4789 \
	remote 192.168.1.3 \
	local 192.168.1.2 \
	dev eth0
```

通过上面的命令，我们创建了一个名为 `vxlan0` 类型为 `vxlan`的网络接口。

该命令中的参数说明如下：

- id 1024：指定的VNI值，有效范围在 1~2^24之间；
- dstport: VTEP 通信端口, IANA分配的端口为 4789，如不指定，Linux 默认使用8472；
- remote: 对端的VTEP地址
- local: 当前节点的VTEP地址
- dev: 当前节点用于VTEP通信的网卡设备，用来获取本节点 VTEP ip地址。local 和 dev 参数功能一致，实际中只写一个即可。

执行之后，系统会创建一个名为 vxlan0 的网卡，我们查询它的详细信息

```
ip -d link show dev vxlan0
...
```

接下来为 vxlan0 网卡分配IP地址，并启用

```
ip addr add 172.17.1.2/24 dev vxlan0
ip link set vxlan0 up
```

