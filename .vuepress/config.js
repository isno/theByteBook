import { defineUserConfig, defaultTheme } from 'vuepress';

import { readingTimePlugin } from "vuepress-plugin-reading-time2";


export default defineUserConfig({
    lang: 'zh-CN',
    title: '深入架构原理与实践',
    description: '高可用服务体系原理与实践',
    head: [
        ['link', { rel: "shortcut icon", href: "/assets/favicon.ico" }],
    ],
    plugins: [
    
    ],
    theme: defaultTheme({
        navbar: [{
                text: '首页',
                link: '/'
            },
            {
                text: 'GitHub仓库',
                link: 'https://github.com/isno/theByteBook'
            }
        ],
        sidebar: [
            '/intro.md',
            {
                text: '网络的原理与应用',
                collapsable: true,
                link: '/content/chapter1/intro.md',
                sidebarDepth: 0,
                children: [
                    '/content/chapter1/latency.md',
                    {
                        text: '基础网络',
                        link: "/content/chapter1/underlay.md",
                        children: [
                            '/content/chapter1/bgp.md',
                            '/content/chapter1/anycast.md',
                            '/content/chapter1/congestion-control.md',
                           
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
                            '/content/chapter1/vxlan.md',

                        ]
                    },
                    {
                        text: '内核网络以及内核旁路技术',
                        link: "/network/kernel.md",
                        children: [
                          '/network/netfilter.md',
                          '/content/chapter1/dpdk.md'
                        ]
                    },
                   
                    {
                        text: '网络优化指南',
                        link: "/content/chapter1/net-optimize-intro.md",
                        children: [
                            '/content/chapter1/net-optimize.md',
                            {
                                text: "传输层优化",
                                link: "/content/chapter1/transport.md",
                                children: [
                                    '/content/chapter1/tcp-handshake.md',
                                    '/content/chapter1/tcp-handwave.md',
                                ]
                            },
                           
                            '/content/chapter1/edge.md',
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
                text: '移动端网络架构指南',
                link: "/http/intro.md",
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/http/latency.md',
                    '/http/http-dns.md',
                    '/http/compress.md',
                    '/http/ssl.md'
                ]
            },
            {
                text: '负载均衡与网关架构实践',
                link: '/api-gateway/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    {
                        text:"四层负载均衡", 
                        link: '/api-gateway/balance4.md',
                        children: [
                             '/api-gateway/LVS.md'
                        ]
                    },
                    {
                        text:"七层负载均衡", 
                        link: '/api-gateway/balance7.md',
                        children: [
                             '/api-gateway/nginx-conf.md'
                        ]
                    },
                    '/api-gateway/api-gateway.md',
                    '/api-gateway/OpenResty.md'
                ]
            },
            {
                text: '分布式与微服务系统',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/distributed-system/cap.md',
                    '/content/product/idempotent.md',
                    '/distributed-system/tracing.md'
                ]
            },
            {
                text: '容器与服务编排',
                link: '/CloudNative/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                    '/CloudNative/define-cloud-native.md',
                    '/CloudNative/k8s-docker.md'
                ]
            },
            {
                text: 'FinOps云成本管理',
                link: '/FinOps/intro.md',
                collapsable: false,
                sidebarDepth: 1,
                children: [
                ]
            }
        ]
    })
});