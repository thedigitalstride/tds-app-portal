# TDS Portal

A secure portal for The Digital Stride team to access digital marketing tools.

## Features

- **Secure Authentication**: Google OAuth restricted to @thedigitalstride.co.uk emails
- **Role-Based Access**: Admin and User roles with appropriate permissions
- **Shared Client Database**: Manage clients that can be shared across tools
- **Tool Library**: Expandable collection of digital marketing tools

### Available Tools

- **Meta Tag Analyser**: Analyse and plan meta tags for any webpage

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Dev Server**: Turbopack (enabled by default)
- **UI**: Tailwind CSS + Custom Components
- **Auth**: NextAuth.js with Google OAuth
- **Database**: MongoDB with Mongoose
- **Monorepo**: Turborepo 2.3
- **Deployment**: Vercel

## Project Structure

```
tds-app-portal/
├── apps/
│   └── portal/              # Main Next.js application
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── lib/             # Utilities and config
├── packages/
│   ├── ui/                  # Shared UI components
│   └── database/            # MongoDB models and connection
├── turbo.json               # Turborepo configuration
└── package.json             # Root workspace
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB database (MongoDB Atlas recommended)
- Google Cloud Console project for OAuth

### Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd tds-app-portal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp apps/portal/.env.example apps/portal/.env.local
   ```

   Required variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID`: From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

4. **Configure Google OAuth**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the Google+ API
   - Go to Credentials → Create Credentials → OAuth Client ID
   - Application type: Web application
   - Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - For production, add: `https://your-domain.com/api/auth/callback/google`

5. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set the root directory to `apps/portal`
4. Add environment variables in Vercel dashboard
5. Deploy!

### Environment Variables for Production

```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Adding New Tools

1. Create a new directory in `apps/portal/app/tools/[tool-name]/`
2. Add the tool to the registry in `apps/portal/lib/tools.ts`
3. Create any required API routes in `apps/portal/app/api/tools/[tool-name]/`

## User Roles

- **Admin**: Full access including user management
- **User**: Access to all tools and clients

The first user to sign in automatically becomes an admin.

## Security

- Only @thedigitalstride.co.uk email addresses can sign in
- JWT-based sessions with secure cookies
- Role-based access control on admin routes
- API routes protected with session validation

## License

Private - The Digital Stride
