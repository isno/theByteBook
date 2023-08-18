# 2.2.4 路由

如果两个namespace处于不同的子网中，那么就不能通过bridge进行连接了，而是需要通过路由器进行三层转发。

然而Linux并未像提供虚拟网桥一样也提供一个虚拟路由器设备，原因是Linux自身就具备有路由器功能。

路由器的工作原理是这样的：路由器上有2到多个网络接口，每个网络接口处于不同的三层子网上。

路由器会根据内部的路由转发表将从一个网络接口中收到的数据包转发到另一个网络接口，这样就实现了不同三层子网之间的互通。

Linux内核提供了IP Forwarding功能，启用IP Forwarding后，就可以在不同的网络接口中转发IP数据包，相当于实现了路由器的功能。

备注：Linux的IP Forwarding功能并不是默认开启的，可以采用下面的方法开启：

```
cat > /etc/sysctl.d/30-ipforward.conf << EOL
net.ipv4.ip_forward=1
net.ipv6.conf.default.forwarding=1
net.ipv6.conf.all.forwarding=1
EOL

sysctl -p /etc/sysctl.d/30-ipforward.conf
```

## 操作实践

将两个不同三层子网中的namespace通过Linux自身的路由功能连接起来，该试验的网络拓扑如下图所示：

> 下方的路由器并未对应一个物理或者虚拟的路由器设备，而是采用了一个带两个虚拟网卡的namespace来实现，由于Linux内核启用了IP forwading功能，因此ns-router namespace可以在其两个处于不同子网的网卡之间进行IP数据包转发，实现了路由功能。


创建三个namespace。

```
ip netns add ns1
ip netns add ns2
ip netns add ns-router
```

创建veth pair，并使用veth pair将ns1和ns2连接到由ns-router实现的路由器上。

```
ip link add veth-ns1 type veth peer name veth-ns1-router
ip link set veth-ns1 netns ns1
ip link set veth-ns1-router netns ns-router

ip link add veth-ns2 type veth peer name veth-ns2-router
ip link set veth-ns2 netns ns2
ip link set veth-ns2-router netns ns-router
```

为虚拟网卡设置ip地址，ns1和ns2分别为192.168.1.0/24和192.168.2.0/24两个子网上，而ns-router的两个网卡则分别连接到了这两个子网上。

```
ip -n ns1 addr add 192.168.1.2/24 dev veth-ns1
ip -n ns2 addr add 192.168.2.2/24 dev veth-ns2
ip -n ns-router addr add 192.168.1.1/24 dev veth-ns1-router
ip -n ns-router addr add 192.168.2.1/24 dev veth-ns2-router
```

将网卡的状态设置为up。


```
ip -n ns1 link set veth-ns1 up
ip -n ns2 link set veth-ns2 up
ip -n ns-router link set veth-ns1-router up
ip -n ns-router link set veth-ns2-router up
```

此时尝试从ns1 ping ns2，会失败，原因是虽然ns-router可以进行路由转发，但ns2的IP地址不在ns1的子网中，ns1在尝试发送IP数据包时找不到对应的路由，因此会报错，提示Network is unreachable。此时IP数据包并未能发送到ns-router上。

```
ip netns exec ns1 ping 192.168.2.2
ping: connect: Network is unreachable
```

我们在ns1和ns2中分别加上到达对方子网的路由，即将发送到对方子网的IP数据包先发送到路由器上本子网对于的网络接口上，然后通过路由器ns-router进行转发

```
ip netns exec ns1 ip route add 192.168.2.0/24 via 192.168.1.1
ip netns exec ns2 ip route add 192.168.1.0/24 via 192.168.2.1
```

此时再在两个ns中尝试ping对方，就可以成功了。

```
ip netns exec ns1 ping 192.168.2.2
PING 192.168.2.2 (192.168.2.2) 56(84) bytes of data.
64 bytes from 192.168.2.2: icmp_seq=1 ttl=63 time=0.064 ms
```

## 小结

为了方便理解，在该试验中使用了一个单独的namespace ns-router来承担路由器的功能，实际上我们可以直接把veth路由器端的虚拟网卡放在default network namespace中，由default network namespace来承担路由器功能。
