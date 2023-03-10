# Docker

Docker 是一个开源的应用容器引擎，基于 Go 语言 并遵从 Apache2.0 协议开源。

在前面文章已经介绍过容器相关的技术原理，可以说Docker本质上是一个工具包，让开发人员使用简单的命令和省力的自动化技术来管理容器，实现快速交付、测试、部署，减少业务之外的复杂度目标。


## Docker的架构

Docker有三个基本概念：镜像（Image）、容器（Container）、仓库（Repository），理解了这三个概念，就理解了 Docker 的运行关系和整个生命周期。

- Image ：在前面也介绍过Image的原理，dockerfile 中的 RUN 以及 commit 都相当于在镜像添加新的层，从而构成新的镜像。
- Container： Image 和 Container 的关系，就像是面向对象程序设计中的类和实例一样，镜像是静态的定义，容器是镜像运行时的实体。
- Repository：仓库可看成一个代码控制中心，用来管理、共享镜像。 公共的仓库如Docker hub，当然也可以利用开源软件搭建私有的仓库。

<div  align="center">
	<img src="/assets/chapter4/docker.jpg" width = "500"  align=center />
</div>


Docker 使用了 C/S 体系架构，Docker Client 与 Docker Daemon 通信，Docker Daemon 负责构建，运行和分发 Docker 容器。Docker Client和 Docker Daemon 使用REST API通过UNIX套接字或网络接口进行通信，我们日常使用各种 docker 命令，其实就是在使用 客户端工具 与 Docker Daemon 进行交互。

通过以上这些技术的组合，对于绝大部分应用，开发者都可以通过 docker build 创建镜像、 docker push 上传镜像，用户通过 docker pull 下载镜像，使用 docker run 运行容器应用。

这时候用户不再需要去关心如何搭建环境，如何安装，如何解决不同发行版的库冲突，而且通常不会消耗更多的硬件资源，不会明显降低性能，就会得到一个完整的与本地预期一致的服务。

## Docker的使用

我们下面讲解Docker的安装以及部分命令的使用，在理解前面Docker相关的原理，相信读者对这部分的操作更加理解的透彻。

安装 yum-utils 软件包（提供了 yum-config-manager 程序）并设置稳定的 yum 源方便下载 Docker Engine。
```
# 安装 yum-utils
sudo yum install -y yum-utils
# 设置 yum 源为阿里云方便下载 Docker Engine
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

### 安装Docker CE

此命令安装Docker ce最新版本
```
sudo yum install docker-ce docker-ce-cli containerd.io
```

在生产系统上，要按照安装特定版本的Docker CE，使用以下命令列出可用的版本。

此示例使用该sort -r命令按版本号对结果进行排序，从最高到最低。

```
[root@VM-12-14-centos ~]# yum list docker-ce --showduplicates | sort -r
docker-ce.x86_64            3:20.10.9-3.el7                    docker-ce-stable 
docker-ce.x86_64            3:20.10.8-3.el7                    docker-ce-stable 
docker-ce.x86_64            3:20.10.7-3.el7                    docker-ce-stable
... 
```

### 配置Docker镜像加速

Docker 从 Docker Hub 拉取镜像，因为是从国外获取，所以速度较慢，会出现以下情况：

```
docker run hello-world
Unable to find image 'hello-world:latest' locally
docker: Error response from daemon: Get https://registry-1.docker.io/v2/library/hello-world/manifests/latest: net/http: TLS handshake timeout.
See 'docker run --help'.
```

可以通过配置国内镜像源的方式，从国内获取镜像，提高拉取速度。这里介绍中国科学技术大学（LUG@USTC）的开源镜像：https://docker.mirrors.ustc.edu.cn 和网易的开源镜像：http://hub-mirror.c.163.com

> USTC 是老牌的 Linux 镜像服务提供者了，USTC 的 Docker 镜像加速服务速度很快。USTC 和网易的优势之一就是不需要注册，属于真正的公共服务。

```
vi /etc/docker/daemon.json
```

在文件中输入以下内容并保存。

```
{
  "registry-mirrors": ["http://hub-mirror.c.163.com", "https://docker.mirrors.ustc.edu.cn"]
}
```

重新加载配置信息及重启 Docker 服务。

```
# 重新加载某个服务的配置文件
sudo systemctl daemon-reload
# 重新启动 docker
sudo systemctl restart docker
```

## Docker 命令

通过运行 hello-world 镜像来验证 Docker Engine 是否已正确安装。

```
[root@VM-12-14-centos ~]# docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
2db29710123e: Pull complete 
Digest: sha256:faa03e786c97f07ef34423fccceeec2398ec8a5759259f94d99078f264e9d7af
Status: Downloaded newer image for hello-world:latest

# 看到此消息表示您已正常安装。
Hello from Docker!
...
```

docker run hello-world 命令执行流程图如下。

<div  align="center">
	<img src="/assets/chapter4/docker-image-pull.png" width = "500"  align=center />
</div>



