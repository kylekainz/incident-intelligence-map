# 🐳 Docker Deployment Guide

This guide explains how to deploy your Incident Intelligence Map application using Docker containers.

## 📋 Prerequisites

- Docker installed on your system
- Docker Compose installed
- Environment variables configured

## 🏗️ Architecture

The application consists of two containers:
- **Backend**: FastAPI Python application (Port 8000)
- **Frontend**: React application served by Nginx (Port 3000)

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory with your configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Configuration
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Frontend Configuration (Optional)
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs

## 🔧 Container Details

### Backend Container

- **Base Image**: Python 3.12-slim
- **Port**: 8000
- **Features**:
  - FastAPI application
  - WebSocket support
  - PostgreSQL database connection
  - JWT authentication
  - Geospatial operations (GeoAlchemy2)

### Frontend Container

- **Base Image**: Nginx Alpine
- **Port**: 3000 (mapped to 80 internally)
- **Features**:
  - React SPA
  - Nginx reverse proxy
  - Static file serving
  - Client-side routing support
  - Gzip compression
  - Security headers

## 📊 Health Checks

Both containers include health checks:

- **Backend**: Checks `/health` endpoint every 30s
- **Frontend**: Checks nginx health every 30s

## 🔒 Security Features

- Non-root user in backend container
- Security headers in nginx
- Environment variable configuration
- No hardcoded secrets

## 🚀 Production Deployment

### 1. Update Environment Variables

```bash
# Production database
DATABASE_URL=postgresql://prod_user:prod_password@prod_host:5432/prod_db

# Strong secret key
SECRET_KEY=your-production-secret-key-here

# Production CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Use Production Images

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### 3. Reverse Proxy (Optional)

For production, consider using a reverse proxy like Traefik or Nginx:

```yaml
# Example with Traefik
services:
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.tls=true"
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8000
   lsof -i :3000
   ```

2. **Database Connection Issues**
   ```bash
   # Check backend logs
   docker-compose logs backend
   ```

3. **Frontend Build Issues**
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   ```

### Debug Commands

```bash
# Enter container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# View container resources
docker stats

# Check container health
docker-compose ps
```

## 📁 File Structure

```
├── docker-compose.yml          # Main orchestration file
├── backend/
│   ├── Dockerfile             # Backend container definition
│   ├── .dockerignore          # Backend build exclusions
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── Dockerfile             # Frontend container definition
│   ├── .dockerignore          # Frontend build exclusions
│   ├── nginx.conf             # Nginx configuration
│   └── package.json           # Node.js dependencies
└── .env                       # Environment configuration
```

## 🔄 Updates and Maintenance

### Update Dependencies

```bash
# Backend
docker-compose exec backend pip install --upgrade package_name

# Frontend
docker-compose exec frontend npm update package_name
```

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Restart services
docker-compose up -d
```

## 📈 Monitoring

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Resource Usage

```bash
# Container stats
docker stats

# System resources
docker system df
```

## 🎯 Best Practices

1. **Environment Variables**: Never hardcode secrets
2. **Health Checks**: Always include health check endpoints
3. **Security**: Use non-root users and security headers
4. **Caching**: Optimize Docker layer caching
5. **Monitoring**: Monitor container health and resources
6. **Backups**: Regular database backups
7. **Updates**: Keep base images updated

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure ports are available
4. Check database connectivity
5. Review Docker and Docker Compose versions

---

**Happy Deploying! 🚀**
