# etcd 集群

:::tip etcd
etcd 是基于 Raft 的分布式、高可用的一致性键值对存储系统，kubernetes 使用 etcd 存储集群配置、状态和元数据。
:::

笔者在分布式的章节用大量篇幅介绍共识算法和 raft，这一节我们根据共识算法以及 etcd 本身实现的特性解读 etcd 部署策略。

首先因 raft 选举或者可用性要求，一般部署节点的个数要求奇数且数量大于 3 个，注意笔者用的是“一般”，实际上**raft 并不严格限定到底是奇数还是偶数，只要 (n-1)/2 以上的节点正常，集群就能正常工作**。譬如配置 4 个节点也没问题，其中 1 个节点宕机了，但还有 (n-1)/2 以上的节点个数正常，这对 etcd 集群而言不论是选举还是可用性，都不会产生影响。

etcd 默认是线性一致性（最强一致性模型），每次读取/写入数据需要所有的节点都要参与，集群不是弱一致性的副本容错模型的情况下，增加节点为提升集群性能意义不很大。etcd 集群的性能极限受两个因素影响：单机性能以及网络交互。如此，节点硬盘尽量使用 SSD 存储，节点个数根据 Kubernetes 集群规模从官方推荐个数 3、5、7 选个就行。

不少部署 etcd 的教程中说是“为防止脑裂”使用多个可用区的方式部署，譬如可用区 A 部署两个节点，可用区 B 部署一个节点，可用区 C 部署两个几点。实际上这是一种画蛇添足的做法，raft 算法中并没有脑裂，且 etcd 官方给到的解释也是 **etcd 没有脑裂**[^1]。

:::tip etcd 没有脑裂
The majority side becomes the available cluster and the minority side is unavailable; there is no “split-brain” in etcd.
:::

但还是要解释一种特殊情况，假如旧的 Leader 和集群其他节点出现了网络分区，其他节点选出了新的 Leader，但是旧 Leader 并没有感知到新的 Leader，那么此时集群可能会出现一个短暂的“双 Leader”状态，但这个并不是脑裂，原因是 raft 有恢复机制，这个状态并不会持续很长，其次 etcd 也有 ReadIndex、Lease read 机制解决这种状态下的一致性问题。

使用多个可用区部署唯一能假设的情况是云商某个可用区产生重大故障，短时间内无法恢复。可惜非常遗憾，实现多活不仅仅靠 etcd 部署了几个可用区，真正的多活系统得投入巨大的成本，涉及镜像仓库、网关、数据库、文件存储、各类中间件以及等等有状态的无状态的各类服务。


了解了背景知识，接下来进入实践环节，笔者演示使用二进制包的方式部署一个三个节点的 etcd 集群。etcd 集群服务发现有三种方式：Static（静态部署）; etcd Discovery（借助已有的集群发现新的集群）; DNS Discovery（使用 DNS 的方式）。此次配置只有三个节点，节点信息全部知晓，我们就使用最简单的静态部署方式。

集群三个节点 IP 地址：

| 名称| 节点 IP |
|:--|:--|
|etcd-1|192.168.0.100|
|etcd-2|192.168.0.101|
|etcd-3|192.168.0.102|

在每个节点中执行以下步骤。

1. 下载二进制安装包

```
wget https://github.com/etcd-io/etcd/releases/download/v3.5.11/etcd-v3.5.11-linux-amd64.tar.gz
tar -xvf etcd-v3.5.11-linux-amd64.tar.gz
mv etcd-v3.5.11-linux-amd64/etcd* /usr/local/bin
```

2. 创建 etcd 集群配置文件

整个配置分为节点（Member）和集群（Clustering）两个部分，参数的值按实际情况进行修改。

