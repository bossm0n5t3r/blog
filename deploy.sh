#!/bin/bash

# Exit on error
set -e

# Image name
IMAGE_NAME="blog"
CONTAINER_NAME="blog-container"
PORT=8080

echo "🚀 Building Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing existing container: $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

echo "🏃 Running container: $CONTAINER_NAME on port $PORT..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:80 \
    $IMAGE_NAME

echo "✅ Deployment successful!"
echo "📍 Access your blog at: http://localhost:$PORT"
