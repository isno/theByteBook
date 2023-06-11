import { defineUserConfig, defaultTheme } from 'vuepress';

export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入架构原理与实践',
    description: '高可用服务体系原理与实践',
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
    plugins: [],
    theme: defaultTheme({
        navbar: [{
                text: '首页',
                link: '/'
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
            '/intro.md',
            '/recommend.md',
            {
                text: '第一章：架构的演进',
                link: "/architecture/intro.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/architecture/define-cloud-native.md',
                    '/architecture/arc.md',
                    '/architecture/arc-guide.md'
                ]
            },
            {
                text: '网络架构基础与实践',
                collapsable: true,
                link: '/content/chapter1/intro.md',
                sidebarDepth: 2,
                children: [
                    '/content/chapter1/latency.md',
                    {
                        text: '基础网络',
                        link: "/content/chapter1/underlay.md",
                        children: [
                            '/content/chapter1/bgp.md',
                            '/content/chapter1/anycast.md',
                            '/network/tcp.md',
                            '/content/chapter1/congestion-control.md'

                        ]
                    },
                    {
                        text: '网络虚拟化',
                        link: "/content/chapter1/SDN.md",
                        children: [
                            '/content/chapter1/network-namespace.md',
                            '/content/chapter1/veth-pair.md',
                            '/content/chapter1/bridge.md',
                            '/content/chapter1/route.md',
                            '/content/chapter1/tun.md',
                            '/content/chapter1/vxlan.md'
                        ]
                    },
                    '/network/netfilter.md',
                    {
                        text: '网络优化指南',
                        link: "/content/chapter1/net-optimize-intro.md",
                        children: [
                            '/network/kernel.md',
                            {
                                text: "传输层优化",
                                link: "/content/chapter1/transport.md",
                                children: [
                                    '/content/chapter1/tcp-handshake.md',
                                    '/content/chapter1/tcp-handwave.md',
                                    '/network/bbr.md',
                                ]
                            },
                            '/content/chapter1/edge.md',
                            '/network/kernel-bypass.md'
                        ]
                    },

                    {
                        text: '网络可用性观测',
                        link: "/content/chapter1/index.md",
                        children: [
                            '/content/chapter1/mtr.md',
                            '/content/chapter1/tcpdump.md'
                        ]
                    },
                ]
            },
            {
                text: '应用层网络架构实践',
                link: "/http/intro.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/http/https.md',
                    '/http/latency.md',

                    {
                        text: "DNS 解析原理",
                        link: '/http/dns.md',
                        children: [
                            '/http/http-dns.md',
                            '/http/dns-ha.md',
                            //'/http/quic-performance.md',
                        ]
                    },
                    '/http/compress.md',
                    {
                        text: "引入 QUIC",
                        link: '/http/quic.md',
                        children: [
                            '/http/nginx-quic.md',
                            //'/http/quic-performance.md',
                        ]
                    },

                    '/http/ssl.md',
                    '/http/ssl-performance.md',
                    '/http/protobuf.md',

                ]
            },
            {
                text: '负载均衡与网关架构实践',
                link: '/api-gateway/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [{
                        text: "四层负载均衡",
                        link: '/api-gateway/balance4.md',
                        children: [
                            '/api-gateway/LVS.md',
                            '/api-gateway/lvs-mod.md',
                            '/api-gateway/lvs-balance.md'
                        ]
                    },
                    {
                        text: "七层负载均衡",
                        link: '/api-gateway/balance7.md',
                        children: [
                            '/api-gateway/nginx-conf.md'
                        ]
                    },
                    {
                        text: "网关的理解与实践",
                        link: '/api-gateway/api-gateway.md',
                        children: [
                            '/api-gateway/OpenResty.md',
                            '/api-gateway/limit.md',
                            '/api-gateway/openresty-module.md',
                            '/api-gateway/openresty-fire.md'
                        ]
                    },

                ]
            },
            {
                text: "分布式集群理论与实践",
                link: '/distributed-system/distributed-transaction.md',
                children: [
                    '/distributed-system/BASE.md',
                    '/distributed-system/cap.md',
                    '/distributed-system/ACID.md',
                     {
                        text: "分布式事务",
                        link: '/distributed-system/transaction.md',
                        children: [
                            '/distributed-system/compensate.md',
                            '/distributed-system/idempotent.md',
                            '/distributed-system/2PC.md',
                            '/distributed-system/XA.md',
                            '/distributed-system/TCC.md',
                            '/distributed-system/Saga.md',
                            '/distributed-system/Seata.md'
                        ]
                    },
                    {
                        text: "分布式集群高可用",
                        link: '/distributed-system/consistency.md',
                        children: [
                            '/distributed-system/consensus.md',
                            '/distributed-system/raft.md',
                        ]
                    },
                ]
            },
            {
                text: '从消息到事件流',
                link: '/MessageQueue/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/MessageQueue/mq-diff.md',
                    '/MessageQueue/mq-benchmark.md'
                ]
            },
            {
                text: '容器技术',
                link: '/container/container.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/container/OCI.md',
                    {
                        text: '容器镜像',
                        link: '/container/image.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/rootfs.md',
                            '/container/image-build.md',
                            '/container/Nydus-image.md',
                        ]
                    },
                    {
                        text: '容器运行时',
                        link: '/container/runtime.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/low-level-runtime.md',
                            '/container/high-level-runtime.md',
                            '/container/kata-container.md',
                            '/container/CRI-in-Kubernetes.md',
                            '/container/Docker-Kubernetes.md',
                            '/container/containerd.md',
                            '/container/CRI-O.md',
                            '/container/RuntimeClass.md'
                        ]
                    },
                    {
                        text: '镜像仓库',
                        link: '/container/registry.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/container/harbor.md',
                            '/container/dragonfly.md'
                        ]
                    },
                ]
            },
            {
                text: '容器编排系统 Kubernetes',
                link: '/kubernetes/index.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/container/declarative-api.md',
                    '/kubernetes/namespace.md',
                    {
                        text: 'Kubernetes 核心资源',
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
                        text: 'Kubernetes 资源限制及弹性伸缩',
                        link: '/kubernetes/AutoScaling.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/virtual.md',
                            '/kubernetes/requests-limits.md',
                        ]
                    },
                    {
                        text: 'Kubernetes 架构与组件',
                        link: '/kubernetes/component.md',
                        collapsable: false,
                        sidebarDepth: 1,
                        children: [
                            '/kubernetes/kube-proxy.md',
                        ]
                    },
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
                ]
            },
            {
                text: '服务治理变革 ServiceMesh',
                collapsable: false,
                sidebarDepth: 1,
                link: '/MicroService/micro-service.md',
                children: [

                    '/MicroService/micro-service-principle.md',
                    '/MicroService/micro-service-arc.md',

                    {
                        text: "ServiceMesh",
                        link: '/MicroService/ServiceMesh.md',
                        children: [
                            '/MicroService/ServiceMesh-implement.md',
                            '/MicroService/ServiceMesh-Kubernetes.md',

                        ]
                    },
                    '/MicroService/Envoy.md',
                    '/MicroService/Istio.md'
                ]
            },
            {
                text: 'Serverless架构',
                link: '/serverless/Serverless.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/serverless/Knative.md',
                ]
            },
            {
                text: '基于云原生技术的 CI/CD 设计与开发',
                link: '/CI-CD/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/CI-CD/tools.md',
                ]
            },
            {
                text: '架构可观测性',
                link: '/Observability/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/Observability/monitor-upgrade.md',
                    '/MicroService/tracing.md'
                ]
            },
            {
                text: 'FinOps云成本管理',
                link: '/FinOps/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/FinOps/finops-define.md',
                ]
            }
        ]
    })
});