# Admin Portal for EasyDeliver

This is the admin portal for EasyDeliver, allowing administrators to manage couriers and view delivery stats.

## Features

- Admin login (username: `admin`, password: `admin123`)
- Dashboard with key metrics
- Courier management (view, create, activate/deactivate)
- Integration with Firebase for data storage

## Setup and Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Login Credentials

- Username: `admin`
- Password: `admin123`

## Note

This admin portal uses the same Firebase instance as the client app to ensure data consistency.

## Fixing CORS Issues with Firebase Storage

If you encounter CORS errors when uploading images to Firebase Storage, follow these steps:

1. Install the Firebase CLI:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Deploy the storage rules:
   ```
   firebase deploy --only storage
   ```

This will update your Firebase Storage rules to allow uploads from your development server.

## Alternative Solution

If you continue to face CORS issues, the current implementation uses URL inputs instead of direct file uploads. You can:

1. Upload your images to a service like Imgur, Cloudinary, or any image hosting service
2. Copy the direct URL to the image 
3. Paste it into the "Logo URL" field in the form

This approach avoids CORS issues completely while still allowing you to associate images with your courier companies.
