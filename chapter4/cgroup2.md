# cgroups的理解与应用

Systemd是很多linux发行版本的init系统。在这些发行版本中，systemd是第一个启动的进程，pid为1。它负责管理linux系统上运行的服务。Systemd实际上是Cgroup接口的一个封装，在目录/sys/fs/cgroup/systemd 中可以看到systemd维护的cgroups层级结构（非subsystem）。

在本文，将通过实例讲解systemd如何通过UNIT文件的配置来使用cgroup的功能。

### 创建slice，service

yum install libcgroup-tools

使用systemd创建启动一个test.service

```
[root@VM-12-14-centos ~]# cat /usr/libexec/test.sh 
#!/bin/bash
while true;do
    echo "1"
done

[root@VM-12-14-centos ~]# chmod +x /usr/libexec/test.sh
```
创建test.service的unit文件

```
[root@VM-12-14-centos ~]# vim /etc/systemd/system/test.service
[Unit]
Description=test
ConditionFileIsExecutable=/usr/libexec/test.sh
[Service]
Type=simple
ExecStart=/usr/libexec/test.sh
[Install]
WantedBy=multi-user.target
```

启动test服务
```
[root@VM-12-14-centos ~]# systemctl start test
[root@VM-12-14-centos ~]# systemctl status test
● test.service - test
   Loaded: loaded (/etc/systemd/system/test.service; disabled; vendor preset: disabled)
   Active: active (running) since 二 2022-12-06 13:54:46 CST; 6s ago
 Main PID: 9738 (test.sh)
    Tasks: 1
   Memory: 208.0K
   CGroup: /system.slice/test.service
           └─9738 /bin/bash /usr/libexec/test.sh

12月 06 13:54:46 VM-12-14-centos test.sh[9738]: 1
...
```

此时，test服务跑已经满了cpu。

因为test.service是通过systemd启动的，执行systemd-cgls查看，将会在system.slice下面test.service, 如何非systemd执行，进程将属于cgroup树的user.slice下

```
[root@VM-12-14-centos ~]# systemd-cgls
└─system.slice
  ├─test.service
  │ └─9738 /bin/bash /usr/libexec/test.sh
```

### 使用cgroup 控制进程资源

查看test.service所属的cgroup树的分支，很明显，在上面讲过，test.service通过systemd执行，属于system.slice
```
[root@VM-12-14-centos ~]# systemctl show test
Slice=system.slice
ControlGroup=/system.slice/test.service
...
```

修改服务所属的slice, 以及添加CPUAccounting=yes。这是在宣布，test.slice，和test.slice下的test.service，都将开始使用cgroup的cpu,cpuacct这个资源管理。

```
[root@VM-12-14-centos ~]#  vim /etc/systemd/system/test.service
Slice=test.slice
CPUAccounting=yes
...

[root@VM-12-14-centos ~]# systemctl daemon-reload
[root@VM-12-14-centos ~]# systemctl restart test
[root@VM-12-14-centos ~]# lscgroup |grep test.slice
cpu,cpuacct:/test.slice
cpu,cpuacct:/test.slice/test.service
memory:/test.slice
blkio:/test.slice
pids:/test.slice
devices:/test.slice


```

此时 test.service还在100%占用cpu，这是cpu.cfs_period_us、cpu.cfs_quota_us 还都是默认值。

```
// 执行一下命令, 可以看到cpu降下来了
echo 50000 > /sys/fs/cgroup/cpu/test.slice/test.service/cpu.cfs_quota_us
echo 13221 > /sys/fs/cgroup/cpu/test.slice/test.service/tasks
```
### 应用

在上面的配置中，systemd通过UNIT文件的配置，来使用cgroup的功能，要使得test.srevice利用cgroup的cpu，memory，blockIO的资源管理；需要的参数分别是：CPUAccounting=yes  MemoryAccounting=yes TasksAccounting=yes BlockIOAccounting=yes


#### 限制cpu:CPUQuota=30%

```
CPUQuota=30%
```
#### 限制cpu:cpu.shares
```
MemoryMax=200M
```

### systemd控制cgroup的常用参数

|参数|备注|
|:--|:--|
|Slice=test.slice|以 ".slice" 为后缀的单元文件,用于封装管理一组进程资源占用的控制组的 slice 单元。此类单元是通过在 Linux cgroup(Control Group) 树中创建一个节点实现资源控制|
|CPUAccounting=yes|若设为"yes"则表示 为此单元开启CPU占用统计。 注意,这同时也隐含的开启了该单元 所属的 slice 以及父 slice 内 所有单元的CPU占用统计|
|CPUQuotaPeriodSec=|指定测量CPUQuota=指定的CPU时间配额的持续时间,采用以秒为单位的持续时间值，并带有可选后缀，如毫秒为“ms”|
|CPUQuota=10%|为此单元的进程设置CPU时间限额，必须设为一个以"%"结尾的百分数， 表示该单元最多可使用单颗CPU总时间的百分之多少|
|AllowedCPUs=|限制要在特定CPU上执行的进程。获取由空格或逗号分隔的CPU索引或范围列表|
|MemoryAccounting=yes|若设为"yes"则表示 为此单元开启内存占用统计|
|TasksAccounting=yes|若设为"yes"则表示 为此单元开启 任务数量统计 (内核空间线程数+用户空间进程数)。|
|TasksMax=infinity|为此单元设置总任务数量限制|
|IOAccounting=yes|若设为"yes"则表示 为此单元开启块设备IO统计。|
|IPAccounting=yes|是否为此单元开启网络流量统计。|
|MemorySwapMax=100M|绝对刚性的限制该单元中的进程最多可以使用多少交换空间|
|MemoryMax=1G |绝对刚性的限制该单元中的进程最多可以使用多少内存。|




