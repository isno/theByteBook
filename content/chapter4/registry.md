#使用Docker Registry搭建私有镜像仓库

除了使用Docker Hub 这样的公共仓库外，企业内部通常也会构建自己的私有仓库来管理共享镜像。构建私有仓库可以使用Docker Registry，也可以使用Nexus。

> Nexus号称是世界上最流行的仓库管理软件，Nuexu3能够支持Maven、npm、Docker、YUM、Helm等格式数据的存储和发布；并且能够与Jekins、SonaQube和Eclipse等工具进行集成。

Nexus有两个版本Nexus RepositoryOSS和NexusRepositoryPro, 其中OSS版本是免费, 本文通过基于OSS版本 使用docker-compose 的方式搭建私有仓库 Nexus3 环境。



### 安装nexus

创建 docker-compose.yml 文件，写入以下内容：

```
version: '2.0'
services:
  nexus:
    restart: always
    image: sonatype/nexus3:3.37.3
    container_name: nexus3
    volumes:
      - /opt/nexus/data:/nexus-data
    ports:
      - "8081:8081"
      - "6000:6000"
      - "6001:6001"
    environment:
      - "INSTALL4J_ADD_VM_PARAMS=-Xms128m -Xmx512m -XX:MaxDirectMemorySize=512m -Djava.util.prefs.userRoot=/nexus-data/javaprefs"
      - TZ=Asia/Shanghai
```

映射端口对应的用途：
- 8081：可以通过http访问nexus3 Web页面
- 8082：docker(hosted)私有仓库，可以pull和push
- 8083：docker(proxy)代理远程仓库，只能pull
- 8084：docker(group)私有仓库和代理的组，只能pull

由于Nexus3 依赖于JDK，因此环境变量中指定了JVM的一些参数，读者可以根据自己服务器的实际情况修改。

启动服务
```
docker-compose up -d
```

由于启动较慢，可以查看log，确认启动是否成功

```
docker-compose logs
```

浏览器访问 http://ip:8081 默认账号密码: admin/admin123



### 创建私有镜像仓库


Docker Registry来构建本地仓库用于管理共享镜像。

官方 registry 镜像运行服务

```
docker run -d -p 5000:5000 --restart=always --name registry registry
```

这将使用官方的 registry 镜像来启动私有仓库。默认情况下，仓库会被创建在容器的 /var/lib/registry 目录下。你可以通过 -v 参数来将镜像文件存放在本地的指定路径。

### 在私有仓库管理镜像


#### repository的类型

- hosted，本地仓库，通常我们会部署自己的构件到这一类型的仓库。比如公司的第二方库。
- proxy，代理仓库，它们被用来代理远程的公共仓库，如maven中央仓库。
- group，仓库组，用来合并多个hosted/proxy仓库，当你的项目希望在多个repository使用资源时就不需要多次引用了，只需要引用一个group即可。


### 创建 docker(hosted) 类型的仓库

用于将自己的镜像上传至私库。

在创建镜像仓库的页面中，设置镜像仓库的相关信息，包括名称、HTTP端口、是否允许匿名拉取镜像等信息。这里需要注意的是，
此处的HTTP端口(此处的值为8082)很重要，后续拉取和推送进行是使用此端口进行的，而不是nexus本身对外暴露的端口。


### 创建 docker(proxy) 类型的仓库

用于从外网仓库中拉取镜像至本地仓库中。点击“create Repository”，选择docker(proxy)进行创建


