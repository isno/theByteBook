# BBRv2安装及测试

BBRv2相对来说是使用较为激进的拥塞控制，在一堆保守的拥塞控制衬托下，抢占了网络中的带宽、缓存资源。我使用了一台日本的节点，在该节点中安装了 BBRv2、cubic拥塞控制，并用Nginx建立了一个测试Web下载服务，通过在上海使用curl以及bench.sh测试，获取了一点的数据结果。 


下面将BBRv2安装的步骤方法以及测试结果分享给读者。


使用BBRv2的条件：

- Linux内核 4.9+ 
- GCC 9.0+

安装编译相关工具

```
yum groups install development -y
yum install gcc bc ncurses-devel openssl-devel elfutils-libelf-devel -y

```

建立BBR安装环境

#### 升级gcc版本
```
// 
gcc -v // 4.8.5 
wget http://ftp.gnu.org/gnu/gcc/gcc-9.2.0/gcc-9.2.0.tar.gz
tar -jxvf gcc-9.2.0.tar.bz2

cd gcc-9.2.0
./contrib/download_prerequisites　

mkdir gcc-build-9.2.0
cd gcc-build-9.2.0

screen -S gcc

../configure -enable-checking=release -enable-languages=c,c++ -disable-multilib
make && make install

// Control + A + B  // 编译时间很长，放后台执行
gcc -v // 9.2.0

```
#### 升级Linux内核
```
uname -r
// 3.10.0-1160.45.1.el7.x86_64

// 安装 ELRepo
sudo rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
sudo rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-2.el7.elrepo.noarch.rpm

// 使用ELRepo升级内核
sudo yum --enablerepo=elrepo-kernel install kernel-ml -y

// 查看是否安装成功
rpm -qa | grep kernel

// 查看 grub2列表, 确认会否有5.xx+内核， 重新建立启动引导
sudo egrep ^menuentry /etc/grub2.cfg | cut -f 2 -d \'

// 5.19.11 位于第二个，索引从0开始， 设置启动索引为1
sudo grub2-set-default 1 

reboot
// 重新查看内核
uname -r
```

### 安装BBRv2

```
git clone -o BBRv2 -b v2alpha  https://github.com/google/bbr.git
// 开始编译
cd BBRv2 && make menuconfig
```

进入下图界面后按  /  按键进入搜索界面，输入bbr2 回车

<div  align="center">
	<img src="/assets/chapter1/bbr-1.png" width = "600"  align=center />
</div>

找到这行，按2，打开 TCP BBR2设置

TCP: advanced congestion control (TCP_CONG_ADVANCED [=y]

<div  align="center">
	<img src="/assets/chapter1/bbr-2.png" width = "600"  align=center />
</div>
设置开启 BBR2, 确认 BBR2 TCP行 为 <M>

<div  align="center">
	<img src="/assets/chapter1/bbr-3.png" width = "600"  align=center />
</div>

选择 save 确认保存，最后生成 config文件

<div  align="center">
	<img src="/assets/chapter1/bbr-4.png" width = "600"  align=center />
</div>

最后一路 Exit， 返回 shell命令行


确认是否配置成功
```
grep -i bbr2 .config
CONFIG_TCP_CONG_BBR2=m // 出现这行表示正常
```

编译 Linux BBRv2内核 
```
screen -S bbr // 由于编译较长，使用screen后台编译

time make rpm-pkg // 开始编译，等待几分钟，确认初始化是否正常
// 编译正常， Control + A + B，放到后台执行， 先吃个晚饭

// 等待 2到3个小时,编译成功后进入
cd /root/rpmbuild/RPMS/x86_64
```

查看新的编译内核
<div  align="center">
	<img src="/assets/chapter1/bbr-5.png" width = "600"  align=center />
</div>

升级支持BBRv2的内核
```
rpm -Uvh kernel-5.13.12-1.x86_64.rpm
```

重新引导

```
grub2-set-default 0
```

设置拥塞算法为BBRv2
```
sed -i '/net.core.default_qdisc/d' /etc/sysctl.conf
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
sed -i '/net.ipv4.tcp_congestion_control/d' /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr2" >> /etc/sysctl.conf

reboot
```
查看系统支持的拥塞算法
```
sysctl net.ipv4.tcp_available_congestion_control
sysctl net.ipv4.tcp_congestion_control

```

### BBRv2测试

测试节点（日本 43.153.177.127， 峰值带宽30Mbps）：延迟、丢包率非常高
<div  align="center">
	<img src="/assets/chapter1/bbr-6.png" width = "600"  align=center />
</div>

#### 先进行默认cubic测试

```
wget -qO- bench.sh | bash
```
<div  align="center">
	<img src="/assets/chapter1/bbr-7.png" width = "600"  align=center />
</div>

CURL下载测试
```
curl  -Lo /dev/null http://43.153.177.127/500mb.zip

```
<div  align="center">
	<img src="/assets/chapter1/bbr-8.png" width = "600"  align=center />
</div>

#### 测试开启BBRv2

```
wget -qO- bench.sh | bash //使用bench.sh进行测试

```
<div  align="center">
	<img src="/assets/chapter1/bbr-9.png" width = "600"  align=center />
</div>

CURL下载测试

```
curl  -Lo /dev/null http://43.153.177.127/500mb.zip
```

<div  align="center">
	<img src="/assets/chapter1/bbr-10.png" width = "600"  align=center />
</div>


总结来说有一定的提升效果，CURL下载提升了 58%左右。如果你的网络环境延迟高、带宽大，可以尝试用BBRv2提升网络效率。
