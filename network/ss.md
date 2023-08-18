# 2.4.3 使用 ss 监控网络连接状态

ss是socket statistics的缩写，作为iproute2 命令家族的一员，用来取代 netstat。

netstat是基于 /proc/net/tcp 获取 TCP socket 的相关统计信息，用 strace 跟踪一下netstat，会看到它open的是/proc/net/tcp的信息，而 /proc/net/tcp 文件里存放了目前活跃的tcp连接的统计值。
```
$ strace netstat
execve("/usr/bin/netstat", ["netstat"], 0x7ffd3995b130 /* 33 vars */) = 0
...
openat(AT_FDCWD, "/proc/net/tcp", O_RDONLY) = 3
```

ss可以显示跟netstat类似的信息，但是速度却比netstat快很多，因为它利用的是TCP协议的 tcp_diag 模块，直接从内核直接读取第一手信息，当内核不支持 tcp_diag 内核模块时，会退回 /proc/net/tcp 模式。

下面是一些ss命令常用参数的解释

```
-a, --all           display all sockets
-m, --memory        show socket memory usage
-n, --numeric       don't resolve service names
-i, --info          show internal TCP information
-l, --listening     display listening sockets
-s, --summary       show socket usage summary
-p, --processes     show process using socket
-t, --tcp           display only TCP sockets
-o, --options       show timer information
```

更多详情参考 `man ss`

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

## ss查看RTT和CWND

```
$ ss -itO |head -n 1 &&  ss -tiO 'src 10.0.0.4:55544' | grep ESTAB | head -n 100 | awk '{print $1,$2,$3,$4,$5,$9,$15}' 
State Recv-Q Send-Q      Local Address:Port    Peer Address:Port     Process                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
ESTAB 0      3314        10.0.0.4:55544        113.90.165.102:29900  rtt:99.854/49.927  cwnd:10
ESTAB 0      0           10.0.0.4:55544        113.90.165.102:32737  rtt:102.281/20.046 cwnd:17
ESTAB 0      0           10.0.0.4:55544        113.90.165.102:32757  rtt:94.54/20.271   cwnd:17
ESTAB 0      0           10.0.0.4:55544        113.90.165.102:32761  rtt:107.654/19.356 cwnd:18
```

## ss查看连接Buffer
```
$ ss -mtO | grep 55544 | head -n 2                                           
tcp   ESTAB 0      0    10.0.0.4:55544    113.90.165.102:29002    skmem:(r0,rb369280,t0,tb69120,f0,w0,o0,bl0,d0)     
tcp   ESTAB 0      0    10.0.0.4:55544    113.90.165.102:29301    skmem:(r0,rb369280,t0,tb69120,f0,w0,o0,bl0,d3)

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
$ ss -lt
State  Recv-Q Send-Q Local Address:Port       Peer Address:PortProcess
LISTEN 0      128          0.0.0.0:submission      0.0.0.0:*          
LISTEN 0      128          0.0.0.0:hostmon         0.0.0.0:*  
```

## ss 查看timer状态
```
$ ss -t | head -n 1 && ss -atonp | grep ESTAB | grep timer | head -n 2
State     Recv-Q Send-Q      Local Address:Port     Peer Address:Port     Process                                                                        
ESTAB     0      0           10.0.0.4:22            113.90.165.102:30340  users:(("sshd",pid=2045801,fd=4),("sshd",pid=2045798,fd=4)) timer:(keepalive,90min,0)
ESTAB     0      0           10.0.0.4:22            113.90.165.102:32037  users:(("sshd",pid=2045717,fd=4),("sshd",pid=2045714,fd=4)) timer:(keepalive,89min,0)
```

## 统计所有连接的状态
```
$ ss -s
Total: 257
TCP:   114 (estab 47, closed 42, orphaned 0, timewait 1)

Transport Total     IP        IPv6
RAW	      0         0         0        
UDP	      11        4         7        
TCP	      72        46        26       
INET	  83        50        33       
FRAG	  0         0         0 
```