```
cat > /etc/etcd/etcd.conf << EOF
#[Member]
# 自定义此etcd节点的名称，集群内唯一
ETCD_NAME="etcd-1"
# 定义etcd数据存放目录
ETCD_DATA_DIR="/var/lib/etcd/default.etcd"
# 定义本机和成员之间通信的地址
ETCD_LISTEN_PEER_URLS="https://192.168.31.34:2380" 
# 定义etcd对外提供服务的地址
ETCD_LISTEN_CLIENT_URLS="https://192.168.31.34:2379,http:/192.168.31.34:2379"

#[Clustering]
# 定义该节点成员对等URL地址，且会通告集群的其余成员节点
ETCD_INITIAL_ADVERTISE_PEER_URLS="https://192.168.31.34:2380"
# 此成员的客户端URL列表，用于通告群集的其余部分
ETCD_ADVERTISE_CLIENT_URLS="https://192.168.31.34:2379"
# 集群中所有节点的信息
ETCD_INITIAL_CLUSTER="etcd-1=https://192.168.31.34:2380,etcd-2=https://192.168.31.35:2380,etcd-3=https://192.168.31.36:2380"
# 创建集群的token，这个值每个集群保持唯一
ETCD_INITIAL_CLUSTER_TOKEN="etcd-cluster"
# 设置new为初始静态或DNS引导期间出现的所有成员。如果将此选项设置为existing，则etcd将尝试加入现有群集
ETCD_INITIAL_CLUSTER_STATE="new"
EOF
```

2. 创建 etcd 的 systemd unit 文件

该文件最关键的是证书相关的配置，7.9.2 篇节已经详细解释过 Kubernetes 集群的机制。etcd 的 TLS 有两对，一对是 etcd 和 client 端的 TLS 配置。一对是 etcd 之间的 peer 的 TLS 配置。
```
cat > /usr/lib/systemd/system/etcd.service << EOF

[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
EnvironmentFile=/etc/etcd/etcd.conf
ExecStart=/usr/local/bin/etcd \
		--name ${ETCD_NAME} \
        --cert-file=/etc/kubernetes/ssl/etcd-peer.pem \   # 服务器证书
        --key-file=/etc/kubernetes/ssl/etcd-peer-key.pem \ # 服务器证书密钥
        --trusted-ca-file=/etc/kubernetes/ssl/ca.pem \  # 服务器 CA 证书

        --peer-cert-file=/etc/kubernetes/ssl/etcd-peer.pem \ # 客户端证书
        --peer-key-file=/etc/kubernetes/ssl/etcd-peer-key.pem \ # 客户端证书密钥
        --peer-trusted-ca-file=/etc/kubernetes/ssl/ca.pem # 客户端 CA 证书  
        --data-dir=${ETCD_DATA_DIR}
        --initial-advertise-peer-urls ${ETCD_INITIAL_ADVERTISE_PEER_URLS} 
        --listen-peer-urls ${ETCD_LISTEN_PEER_URLS} \
  		--listen-client-urls https://192.168.31.34,http://127.0.0.1:2379 \
  		--advertise-client-urls ${ETCD_ADVERTISE_CLIENT_URLS} \
  		--initial-cluster-token "etcd-cluster" \
  		--initial-cluster infra1=https://172.20.0.113:2380,infra2=https://172.20.0.114:2380,infra3=https://172.20.0.115:2380 \
  		--initial-cluster-state new \
  		--data-dir=/var/lib/etcd/default.etcd

Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

3. 启动 etcd 服务

在所有 etcd 集群节点上设置 etcd 开机自启并启动 etcd，在第一台节点上执行start后会一直卡着无法返回命令提示符，这是因为在等待其他节点准备就绪，继续启动其余节点即可

```
systemctl daemon-reload
systemctl enable -now etcd
```

4. 查看集群装填

在任意 etcd 节点上执行如下命令查看集群状态，若所有节点均处于 healthy 状态则表示 etcd 集群部署成功

```
/opt/etcd/bin/etcdctl --cacert=/opt/etcd/ssl/ca.pem --cert=/opt/etcd/ssl/etcd.pem --key=/opt/etcd/ssl/etcd-key.pem --endpoints="https://192.168.0.100:2379,https://192.168.0.101:2379,https://192.168.0.102:2379" endpoint health
```

[^1]: 参见 https://etcd.io/docs/v3.5/op-guide/failures/