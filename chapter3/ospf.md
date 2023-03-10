# 基于OSPF构建双活的负载均衡

在前面笔者介绍Keepalived，并部署了一套主备方式的L4负载均衡集群。

用户访问同一个VIP，两台DS之间始终只有一台（Master）处于工作状态，而另一台（Backup）只是用来备份，当Master出现问题的时候才用到它。这样是不是很浪费资源呢？特别是当有大量请求访问的时候，依然仅有一台DS进行工作，无法提升整体的服务效率。

是否可以横向扩展让两台DS都处于工作的状态呢？LVS + OSPF 架构就解决了这个问题, 实现了负载均衡的横向扩展。


这个架构与LVS+keepalived 最明显的区别在于，两台DS都是Master状态，对资源实现了均衡利用，实现这种方案关键涉及了路由器领域的几个技术概念


## OSPF/ECMP

OSPF，开放式最短路径优先协议，一种基于链路状态的内部网关协议。

每个OSPF路由器都包含了整个网络的拓扑。并计算通过网络的最短路径。OSPF会通过多播的方式自动对外传播检测到的网络变化。


ECMP（Equal-CostMultipathRouting）是一个逐跳的基于流的负载均衡策略，当路由器发现同一目的地址出现多个最优路径时，会更新路由表，为此目的地址添加多条规则，对应于多个下一跳，可同时利用这些路径转发数据，增加带宽.ECMP算法被多种路由协议支持，例如：OSPF、ISIS、EIGRP、BGP等


ECMP最大的特点是实现了等值情况下，多路径负载均衡和链路备份的目的，在静态路由和OSPF中基本上都支持ECMP功能。

例如下图中的路径A、路径B两条路径的COST值相同，既是等价路径。在路由器选路的时候，便可以同时使用这2条路径，从而实现负载均衡。

<div  align="center">
	<img src="/assets/chapter3/ecmp.png" width = "360"  align=center />
</div>

OSPF、ISIS、EIGRP、BGP 等主流的路由协议都支持 ECMP 功能，我们利用quagga软件将调度器模拟成路由器，即可将多台DS与真实的路由器组成OSPF网络。

## 安装实践

在本文，笔者利用quagga软件模拟ospf协议，实现负载均衡多活的方案，根据下面的方案图可以看到到达VIP的链路有两条，当请求到达router的时候，会将流量分配到两台主负载均衡器上。
<div  align="center">
	<img src="/assets/chapter3/lvs-ecmp.png" width = "400"  align=center />
</div>


### 环境准备

|名称|ip|
|:--|:--|
|vip|192.168.28.211 |
|router|192.168.28.210 |
|ds-1|192.168.28.101|
|ds-2|192.168.28.102|
|rs-1|192.168.28.103 |
|rs-2|192.168.28.104|


### RS环境部署

**部署Real Server服务**

部署的方式使用Docker方式在192.168.28.103、192.168.28.104两台节点中建立两个 HTTP 服务。

```
mkdir -p /root/nginx/www
echo "test-1" >> /root/nginx/www/index.html
docker pull nginx
docker run -p 80:80 --name nginx-1 -v /root/nginx/www/:/usr/share/nginx/html:ro -d nginx
```

在第二台RS节点执行相同操作，不过HTML 换个内容，以便测试区分。

```
echo "test-2" >> /root/nginx/www/index.html
```

**vip及arp配置**

由于RS开启了IP数据包转发，以及IP数据包的dst_src为vip，所以将vip绑定到lo网卡，把数据包交由上层处理。

```
/sbin/ifconfig lo:0 192.168.28.211 broadcast 192.168.28.211 netmask 255.255.255.255 up
/sbin/route add -host 192.168.28.211 dev lo:0
```

由于lo网卡绑定了vip，此处进行相应的arp配置

```
echo "1">/proc/sys/net/ipv4/conf/all/arp_ignore
echo "1">/proc/sys/net/ipv4/conf/lo/arp_ignore
echo "2">/proc/sys/net/ipv4/conf/all/arp_announce
echo "2">/proc/sys/net/ipv4/conf/lo/arp_announce

```

- arp_ignore设置为1，不做lo网卡的arp响应
- arp_announce设置为2  避免了通过lo:vip发送arp请求包，请求不经过ds


## DS 环境准备


OSPF-LVS模式的集群下，Router根据ospf信息，通过修改报文的目的mac地址，转发到对应的LVS来实现负载均衡。并不根据vip对应的arp信息，将对应每台lvs将vip挂载在lo上。

**配置vip lo网卡处理**

```
ifconfig lo:0 192.168.12.211 netmask 255.255.255.255 up
```

验证vip挂载到 lo接口
```
[root@node1 ~]# ifconfig
...
lo:0: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 192.168.12.211  netmask 255.255.255.255
        loop  txqueuelen 1000  (Local Loopback)
```

配置keepalived

由于我们使用ospf来实现高可用，所以Keepalived不需要配置vrrp功能。keepalived只使用期后端服务检测功能。

