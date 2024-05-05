# 7.3 容器运行时：从 Docker 到 CRI

Docker 大概也没想到，在孕育 Docker 的母公司倒闭的 8 年之后还能再次成为舆论的焦点[^1]，事件的起源是 Kubernetes 宣布开始进入废弃 dockershim 支持的倒计时，最后讹传讹被人误以为 Docker 不能再用了。

虽说此次事件有众多标题党的推波助澜，但也侧面说明了 Kubernetes 与 Docker 两者的关系十分微妙。而把握住两者关系的变化过程，就成了我们理解 Kubernetes 架构演变与容器运行时规范的线索。