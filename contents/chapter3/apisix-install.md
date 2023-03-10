# APISIX 安装

APISIX 有多种安装方式 Docker、Helm、RPM、源码。 如果您仅想体验 APISIX，推荐您使用Docker方式安装。

APISIX 使用 etcd 作为配置中心进行保存和同步配置。你在安装 APISIX 时选择了 Docker 或 Helm 安装，那么 etcd 将会自动安装，如果是其他方式，则需要先安装 etcd。

## 使用Docker 方式安装

使用此方法安装 APISIX，你需要安装 Docker 和 Docker Compose。

首先下载 apisix-docker 仓库

```
git clone https://github.com/apache/apisix-docker.git
cd apisix-docker/example
```

使用 docker-compose 启用 APISIX

```
docker-compose -p docker-apisix up -d
```

## 配置 APISIX

通过修改本地 ./conf/config.yaml 文件，或者在启动 APISIX 时使用 -c 或 --config 添加文件路径参数 `apisix start -c <path string>`，完成对 APISIX 服务本身的基本配置。

在 config.yaml 配置中，您可以修改 APISIX 端口号、ETCD、Admin API key等关键信息。

比如将 APISIX 默认监听端口修改为 8000，其他配置保持默认，在 ./conf/config.yaml 中只需这样配置：

```
apisix:
  node_listen: 8000 # APISIX listening port
```

### 更新 Admin API key

您可以在./conf/config.yaml 文件中查看 admin_key 信息

后续您可以使用 admin_key 访问 APISIX admin RESTful API接口，进行各类管理操作

```
curl http://127.0.0.1:9180/apisix/admin/routes?api_key=edd1c9f034335f136f87ad84b625c8f1 -i
```