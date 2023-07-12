# 7.4.3 镜像构建

我们先前面讲述过，容器镜像实际上就是利用 UnionFs 实现的一个特殊文件系统。那么容器镜像的构建就是基于底层 roofs （基础镜像）定制上层配置、文件、依赖等信息。我们把每一层修改、操作命令都写入一个脚本，用这个脚本来构建、定制镜像，这个脚本就是 Dockerfile。

有了 Dockerfile 之后, 就可以制定自己的镜像规则，在 Dockerfile 上添加或者修改指令, 就可生成镜像产物。

<div  align="center">
	<img src="../assets/docker-image.png" width = "500"  align=center />
</div>

## 1. Dockerfile 常用指令

通过 Dockerfile 构建镜像时，Docker 安装顺序读取 Dockerfile 内的指令，每执行一条指令，叠加一层镜像，指令越多，叠加的镜像层越多。实践中，我们可以将重复的动作尽量合并到一条指令中实现。下表列举了常用的 Dockerfile 指令。

|指令|用途|
|:--|:--|
|FROM| 指定构建镜像的基础镜像|
|MAINTAINER| 镜像的维护信息|
|RUN | 构建镜像时运行的指令|
|COPY| 复制文件或目录到镜像内（只能在构建镜像的主机上读取资源）|
|ADD| 支持从远程服务器读取资源，复制到镜像内|
|ENV| 环境变量设置|
|USER| 指定运行 RUN、CMD COPY 等指令的用户|
|EXPOSE| 容器运行的端口|
|WORKDIR| 指定运行 RUN、CMD、copy 指令的工作目录|
|VOLUME| 设置挂载卷|
|CMD| 启动后运行的指令|

## 2. 镜像构建

熟悉常用的 Dockerfile 指令之后，我们可以开始尝试通过 Dockerfile 构建一个 Nginx 镜像。

```
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
```
docker build -t alpine:nginx .
```
查看镜像产物
```
$ docker images 
REPOSITORY                TAG             IMAGE ID       CREATED          SIZE
alpine                    nginx           ca338a969cf7   17 seconds ago   23.4MB
```

测试镜像
```
docker run --rm --name nginx -p 80:80 alpine:nginx
```

构建镜像最有挑战性之一的就是使用镜像尽可能小，小的镜像不论在大规模集群部署、故障转移、存储成本方面都有巨大的优势，这方面的实践包括通过合并指令减小叠加层、选用精简的基础镜像、使用多阶段构建等。