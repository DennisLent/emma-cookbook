FROM node:20 AS build
WORKDIR /app

COPY cookbook-app/package*.json ./
RUN npm install

COPY cookbook-app/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
