# cgroups的理解与应用
cgroups 的全称是control groups，是Linux内核提供的一种可以限制单个或者多个进程多所使用物理资源的机制，可以对CPU、内存、I/O、网络等资源实现精准的控制，现在流行的Docker、LXC等一系列化虚拟管理工具都是基于cgroups，在Kubernetes中，pod级别上部署资源请求和限制也是基于cgroups, 可以说cgroups为容器实现虚拟化以及资源弹性计算提供了基本保证。

### cgroups的组成

cgroups 功能的实现依赖于四个核心概念：子系统、控制组、层级树、任务。

**控制组（cgroup）**

表示一组进程和一组带有参数的子系统的关联关系。例如，一个进程使用了 CPU 子系统来限制 CPU 的使用时间，则这个进程和 CPU 子系统的关联关系称为控制组

**层级树（hierarchy）**

由一系列的控制组按照树状结构排列组成的。这种排列方式可以使得控制组拥有父子关系，子控制组默认拥有父控制组的属性，也就是子控制组会继承于父控制组。
比如，系统中定义了一个控制组 c1，限制了 CPU 可以使用 1 核，然后另外一个控制组 c2 想实现既限制 CPU 使用 1 核，同时限制内存使用 2G，那么 c2 就可以直接继承 c1，无须重复定义 CPU 限制

**子系统（subsystem）**

一个内核的组件，一个子系统代表一类资源调度控制器。

例如内存子系统可以限制内存的使用量，CPU 子系统可以限制 CPU 的使用时间。子系统是真正实现某类资源的限制的基础Subsystem(子系统) cgroups 中的子系统就是一个资源调度控制器(又叫 controllers)

在/sys/fs/cgroup/这个目录下可以看到cgroup子系统

|子系统|备注|
|:--|:--|
|cpu|使用调度程序控制任务对cpu的使用|
|cpuacct|自动生成cgroup中任务对cpu资源使用情况的报告|
|cpuset|可以为cgroup中的任务分配独立的cpu和内存|
|blkio|可以为块设备设定输入 输出限制，比如物理驱动设备|
|devices|可以开启或关闭cgroup中任务对设备的访问|
|freezer|可以挂起或恢复cgroup中的任务|
|pids|限制任务数量|
|memory|可以设定cgroup中任务对内存使用量的限定，并且自动生成这些任务对内存资源使用情况的报告|
|perf_event|使用后使cgroup中的任务可以进行统一的性能测试|
|net_cls|它通过使用等级识别符标记网络数据包，从而允许linux流量控制程序识别从具体cgroup中生成的数据包|


**任务（task）**

在cgroup中，任务就是一个进程，一个任务可以是多个cgroup的成员，但这些cgroup必须位于不同的层级，子进程自动成为父进程cgroup的成员，可按需求将子进程移到不同的cgroup中

<div  align="center">
	<img src="/assets/chapter4/cgroup-task.png" width = "520"  align=center />
</div>


### cgroups子系统及参数说明

到目前为止，Linux 支持 12 种 subsystem，下面给出部分子系统接口以及参数说明，在下一部分，将基于此参数给出cgroups应用示例

**cpu子系统：于限制进程的 CPU 利用率**

|参数|说明|
|:--|:--|
|cpu.shares| cpu比重分配，通过一个整数的数值来调节cgroup所占用的cpu时间|
|cpu.cfs_period_us| 规定CPU的时间周期(单位是微秒)。最大值是1秒，最小值是1000微秒|
|cpu.cfs_quota_us| 在单位时间内（即cpu.cfs_period_us设定值）可用的CPU最大时间（单位是微秒）。cpu.cfs_quota_us值可以大于cpu.cfs_period_us值，例如在一个双CPU的系统内，想要一个cgroup内的进程充分的利用2个CPU，可以设定cpu.cfs_quota_us为 200000 及cpu.cfs_period_us为 100000 |


当设定cpu.cfs_quota_us为-1时，表明不受限制，同时这也是默认值

**cpuacct子系统：统计各个 Cgroup 的 CPU 使用情况**

|参数|说明|
|:--|:--|
|cpuacct.stat|cgroup中所有任务的用户和内核分别使用CPU的时长|
|cpuacct.usage|group中所有任务的CPU使用时长（纳秒）|
|cpuacct.usage_percpu|cgroup中所有任务使用的每个cpu的时间（纳秒）|

