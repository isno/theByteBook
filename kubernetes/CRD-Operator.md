# CRD 和 Operator

Kuberneters 中一切可管理的都可视为资源（Resource）。如果自带资源类型不足以满足业务需求，需要定制开发怎么办呢？

Kubernetes 1.7 之后增加了对 CRD（Custom Resource Definition） 自定义资源二次开发能力来扩展 Kubernetes API，通过 CRD 我们可以向 Kubernetes API 中增加新资源类型，而不需要修改 Kubernetes 源码，该功能大大提高了 Kubernetes 的扩展能力。

- 使用 CRD 自定义资源，并进行 CRUD 

