#TCP ECN应用

Explicit Congestion Notification(ECN)是TCP/IP协议的扩展。

ECN支持端到端的网络拥塞通知，通常情况下，当网络中出现拥塞的时候，TCP/IP会主动丢弃数据包。源端检测到丢包后，就会减小拥塞窗口，降低传输速率，
如果端到端能成功协商ECN的话，支持ECN的路由器就可以发生拥塞时在IP报头中设置一个标记，发出即将发生拥塞的信号，而不是直接丢弃数据包。

ECN减少了TCP的丢包数量，通过避免重传，减少了延迟(尤其是抖动)

开启ECN

```
sysctl -w net.ipv4.tcp_ecn=1   
```