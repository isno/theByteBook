#Keepalived

在第一章笔者介绍过ARP协议的一些概述，对于Keepalived的HA方案，其实就是以ARP协议为基础 “抢占”一个VIP，然后两个节点之间通过一个协议（VRRP）确认服务是否正常，如果Master异常，则另一个Slave 通过 ARP“抢占” VIP。以继续提供服务。


Keepalived主要功能是实现真RS故障隔离及负载均衡器间的失败切换，提高系统的可用性，Keepalived除了能够管理LVS软件外，还可以作为其他服务的高可用解决方案软件。


## VRRP协议原理简介

VRRP （Virtual Router Redundancy Protocol），虚拟路由器冗余协议。主要是为了解决主机通讯内路由器单点的问题。VRRP 可以将两台或多台物理路由器设备虚拟成一个虚拟路由器，每个虚拟路由器都有一个唯一标识，称为 VRID。

一个 VRID 与一组 IP 地址构成了一个虚拟路由器。这个虚拟路由器通过虚拟IP（一个或多个）对外提供服务。而在虚拟路由器内部，同一时间只有一台物理路由器对外提供服务，这台物理路由器被称为主路由器（处于 MASTER 角色）。 

而其他物理路由器不拥有对外的虚拟 IP，也不提供对外网络功能，仅仅接收 MASTER 的 VRRP 状态通告信息，这些路由器被统称为备份路由器（处于 BACKUP 角色）。 当主路由器失效时，处于 BACKUP 角色的备份路由器将重新进行选举，产生一个新的主路由器进入 MASTER 角色继续提供对外服务，整个切换过程对用户来说完全透明

<div  align="center">
    <p>图：VRRP示意</p>
    <img src="/assets/chapter3/vrrp.png" width = "500"  align=center />
</div>

Keepalived体系架构中主要有三个模块，分别是core、check和vrrp。

- core模块：为keepalived的核心，负责主进程的启动、维护及全局配置文件的加载和解析。
- vrrp模块：是来实现VRRP协议的。
- check模块：负责健康检查，常见的方式有端口检查及URL检查。

check模块会检查各自服务器的健康状况，例如HTTP、LVS，如果检查到Master上服务不可用了，就会通知本机上的VRRP子进程，让他删除通告，并且去掉虚拟IP，转换为Backup状态。


## Keepalived的应用示例

LVS配合Keepalived可以实现一个主备方式集群，在本文笔者配置该套环境，以便您参考了解。


### 环境说明

VIP: 192.168.28.211, 确保该IP未被分配

LVS Node1: 192.168.28.101  52:54:00:8b:23:44
LVS Node2: 192.168.28.102  52:54:00:10:03:31

HTTP Node1: 192.168.28.103
HTTP Node2: 192.168.28.104


首先配置Nginx的HTTP示例服务， 在HTTP两个Node上分别启动Docker的Nginx服务

```
mkdir -p /root/nginx/www
echo "http demo" >> /root/nginx/www/index.html

docker run -p 80:80 --name nginx1 -v /root/nginx/www/:/usr/share/nginx/html:ro -d nginx
```

安装ipvsadm以及Keepalived

```
install ipvsadm keepalived
```

## Keepalived的配置解释

 Keepalived默认配置文件为 /etc/keepalived/keepalived.conf

 Keepalived的配置文件可以分为三块：

 - 全局定义块：对整个 Keepalive 配置生效的，不管是否使用LVS
 - VRRP 实例定义块：是 Keepalived 的核心
 - 虚拟服务器（LVS）定义块：该配置只在使用 Keepalived 来配置和管理 LVS 时才需要使用，如果仅仅使用 Keepalived做HA，则不需要该配置


```
global_defs {
    ...
    router_id LVS_DEVEL          #标识这台机器ID，默认情况下是主机名，可以配置成主机名
    vrrp_skip_check_adv_addr     #所有报文都检查比较消耗性能，此配置为如果收到的报文和上一个报文是同一个路由器则跳过检查报文中的源地址
    vrrp_strict                  #严格遵守VRRP协议,不允许状况:1,没有VIP地址,2.配置了单播邻居,3.在VRRP版本2中有IPv6地址
    vrrp_garp_interval 0         #ARP报文发送延迟
    vrrp_gna_interval 0          #消息发送延迟
}
```

**vrrp_instance**

虚拟路由器和物理服务器的配置

```
vrrp_instance VI_1 {  #一个虚拟路由器组的物理实例, 同一组里的实例不能重名

    state MASTER #当前节点在此虚拟路由器上的初始状态，状态为MASTER或者BACKUP
    interface eth0 #绑定为当前虚拟路由器使用的物理接口 ens32,eth0,bond0,br0
    virtual_router_id 51 #当前虚拟路由器惟一标识，范围是0-255
    priority 100 #当前物理节点在此虚拟路由器中的优先级；范围1-254
    advert_int 1 #vrrp通告的时间间隔，默认1s

    authentication { #认证机制
        auth_type PASS
        auth_pass 123456
    }
    virtual_ipaddress { #VIP池，可以单个，也可以多个
       192.168.12.211
    }
}
```

**virtual_server** 

用于配合LVS实现后端服务器检测, 如果不是和LVS一起使用, 那么此段配置可不配置

```
virtual_server 192.168.12.211 80 {
    delay_loop 1       # 每隔1秒查询realserver状态 
    lb_algo wrr        # lvs 算法
    lb_kind DR         # Direct Route
    protocol TCP       # 用TCP协议检查realserver状态
    persistence_timeout 50 # 会话保持时间，这段时间内，同一ip发起的请求将被转发到同一个realserver
    
    # 第一台realserver物理环境
    real_server 192.168.28.103 80 {
        weight 1    
        TCP_CHECK {
            connect_timeout 3
            nb_get_retry 3
            delay_before_retry 3
            connect_port 80
        }
    }
    
    # 第二台realserver物理环境
    real_server 192.168.28.104 80 {
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

lvs-slave的配置和主机一样，仅需要将

```
state MASTER --> BACKUP
priority 100 --> 90
```

启动 keepalived

```
# 清除路由设置
sudo ipvsadm -C

# 重启 keepalived
sudo service keepalived restart
```

此时查看路由配置

```
[root@node1 ~]# sudo ipvsadm
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.12.211:http wrr persistent 50
  -> 192.168.28.103:http          Route   1      0          0         
  -> 192.168.28.104:http          Route   1      0          0    
```

## 访问测试

访问http://192.168.28.211/

<div  align="center">
    <img src="/assets/chapter3/lvs-test.png" width = "560"  align=center />
</div>

假设lvs-master宕机

```
service keepalived stop
```

假设 RS1 宕机

```
docker stop nginx
```

```
isno@isnodeMacBook-Pro ~ % arp -n 192.168.28.211
? (192.168.28.211) at 52:54:0:10:3:31 on en0 ifscope [ethernet]
```

