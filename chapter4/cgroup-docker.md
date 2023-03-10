# cgroup在docker中的使用

docker 是目前常用容器，它就依赖cgroup 对资源进行限制

创建一个centos7 分配0.25 个cpu 与1g 内存

```

docker run  -itd  --name test -m 1g  --cpus 0.25  centos:7 bash
```

```
docker inspect test|more
[
    {
        "Id": "7d1d6b1865094f5e357f89f615dcdf57ce50954f6299d8a7aea41b4ca0cc73c8",
        "Created": "2022-12-6T09:29:30.247354976Z",

```

```
[root@VM-12-14-centos ~]# /sys/fs/cgroup/cpu/docker/7d1d6b1865094f5e357f89f615dcdf57ce50954f6299d8a7aea41b4ca0cc73c8$ ls
cgroup.clone_children  cpuacct.usage         cpuacct.usage_percpu_sys   cpuacct.usage_user  cpu.shares      cpu.uclamp.min
cgroup.procs           cpuacct.usage_all     cpuacct.usage_percpu_user  cpu.cfs_period_us   cpu.stat        notify_on_release
cpuacct.stat           cpuacct.usage_percpu  cpuacct.usage_sys          cpu.cfs_quota_us    cpu.uclamp.max  tasks

[root@VM-12-14-centos ~]# /sys/fs/cgroup/cpu/docker/7d1d6b1865094f5e357f89f615dcdf57ce50954f6299d8a7aea41b4ca0cc73c8$ cat cpu.cfs_quota_us 
25000
```

```
docker exec -it test bash

// 上面的目录已经被 mount 到 /sys/fs/cgroup/cpu下了
[root@VM-12-14-centos ~]# cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us 

```
这时候类似 top, free 等命令查看 /proc/ 目录都是宿主机的信息, 就会导致 free 的实际值并不准确