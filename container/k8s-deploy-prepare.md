# 初始化准备


1. 关闭 swap 内存

```
# 使用命令直接关闭swap内存
swapoff -a
# 修改fstab文件禁止开机自动挂载swap分区
sed -i '/swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

内存不足时，Linux 会自动使用 swap，将部分内存数据存放到磁盘中，运维实际的观察的情况是当内存不够发生内存转储到 swap 的时候，系统的任务负载数字会飙升，而且会持续很长时间，整个系统出现僵死情况，与其整个节点挂掉，不如 OOM 的时候直接杀掉进程。

2. 关闭selinux

```
# 使用命令直接关闭
setenforce 0

# 也可以直接修改/etc/selinux/config文件
sed -i 's/^SELINUX=enforcing$/SELINUX=disabled/' /etc/selinux/config
```

3. 配置防火墙

```
# 使用systemctl禁用默认的firewalld服务
systemctl disable firewalld.service
```

4. 配置netfilter参数

```

```