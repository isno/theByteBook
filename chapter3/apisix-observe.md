# API 观测性实践

APISIX 中提供了很多具有丰富功能的可观测性插件。你可以通过使用和设置这些插件，来了解 API 行为，进而使整个业务流程更加清晰。

可观测性可分为三个关键部分：日志、指标、链路追踪，接下来让我们逐个了解它们。

## 日志

在 APISIX 中，日志默认存储在 ./apisix/logs/ 目录下。更多的情况是我们需要 将 APISIX 的日志发送到指定的日志服务中，以便进行运用分析。

接下来我们将使用 kafka-logger 插件为你演示如何将 APISIX 的日志数据发送到 Apache Kafka 集群中。

创建日志 format 

```
curl http://127.0.0.1:9180/apisix/admin/plugin_metadata/kafka-logger \
-H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' -X PUT -d '
{
    "log_format": {
        "host": "$host",
        "@timestamp": "$time_iso8601",
        "client_ip": "$remote_addr"
    }
}'
```
配置完成后，你将在日志系统中看到如下类似日志：

```
{"host":"localhost","@timestamp":"2020-09-23T19:05:05-04:00","client_ip":"127.0.0.1","route_id":"1"}
```

为 路由 启用 kafka-logger 插件, 继续使用 我们第一个创建的路由为例：

```
curl "http://127.0.0.1:9180/apisix/admin/routes/1" -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PATCH -d '
{
     "plugins": {
       "kafka-logger": {
            "brokers" : [
              {
               "host": "127.0.0.1",
               "port": 9092
              }
            ],
           "kafka_topic" : "test",
           "key" : "key1"
       }
   }
}'
```

### 测试

```
curl http://127.0.0.1:9080//anything/11  -H "Host: thebyte.com.cn"
```

通过下图可以看到，有一些日志消息已经被写入到我们创建的 test topic 中。点击查看日志内容，可以发现上述进行的 API 请求日志已经被写入了。

<div  align="center">
    <img src="/assets/chapter3/kafka-topic.png" width = "520"  align=center />
</div>


## 指标

APISIX 提供了 Prometheus 插件来获取你的 API 指标，并在 Prometheus 中暴露它们。通过使用 APISIX 提供的 Grafana 仪表板元数据，并从 Prometheus 中获取指标，更加方便地监控你的 API。

你可以通过以下命令启用 prometheus 插件：

```
curl http://127.0.0.1:9180/apisix/admin/routes/1  \
-H 'X-API-KEY: edd1c9f034335f136f87ad84b625c8f1' -X PUT -d '
{
  "uri": "/get",
  "plugins": {
    "prometheus": {}
  },
  "upstream_id": "1"
}'
```

启用成功后，你可以通过 /apisix/prometheus/metrics 接口获取 APISIX 的指标。

```
curl -i http://127.0.0.1:9091/apisix/prometheus/metrics
```

你还可以查看在本地实例中运行的 Grafana 仪表板。访问 http://localhost:3000/ 获取指标的概况信息。

<div  align="center">
    <img src="/assets/chapter3/frafana.png" width = "520"  align=center />
</div>

## 链路追踪

链路追踪会请求还原成调用链路，并将该请求的调用情况使用拓扑的方式展现，比如展示各个微服务节点上的耗时，请求具体经过了哪些服务器以及每个服务节点的请求状态等内容。
在APISIX中，我们可以启用 Skywalking 插件 对 route 开启 链路追踪。skywalking 插件用于与 Apache SkyWalking 集成

首先设置 Endpoint 信息

./conf/config.yaml

```
plugin_attr:
  skywalking:
    service_name: APISIX
    service_instance_name: "APISIX Instance Name"
    endpoint_addr: http://127.0.0.1:12800 // SkyWalking 的 HTTP endpoint 地址
```

###  上游服务示例代码

```
package com.thebyte.demo.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.servlet.http.HttpServletRequest;

/**
 * @author isno
 * @create 2022-01-29 17:10
 * @desc skywalking test controller
 **/
@RestController
public class TestController {
    @RequestMapping("/test/{count}")
    public String getUidList(@PathVariable("count") String countStr, HttpServletRequest request) {
        System.out.println("counter:::::"+countStr);
       	return "OK";
    }
}
```
在启动服务前，需要配置 SkyWalking agent：

agent/config/agent.config
```
agent.service_name=yourservername
collector.backend_service=170.10.156.210:11800
```

使用以下命令启动服务脚本

```
nohup java -javaagent:/root/skywalking/app/agent/skywalking-agent.jar \
-jar /root/skywalking/app/app.jar \
--server.port=8089 \
2>&1 > /root/skywalking/app/logs/nohup.log &
```

### 启动插件

该插件默认是禁用状态，你需要将其添加到配置文件（./conf/config.yaml）中才可以启用它

./conf/config.yaml

```
plugins:
  - skywalking
  ...
```

配置完成后，重新加载 APISIX，此时 APISIX 会创建一个后台定时器，向 SkyWalking OAP 服务定期上报数据。

以下示例展示了如何在指定路由中启用 skywalking 插件：

```
curl "http://127.0.0.1:9180/apisix/admin/routes/1" -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" -X PATCH -d '
{
     "plugins": {
      	"skywalking": {
            "sample_ratio": 1
        }
   }
}'
```

### 测试插件

#### 使用 Docker 启用 SkyWalking UI 

通过 Docker Compose 启动 SkyWalking OAP 和 SkyWalking UI：

在 usr/local 中创建 skywalking.yaml 文件。

```
version: "3"
services:
oap:
    image: apache/skywalking-oap-server:8.9.1
    restart: always
    ports:
    - "12800:12800/tcp"

ui:
    image: apache/skywalking-ui:8.9.1
    restart: always
    ports:
    - "8080:8080/tcp"
    environment:
    SW_OAP_ADDRESS: http://oap:12800
```

使用以下命令启动上述创建的文件：

```
docker-compose -f skywalking.yaml up -d
```

#### 生产测试数据，并进行追踪查看

产生测试数据
```
curl -v http://10.110.149.192:9080/uid/12
```

完成上述步骤后，打开浏览器，访问 SkyWalking 的 UI 页面，你可以看到如下服务拓扑图：
<div  align="center">
    <img src="/assets/chapter3/SkyWalking-1.png" width = "520"  align=center />
</div>

并且可以看到服务追踪列表：

<div  align="center">
    <img src="/assets/chapter3/SkyWalking-2.png" width = "520"  align=center />
</div>

