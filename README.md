# LeadConnect - Hyderabad Lead Management System

A professional lead management system built specifically for Indian businesses, with a focus on the Hyderabad market. This application provides complete CRUD functionality with a PostgreSQL database backend.

## 🇮🇳 Indian Business Focus

LeadConnect is designed specifically for Indian businesses with:
- **Indian phone number validation** (+91 format support)
- **Local market optimization** (Hyderabad-focused)
- **Indian business categories** and company sizes
- **Regional lead source tracking**
- **Local communication preferences**

## ✨ Features

### 🔐 Complete Authentication System
- Secure user registration and login
- Password hashing with bcrypt
- Role-based access control (Admin, User, Manager)
- Session management

### 📊 Comprehensive Lead Management
- **Create, Read, Update, Delete** operations for leads
- Advanced search and filtering
- Lead status tracking (New, Follow-up, Qualified, Hot, Converted, Lost)
- Customer categorization (Existing, Potential)
- Follow-up date management
- Multiple lead sources (Website, Referral, LinkedIn, Facebook, etc.)

### 📈 Analytics & Reporting
- Real-time analytics dashboard
- Lead conversion tracking
- Export to CSV functionality
- Performance insights
- Follow-up reminders

### 🎯 No Mock Data
- Real PostgreSQL database
- No dummy or sample data
- Production-ready from day one
- Proper data persistence

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL Database** (local or cloud service like Neon, Supabase)
3. **npm** or **yarn**

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd LeadConnect
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the project root:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database_name"
NODE_ENV=development

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

For local PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/leadconnect_db"
```

For Neon (cloud PostgreSQL):
```env
DATABASE_URL="postgresql://username:password@ep-xxxx.us-east-1.aws.neon.tech/neondb"
```

3. **Initialize the database:**
```bash
npm run setup
```

This command will:
- Create database tables
- Set up the schema
- Create an initial admin user

4. **Start the development server:**
```bash
npm run dev
```

5. **Access the application:**
- Open http://localhost:5000
- Login with: `admin@leadconnect.hyderabad` / `admin123`
- **Important:** Change the default password after first login

6. **Configure Email Notifications (Optional):**
- See `EMAIL_SETUP.md` for detailed email configuration instructions
- Test email functionality: `node test-email.js`

## 🛠️ Database Setup Options

### Option 1: Local PostgreSQL
```bash
# Install PostgreSQL locally
# Create database
createdb leadconnect_db

# Set environment variable
DATABASE_URL="postgresql://postgres:password@localhost:5432/leadconnect_db"
```

### Option 2: Neon (Recommended for production)
1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set as DATABASE_URL in your .env file

### Option 3: Supabase
1. Sign up at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Set as DATABASE_URL in your .env file

## 📁 Project Structure

```
LeadConnect/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/        # Application pages
│   │   └── lib/          # Utilities
├── server/                # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── notifications.ts  # Email notifications
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema & validation
└── migrations/          # Database migrations
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Lead Management
- `GET /api/leads` - Get all leads (with filtering)
- `GET /api/leads/:id` - Get specific lead
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `GET /api/leads/export` - Export leads to CSV

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/leads/stats/summary` - Get lead statistics

### User Management
- `GET /api/users` - Get all users
- `PUT /api/users/profile` - Update user profile

## 🏗️ Database Schema

### Users Table
- User authentication and profile information
- Role-based permissions
- Company details and subscription status
- Password hashing with bcrypt

### Leads Table
- Comprehensive lead information
- Contact details and company info
- Lead status and category tracking
- Follow-up management
- Source attribution

## 🔒 Security Features

- **Password Hashing:** bcrypt with salt rounds
- **Input Validation:** Zod schema validation
- **SQL Injection Protection:** Parameterized queries with Drizzle ORM
- **Environment Variables:** Secure configuration management

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
DATABASE_URL="your_production_database_url"
NODE_ENV=production
SENDGRID_API_KEY="your_sendgrid_api_key" # Optional for email notifications
FROM_EMAIL="noreply@yourdomain.com"
```

## 📊 Indian Market Features

### Phone Number Support
- Validates Indian mobile numbers
- Supports +91 country code
- Accepts various formats (9876543210, +91 9876543210)

### Business Categories
- Indian company size classifications
- Local industry categories
- Regional business types

### Lead Sources
- Website inquiries
- Referrals (local network)
- LinkedIn (professional network)
- Facebook/Instagram (social media)
- On-field activities
- Local campaigns

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes
- `npm run db:generate` - Generate migration files
- `npm run db:init` - Initialize database with admin user
- `npm run setup` - Complete database setup (push + init)

## 🔧 Troubleshooting

### Database Connection Issues
1. Verify DATABASE_URL is correct
2. Ensure PostgreSQL is running
3. Check network connectivity
4. Verify database permissions

### Migration Errors
1. Run `npm run db:push` to sync schema
2. Check for conflicting migrations
3. Ensure database is accessible

### Authentication Problems
1. Verify bcrypt is installed correctly
2. Check password hashing in database
3. Ensure session management is working

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
1. Check the setup guide: `setup-database.md`
2. Review the troubleshooting section
3. Check database logs for errors
4. Verify environment variables are set correctly

---

**Built with ❤️ for Indian businesses, particularly those in Hyderabad** 