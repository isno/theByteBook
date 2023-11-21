import { defineUserConfig, defaultTheme } from 'vuepress';
import { mdEnhancePlugin } from "vuepress-plugin-md-enhance";

export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入架构原理与实践',
    description: '构建大规模高可用的分布式系统',
    head: [
        ['link', { rel: "shortcut icon", href: "/assets/favicon.ico" }],

        [ 'script', {}, `
     var _hmt = _hmt || [];
   (function() {
 var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?e84cbf587012e6a1376a6d69805d5aa2";
              var s = document.getElementsByTagName("script")[0]; 
              s.parentNode.insertBefore(hm, s);
            })(); 
     `
 ]
    ],
    plugins: [
        mdEnhancePlugin({
          // 启用脚注
          footnote: true,
          katex: true,
          sub: true,
        }),
    ],
    theme: defaultTheme({
        navbar: [{
                text: '首页',
                link: '/'
            },
            {
                text: '作者',
                link: '/about.md'
            },
            {
                text: '讨论',
                link: 'https://github.com/isno/theByteBook/discussions'
            },
            {
                text: 'GitHub仓库',
                link: 'https://github.com/isno/theByteBook'
            }
        ],
        sidebar: [
            //'/intro.md',
            '/noun.md',
            {
                text: '第一章：云原生技术概论',
                link: "/architecture/summary.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/architecture/history.md',
                    '/architecture/background.md',
                    '/architecture/define-cloud-native.md',
                    '/architecture/target.md',
                    {
                        text: '1.5 云原生代表技术',
                        link: '/architecture/cloud-native-tech.md',
                        children: [
                            '/architecture/container.md',
                            '/architecture/MicroService.md',
                            '/architecture/ServiceMesh.md',
                            '/architecture/Immutable.md',
                            '/architecture/declarative-api.md',
                            '/architecture/devops.md',
                        ]
                    },
                    '/architecture/arc.md',
                    '/architecture/architect.md',
                    '/architecture/conclusion.md', 
                ]
            },
            {
                text: '第二章：构建”足够快“的网络服务',
                link: "/http/summary.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/network/latency.md',
                    '/http/latency.md',
                    {
                        text: '2.3 域名解析环节',
                        link:  '/http/dns.md',
       
                        children: [
                            '/http/dns-ha.md',
                            '/http/http-dns.md',
                        ]
                    },
                    {
                        text: '2.4 HTTP 请求优化',
                        link:  '/http/http-performance.md',
       
                        children: [
                            '/http/compress.md',
                            '/http/protobuf.md',
                        ]
                    },
                    {
                        text: '2.5 HTTPS 原理及 SSL 优化',
                        link:  '/http/https-summary.md',
                        children: [
                            '/http/https.md',
                            '/http/ssl.md'
                        ]
                    },
                    "/http/bbr.md",
                    '/http/Edge-Acceleration.md',

                    {
                        text: '2.8 使用 QUIC 协议',
                        link:  '/http/http3.md',
                        children: [
                            '/http/quic.md',
                            '/http/quic-performance.md'
                        ]
                    },
                ]
            },
            {
                text: '第三章：Linux 内核网络',
                collapsable: true,
                link: '/network/summary.md',
                sidebarDepth: 2,
                children: [
                    '/network/networking.md',
                    {
                        text: '3.2 Linux 内核网络框架',
                        link: "/network/linux-kernel-networking.md",
                        children: [
                            '/network/netfilter.md',
                            '/network/conntrack.md',
                            '/network/XDP.md',
                        ]
                    },
                    {
                        text: '3.3 内核参数优化实践',
                        link: '/network/kernel-performance.md',
                        children: [
                            "/network/RSS.md",
                            "/network/netstack-performance.md",
                            '/network/kernel-bypass.md',
                        ]
                    },
                    '/network/conclusion.md',    
                    /*
                    {
                        text: '3.4 Linux 网络虚拟化',
                        link: "/network/net-virtual.md",
                        children: [
                            '/network/network-namespace.md',
                            '/network/veth-pair.md',
                            '/network/bridge.md',
                            '/network/tun.md',
                            '/network/vxlan.md'
                        ]
                    }*/
                ]
            },
            
            {
                text: '第四章：负载均衡概论',
                link: '/balance/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                '/balance/balance.md',
                '/balance/balance-topology.md',
                {
                    text: "4.3 四层负载均衡",
                    link: '/balance/balance4.md',
                    children: [
                        '/balance/balance4-principle.md',
                        '/balance/balance4-ha.md',
                        '/balance/balance4-conclusion.md',    
                    ]
                },
                {
                    text: "4.4 七层负载均衡",
                    link: '/balance/balance7.md',
                    children: [
                        '/balance/nginx-conf.md',
                        '/balance/balancer7-feature.md',
                    ]
                },
                '/balance/balance-algorithm.md',
                '/balance/conclusion.md',
                ]
            },
            {
                text: "第五章：分布式系统可用性",
                link: '/distributed-system/summary.md',
                children: [
                    '/distributed-system/CAP.md',
                    '/distributed-system/BASE.md',
                    '/distributed-system/idempotent.md',
                    {
                        text: "5.5 分布式事务协议与解决",
                        link: '/distributed-system/transaction.md',
                        children: [
                            '/distributed-system/compensate.md',
                            '/distributed-system/2PC.md',
                        ]
                    }
                ]
            },
            {
                text: '第六章：分布式系统共识',
                collapsable: true,
                link: '/consensus/summary.md',
                sidebarDepth: 2,
                children: [
                    '/consensus/consensus.md',
                    '/consensus/The-Byzantine-General-Problem.md',
                    {
                        text: "5.3 共识算法 Paxos",
                        link: '/consensus/Paxos.md',
                        children: [
                            '/consensus/Paxos-history.md',
                            '/consensus/Paxos-define.md',
                            '/consensus/Basic-Paxos.md',
                            '/consensus/Multi-Paxos.md',
                        ]
                    },
                    '/consensus/raft.md',
                    '/consensus/conclusion.md',
                ]
            },
            {
                text: "第七章：分布式事务",
                link: '/distributed-transaction/summary.md',
                children: [
                    '/distributed-transaction/ACID.md',
                ]
            },
            {
                text: '第八章：容器技术概论',
                link: '/container/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/container/Container-Orchestration-Wars.md',
                    {
                        text: '7.2 容器技术的核心原理',
                        link: '/container/principle.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/namespace.md',
                            '/container/cgroups.md',
                            '/container/unionfs.md'
                        ]
                    },

                    '/container/OCI.md',
                    {
                        text: '7.4 容器镜像',
                        link: '/container/image.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/image-build.md',
                            '/container/Nydus-image.md',
                        ]
                    },
                    {
                        text: '7.5 容器运行时',
                        link: '/container/runtime.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/low-level-runtime.md',
                            '/container/high-level-runtime.md',
                            '/container/kata-containers.md',
                        ]
                    },
                    {
                        text: '7.6 镜像仓库',
                        link: '/container/registry.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/harbor.md',
                            '/container/dragonfly.md'
                        ]
                    },
                    {
                        text: '7.7 容器与kubernetes',
                        link: '/container/container-in-kubernetes.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/CRI-in-Kubernetes.md',
                            '/container/Docker-Kubernetes.md',
                            '/container/RuntimeClass.md'
                        ]
                    },
                    
                ]
            },
            {
                text: '第八章：容器编排系统 Kubernetes',
                link: '/kubernetes/index.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/kubernetes/declarative-api.md',
                    '/kubernetes/namespace.md',
                    '/kubernetes/component.md',
                    {
                        text: '8.4 Kubernetes 核心资源',
                        link: '/kubernetes/resource.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/pod.md',
                            '/kubernetes/deployment.md',
                            '/kubernetes/service.md',
                            '/kubernetes/ingress.md',
                            '/kubernetes/pv.md',
                        ]
                    },
                    {
                        text: '8.5 资源限制模型以及 QoS',
                        link: '/kubernetes/capacity.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/virtual.md',
                            '/kubernetes/requests-limits.md',
                            '/kubernetes/Qos.md',
                        ]
                    },
                    '/kubernetes/AutoScaling.md',
                    '/kubernetes/CRD-Operator.md',

                    '/kubernetes/monitor.md',
                    {
                        text: 'Kubernetes 进阶',
                        link: '/kubernetes/AutoScaling.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/CNI.md',
                            '/kubernetes/CRI.md',
                        ]
                    },
                    {
                        text: '生产级 Kubernetes 高可用部署方案',
                        link: '/kubernetes/install.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/api-server-ha.md',
                            '/kubernetes/controller-manager-scheduler.md',
                            '/kubernetes/etcd-ha.md'                        ]
                    },

                ]
            },
            {
                text: '第九章：服务治理变革 ServiceMesh',
                collapsable: false,
                sidebarDepth: 1,
                link: '/ServiceMesh/summary.md',
                children: [
                    '/MicroService/micro-service-arc.md',
                    '/MicroService/ServiceMesh-implement.md',
                    '/MicroService/ServiceMesh-Kubernetes.md',
                    '/MicroService/Envoy.md',
                    '/MicroService/Istio.md'
                ]
            },
            {
                text: '第十章：GitOps 的落地与实施',
                link: '/GitOps/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/GitOps/GitOps.md',
                    '/GitOps/AoneFlow.md',
                    {
                        text: "基础设施即代码",
                        link: '/GitOps/IaC.md',
                        children: [
                            '/GitOps/Kustomize.md',
                            '/GitOps/Helm.md',
                        ]
                    },
                    '/GitOps/CICD.md',
                    {
                        text: "持续集成",
                        link: '/GitOps/CI.md',
                        children: [
                            '/GitOps/SonarQube.md'
                        ]
                    },
                    {
                        text: "持续交付",
                        link: '/GitOps/CD.md',
                        children: [                         
                           '/GitOps/ArgoCD.md',
                           '/GitOps/Flagger.md'
                        ]
                    },
                ]
            },
            {
                text: '第十一章：架构可观测性',
                link: '/Observability/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/Observability/monitor-upgrade.md',
                    '/Observability/metrics.md',
                    '/MicroService/tracing.md'
                ]
            },
            {
                text: '第十二章：FinOps云成本管理',
                link: '/FinOps/summary.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/FinOps/finops-define.md',
                    '/FinOps/framework.md',
                    '/FinOps/finops-for-kubernetes.md',
                    '/FinOps/kubecost.md',
                    '/FinOps/conclusion.md'
                ]
            }
        ]
    })
});