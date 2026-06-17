FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=development
ENV VITE_API_URL=http://34.26.220.206

# Install dependencies (separate layer for caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . /app/

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
