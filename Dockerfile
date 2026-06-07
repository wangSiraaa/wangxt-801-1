FROM nginx:1.25-alpine

LABEL maintainer="community-garden"
LABEL description="社区菜园认领图 Web 前端"
LABEL version="1.0.0"

RUN rm -rf /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p /usr/share/nginx/html/css /usr/share/nginx/html/js

COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

RUN echo "50x.html placeholder" > /usr/share/nginx/html/50x.html

RUN ls -la /usr/share/nginx/html/ && \
    ls -la /usr/share/nginx/html/css/ && \
    ls -la /usr/share/nginx/html/js/

RUN nginx -t

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
