# 🥜 Peanut Butter Dashboard

A full-stack data analytics dashboard that leverages real-time and static datasets to support insights and predictions in two core areas:

1. **Household Energy Consumption Monitoring**
2. **Electric Vehicle (EV) Charge Point Planning**

## ⚙️ Tools & Technologies

### 📦 Packages & Libraries

| Purpose               | Tools Used                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| Data Processing       | `pandas`, `numpy`                                                          |
| ML & Forecasting      | `sklearn`, `statsmodels`, `KDE`                    |
| Geospatial Analysis   | `GeoPandas`, `shapely`, `folium`, `scipy`                                  |                      
| Visualization         | `Next.js`, `shadcn/ui`, `recharts`, `Tailwind CSS`                         |

---

### ☁️ Cloud Services & Architecture

| Component               | Service/Tool                      |
|-------------------------|-----------------------------------|
| Data Storage            | Amazon S3                         |
| Data Transformation     | AWS Glue (ETL jobs)               |
| Real-time Data          | Kafka                             |
| Real-time Warehouse     | Amazon RDS                        |
| Static Warehouse        | Amazon Redshift                   |
| Frontend Deployment     | Vercel                            |
| Backend/API             | AWS Lambda + API Gateway          |
| GenAI                   | Claude 3 Sonnet via Bedrock API   |

---

## 🚀 Getting Started

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```