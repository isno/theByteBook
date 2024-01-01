# 高可用 etcd 集群

:::tip etcd

etcd 是基于 Raft 的分布式 key-value 存储系统，由 CoreOS 开发，常用于服务发现、共享配置以及并发控制（如 leader 选举、分布式锁等）。kubernetes 使用 etcd 存储所有运行数据。


:::
笔者在分布式的章节用大量篇幅介绍共识算法和 raft，这一节那些知识终于到了用武之地。

笔者根据 raft 协议以及 etcd 本身实现的特性，解读部署中的部分策略，首先因 raft 选举或者可用性要求，一般部署节点的个数奇数且数量大于 3 个，注意，笔者用的是“一般”，实际上**raft 并不严格限定到底是奇数还是偶数，只要 (n-1)/2 以上的节点正常，集群就能正常工作**。譬如配置 4 个节点，其中 1 个节点宕机了，但还有  (n-1)/2 个节点正常，对 etcd 集群而言不论是选举还是可用性，都不会产生影响。

etcd 集群的性能极限受两部分影响：单机性能的影响（有条件使用 SSD 存储）以及网络的开销。etcd 默认是线性一致性（最强一致性），每次操作所有的节点都要参与，节点越多性能越低，所以增加再多的节点意义不是很大。官方推荐 etcd 节点个数 3、5、7。

笔者使用多个可用区的方式部署 etcd，注意这个并不是防止脑裂，官方给到的解释也是 **etcd 没有脑裂**。可用区部署假设的是云商某个可用区产生重大故障，短时间内无法恢复。

:::tip etcd 没有脑裂
The majority side becomes the available cluster and the minority side is unavailable; there is no “split-brain” in etcd.
:::

但有一种特殊情况，假如旧的 Leader 和集群其他节点出现了网络分区，其他节点选出了新的 Leader，但是旧 Leader 并没有感知到新的 Leader，那么此时集群可能会出现一个短暂的“双 Leader”状态，但这个并不是脑裂，原因是 raft 有恢复机制，这个状态并不会持续很长，其次 etcd 也有 ReadIndex、Lease read 机制解决这种状态下的一致性问题。


1. 下载二进制安装包

```
wget https://github.com/etcd-io/etcd/releases/download/v3.5.11/etcd-v3.5.11-linux-amd64.tar.gz
tar -xvf etcd-v3.5.11-linux-amd64.tar.gz
mv etcd-v3.5.11-linux-amd64/etcd* /usr/local/bin
```

2. 创建etcd集群配置文件，标注部分按实际情况进行修改

```
cat > /opt/etcd/cfg/etcd.conf << EOF
#[Member]
# 自定义此etcd节点的名称，集群内唯一
ETCD_NAME="etcd-1"
# 定义etcd数据存放目录
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
# 定义本机和成员之间通信的地址
ETCD_LISTEN_PEER_URLS="https://10.211.55.7:2380" 
# 定义etcd对外提供服务的地址
ETCD_LISTEN_CLIENT_URLS="https://10.211.55.7:2379,http://127.0.0.1:2379"

#[Clustering]
# 定义该节点成员对等URL地址，且会通告集群的其余成员节点
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://10.211.55.7:2380"
# 此成员的客户端URL列表，用于通告群集的其余部分
ETCD_ADVERTISE_CLIENT_URLS="https://10.211.55.7:2379"
# 集群中所有节点的信息
ETCD_INITIAL_CLUSTER="etcd-1=https://10.211.55.7:2380,etcd-2=https://10.211.55.8:2380,etcd-3=https://10.211.55.9:2380"
# 创建集群的token，这个值每个集群保持唯一
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
# 设置new为初始静态或DNS引导期间出现的所有成员。如果将此选项设置为existing，则etcd将尝试加入现有群集
ETCD_INITIAL_CLUSTER_STATE="new"
# flannel操作etcd使用的是v2的API，而kubernetes操作etcd使用的v3的API，在ETCD3.5版本中默认关闭v2版本，所以为了兼容flannel，要设置开启v2的API
ETCD_ENABLE_V2="true"
EOF
```

2. 创建 etcd 的 systemd unit 文件

```
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/opt/etcd/cfg/etcd.conf
ExecStart=/opt/etcd/bin/etcd \
        --cert-file=/opt/etcd/ssl/etcd.pem \ 
        --key-file=/opt/etcd/ssl/etcd-key.pem \
        --peer-cert-file=/opt/etcd/ssl/etcd.pem \
        --peer-key-file=/opt/etcd/ssl/etcd-key.pem \
        --trusted-ca-file=/opt/etcd/ssl/ca.pem \
        --peer-trusted-ca-file=/opt/etcd/ssl/ca.pem
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

3. 在所有 etcd 集群节点上设置 etcd 开机自启并启动 etcd

```
systemctl daemon-reload
systemctl enable etcd
systemctl start etcd # 在第一台节点上执行start后会一直卡着无法返回命令提示符，这是因为在等待其他节点准备就绪，继续启动其余节点即可
```

4. 在任意 etcd 节点上执行如下命令查看集群状态，若所有节点均处于 healthy 状态则表示 etcd 集群部署成功

```
/opt/etcd/bin/etcdctl --cacert=/opt/etcd/ssl/ca.pem --cert=/opt/etcd/ssl/etcd.pem --key=/opt/etcd/ssl/etcd-key.pem --endpoints="https://10.211.55.7:2379,https://10.211.55.8:2379,https://10.211.55.9:2379" endpoint health
```

[^1]: 参见 https://etcd.io/docs/v3.5/op-guide/failures/