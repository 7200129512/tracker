# Dockerfile for Koyeb deployment
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build backend
RUN npm run build --workspace=backend

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "run", "start", "--workspace=backend"]
