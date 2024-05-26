# 10.4.1 用更安全的方式构建镜像

现在大部分的 CI/CD 系统运行的容器内，镜像的构成也是在容器内完成。这时候通常用两种方式完成镜像构建：


1. 挂载宿主机的 socket 文件到容器内部

然后在容器内部用 docker build 构建镜像

由于 docker 依赖于 docker daemon 进程，docker daemon 进程是一个 Unix Socket 连接，且 /var/run/docker.sock 文件是root权限，在 docker daemon 无法暴露或者用户没有权限获取 docker daemon 进程的前提下，用 docker build 来构建镜像就变的非常困难了。

上述两种方法，都能满足在容器内构建容器镜像且推送镜像至远端仓库的需求，但是从安全角度来讲：
- 需要root 权限(第一种方式)
- 提供特权(第二种方式)都使得风险增大

在 Kubernetes 多租户的场景下，上面风险是不能接受的。那是否有一种不需要特殊权限，还能快速构建容器镜像的方法呢？答案就是下面将的 Kaniko。

## 使用 Kaniko 构建镜像

Kaniko 是谷歌开源的一款用来构建容器镜像的工具。

与 docker 不同，Kaniko 并不依赖于 Docker daemon 进程，完全是在用户空间根据 Dockerfile 的内容逐行执行命令来构建镜像，这就使得在一些无法获取 docker daemon 进程的环境下也能够构建镜像，比如在标准的 Kubernetes Cluster 上。

<div  align="center">
	<img src="../assets/kaniko.png" width = "500"  align=center />
	<p>Kaniko 如何工作</p>
</div>

Kaniko 会先提取基础镜像(Dockerfile FROM 之后的镜像)的文件系统，然后根据 Dockerfile 中所描述的，一条条执行命令，每一条命令执行完以后会在用户空间下面创建一个 snapshot，并与存储与内存中的上一个状态进行比对，如果有变化，就将新的修改生成一个镜像层添加在基础镜像上，并且将相关的修改信息写入镜像元数据中。等所有命令执行完，kaniko 会将最终镜像推送到指定的远端镜像仓库。


## 集成 Kaniko 到 Tekton 流水线


我们先前面讲述过，容器镜像实际上就是利用 UnionFs 实现的一个特殊文件系统。那么容器镜像的构建就是基于底层 rootfs （基础镜像）定制上层配置、文件、依赖等信息。我们把每一层修改、操作命令都写入一个脚本，用这个脚本来构建、定制镜像，这个脚本就是 Dockerfile。

有了 Dockerfile 之后, 就可以制定自己的镜像规则，在 Dockerfile 上添加或者修改指令, 就可生成镜像产物。


## 2. 镜像构建

熟悉常用的 Dockerfile 指令之后，我们可以开始尝试通过 Dockerfile 构建一个 Nginx 镜像。

```dockerfile
#第1阶段
FROM skillfir/alpine:gcc AS builder01
RUN wget https://nginx.org/download/nginx-1.24.0.tar.gz -O nginx.tar.gz && \
tar -zxf nginx.tar.gz && \
rm -f nginx.tar.gz && \
cd /usr/src/nginx-1.24.0 && \
 ./configure --prefix=/app/nginx --sbin-path=/app/nginx/sbin/nginx && \
  make && make install
  
#第2阶段
FROM skillfir/alpine:glibc
RUN apk update && apk upgrade && apk add pcre openssl-dev pcre-dev zlib-dev 

COPY --from=builder01 /app/nginx /app/nginx
WORKDIR /app/nginx
EXPOSE 80
CMD ["./sbin/nginx","-g","daemon off;"]
```
制作镜像
```bash
docker build -t alpine:nginx .
```
查看镜像产物
```bash
$ docker images 
REPOSITORY                TAG             IMAGE ID       CREATED          SIZE
alpine                    nginx           ca338a969cf7   17 seconds ago   23.4MB
```

测试镜像
```bash
docker run --rm --name nginx -p 80:80 alpine:nginx
```

构建镜像最有挑战性之一的就是使用镜像尽可能小，小的镜像不论在大规模集群部署、故障转移、存储成本方面都有巨大的优势，以下是一些镜像构建的小技巧：
* 选用精简的基础镜像
* 使用多阶段构建
* COPY ADD 和 RUN 命令都会增加镜像层数，所以构建镜像时可以通过合并 RUN 指令减少叠加层，同时 RUN 命令最后可以通过一些工具的清理命令如`yum clean` `conda clean --all`来清理缓存，以此来减小 RUN 层的大小

