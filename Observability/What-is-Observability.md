# 9.1 什么是可观测性

什么是可观测性？观测的是什么？Google Cloud 介绍 OpenTelemetry 时提到了这么一个概念 telemetry data [^1]。

:::tip telemetry data（遥测数据）

The information that you will use to determine whether an application is healthy and performing as designed is called telemetry data. 

遥测数据是指采样和汇总有关软件系统性能和行为的数据，这些数据（响应时间、错误率、资源消耗等）用于监控和了解系统的当前状态。
:::

如果你在生活中观察仔细，观看火箭发射的直播时，能注意到发射指挥大厅内回响起一系列有条不紊的口令：“东风光学USB雷达跟踪正常，遥测信号正常”，软件领域的可测性以及系统遥测数据本质和火箭发射系统一致，就是通过收集系统内部各类的遥测数据来了解系统内部正在发生的事情。

所以，**可观测性本质上一门数据收集和分析的科学**，帮助大家在 DevOps 中遇到的故障定位难、容量评估、链路梳理、性能分析等问题。

[^1]: 参见 https://cloud.google.com/learn/what-is-opentelemetry
