# Keepalived 主备部署

```
mkdir -p /root/nginx/www/
echo "hello-1" >> index.html

docker run -p 80:80 --name nginx1 -v /root/nginx/www/:/usr/share/nginx/html:ro -d nginx
```

