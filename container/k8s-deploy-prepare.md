# 初始化准备


1. **流量转发和桥接**

Kubernetes 的核心是依靠Netfilter内核模块来设置低级别的集群 IP 负载均衡，这需要用到两个关键的模块：IP 转发和桥接（IP forward 和 bridge）

IP forward 是一种内核态设置，允许将一个接口的流量转发到另外一个接口，该配置是 Linux 内核将流量从容器路由到外部所必须的。bridge-netfilter 设置可以使 iptables 规则可以在 Linux Bridges 上面工作

```
cat <<EOF | sudo tee /etc/modules-load.d/containerd.conf
overlay
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sudo sysctl --system
```
2. **关闭 swap 内存**

在 Linux 系统，swap 类似于虚拟内存，初衷是为了缓解物理内存用尽而选择直接粗暴 OOM 进程的尴尬。但实际的运维观察情况是内存不足，swap 场景下进程就是僵而不死，资源被占用不放，与其服务一直不可用，不如关闭 swap 直接 OOM。此外，对于一个分布式系统来说，并不担心节点宕机，而恰恰最担心某个节点夯住，宕机自有副本机制保障可用性，但节点夯住会将所有分布式请求都夯住，导致整个集群请求阻塞。从这两个角度考虑，都应该关掉 swap。

```
# 使用命令直接关闭swap内存
swapoff -a
# 修改fstab文件禁止开机自动挂载swap分区
sed -i '/swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

3. **关闭selinux**

SELinux是Linux内核的安全子系统，会通过访问策略控制机制对应用、进程和文件访问进行安全控制，然而，在Kubernetes环境中，容器需要访问宿主机的文件系统，开启 SELinux 可能会出现意外的权限问题，Kubernetes 官方建议关闭SELinux[^1]。此外，Kubernetes 本身也提供了一系列的安全机制，譬如RBAC、网络策略和 PodSecurityPolicy 等等。

```
# 使用命令直接关闭
setenforce 0

# 也可以直接修改/etc/selinux/config文件
sed -i 's/^SELINUX=enforcing$/SELINUX=disabled/' /etc/selinux/config
```
4. **配置防火墙**

Kubernetes集群之间通信和服务暴露需要使用较多端口，为了方便，禁用默认的firewalld服务

```
systemctl disable firewalld.service
```

[^1]: 参见 https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/install-kubeadm/