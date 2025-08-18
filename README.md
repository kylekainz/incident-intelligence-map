# Incident Intelligence Map

A real-time, incident reporting and management system that helps communities track and respond to various types of incidents through interactive mapping, intelligent analytics, and live notifications.

## 🌟 Features

### 🗺️ Interactive Mapping
- **Multi-View Modes**: Markers, Icons, Heatmap, and AI Predictions
- **Real-time Updates**: Live incident synchronization across all users
- **Location Services**: GPS integration with user location tracking
- **Responsive Design**: Mobile-optimized with expandable map view

### 🤖 AI-Powered Intelligence
- **Hotspot Detection**: Machine learning-based incident clustering
- **Risk Assessment**: Multi-factor risk scoring (temporal, spatial, priority)
- **Incident Prediction**: ML-powered forecasting of future incident locations
- **Pattern Recognition**: Temporal and spatial pattern analysis using DBSCAN clustering

### 📱 Real-Time Notifications
- **Location-Based Alerts**: Customizable notification radius (1-25 miles)
- **Live Updates**: WebSocket-powered real-time incident notifications
- **Smart Filtering**: Category and priority-based alert customization
- **Proximity Alerts**: Automatic notifications for nearby incidents

### 📊 Advanced Analytics
- **Data Visualization**: Interactive charts and statistics
- **Trend Analysis**: Time-series incident pattern analysis
- **Category Distribution**: Incident type and priority breakdowns
- **Response Time Metrics**: Performance tracking and optimization

### 🛠️ Admin Management
- **Incident Management**: Status updates, priority changes, deletion
- **User Authentication**: JWT-based secure admin access
- **Bulk Operations**: Efficient incident processing workflows
- **Audit Trail**: Complete incident history tracking

## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI Framework**: API with automatic documentation
- **PostgreSQL + GeoAlchemy2**: Spatial database with PostGIS extensions
- **SQLAlchemy ORM**: Robust database abstraction and management
- **WebSocket Manager**: Real-time bidirectional communication
- **JWT Authentication**: Secure token-based user authentication
- **Machine Learning**: Scikit-learn integration for AI features

### Frontend (React + Vite)
- **React 19**: Modern React with hooks and functional components
- **Leaflet Maps**: Interactive mapping with multiple visualization layers
- **Tailwind CSS**: Utility-first responsive design framework
- **Chart.js**: Data visualization and analytics charts
- **Real-time Updates**: WebSocket integration for live data

### Infrastructure
- **Docker**: Containerized deployment with docker-compose
- **Nginx**: Production-ready web server for frontend
- **Supabase**: Cloud PostgreSQL database with connection pooling
- **Environment Configuration**: Secure environment variable management

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 

### 1. Clone the Repository
```bash
git clone https://github.com/kylekainz/incident-intelligence-map.git
cd incident-intelligence-map
```

### 2. Environment Setup
The project includes a pre-configured `.env` file with all necessary environment variables. The application is ready to run with the existing Supabase database configuration.

### 3. Start the Application
```bash
docker compose up --build
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📋 Incident Categories

The system supports comprehensive incident categorization:

| Category | Description | Priority Levels |
|----------|-------------|-----------------|
| 🕳️ **Pothole** | Road surface damage | Low/Medium/High |
| 🦌 **Wildlife** | Animal-related incidents | Low/Medium/High |
| 💡 **Street Light Out** | Lighting infrastructure issues | Low/Medium/High |
| 🗑️ **Debris/Trash** | Roadway obstruction | Low/Medium/High |
| 🚗 **Traffic Jam** | Congestion and delays | Medium/High |
| 🚨 **Car Accident** | Vehicle collision incidents | High |
| 🚙 **Broken Down Car** | Vehicle mechanical issues | Medium/High |
| 🚧 **Lane Closure** | Road construction/closure | Medium/High |
| 👮 **Police** | Law enforcement activity | Medium/High |

## 🔐 Authentication

### Admin Access
- **Username**: `admin`
- **Password**: `password`
- **Features**: Full incident management, analytics, and system administration

### Security Features
- JWT token-based authentication
- Automatic token expiration (30 minutes)
- Secure password hashing with bcrypt
- CORS protection for cross-origin requests

## 📊 AI & Machine Learning Features

### Hotspot Detection
- **DBSCAN Clustering**: Spatial incident clustering with adaptive parameters
- **Risk Scoring**: Multi-factor risk assessment (0-100 scale)
- **Temporal Analysis**: Pattern recognition across time dimensions
- **Spatial Density**: Geographic concentration analysis

### Predictive Analytics
- **Incident Prediction**: ML-based forecasting of future incident locations
- **Confidence Scoring**: Reliability metrics for predictions
- **Pattern Learning**: Continuous improvement through data analysis
- **Anomaly Detection**: Identification of unusual incident patterns

### ML Metrics
- **Clustering Quality**: Silhouette score analysis for optimal parameters
- **Data Sufficiency**: Assessment of training data quality
- **Model Performance**: Real-time model evaluation and status

## 🌐 API Endpoints

### Core Incident Management
- `POST /incidents` - Create new incident
- `GET /incidents` - Retrieve all incidents
- `GET /incidents/{id}` - Get specific incident
- `PUT /incidents/{id}` - Update incident status
- `DELETE /admin/incidents/{id}` - Delete incident (admin only)

### Advanced Features
- `GET /trend-analysis` - AI-powered trend analysis
- `GET /admin/analytics` - Comprehensive analytics dashboard
- `GET /incidents/nearby/{user_id}` - Location-based incident search
- `POST /user-location` - Update user location for notifications

### Authentication
- `POST /auth/login` - Admin authentication
- `GET /auth/verify` - Token verification

### WebSocket
- `WS /ws` - Real-time updates and notifications


## 🛠️ Development

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm run test
```

### Building for Production
```bash
# Build Docker images
docker compose build --no-cache

# Start production services
docker compose up -d
```

## 📁 Project Structure

```
incident-intelligence-map/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── auth.py         # Authentication logic
│   │   ├── db.py           # Database configuration
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx         # Main application
│   │   └── index.jsx       # Entry point
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile          # Frontend container
├── docker-compose.yml       # Service orchestration
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT encryption secret
- `ALGORITHM`: JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `ALLOWED_ORIGINS`: CORS allowed origins

### Database Schema
- **incidents**: Core incident data with spatial geometry
- **user_locations**: User location tracking for notifications
- **PostGIS Integration**: Advanced spatial queries and indexing

## 📈 Performance Features

- **Real-time Updates**: WebSocket-powered live synchronization
- **Spatial Indexing**: PostGIS spatial database optimization
- **Connection Pooling**: Supabase connection management
- **Caching**: Intelligent data caching and optimization
- **Responsive Design**: Mobile-first responsive interface

## 🚀 Deployment

### Docker Deployment
```bash
# Production deployment
docker compose -f docker-compose.yml up -d

# Scale services
docker compose up -d --scale backend=3
```

### Cloud Deployment
- **Supabase**: Database hosting with automatic scaling
- **Docker**: Container orchestration support
- **Environment**: Configurable for any cloud provider