```
global_defs {
    router_id LVS_DEVEL
    vrrp_skip_check_adv_addr
    vrrp_strict
}

# 虚拟服务器配置
virtual_server 192.168.12.211 80 {
    delay_loop 1       # 每隔1秒查询realserver状态 
    lb_algo wrr        # lvs 算法
    lb_kind DR         # Direct Route
    protocol TCP       # 用TCP协议检查realserver状态
    persistence_timeout 50 # 会话保持时间，这段时间内，同一ip发起的请求将被转发到同一个realserver

    ha_suspend    # 在LB节点状态从Master切换到Backup时，不启用对RS节点的健康检查

    sorry_server 127.0.0.1 80

    #realserver物理环境
    real_server 192.168.28.208 80 {
        weight 1    
        TCP_CHECK {
            connect_timeout 3
            nb_get_retry 3
            delay_before_retry 3
            connect_port 80
        }
    }
}
```
启动keepalived服务

```
systemctl enable keepalived
systemctl start keepalived
```

验证keepalived，以及查看转发规则

```
[root@node1 ~]# ipvsadm -L
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.12.211:http wrr persistent 50
  -> 192.168.28.136:http          Route   1      0          0  
```


### 配置quagga

安装 quagga

```
yum install  -y quagga
```

配置/etc/quagga/ospfd.conf

```
hostname 192.168.28.208   #用主机ip代替即可
password test
log file /var/log/quagga/ospfd.log
log stdout
log syslog
service password-encryption
interface eth0        #主机ip所在的网卡名
  ip ospf hello-interval 1
  ip ospf dead-interval 4
  ip ospf priority 0
  ip ospf cost 1
router ospf
  ospf router-id 192.168.28.208  #用主机ip代替
  log-adjacency-changes
  network 192.168.28.0/8 area 0.0.0.0
access-list 1 permit 127.0.0.1
line vty
 access-class 1
```

配置/etc/quagga/zebra.conf

```
hostname 192.168.28.208    # 主机ip代替
password test
enable password test
log file /var/log/quagga/zebra.log
service password-encryption
interface eth0
access-list 1 permit 127.0.0.1
ip prefix-list ANY seq 5 permit 0.0.0.0/0 le 32
route-map ANY deny 10
  match ip address prefix-list ANY
ip protocol ospf route-map ANY
line vty
  access-class 1
```

启动ospfd、zebra 服务

```
systemctl  start zebra
systemctl  start ospfd
```

## 配置Router端

开启转发，以及arp proxy
```
echo 1 >  /proc/sys/net/ipv4/ip_forward
echo 1 > /proc/sys/net/ipv4/conf/eth0/proxy_arp
```

安装及配置 quagga

```
yum install -y quagga
```

配置 ospfd服务。 配置文件 /etc/quagga/ospfd.conf

```
hostname 10.0.1.136    #主机ip地址
password test
log file /var/log/quagga/ospfd.log
log stdout
log syslog
service password-encryption
interface eth0
  ip ospf hello-interval 1
  ip ospf dead-interval 4
  ip ospf priority 1
  ip ospf cost 1
router ospf
  ospf router-id 10.0.1.136
  log-adjacency-changes
  network 10.0.1.0/24 area 0.0.0.0
access-list 1 permit 127.0.0.1
line vty
 access-class 1
```

```
hostname 10.0.1.136 # HOSTNAME改为IP也可以
password test
enable password test
log file /var/log/quagga/zebra.log
#log syslog
service password-encryption
interface eth0
access-list 1 permit 127.0.0.1
ip prefix-list ANY seq 5 permit 0.0.0.0/0 le 32
route-map ANY permit 10  #将ospf路由映射到kernel
  match ip address prefix-list ANY
ip protocol ospf route-map ANY
line vty
  access-class 1
```

启动服务

```
systemctl  enable zebra
systemctl  start zebra

systemctl  enable ospfd
systemctl  start ospfd


systemctl  start zebra

```


验证结果：可以看到访router到达vip 10.0.1.100有两条链路，一条是10.0.1.133(lb1)，一条是10.0.1.135（lb2）

```
[root@localhost ~]# vtysh
```

## 验证

```
[root@localhost ~]# ifconfig|grep 10.0
        inet 10.0.1.138  netmask 255.255.255.0  broadcast 10.0.1.255
        ether 00:0c:29:c8:e5:37  txqueuelen 1000  (Ethernet)
        loop  txqueuelen 1000  (Local Loopback)
[root@localhost ~]# ip route
default via 10.0.1.2 dev ens33 proto dhcp metric 100
10.0.1.0/24 dev ens33 proto kernel scope link src 10.0.1.138 metric 100
10.0.1.100 via 10.0.1.136 dev ens33
[root@localhost ~]# traceroute 10.0.1.100
traceroute to 10.0.1.100 (10.0.1.100), 30 hops max, 60 byte packets
 1  10.0.1.136 (10.0.1.136)  0.260 ms  0.146 ms  0.146 ms
 2  10.0.1.100 (10.0.1.100)  0.293 ms  0.303 ms  0.226 ms
[root@localhost ~]# curl 10.0.1.100
server 10.0.1.129
```