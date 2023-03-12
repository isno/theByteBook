# 初始化集群

我们使用kubeadm 进行集群部署，首先安装 kube 三件套。

kube三件套就是kubeadm、kubelet 和 kubectl，三者的具体功能和作用如下：

- kubeadm：用来初始化集群的指令。
- kubelet：在集群中的每个节点上用来启动 Pod 和容器等。
- kubectl：用来与集群通信的命令行工具。


配置 k8s yum 源

```
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

```

gpkcheck=0 表示对从这个源下载的rpm包不进行校验

```

# 查找所有的版本，这里选择最新的1.26.1版本
yum --showduplicates list kubelet

# disableexcludes=kubernetes：禁掉除了这个kubernetes之外的别的仓库
yum install -y kubelet-1.25.6 kubeadm-1.25.6 kubectl-1.25.6 --disableexcludes=kubernetes

# 设置为开机自启并现在立刻启动服务 --now：立刻启动服务
systemctl enable --now kubelet

# 查看状态，这里需要等待一段时间再查看服务状态，启动会有点慢
systemctl status kubelet

# 查看版本
kubectl version
yum info kubeadm
```

```
/etc/containerd/config.toml

# disabled_plugins = ["cri"]

systemctl restart containerd
```
## 初始化集群

使用 kubeadm 初始化集群

kubeadm 默认从官网k8s.grc.io下载所需镜像，国内无法访问，因此需要通过–image-repository指定阿里云镜像仓库地址

```
kubeadm init \
  --kubernetes-version v1.25.6 \
  --control-plane-endpoint=192.168.28.101 \
  --service-cidr=10.1.0.0/16 \
  --pod-network-cidr=10.244.0.0/16 \
  --v=5
```
以下为 init 参数解释

- kubernetes-version: 用于指定k8s版本
– apiserver-advertise-address：用于指定kube-apiserver监听的ip地址,就是 master本机IP地址
– pod-network-cidr：用于指定Pod的网络范围； 10.244.0.0/16
– service-cidr：用于指定SVC的网络范围
– image-repository: 指定阿里云镜像仓库地址



