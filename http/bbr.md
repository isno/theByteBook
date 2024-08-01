# 2.6.2 BBR 的应用实践

Linux 内核从 4.9 开始集成了 BBR 拥塞控制算法，此后，只要几个命令就能使用 BBR 提升网络吞吐。

1. 首先，查询系统所支持的拥塞控制算法。
```bash
$ sysctl net.ipv4.tcp_available_congestion_control
net.ipv4.tcp_congestion_control = bbr cubic reno
```
上面返回的结果中，显示当前系统支持 bbr cubic reno 三种拥塞控制算法。

2. 查询当前使用的拥塞控制算法。

```bash
$ sysctl net.ipv4.tcp_congestion_control
net.ipv4.tcp_congestion_control = cubic
```
绝大部分 Linux 系统默认的拥塞控制算法为 Cubic 算法。

3. 指定拥塞控制算法为 bbr。
```bash
$ echo net.ipv4.tcp_congestion_control=bbr >> /etc/sysctl.conf && sysctl -p
```

**网络拥塞控制是单向生效，也就是说作为下行方的服务端调整了，客户端与服务端之间的网络吞吐即可提升。**

拥塞控制算法设置为 BBR 之后，我们可以使用 tc 工具模拟真实的网络环境，测试 BBR 的效果。

下面，使用 tc 工具设置两台服务器的收/发增加 25ms 的延迟以及 1% 的丢包率。

```bash
$ tc qdisc add dev eth0 root netem loss 1% latency 25ms
```

设置完测试环境后，在客户端节点中，使用 iperf3 命令测试两个主机之间的网络传输性能。iperf3 参数 -c 的意思是，以客户端模式运行，请求 10.0.1.188 服务端的 8080 端口。

```bash
$ iperf3 -c 10.0.1.188 -p 8080
```



