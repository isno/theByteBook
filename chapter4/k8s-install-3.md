# 初始化集群

## etcd高可用

Kubernetes的高可用集群拓扑有两个选项，

- 使用堆叠（stacked）控制平面节点，其中 etcd 节点与控制平面节点共存
- 使用外部 etcd 节点，其中 etcd 在与控制平面不同的节点上运行

我们选用堆叠方式，etcd 分布式数据存储集群堆叠在 kubeadm 管理的控制平面节点上，作为控制平面的一个组件运行。

## apiserver高可用

apiserver的高可用比较主流的官方推荐方案是使用keepalived和haproxy。

由于centos7自带的版本较旧，重新编译又过于麻烦，因此我们可以参考官方给出的静态pod的部署方式，提前将相关的配置文件放置到/etc/kubernetes/manifests目录下即可(需要提前手动创建好目录)


首先我们需要准备好两台master节点上面的keepalived配置文件和haproxy配置文件：

```
! /etc/keepalived/keepalived.conf
! Configuration File for keepalived
global_defs {
    router_id LVS_DEVEL
}
vrrp_script check_apiserver {
  script "/etc/keepalived/check_apiserver.sh"
  interval 3
  weight -2
  fall 10
  rise 2
}
vrrp_instance VI_1 {
    state ${STATE}
    interface ${INTERFACE}
    virtual_router_id ${ROUTER_ID}
    priority ${PRIORITY}
    authentication {
        auth_type PASS
        auth_pass ${AUTH_PASS}
    }
    virtual_ipaddress {
        ${APISERVER_VIP}
    }
    track_script {
        check_apiserver
    }
}
```

实际上我们需要区分两台控制面节点的状态

```
! /etc/keepalived/keepalived.conf
! Configuration File for keepalived
global_defs {
    router_id CALICO_MASTER_90_1
}
vrrp_script check_apiserver {
  script "/etc/keepalived/check_apiserver.sh"
  interval 3
  weight -2
  fall 10
  rise 2
}

vrrp_instance calico_ha_apiserver_10_31_90_0 {
    state MASTER
    interface eth0
    virtual_router_id 90
    priority 100
    authentication {
        auth_type PASS
        auth_pass pass@77
    }
    virtual_ipaddress {
        10.31.90.0
    }
    track_script {
        check_apiserver
    }
}
```

```
! /etc/keepalived/keepalived.conf
! Configuration File for keepalived
global_defs {
    router_id CALICO_MASTER_90_3
}
vrrp_script check_apiserver {
  script "/etc/keepalived/check_apiserver.sh"
  interval 3
  weight -2
  fall 10
  rise 2
}

vrrp_instance calico_ha_apiserver_10_31_90_0 {
    state BACKUP
    interface eth0
    virtual_router_id 90
    priority 98
    authentication {
        auth_type PASS
        auth_pass pass@77
    }
    virtual_ipaddress {
        10.31.90.0
    }
    track_script {
        check_apiserver
    }
}
```