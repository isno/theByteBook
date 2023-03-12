# OpenResty动态负载均衡

Nginx 作为反向代理，当upstream需要修改时，会reload一下Nginx, 使其生效。升级到网关服务后，会有大量的 upstream 维护，再手动操作就不现实了。

这时候我们就需要借助服务发现和 OpenResty的编程能力，使其upstream变成动态更新，无需再手动维护。

服务发现我们可以使用Consul，Consul提供了time_wait和修改版本号概念，在OpenResty通过长轮训和版本号及时获取Consul的kv store变化，如果Consul发现该kv没有变化就会hang住这个请求5分钟，在这５分钟内如果有任何变化都会及时返回结果。通过比较版本号我们就知道是超时了还是kv的确被修改了。


## 部署 Consul服务

consul 是一个功能比较完备的服务注册中心， 使用 docker 部署一个 consul 服务

```
# server，如果是 podman则需要用必须使用 sudo
sudo docker run -d --name=dev-consul -e CONSUL_BIND_INTERFACE=eth0 consul

# 加入两个节点，ip地址你可以通过获得
sudo docker inspect dev-consul | grep IP
sudo docker run -d -e CONSUL_BIND_INTERFACE=eth0 consul agent -dev -join=10.88.0.4
sudo docker run -d -e CONSUL_BIND_INTERFACE=eth0 consul agent -dev -join=10.88.0.4
sudo docker run -d --net=host -e 'CONSUL_LOCAL_CONFIG={"leave_on_terminate": true}' consul agent -bind={绑定的ip} -retry-join=10.88.0.4

```

## upstreams 更新

在Consul注册好服务之后通过Consul的 http://127.0.0.1:8500/v1/catalog/service/api_demo 接口就可以获取到服务的列表

在OpenResty的目录内，我们创建一个 upstreams.lua 用于拉取 Consoul内的服务

在该服务内，创建定时器，利用 consul 的 watch api，passing = true 过滤得到健康节点，index 是 consul 提供的 blocking query 的 概念，也即 watch。然后更新本地 upstream 的 peers，来实现动态更新的功能。


```
local http = require "socket.http"
local ltn12 = require "ltn12"
local cjson = require "cjson"

local _M = {}

_M._VERSION="0.1"

function _M:update_upstreams()
    local resp = {}
    local resty_consul = require "resty.consul"

    consul = resty_consul:new({
                host="127.0.0.1",
                port=8500,
                read_timeout=(60*1000)
            })

   	-- get active peers from consul, store in realtime set
    local res, err = consul:get("/health/service/star", { ["passing"] = true, ["index"] = 0 })

    local upstreams = {}
    for i, v in ipairs(res.body) do
         upstreams[i] = {ip=v.Address, port=v.ServicePort}
    end    
    ngx.shared.upstream_list:set("api_demo", cjson.encode(upstreams))
end

function _M:get_upstreams()
   local upstreams_str = ngx.shared.upstream_list:get("api_demo");
   local tmp_upstreams = cjson.decode(upstreams_str);
   return tmp_upstreams;
end

return _M

```

## upstream 动态更新

过luasockets查询Consul来发现服务，update_upstreams用于更新upstream列表，get_upstreams用于返回upstream列表，此处可以考虑worker进程级别的缓存，减少因为json的反序列化造成的性能开销。

```
lua_shared_dict upstream_list 10m;

# 第一次初始化
init_by_lua_block {
    local upstreams = require "upstreams";
    upstreams.update_upstreams();
}

# 定时拉取配置
init_worker_by_lua_block {
    local upstreams = require "upstreams";
    local handle = nil;

    handle = function ()
        upstreams.update_upstreams();
        ngx.timer.at(5, handle);
    end
    # 在一个 Worker上执行
    if ngx.worker.id() == 0 then
    	ngx.timer.at(5, handle);
}
upstream api_server {
    server 0.0.0.1 down; #占位server

    balancer_by_lua_block {
        local balancer = require "ngx.balancer";
        local upstreams = require "upstreams";    
        local tmp_upstreams = upstreams.get_upstreams();
        local ip_port = tmp_upstreams[math.random(1, table.getn(tmp_upstreams))];
        balancer.set_current_peer(ip_port.ip, ip_port.port);
    }
}
server {
    listen       8080;
    server_name  localhost;
    charset utf-8;
    location / {
         proxy_pass http://api_server;
    }
}

```