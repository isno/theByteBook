# 网络吞吐和PPS

sar是系统活动报告(System Activity Report)英文单词的首字母缩写。正如它的名字所表示的那样，sar是一个在Unix和Linux操作系统中用来收集、报告和保存文件的读写情况、系统调用的使用情况、磁盘I/O、CPU效率、内存使用状况、进程活动、IPC有关的活动、网卡相关信息的命令。

**安装**

```
yum install sysstat
```

**工作原理**

安装sar后，将自动启动sadc(system activity data collector)服务sysstat，这样报告就会被写入到日志文件“/var/log/sa/saDD”中并且已经存在的文档将会被归档。DD表示当前日期。每隔10分钟收集一次数据并且每天形成一份报告。查看该服务会否正常启动的命令：

**查看服务会否正常启动**

```
[root@VM-12-12-centos ~]# systemctl status sysstat
● sysstat.service - Resets System Activity Logs
   Loaded: loaded (/usr/lib/systemd/system/sysstat.service; enabled; vendor preset: enabled)
   Active: active (exited) since 五 2022-11-25 11:15:00 CST; 35s ago
  Process: 8589 ExecStart=/usr/lib64/sa/sa1 --boot (code=exited, status=0/SUCCESS)
 Main PID: 8589 (code=exited, status=0/SUCCESS)

```

**sar命令格式**

sar 命令的基本格式：  sar [options] [-o filename] interval [count]

此命令格式中，各个参数的含义如下：

- options：为命令行选项
- filename 为文件名，此选项表示将命令结果以二进制格式存放在文件中
- interval：表示采样间隔时间，该参数必须手动设置
- count：表示采样次数，是可选参数，其默认值为 1

|sar命令选项|备注|
|:---|:---|
|-A	|显示系统所有资源设备（CPU、内存、磁盘）的运行状况 |
|-u	|显示系统所有 CPU 在采样时间内的负载状态 |
|-P	|显示当前系统中指定 CPU 的使用情况|
|-d	|显示系统所有硬盘设备在采样时间内的使用状态|
|-r	|显示系统内存在采样时间内的使用情况|
|-b	|显示缓冲区在采样时间内的使用情况|
|-v	|显示 inode 节点、文件和其他内核表的统计信息|
|-n	|显示网络运行状态，此选项后可跟 DEV（显示网络接口信息）、EDEV（显示网络错误的统计数据）、SOCK（显示套接字信息）和 FULL（等同于使用 DEV、EDEV和SOCK）等，有关更多的选项，可通过执行 man sar 命令查看|
|-q	|显示运行列表中的进程数、进程大小、系统平均负载等|
|-R	|显示进程在采样时的活动情况|
|-y	|显示终端设备在采样时间的活动情况|
|-w	|显示系统交换活动在采样时间内的状态|

**网络性能观察**

```
[root@VM-12-12-centos ~]# sar -n DEV 1
Linux 3.10.0-1160.45.1.el7.x86_64 (VM-12-12-centos) 	2022年11月25日 	_x86_64_	(2 CPU)

11时21分35秒     IFACE   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s
11时21分36秒      eth0      3.00      4.00      0.73      1.37      0.00      0.00      0.00
11时21分36秒        lo      0.00      0.00      0.00      0.00      0.00      0.00      0.00
```

输出的指标含义如下:

- rxpck/s 和 txpck/s 分别是接收和发送的 PPS，单位为包 / 秒
- rxkB/s 和 txkB/s 分别是接收和发送的吞吐量，单位是 KB/ 秒
- rxcmp/s 和 txcmp/s 分别是接收和发送的压缩数据包数，单位是包 / 秒

**CPU性能**
```
[root@VM-12-12-centos ~]# sar -u 3 5
Linux 3.10.0-1160.45.1.el7.x86_64 (VM-12-12-centos) 	2022年11月25日 	_x86_64_	(2 CPU)

11时25分04秒     CPU     %user     %nice   %system   %iowait    %steal     %idle
11时25分07秒     all     95.02      0.00      4.98      0.00      0.00      0.00
11时25分10秒     all     96.00      0.00      4.00      0.00      0.00      0.00
11时25分13秒     all     96.17      0.00      3.83      0.00      0.00      0.00
```

此输出结果中，各个列表项的含义分别如下：

- %user 用于表示用户模式下消耗的 CPU 时间的比例
- %nice 通过 nice 改变了进程调度优先级的进程，在用户模式下消耗的 CPU 时间的比例
- %system 系统模式下消耗的 CPU 时间的比例
- %iowait CPU 等待磁盘 I/O 导致空闲状态消耗的时间比例
- %steal 利用 Xen 等操作系统虚拟化技术，等待其它虚拟 CPU 计算占用的时间比例
- %idle CPU 空闲时间比例


**磁盘io**

```
[root@VM-12-12-centos ~]# sar -d 3 5
Linux 3.10.0-1160.45.1.el7.x86_64 (VM-12-12-centos) 	2022年11月25日 	_x86_64_	(2 CPU)

11时29分20秒       DEV       tps  rd_sec/s  wr_sec/s  avgrq-sz  avgqu-sz     await     svctm     %util
11时29分23秒  dev253-0      0.66      2.66      2.66      8.00      0.00      1.00      2.00      0.13
11时29分23秒   dev11-0      0.00      0.00      0.00      0.00      0.00      0.00      0.00      0.00
```

此输出结果中，各个列表头的含义如下：

- tps：每秒从物理磁盘 I/O 的次数。注意，多个逻辑请求会被合并为一个 I/O 磁盘请求，一次传输的大小是不确定的
- rd_sec/s：每秒读扇区的次数
- wr_sec/s：每秒写扇区的次数
- avgrq-sz：平均每次设备 I/O 操作的数据大小（扇区）
- avgqu-sz：磁盘请求队列的平均长度
- await：从请求磁盘操作到系统完成处理，每次请求的平均消耗时间，包括请求队列等待时间，单位是毫秒（1 秒=1000 毫秒）
- svctm：系统处理每次请求的平均时间，不包括在请求队列中消耗的时间
- %util：I/O 请求占 CPU 的百分比，比率越大，说明越饱和