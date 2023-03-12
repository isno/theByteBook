# 安装 OpenResty

OpenResty的安装有多种方式包管理器、源码编译或者 docker 镜像，笔者优先使用 yum 方式安装。


包管理器中添加 OpenResty 的仓库地址
```
yum install yum-utils
yum-config-manager --add-repo https://openresty.org/package/centos/openresty.repo

```

安装 openresty
```
yum install openresty
```

检测是否安装成功

```
[root@MiWiFi-RB03-srv ~]# openresty -h
nginx version: openresty/1.21.4.1
...
```