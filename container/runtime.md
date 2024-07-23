# 7.4 容器运行时：从 Docker 到 CRI

Docker 大概也没想到，在 2022 年它还能再次成为舆论的焦点，事件的起源是 Kubernetes 宣布开始进入废弃 dockershim 支持的倒计时，最后讹传讹被人误以为 Docker 不能再用了。

虽说此次事件有众多标题党的推波助澜，但也侧面说明了 Kubernetes 与 Docker 的关系十分微妙。本节，我们把握这两者关系的变化，从中理解容器运行时规范以及 Kubernetes CRI 容器运行时接口的演变。

