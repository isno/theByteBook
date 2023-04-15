# TCP连接优化

对于一个传输少量数据的TCP短连接，对于整个过程，握手阶段将近占用了50%的资源消耗，另外在一个高并发的服务场景，如负载均衡、数据库等，针对性的去优化较为保守内核参数很有必要。

通过下图TCP的握手过程，可以知晓相关的参数优化策略：减小重试次数、增大TCP连接队列...

<div  align="center">
	<img src="../../assets/tcp-handshake.jpeg" width = "480"  align=center />
</div>

### SYN重试优化

一般情况下ACK 报文会在几毫秒内返回。如果客户端迟迟没有收到 ACK，客户端会尝试重发SYN 报文，默认重试6次，重试的时间会一次次翻倍，经过6次的重试会产生最大127秒的等待时间。

在链路较好或者内网环境下，降低重试次数可尽快将连接失败传递给业务层处理。

```
sysctl net.ipv4.tcp_syn_retries = 2 
```

###  半连接队列大小优化

服务器收到 SYN 报文后会回复 SYN+ACK 报文，此时服务端状态是 SYN_RECV。

这个状态下服务端必须建立一个 SYN 半连接队列来维护未完成的握手信息，当这个队列溢出后，服务器将无法再建立新连接。半连接队列的大小取决于：max(64, /proc/sys/net/ipv4/tcp_max_syn_backlog)，可以通过设置net.ipv4.tcp_max_syn_backlog参数设置半连接队列的上限。

观察半连接队列溢出情况

```
netstat -s | grep "SYNs to LISTEN"
```

增大半连接队列
```
sysctl net.ipv4.tcp_max_syn_backlog = 1024
```

### 启用syncookies

如果 SYN 半连接队列已满，是不是只能丢弃连接？事实上如果开启 syncookies 功能就可以在不使用 SYN 队列的情况下也能建立连接。
SYNCookie将连接信息编码在ISN(Initial Sequence Number)中返回给客户端，这时server不需要将半连接保存在队列中，而是利用客户端随后发来的ACK带回的ISN还原连接信息，以完成连接的建立。

此设置也可在一定程度上阻止SYN泛攻击。

```
sysctl  net.ipv4.tcp_syncookies = 1
```
### SYN ACK 重试优化

客户端接收到服务端发来的 SYN+ACK 报文之后回复 ACK 去通知服务端，同时客户端连接状态从 SYN_SENT 转换为 ESTABLISHED，表示连接建立成功。

服务器端一直等到接收到 ACK 之后，状态才变为 ESTABLISHED。如果服务端迟迟没有收到 ACK，就会一直重发 SYN+ACK 报文，tcp_synack_retries 的默认次数是 5 次。第 1 次重试在 1 秒钟后，接着会以翻倍的方式在第 2、4、8、16 秒共做 5 次重试，若仍然没有收到 ACK，才会关闭连接，最大耗时会达到63s。

```
sysctl net.ipv4.tcp_synack_retries = 2 
```

### 全连接队列大小优化

服务端已经收到客户端三次握手第三步的ACK，然后就会把这个连接放到全连接队列中，在后续被accept()系统调用取走后，服务端应用才进行处理客户端的请求。
也建议适当优化此队列, 观察全连接队列溢出情况:
```
netstat -s | grep "listen queue"
```

全连接队列的大小取决于：min(backlog, somaxconn) , backlog是在socket创建的时候传入(Nginx默认 511)，
可以通过设置somaxconn增加此参数

```
sysctl net.core.somaxconn=1024
```

### 全连接队列溢出后的优化

accept队列溢出后，会导致建立好的TCP连接被丢弃。
但客户端此时会认为连接继续存在，继续发送数据时，就会产生错误，此时可以设置 tcp_abort_on_overflow 参数，在全连接队列溢出后，像客户端发送 REST 错误，
客户端的上层应用可以针对性的处理。

```
sysctl net.ipv4.tcp_abort_on_overflow
```


