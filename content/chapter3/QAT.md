# 使用QAT技术对网络请求运算加速

英特尔® Quick Assist Technology （以下简称 QAT）是Intel公司推出的一种专用硬件加速技术，可以用来提高Web服务器中计算密集的公钥加密以及数据压缩解压的吞吐率以及降低CPU负载。在爱奇艺内，如网关、CDN等关键流量入口，均有较成熟的应用，也取得了不错的优化效果。 

QAT在技术上驱动采用UIO技术，其大部分处于用户态、只有少部分处理硬件中断应答等逻辑处于内核态。功能支持上能对SSL非对称加解密算法（RSA、ECDH、ECDSA、DH、DSA等）运算，提供对其原生zlib与QAT适配的Zlib-SHIM接口，支持对deflate、LZ77等数据压缩和解压运算。

除此，在如Hadoop、数据库(RocksDB)、文件系统(BTRFS)等场景也能QAT提高运行速度和存储密度。


## 1. QAT性能参照

以硬件Intel® QuickAssist Adapter 8970型号为例，可以看出针对加解密、压缩以及解压缩等运算都有非常高的性能指标。

||intel® QuickAssist Adapter 8970|
|:--|:--|
|批量加密性能|103Gbps@4KB Packet|
|RSA2K Key 解密性能|100k ops/s|
|动态压缩|66Gbps@64KB|
|动态解压缩|160Gbps@64KB|

参考官网的说明：利用QAT硬件，在网络上的应用可以提高HTTPS吞吐量三倍以上，以及提升CPU利用率三倍以上

> 注 1：OpenSSL (AES-128 SHA1-HMAC @ 16KB) （6 核 CPU）：没有 QAT 时：14.4G bps 吞吐量； QAT加速后：达到 44G bps 吞吐量

> 注 2: OpenSSL (AES-128 SHA1-HMAC @ 16KB) （达到 44G bps 吞吐量） ：没有 QAT 时：需要占用18 个核； QAT 加速后：仅需占用 6 个核


## 2. QAT配置Nginx的安装使用

Intel提供了利用Nginx动态模块机制，提供了加解密、解压缩核心模块的支持。在本文基于动态模块的机制进行Nginx安装和配置，以便读者了解 QAT在Nginx中的应用。

安装QAT主要包括硬件安装、BIOS设置、Linux相应的优化、OpenSSL升级、QAT驱动安装、Nginx打QAT Patch以及相应的测试等。


Intel® QuickAssist Accelerator 是一块PCIe卡，首先需要将其安装在服务器的PCIe插槽中。以下为QAT加速卡的图片

<div  align="center">
	<img src="/assets/chapter3/qat.png" width = "450"  align=center />
</div>

卡安装完毕后，需要确认BIOS设置，将PICe link speed设置到 Gen4,X16 以获得最好的性能。


### BIOS设置

BIOS可优化选项及推荐值如下

|配置项|推荐值|
|:--|:--|
|Hyper-Threading（超线程）|Enable|
|CPU C6 report （CPU C6 报告）| Auto|
|SpeedStep(Pstates)|Enable|
|Turbo Mode （Turbo 模式）|Enable|
|PCIe Link Speed （PCIe 链路速度）| Gen4|
|Energy Efficient Turbo （节能加速技术）| Disable|
|Boot Performance Mode （启动性能模式）| Max Performance|

## Linux优化

GRUB_CMDLINE_LINUX中设置相应的系统启动参数

```
intel_iommu=off processor.max_cstates=1 idle=poll pcie_aspm=off
```

关闭cpupower服务以及防火墙

```
systemctl stop cpupower.service
systemctl disable firewalld.service
```

用户进程的相关设置

```
ulimit -c unlimited # 生成Core dump
ulimit -n  1000000 # 设置最大文件句柄打开数
```


### QAT驱动安装

用户可以从以下网址下载加速卡驱动。本文下载的为QAT.L.4.20.0-00001.tar.gz 并以/QAT为驱动安装目录

> https://www.intel.com/content/www/us/en/download/19734/intel-quickassist-technology-driver-for-linux-hw-version-1-7.html

```
cd /QAT
tar xvzf ./ QAT.L.4.20.0-00001.tar.gz
./configure --enable-qat-lkcf --enable-icp-dc-sym-only --enable-kapi
make
make install
make samples-install // (Optional）安装sample应用
```

