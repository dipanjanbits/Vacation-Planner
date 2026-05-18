FROM node:18-alpine as build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY public/ public/
COPY src/ src/

# Accept API URL as build argument (from CI/CD)
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production - serve with nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create entrypoint script to inject env vars
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'export API_BASE_URL=${API_BASE_URL:-http://localhost:8000}' >> /docker-entrypoint.sh && \
    echo 'envsubst < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp' >> /docker-entrypoint.sh && \
    echo 'mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
