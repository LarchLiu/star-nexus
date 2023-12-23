FROM node:18-slim as builder

RUN npm i -g pnpm

ADD ./ /app
WORKDIR /app

RUN pnpm i
RUN pnpm build:nuxt


FROM node:18-slim

RUN mkdir /app
COPY --from=builder /app/server/nuxt3/.output /app/
WORKDIR /app

EXPOSE 3000

ARG KV_DRIVER
ENV KV_DRIVER=$KV_DRIVER

ARG KV_REST_API_URL
ENV KV_REST_API_URL=$KV_REST_API_URL

ARG KV_REST_API_TOKEN
ENV KV_REST_API_TOKEN=$KV_REST_API_TOKEN

ARG GITHUB_REPO_DISPATCH_URL
ENV GITHUB_REPO_DISPATCH_URL=$GITHUB_REPO_DISPATCH_URL

ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN

ARG REDIS_URL
ENV REDIS_URL=$REDIS_URL

ARG CF_ACCOUNT_ID
ENV CF_ACCOUNT_ID=$CF_ACCOUNT_ID

ARG CF_NAMESPACE_ID
ENV CF_NAMESPACE_ID=$CF_NAMESPACE_ID

ARG CF_API_TOKEN
ENV CF_API_TOKEN=$CF_API_TOKEN

ENV NODE_ENV=production

CMD ["node", "/app/server/index.mjs"]