> 在build下， 会出 cpa_sample_code.ko 模块，可以用 insmod ./build/cpa_sample_code.ko 加载cpa_sample_code执行测试

驱动安装完毕后，命令输出中可以看到有3个QAT加速设备(qat_dev)处于启动状态, 然后用如下命令启动QAT服务

```
service qat_service start
```

## OpenSSL 和 QAT_Engine安装

QAT用到的 OpenSSL 的版本需要 1.1.0 之上的, 进行OpenSSL升级

OpenSSL源码下载

```
cd ~
wget https://www.openssl.org/source/openssl-1.1.1s.tar.gz
```

OpenSSL编译安装 (本文安装在/usr/local/ssl中)

```
wget https://www.openssl.org/source/openssl-1.1.1s.tar.gz
tar xvzf openssl-1.1.1s.tar.gz

ln -s openssl-1.1.1s openssl
cd openssl

./config --prefix=/usr/local/ssl
make depend
make
make install

// 添加动态库
echo /usr/local/ssl/lib/ > /etc/ld.so.conf.d/qat.conf
ldconfig

/usr/local/ssl/bin/openssl version //进行验证
```

### QAT Engine安装

QAT Engine编译安装

```
git clone https://github.com/intel/QAT_Engine.git
cd ./QAT_Engine
./autogen.sh
./configure --with-qat_dir=/QAT --with-openssl_dir=/home/ssl --with-openssl_install_dir=/usr/local/ssl
export PERL5LIB=$PERL5LIB:/home/openssl
make && make install
```
QAT服务配置文件替换

为了使得QAT Engine能和 QAT Service联合工作，还需要把QAT Engine目录下的实例配置拷贝至/etc目录下，替换掉QAT原来的配置文件

```
cd /usr/local/QAT_Engine/qat/config/c6xx/multi_process_event-driven_optimized
cp * /etc/
```
替换文件后，重启qat_service以加载新的配置文件

```
service qat_service restart
```

## 测试验证

用OpenSSL加载QAT Engine

```
/usr/local/ssl/bin/openssl engine -t -vvvv qatengine
```

openssl的加解密测试

```
/usr/local/ssl/bin/openssl speed -elapsed rsa2048  // 系统正常跑
/usr/local/ssl/bin/openssl speed -engine qat_dev0 -elapsed rsa2048 // 使用加速卡跑

```

下面针对RSA2048、ECDSA-P256进行openssl speed测试

RSA2048

```
/usr/local/ssl/bin/openssl speed -elapsed rsa2048  # Software纯软 
/usr/local/ssl/bin/openssl speed -engine qatengine -elapsed rsa2048  # Synchronous 同步
/usr/local/ssl/bin/openssl speed -engine qatengine -elapsed -async_jobs 36 rsa2048 # Asynchronous1 异步
/usr/local/ssl/bin/openssl speed -engine qatengine -elapsed -async_jobs 72 rsa2048 # Asynchronous1 异步
```

ECDSA-P256

```
/usr/local/ssl/bin/openssl speed -elapsed ecdsap256 # Software 纯软
/usr/local/ssl/bin/openssl speed -engine qatengine -elapsed ecdsap256 # Synchronous 同步
/usr/local/ssl/bin/openssl speed -engine qatengine -elapsed -async_jobs 36 ecdsap256 # Asynchronous1 异步1
/usr/local/ssl/bin/opensslspeed -engine qatengine -elapsed -async_jobs 72 ecdsap256 # Asynchronous2 异步2

```

查看 QAT卡进行接受处理数据， QAT卡在工作的时候，计数会一直变化

```
cat /sys/kernel/debug/qat_dh895xcc_0000\:07\:00.0/fw_counters
```

## Nginx 安装及优化设置

在本文使用asynch_mode_nginx对Nginx进行打patch，并且安装QATzip，以便Nginx支持QAT gzip压缩处理。

Nginx以及相关的patch下载

```
wget http://nginx.org/download/nginx-1.18.0.tar.gz
git clone https://github.com/intel/asynch_mode_nginx.git
git clone https://github.com/intel/QATzip.git

```

先进行QATzip的编译和安装

