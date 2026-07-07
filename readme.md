# Federation Website Backend

This is the backend for the Federation website, built with Node.js, Express, and MongoDB. It provides APIs for managing industries, updates, emergency contacts, polls, and workshops, as well as user authentication and authorization.

## Prerequisites

Before you begin, ensure you have met the following requirements:

* You have installed Node.js (version 14.x or later)
* You have a MongoDB database (local or cloud-based)
* You have a Cloudinary account for image uploads

## Installation

To install the Federation website backend, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/your-username/federation-backend.git
   cd federation-backend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Configuration

1. Create a `.env` file in the root directory with the following content:

   ```
   mongodb://127.0.0.1:27017/HDIL=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

   Replace the placeholder values with your actual MongoDB connection string, JWT secret, and Cloudinary credentials.

2. Ensure that your MongoDB database is running and accessible.

## Running the Server

To run the Federation website backend, use the following command:

```
npm start
```

For development with auto-restart on file changes, use:

```
npm run dev
```

The server will start running on `http://localhost:5000` (or the port specified in your .env file).

## API Endpoints

Here are the main API endpoints available:

- Authentication:
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me

- Industries:
  - GET /api/industries
  - GET /api/industries/:id
  - POST /api/industries
  - PUT /api/industries/:id
  - DELETE /api/industries/:id

- Updates:
  - GET /api/updates
  - POST /api/updates
  - PUT /api/updates/:id
  - DELETE /api/updates/:id

- Emergency Contacts:
  - GET /api/emergency
  - POST /api/emergency
  - PUT /api/emergency/:id
  - DELETE /api/emergency/:id

- Polls:
  - GET /api/polls
  - POST /api/polls
  - PUT /api/polls/:id/vote
  - DELETE /api/polls/:id

- Workshops:
  - GET /api/workshops
  - POST /api/workshops
  - PUT /api/workshops/:id
  - DELETE /api/workshops/:id
  - POST /api/workshops/:id/register

For detailed information about request/response formats and authentication requirements, please refer to the API documentation (not included in this README).

## Additional Notes

- This backend uses JWT for authentication. Include the JWT token in the `x-auth-token` header for protected routes.
- File uploads (for industries and updates) are handled using Multer and Cloudinary.
- The server includes rate limiting, security headers, and other protective measures against common web vulnerabilities.
- Logging is implemented using Winston. Check the log files for detailed server activities and errors.

## Contributing

Contributions to the Federation website backend are welcome. Please ensure to follow the project's code style and include tests for new features.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).