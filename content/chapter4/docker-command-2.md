# Docker 之常见应用部署

大家如何将常见的应用使用 Docker 进行部署，巩固大家 Docker 命令的学习

## Nginx

拉取镜像。

```
docker pull nginx
```
创建 Nginx 容器。
```
docker run -di --name nginx -p 80:80 nginx

```

将容器内的配置文件拷贝到指定目录（请先提前创建好目录）。

```
# 创建目录
mkdir -p /mydata/docker_nginx
# 将容器内的配置文件拷贝到指定目录
docker cp nginx:/etc/nginx /mydata/docker_nginx/

```
重命名宿主机 /mydata/docker_nginx/nginx 为 /mydata/docker_nginx/conf

```
mv /mydata/docker_nginx/nginx/ /mydata/docker_nginx/conf
```

终止并删除容器（目录挂载操作只能在创建容器时设置）。

```
docker stop nginx
docker rm nginx
```

创建 Nginx 容器，并将容器中的 /etc/nginx 目录和宿主机的 /mydata/docker_nginx/conf 目录进行挂载。

```
docker run -di --name nginx -p 80:80 -v /mydata/docker_nginx/conf:/etc/nginx nginx

```

访问宿主机：http://192.168.10.10:80/ 结果如下：

<div  align="center">
	<img src="/assets/chapter4/image-20200812183235528.png" width = "650"  align=center />
</div>

## MySQL

拉取镜像
```
docker pull mysql:8.0.21
```
创建容器
```
docker run -di --name mysql8 -p 3306:3306 -v /mydata/docker_mysql/conf:/etc/mysql/conf.d -v /mydata/docker_mysql/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=1234 mysql:8.0.21

```
- -p：代表端口映射，格式为 宿主机映射端口:容器运行端口。
- -e：代表添加环境变量 MYSQL_ROOT_PASSWORD 是 root 用户的登陆密码。

可以进入容器并使用 MySQL 命令打开客户端。

```
# 进入容器
docker exec -it mysql8 /bin/bash
# 使用 MySQL 命令打开客户端
mysql -uroot -p1234 --default-character-set=utf8
```

## Redis

```
docker pull redis

```
创建容器。

```
docker run -di --name redis -p 6379:6379 redis
```

连接容器中的 Redis 时，只需要连接宿主机的 IP + 指定的映射端口即可。


## MongoDB

```
docker pull mongo

```

创建容器。
```
docker run -di --name mongo -p 27017:27017 mongo

```
连接容器中的 MongoDB 时，只需要连接宿主机的 IP + 指定的映射端口即可。


## RabbitMQ

```
docker pull rabbitmq

```

```
docker run -di --name rabbitmq -p 4369:4369 -p 5671:5671 -p 5672:5672 -p 15671:15671 -p 15672:15672 -p 25672:25672 rabbitmq
```

```
# 进入容器
docker exec -it rabbitmq /bin/bash
# 开启 RabbitMQ 管理功能
rabbitmq-plugins enable rabbitmq_management
```
访问：http://192.168.10.10:15672/ 使用 guest 登录账号密码，结果如下：

<div  align="center">
	<img src="/assets/chapter4/image-20200812200109882.png" width = "650"  align=center />
</div>
