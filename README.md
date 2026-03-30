# Pixel CRM - Neon PostgreSQL Edition

A standalone CRM application migrated from Supabase to a custom **Express.js + Neon PostgreSQL** architecture. This version is designed for maximum portability and easy deployment on Vercel.

## 🚀 Key Features

- **Custom API Backend**: Built with Express.js to handle all database operations.
- **Neon PostgreSQL**: Modern, serverless PostgreSQL with branching support.
- **Vercel Optimized**: Configured for single-unit deployment (Frontend + API).
- **No JWT/Supabase Auth**: Simplified direct-to-DB authentication for faster development.
- **Premium UI**: Modern, responsive dashboard with rich aesthetics.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Backend**: Express.js (Node.js).
- **Database**: Neon PostgreSQL.
- **Deployment**: Vercel.

## 🏁 Getting Started

### 1. Database Setup
1. Create a project on [Neon.tech](https://neon.tech).
2. Open the **SQL Editor** in your Neon console.
3. Copy and run the contents of `neon-schema.sql` located in the root of this project.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL='your_neon_connection_string'
PORT=3001
```

### 3. Installation & Local Development
```bash
# Install dependencies
npm install

# Run frontend and backend concurrently
npm run dev
```

The app will be available at `http://localhost:5173`. The API runs on `http://localhost:3001`.

## 📦 Deployment to Vercel

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add the `DATABASE_URL` environment variable in the Vercel project settings.
4. Vercel will automatically detect the `vercel.json` configuration and deploy both the frontend and the `/api` server.

## 🔐 Credentials (Initial)
- **Email**: `adnan@gmail.com`
- **Password**: `abc@12345`

*Note: You can change the password in the application settings after logging in.*

## 📂 Project Structure
- `/api`: The Express server and database logic.
- `/src`: React frontend application.
- `neon-schema.sql`: Database schema and initial seed data.
- `vercel.json`: Vercel routing configuration.