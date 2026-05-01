# Build stage
FROM ghcr.io/gohugoio/hugo:latest AS builder

USER root

# Install Node.js and pnpm
RUN apk add --no-cache nodejs npm \
    && npm install -g pnpm@10.23.0

WORKDIR /src
COPY . .

# Install dependencies and build
# Note: Skip summary generation if OPENAI_API_KEY is not provided
RUN pnpm install --frozen-lockfile \
    && (pnpm summary || echo "Skipping summary generation") \
    && hugo --gc --minify \
    && npx pagefind --source "public"

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /src/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
