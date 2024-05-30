# 10.4.1 用更安全的方式构建镜像

现在大部分的 CI/CD 系统运行的容器内，镜像的构成也是在容器内完成。如果想要在 Pod 内使用 docker 编译镜像，那就得将宿主机上的 /var/run/docker.sock 文件通过 hostPath 的方式挂载到 pod 容器内

但这种方式有很大的弊端，**在 docker daemon 无法暴露或者用户没有权限获取 docker daemon 进程的前提下，用 docker build 来构建镜像就变的非常困难了**。

在 Kubernetes 多租户的场景下，上面风险是不能接受的。那是否有一种不需要特殊权限，还能快速构建容器镜像的方法呢？答案就是下面介绍的 Kaniko。

:::tip Kaniko 是什么

Kaniko 是谷歌开源的一款构建容器镜像的工具。

Kaniko 并不依赖于 Docker 守护进程，完全在用户空间根据 Dockerfile 的内容逐行执行命令来构建镜像，这就使得在一些无法获取 docker 守护 进程的环境下也能够构建镜像。

:::

<div  align="center">
	<img src="../assets/kaniko.png" width = "500"  align=center />
	<p>Kaniko 如何工作</p>
</div>

Kaniko 会先提取基础镜像(Dockerfile FROM 之后的镜像)的文件系统，然后根据 Dockerfile 中所描述的，一条条执行命令，每一条命令执行完以后会在用户空间下面创建一个 snapshot，并与存储与内存中的上一个状态进行比对，如果有变化，就将新的修改生成一个镜像层添加在基础镜像上，并且将相关的修改信息写入镜像元数据中。等所有命令执行完，kaniko 会将最终镜像推送到指定的远端镜像仓库。


## 集成 Kaniko 到 Tekton 流水线


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

