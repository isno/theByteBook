#Centos升级


#### 查看内核版本 

uname -r

3.10.0-1160.el7.x86_64


#### 安装内核库

rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
yum install -y https://www.elrepo.org/elrepo-release-7.el7.elrepo.noarch.rpm


#### 查看内核列表

yum --disablerepo="*" --enablerepo="elrepo-kernel" list available

#### 安装长期支持版本

yum --enablerepo=elrepo-kernel install kernel-lt-devel kernel-lt -y



#### 查看系统上可使用的内核

awk -F\' '$1=="menuentry " {print i++ " : " $2}' /etc/grub2.cfg


###  设置新内核为grub2的默认版本

grub2-set-default 0

#### 生成grub配置文件


grub2-mkconfig -o /boot/grub2/grub.cfg


reboot