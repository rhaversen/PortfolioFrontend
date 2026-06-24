# This dockerfile specifies the environment the production
# code will be run in, along with what files are needed
# for production

FROM node:24-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN useradd -m portfolio_frontend_user

COPY .next/ ./.next/
COPY public/ ./public/
COPY package*.json ./

RUN chown -R portfolio_frontend_user:portfolio_frontend_user /app

USER portfolio_frontend_user

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
