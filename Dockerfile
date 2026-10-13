FROM node:20-slim

# Шрифты для текста в видео (libass ищет их через fontconfig)
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-inter fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