**cpuset子系统：为一组进程分配指定的CPU和内存节点**

|参数|说明|
|:--|:--|
|cpuset.cpus|允许cgroup中的进程使用的CPU列表。如0-2,16代表 0,1,2,16这4个CPU|
|cpuset.mems|允许cgroup中的进程使用的内存节点列表。如0-2,16代表 0,1,2,16这4个可用节点|
|cpuset.memory_migrate|当cpuset.mems变化时内存页上的数据是否迁移（默认值0，不迁移；1，迁移）|
|cpuset.cpu_exclusive|cgroup是否独占cpuset.cpus 中分配的cpu 。（默认值0，共享；1，独占），如果设置为1，其他cgroup内的cpuset.cpus值不能包含有该cpuset.cpus内的值|
|cpuset.mem_exclusive| 是否独占memory，（默认值0，共享；1，独占）|
|cpuset.mem_hardwall|cgroup中任务的内存是否隔离，（默认值0，不隔离；1，隔离，每个用户的任务将拥有独立的空间）|
|cpuset.sched_load_balance|cgroup的cpu压力是否会被平均到cpuset中的多个cpu上。（默认值1，启用负载均衡；0，禁用。）|

**memory子系统：限制cgroup所能使用的内存上限**

|参数|说明|
|:--|:--|
|memory.limit_in_bytes|设定最大的内存使用量，可以加单位（k/K,m/M,g/G）不加单位默认为bytes|
|memory.soft_limit_in_bytes|和 memory.limit_in_bytes 的差异是，这个限制并不会阻止进程使用超过限额的内存，只是在系统内存不足时，会优先回收超过限额的进程占用的内存，使之向限定值靠拢。该值应小于memory.limit_in_bytes设定值|
|memory.stat|统计内存使用情况。各项单位为字节|
|memory.memsw.limit_in_bytes|设定最大的内存+swap的使用量|
|memory.oom_control|当进程出现Out of Memory时，是否进行kill操作。默认值0，kill；设置为1时，进程将进入睡眠状态，等待内存充足时被唤醒|
|memory.force_empty|当设置为0时，清空该group的所有内存页；该选项只有在当前group没有tasks才可以使用|

**blkio子系统：限制cgroup对IO的使用**

|参数|说明|
|:--|:--|
|blkio.weight|设置权值，范围在[100, 1000]，属于比重分配，不是绝对带宽。因此只有当不同 Cgroup 争用同一个 阻塞设备时才起作用|
|blkio.weight_device|对具体设备设置权值。它会覆盖上面的选项值|
|blkio.throttle.read_bps_device|对具体的设备，设置每秒读磁盘的带宽上限|
|blkio.throttle.write_bps_device|对具体的设备，设置每秒写磁盘的带宽上限|
|blkio.throttle.read_iops_device|对具体的设备，设置每秒读磁盘的IOPS带宽上限|
|blkio.throttle.write_iops_device|对具体的设备，设置每秒写磁盘的IOPS带宽上限|

**devices子系统：限定cgroup内的进程可以访问的设备**

|参数|说明|
|:--|:--|
|devices.allow| 允许访问的设备。文件包括4个字段：type（设备类型）, major（主设备号）, minor（次设备号）, and access（访问方式）|
|devices.deny|禁止访问的设备，格式同devices.allow|
|devices.list|显示目前允许被访问的设备列表|

**freezer子系统：暂停或恢复任务**
|参数|说明|
|:--|:--|
|freezer.state|当前cgroup中进程的状态 FROZEN：挂起进程 FREEZING：进程正在挂起中 THAWED：激活进程|

### cgroups的使用

**CPU控制**

创建test.sh脚本
```
#!/bin/bash
while true;do
    echo "1"
done
```
创建cgroup子系统的子目录

```
mkdir -p /sys/fs/cgroup/cpu/test/
```

设置资源配额 （以cpu限额为例，限制test.sh最多使用0.5c）
```
echo 50000 > /sys/fs/cgroup/cpu/test/cpu.cfs_quota_us
```

将需要限制的进程号写入子目录
```
echo PID > /sys/fs/cgroup/cpu/test/cgroup.procs
```

运行test.sh脚本验证

```
bash test.sh
```
CPU被限制在50%以内

<div  align="center">
	<img src="/assets/chapter5/cgroup-cpu-limit.png" width = "520"  align=center />
</div>
