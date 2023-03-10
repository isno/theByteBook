# 初始化准备

在集群部署之前，我们要先进行一些基本的初始工作，包括内核升级，这将保证集群更加稳定的运行。

首先说明集群的概况。安装K8S 必须满足以下几个硬性要求： 内核版本大于4.4.xxx。 cpu核心数不低于2，内存不低于2G，hostname不是localhost，且不包含下划线、小数点、大写字母。 任意节点都有固定的内网IP地址。


## 安装环境信息

- Linux Kernel：5.4.231-1.el7.elrepo.x86_64
- Kubernetes： v1.25.6
- Docker： Docker CE 3:20.10.9-3.el7

**节点信息**

- Master节点1：192.168.28.100
- Master节点2：192.168.28.101
- Master节点3：192.168.28.102

由于笔者是实验性质的安装，没有太多的机器以供测试，所以 三个 Master 和 Node 复用。


## 关闭swap内存

官方也建议关闭swap内存，如果开启会导致K8S性能问题。

```
# 使用命令直接关闭swap内存
swapoff -a

# 修改fstab文件禁止开机自动挂载swap分区
sed -i '/swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

## 配置时间同步

确保各个 pod、node 时间一致，笔者在这里选用chrony进行时间同步。

```
# 使用yum安装chrony
yum install chrony -y

# 设置开机启动并开启chony并查看运行状态
systemctl enable chronyd.service
systemctl start chronyd.service
systemctl status chronyd.service

# 自定义时间服务器 改为 中国科学院国家授时中心 ntp.ntsc.ac.cn
vim /etc/chrony.conf

# 修改前
$ grep server /etc/chrony.conf
# Use public servers from the pool.ntp.org project.
server 0.centos.pool.ntp.org iburst
server 1.centos.pool.ntp.org iburst
server 2.centos.pool.ntp.org iburst
server 3.centos.pool.ntp.org iburst

# 修改后
$ grep server /etc/chrony.conf
# Use public servers from the pool.ntp.org project.
server ntp.ntsc.ac.cn iburst

# 重启服务使配置文件生效
systemctl restart chronyd.service

# 查看chrony的ntp服务器状态
chronyc sourcestats -v
chronyc sources -v

```

## 关闭SELinux

Selinux是内核级别的一个安全模块，通过安全上下文的方式控制应用服务的权限，是应用和操作系统之间的一道ACL，但不是所有的程序都会去适配这个模块，不适配的话开着也不起作用，我们直接关闭 SELinux

```
# 临时关闭
setenforce 0
# 永久禁用
sed -i 's/^SELINUX=enforcing$/SELINUX=disabled/' /etc/selinux/config
```

## 配置防火墙

K8S集群之间通信和服务会用到iptables，如果系统使用了 firewalld ，会有互斥的影响，为了方便，直接禁用 firewalld 防火墙。

```
systemctl stop firewalld
systemctl disable firewalld.service
```

## 设置 bridge-nf-call-iptables

开启 ipv4 转发，配置内核加载br_netfilter和iptables放行ipv6和ipv4的流量，确保集群内的容器能够正常通信。

```
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system
```

## 配置IPVS

前面已经介绍过ipvs，大规模的集群系统使用 ipvs 能实现比iptables更高效的转发性能。

```
# 在使用ipvs模式之前确保安装了ipset和ipvsadm
sudo yum install ipset ipvsadm -y

# 手动加载ipvs相关模块
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack

# 配置开机自动加载ipvs相关模块
cat <<EOF | sudo tee /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF
```

## 安装 Docker

k8s 1.24 版 dockershim 代码从 k8s 移除了, 如果要继续在K8S中使用docker容器，要安装cri-docker 进行配置。

为了使 docker使用的 cgroupdriver 与 kubelet 使用的cgroup的一致性，我们统一改为 systemd

```
# 安装yum-config-manager配置工具
yum -y install yum-utils

添加Docker安装源
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

安装Docker CE

```
yum install -y docker-ce
```

```
# 设置为开机自启并现在立刻启动服务 --now：立刻启动服务
systemctl enable --now docker

# 查看版本号
docker --version
# 查看版本具体信息
docker version
```

Docker镜像源设置
```
# 修改文件 /etc/docker/daemon.json，没有这个文件就创建
# 配置docker cgroup 驱动程序systemd
# 添加以下内容后，重启docker服务：
cat >/etc/docker/daemon.json<<EOF
{
   "registry-mirrors": ["http://hub-mirror.c.163.com"],
    "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
# 加载
systemctl restart docker

# 查看
systemctl status docker
```

## 安装cri-docker

```
# 下载cri-docker 
wget  https://ghproxy.com/https://github.com/Mirantis/cri-dockerd/releases/download/v0.2.5/cri-dockerd-0.2.5.amd64.tgz

# 解压cri-docker
tar xvf cri-dockerd-0.2.5.amd64.tgz 
cp cri-dockerd/cri-dockerd  /usr/bin/

```
### 写入启动配置文件

```
cat > /usr/lib/systemd/system/cri-docker.service <<EOF
[Unit]
Description=CRI Interface for Docker Application Container Engine
Documentation=https://docs.mirantis.com
After=network-online.target firewalld.service docker.service
Wants=network-online.target
Requires=cri-docker.socket

[Service]
Type=notify
ExecStart=/usr/bin/cri-dockerd --network-plugin=cni --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.7
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always

StartLimitBurst=3

StartLimitInterval=60s

LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity

TasksMax=infinity
Delegate=yes
KillMode=process

[Install]
WantedBy=multi-user.target
EOF
```

### 写入socket配置文件

```
cat > /usr/lib/systemd/system/cri-docker.socket <<EOF
[Unit]
Description=CRI Docker Socket for the API
PartOf=cri-docker.service

[Socket]
ListenStream=%t/cri-dockerd.sock
SocketMode=0660
SocketUser=root
SocketGroup=docker

[Install]
WantedBy=sockets.target
EOF
```

### 进行启动cri-docker

```
systemctl daemon-reload
systemctl enable cri-docker --now
```

