FROM node:22
LABEL "language"="nodejs"
LABEL "framework"="astro"
WORKDIR /src
RUN npm update -g npm
COPY . .
RUN npm install
RUN npm run build
EXPOSE 8080
ENV HOST=0.0.0.0
ENV PORT=8080
CMD ["node", "dist/server/entry.mjs"]
