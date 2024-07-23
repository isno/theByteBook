# 2.6.2 BBR 的实践及性能报告

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

笔者的测试结果中，网络环境条件好的情况下两者相差无几，但如果是弱网、有一定丢包率的场景下，BBR 的性能较传统的 Cubic 算法提升 50% 以上。

网络工程师 Andree Toonk 在他的博客使用不同拥塞控制算法、延迟和丢包参数所做网络吞吐量的全套测试。测试报告如表 2-3 所示，可以看到，BBR 在大带宽长链路（典型的如跨海、跨国、跨多个运营商的网络），尤其是轻微丢包网络环境下的出色表现。

:::center
表 2-3 各拥塞控制算法在不同丢包率环境下的性能测试 [表数据来源](https://toonk.io/tcp-bbr-exploring-tcp-congestion-control/index.html)
:::
:::center
  ![](../assets/result2.png)<br/>
:::

