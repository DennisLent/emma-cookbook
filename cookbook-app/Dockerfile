FROM node:20 AS build
ARG APP_VERSION=dev
ARG APP_GIT_SHA=local
ENV VITE_APP_VERSION=${APP_VERSION}
ENV VITE_APP_GIT_SHA=${APP_GIT_SHA}
WORKDIR /app

COPY cookbook-app/package*.json ./
RUN npm install

COPY cookbook-app/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
