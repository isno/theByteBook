# 7.4.2 安全容器运行时

尽管容器有许多技术优势，然而传统以 runc 为代表基于共享内核技术进行的软隔离还是存在一定的风险性。如果某个恶意程序利用系统缺陷从容器中逃逸，就会对宿主机造成严重威胁，尤其是公有云环境，安全威胁很可能会波及到其他用户的数据和业务。

将虚拟机的安全优势与容器的高速及可管理性相结合，为用户提供标准化、安全、高性能的容器解决方案，于是就有了 Kata Containers 。

<div  align="center">
	<img src="../assets/kata-container.webp" width = "550"  align=center />
	<p>Kata Containers 与传统容器技术的对比[^1]</p>
</div>

Kata Containers 安全容器的诞生解决了许多普通容器场景无法解决的问题，譬如多租户安全保障、差异化 SLO混合部署、可信/不可信容器混合部署等等。在这些优势的基础上，Kata Containers 也在虚拟化上也追求极致的轻薄，从而让整体资源消耗和弹性能力接近 runc 容器方案，以此达到 Secure as VM、Fast as Container 的技术目标。

Kata Containers 运行符合 OCI 规范，同时兼容 Kubernetes CRI（虚拟机级别的 Pod 实现）。为了缩短容器的调用链、高效地和 Kubernetes CRI 集成，Kata-Container 直接将 containerd-shim 和 kata-shim 以及 kata-proxy 融合到一起。CRI 和 Kata Containers 的集成下图所示：

<div  align="center">
	<img src="../assets/kata-container.png" width = "600"  align=center />

</div>

[^1]: 图片来源 https://medium.com/kata-containers/inject-workloads-with-kata-containers-in-istio-4730a57b33fd
[^2]: 图片来源 https://github.com/kata-containers/documentation/blob/master/design/architecture.md