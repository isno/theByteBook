# 7.4.3 镜像构建

镜像构建实际上就是定制每一层所添加的配置、文件等信息。我们把每一层修改、安装、构建、操作的命令都写入一个脚本，用这个脚本来构建、定制镜像，这个脚本就是 Dockerfile。

有了 Dockefile 之后, 就可以制定自己的镜像规则，在 Dockerfile 上添加或者修改指令, 就可生成镜像产物。

<div  align="center">
	<img src="../assets/docker-image.png" width = "500"  align=center />
</div>

## Dockerfile 常用指令

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


而构建镜像最有挑战性之一的就是使用镜像尽可能小，小的镜像不论在大规模集群部署、故障转移、存储成本方面都有巨大的优势。

```
# 基础镜像
ROM centos
# 工作目录
WORKDIR /usr/local
RUN yum install gcc gcc-c++ make automake autoconf libtool openssl openssl-devel -y \
	 && RUN wget -O redis.tar.gz "http://download.redis.io/redis-stable.tar.gz" \
	 && RUN tar -xvf redis.tar.gz

WORKDIR /usr/local/redis-7.0.5/src
RUN make && make install
# 修改绑定ip地址
RUN sed -i 's/bind 127.0.0.1/bind 0.0.0.0/g' /usr/local/redis-7.0.5/redis.conf

# 暴露 redis 端口
EXPOSE 6379
# 容器运行后启动 redis 的指令
CMD ["/usr/local/redis-7.0.5/bin/redis-server", "/usr/local/redis-7.0.5/redis.conf"]
```