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
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