```
export QZ_ROOT=/home/QATzip
echo 1024 > /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages
rmmod usdm_drv
insmod $ICP_ROOT/build/usdm_drv.ko max_huge_pages=1024 max_huge_pages_per_process=16
cd $QZ_ROOT
./configure --with-ICP_ROOT=$ICP_ROOT
make clean
make all install
./setenv.sh
 
/etc/init.d/qat_service restart
systemctl restart qat_service
```

QATzip测试验证

```
cd $QZ_ROOT/test/performance_tests
./run_perf_test.sh
```


继续对Nginx进行打async_mode_nginx patch

```
tar -zxf nginx-1.18.0.tar.gz
diff -Naru -x .git nginx-1.18.0 asynch_mode_nginx > async_mode_nginx_1.18.0.patch
cd nginx-1.18.0 
patch -p1 < ../async_mode_nginx_1.18.0.patch

```

编译Nginx

```
cd nginx-1.18.0
export NGINX_INSTALL_DIR=/usr/local/nginx
./configure \
    --prefix=/usr/local/nginx \
    --with-http_ssl_module \
    --add-dynamic-module=modules/nginx_qatzip_module \
    --add-dynamic-module=modules/nginx_qat_module/ \
    --with-cc-opt="-DNGX_SECURE_MEM -I$OPENSSL_LIB/include -I$ICP_ROOT/quickassist/include -I$ICP_ROOT/quickassist/include/dc -I$QZ_ROOT/include -Wno-error=deprecated-declarations" \
    --with-ld-opt="-Wl,-rpath=$OPENSSL_LIB/lib -L$OPENSSL_LIB/lib -L$QZ_ROOT/src -lqatzip -lz" 
make 
make install
```


Nginx安装完毕之后，在Nginx conf文件中加载 qat ssl以及qatzip模块 （由于Nginx配置较多，文本仅示例QAT相关的配置）

加载QAT模块，定义ssl_engine

```
load_module modules/ngx_http_qatzip_filter_module.so;
load_module modules/ngx_ssl_engine_qat_module.so;

ssl_engine {
    use_engine qatengine;
    default_algorithms RSA,EC,DH,DSA;
    qat_engine {
        qat_offload_mode async;
        qat_notify_mode poll;
        qat_poll_mode heuristic;
        qat_sw_fallback on;
    }
}
```

HTTP压缩相关的配置

```
qatzip_sw failover;
qatzip_min_length 128;
qatzip_comp_level 1;
qatzip_buffers 16 8k;
qatzip_types text/css text/javascript text/xml text/plain text/x-component application/javascript application/json application/xml application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml application/octet-stream image/jpeg;
qatzip_chunk_size   64k;
qatzip_stream_size  256k;
qatzip_sw_threshold 256;
```

Nginx Server 站点对QAT启用
```
listen       443 ssl backlog=65534 reuseport deferred rcvbuf=8m sndbuf=8m asynch;  # 注意关键字 asynch
server_name  localhost;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_certificate crt/ca.com.crt;
ssl_certificate_key crt/ca.com.key;
}
```
重启Nginx并测试QAT是否正常工作，当QAT卡处理请求时，该计数器发生变化。

```
cat /sys/kernel/debug/qat_dh895xcc_0000\:07\:00.0/fw_counters
```

## 评测

（来自于 爱奇艺 QLB 团队）
通过对ECC、RSA、TLS1.2、TLS1.3几个维度，使用ab进行并发测试

|场景|QPS|Time|单次发出请求数|
|:--|:--|:--|:--|
|RSA证书 + TLS1.2| 316.20| 316.254ms|100|
|RSA证书 + TLS1.2 + QAT| 530.48| 188.507ms|100|
|RSA证书 + TLS1.3| 303.01| 330.017ms|100|
|RSA证书 + TLS1.3 + QAT| 499.29| 200.285ms|100|
|ECC证书 + TLS1.2| 639.39| 203.319ms|100|
|ECC证书 + TLS1.3| 627.39| 159.390ms|100|

使用QAT对 Gzip进行加速后，cpu load也降低 20%左右。

从对SSL加速的结果上看，使用QAT对RSA证书加速后，能提升40%左右的性能。 （特别的是：不管哪种场景，使用ECC证书较RSA证书性能提升很多，即使RSA使用了QAT加速亦是如此，ECC证书已在第二章介绍过）



