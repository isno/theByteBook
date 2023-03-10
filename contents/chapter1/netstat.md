# 使用netstat观察连接信息

netstat 命令用于显示各种网络相关信息，如网络连接，路由表，接口状态、masquerade连接等等信息

netstat的常见参数

- -a (all)显示所有选项，默认不显示LISTEN相关
- -t (tcp)仅显示tcp相关选项
- -u (udp)仅显示udp相关选项
- -n 拒绝显示别名，显示数字地址和端口(而不是名字)
- -l 仅列出有在 Listen (监听) 的服務状态
- -p 表示显示进程信息（进程pid和名称）
- -r 显示路由信息，路由表
- -e 显示扩展信息，例如uid等
- -s 按各个协议进行统计
- -c 每隔一个固定时间，执行该netstat命令。

下面给到常用方法示例，以供参考

**显示监听套接字信息**

```
# -l 表示只显示监听套接字
# -n 表示显示数字地址和端口(而不是名字)
# -p 表示显示进程信息

[root@VM-12-12-centos ~]# netstat -nlp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      13224/nginx: master 
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1200/sshd           
tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      1208/master         
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      13224/nginx: master 
tcp        0      0 0.0.0.0:7070            0.0.0.0:*               LISTEN      10829/python        
tcp6       0      0 :::8080                 :::*                    LISTEN      28678/java          
tcp6       0      0 :::8081                 :::*                    LISTEN      19820/java          
tcp6       0      0 :::8082                 :::*                    LISTEN      20724/java  

```

**显示所有状态的tcp和udp连接**

```
# -a 表示显示所有状态连接
# -t 表示显示tcp协议连接
# -u 表示显示udp协议连接

[root@VM-12-12-centos ~]# netstat -autpn
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      13224/nginx: master 
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1200/sshd           
tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      1208/master         
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      13224/nginx: master 
tcp        0      0 0.0.0.0:7070            0.0.0.0:*               LISTEN      10829/python        
tcp        0      0 10.0.12.12:34726        10.0.12.14:3306         ESTABLISHED 6722/node           
tcp        0      0 10.0.12.12:45384        10.0.12.14:3306         ESTABLISHED 810/node            
tcp        0      0 10.0.12.12:40208        110.40.230.179:80       ESTABLISHED 28325/gitlab-runner 
tcp        0      0 10.0.12.12:41934        10.0.12.14:3306         ESTABLISHED 785/node            
tcp        0      0 10.0.12.12:22           101.227.12.253:55053    ESTABLISHED 12857/sshd: root@pt 
tcp        0      0 10.0.12.12:33338        10.0.12.15:80           ESTABLISHED 28325/gitlab-runner 
```

其中”Recv-Q”和”Send-Q”指的是接收队列和发送队列。

这些数字一般都应该是0。如果不是则表示软件包正在队列中堆积。这种情况只能在非常少的情况见到。

当套接字处于连接状态（Established）时

- Recv-Q 表示套接字缓冲还没有被应用程序取走的字节数（即接收队列长度）。
- Send-Q 表示还没有被远端主机确认的字节数（即发送队列长度）。

当套接字处于监听状态（Listening）时

- Recv-Q 表示全连接队列的长度。
- Send-Q 表示全连接队列的最大长度


**查看协议栈的信息**

```
[root@VM-12-12-centos ~]# netstat -s
...
Tcp:
    18529648 active connections openings
    810787 passive connection openings
    8959630 failed connection attempts
    272802 connection resets received
    39 connections established
    185427381 segments received
    214395960 segments send out
    4179205 segments retransmited
    4502 bad segments received.
    5804433 resets sent
    InCsumErrors: 4491

```
netstat -s命令显示了 TCP 协议的主动连接、被动连接、失败重试、发送和接收的分段数量等各种信息。

**查看连接状态**

```
[root@VM-12-12-centos ~]# netstat -nat |awk '{print $6}'|sort|uniq -c|sort -rn
     38 ESTABLISHED
     12 LISTEN
     10 TIME_WAIT
      1 Foreign
      1 established)
```


同样以上的信息，使用 ss 也可以达到效果，而且它比 netstat 提供了更好的性能，netstat是遍历/proc下面每个PID目录，ss直接读/proc/net下面的统计信息。所以ss执行的时候消耗资源以及消耗的时间都比netstat少很多。关于ss的使用就不再赘述，有兴趣的读者可以自行查看