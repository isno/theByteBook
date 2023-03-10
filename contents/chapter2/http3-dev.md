# HTTP/3的业界进展

### HTTP/3 进展
- 2013年Google推出了基于UDP的QUIC协议，全称Quick UDP Internet Connections 旨在使网页传输更快。
- 2015年6月,QUIC的网络草案被正式提交至ETF互联网工程任务组。
- 2018年10、11月,HTTP-over-QUIC被提出和正式更名为HTTP/3。
- 2019年9月,Cloudflare和Google Chrome(Canary build)添加支持HTTP/3支持,Firefox Nightly也在2019年秋季之后添加支持。
- 2022年6月6日,IETF正式标准化HTTP/3为RFC9114。

### HTTP/3 业界使用情况

#### 客户端

- 2019年9月,Cloudflare和Google Chrome(Canary build)添加支持HTTP/3,同年秋季后,Firefox Nightly也添加支持。
- 2020年,Chrome、Firefox、Safari浏览器相继开始支持HTTP/3
- 2021年9月,IOS系统网络库有条件地支持HTTP/3,Android等暂不支持。

#### 服务器

- 2021年Q4,F5和Microsoft发布支持HTTP/3
- 2021年11月,HAProxy 2.5开始支持HTTP/3,但是处于预实验阶段,仅用于开发。
- 2021年底,腾讯云CLB、CDN开放云客户使用TQUIC(基于Google cronet开发)
- 2022年2月,阿里开源XQUIC,比计划延期了一年多,据说上生产环境了。
- Nginx:分支nginx-quic开发中,2021年底合入主分支的roadmap已延期,暂无新消息,乐观估计也要到2023年的nginx-1.24.0版本。
- Apache httpd:暂无相关消息。
- Tomcat:暂无相关消息。

