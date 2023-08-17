# 2.4.3 使用 ss 监控网络连接状态

ss是socket statistics的缩写，作为iproute2 命令家族的一员，取代了 netstat。

netstat是基于 /proc/net/tcp 获取 TCP socket 的相关统计信息，用 strace 跟踪一下netstat查询tcp的连接，会看到它open的是/proc/net/tcp的信息，而 /proc/net/tcp 文件存放了目前活跃的tcp连接的统计值。
```
$ strace netstat
execve("/usr/bin/netstat", ["netstat"], 0x7ffd3995b130 /* 33 vars */) = 0
...
openat(AT_FDCWD, "/proc/net/tcp", O_RDONLY) = 3
```

ss可以显示跟netstat类似的信息，但是速度却比netstat快很多，因为它利用的是TCP协议的 tcp_diag 模块，直接从内核直接读取信息，当内核不支持 tcp_diag 内核模块时，会退回 /proc/net/tcp 模式。

下面是一些ss命令常用参数的解释

```
-a, --all           display all sockets
-m, --memory        show socket memory usage
-n, --numeric       don't resolve service names
-i, --info          show internal TCP information
-s, --summary       show socket usage summary
-p, --processes     show process using socket
-t, --tcp           display only TCP sockets
-o, --options       show timer information
```

更多详情参考 `man ss`

## ss查看RTT和拥塞窗口CWND

```
$ ss -itn |egrep "cwnd|rtt" |head -n 3 |awk '{print $4,$10}'
rtt:0.257/0.422 cwnd:15
rtt:2.396/4.725 cwnd:18
rtt:2.019/1.454 cwnd:18
```


## ss过滤ip和port
类似tcpdump的用法,以下是ss过滤ip和端口的示例
```
# 过滤55544源端口
$ ss -ant src :55544
State      Recv-Q    Send-Q   Local Address:Port           Peer Address:Port                 Process                
LISTEN     0         128      0.0.0.0:55544                0.0.0.0:*                                             
ESTAB      0         0        10.0.0.4:55544               183.240.139.102:59967                                                                                                                 
LISTEN     0         128      [::]:55544                   [::]:*

# 过滤目的ip 183.240.139.102
$ ss -ant dst 183.240.139.102
State                Recv-Q                Send-Q        Local Address:Port      Peer Address:Port          Process                
ESTAB                0                     0             10.0.0.4:55544          183.240.139.102:60024                                                                             
ESTAB                0                     0             0.0.0.4:22              183.240.139.102:59012   
```
## ss查看连接Buffer
```
$ ss -m |head -n 2
Netid State Recv-Q Send-Q   Local Address:Port     Peer Address:Port    Process                                                
u_str ESTAB 0      0        * 22297                * 22448              skmem:(r0,rb212992,t0,tb16777216,f0,w0,o0,bl0,d0)

# skmem对应参数分别为: SK_MEMINFO_RMEM_ALLOC SK_MEMINFO_RCVBUF SK_MEMINFO_WMEM_ALLOC SK_MEMINFO_SNDBUF SK_MEMINFO_FWD_ALLOC SK_MEMINFO_WMEM_QUEUED SK_MEMINFO_OPTMEM SK_MEMINFO_BACKLOG SK_MEMINFO_DROPS
# rb指可分配的接收buffer大小
# tb指可分配的发送buffer大小
```

## ss按连接状态过滤数据
```
# 展示所有https请求
$ ss -o state established '( dport = :443 or sport = :443 )'
Netid              Recv-Q              Send-Q                           Local Address:Port                             Peer Address:Port              Process                                  
tcp                0                   0                                     10.0.0.4:57548                               23.51.2.3:https              timer:(keepalive,1.595ms,0)             
tcp                0                   0                                     10.0.0.4:60822                           140.82.112.25:https              timer:(keepalive,6.985ms,0) 
```

## ss确认当前和最大全连接队列
```
$ ss -lt |head -n 3
State  Recv-Q Send-Q Local Address:Port       Peer Address:PortProcess
LISTEN 0      128          0.0.0.0:submission      0.0.0.0:*          
LISTEN 0      128          0.0.0.0:hostmon         0.0.0.0:*  
```

## ss 查看timer状态
```
$ ss -atonp | head -n 5
State     Recv-Q Send-Q      Local Address:Port            Peer Address:Port Process                                                                        
LISTEN    0      128               0.0.0.0:587                  0.0.0.0:*     users:(("docker-proxy",pid=177427,fd=4))                                      
LISTEN    0      128               0.0.0.0:5355                 0.0.0.0:*     users:(("systemd-resolve",pid=890,fd=13))                                     
LISTEN    0      128               0.0.0.0:110                  0.0.0.0:*     users:(("docker-proxy",pid=177475,fd=4))                                      
LISTEN    0      128               0.0.0.0:4910                 0.0.0.0:*     users:(("docker-proxy",pid=177379,fd=4))
```