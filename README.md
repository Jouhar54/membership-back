# AALIA Membership Campaign Portal - Backend

This is the backend service for the AALIA Membership Campaign Portal, built with Node.js, Express, and MongoDB.

## Features

- **Authentication**: JWT-based login, registration, and refresh tokens.
- **Role-based Access Control**: Roles including `admin`, `batch_admin`, and `member`.
- **Batch Management**: Create and manage batches with unique join links.
- **Membership Processing**: Register users to batches, approve memberships, and track payment statuses.
- **Automated Poster Generation**: Generates a custom membership poster via `node-canvas` and uploads to Cloudinary upon approval.
- **Email Notifications**: Sends the generated poster via email using Nodemailer.
- **Activity Logging**: Logs all important actions for auditing.

## Tech Stack

- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication & Bcrypt
- Multer & Cloudinary (Image handling)
- Nodemailer (Emails)
- node-canvas (Poster generation)

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jouhar54/membership-back.git
   cd membership-back
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory based on the following structure:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/aalia_membership

   # JWT Secrets
   JWT_ACCESS_SECRET=your_access_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret_key
   JWT_ACCESS_EXPIRES_IN=30m
   JWT_REFRESH_EXPIRES_IN=7d

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Nodemailer SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_password
   EMAIL_FROM=your_email@gmail.com
   ```

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev

   # Or standard node
   node server.js
   ```

## API Endpoints

The API is structured under `/api/v1`. For full integration details, refer to the frontend integration prompt or API documentation.

- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/batches/*` - Batch management endpoints
- `/api/v1/memberships/*` - Membership workflows
- `/api/v1/dashboard/*` - Admin dashboard statistics

## License
ISC
