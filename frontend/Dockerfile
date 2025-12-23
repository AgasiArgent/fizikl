# Frontend Dockerfile - Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
