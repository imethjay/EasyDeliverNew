# Firestore Indexes Setup Guide

## Issue
The driver rating system requires Firestore composite indexes for optimal performance.

## Quick Fix (Already Implemented)
The DriverService has been updated to use simpler queries that work without indexes. The app should work now, but for better performance, follow the steps below to create the indexes.

## Steps to Deploy Indexes

### 1. Login to Firebase
```bash
cd Final_Project_Client
firebase login
```

### 2. Deploy the Indexes
```bash
firebase deploy --only firestore:indexes
```

### 3. Wait for Index Creation
- Indexes may take a few minutes to build
- Check the Firebase Console to see index status

## Alternative: Manual Index Creation

If the deploy command doesn't work, you can create indexes manually:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `imethjay-70734`
3. Go to Firestore Database > Indexes
4. Create these composite indexes:

### Index 1: Driver Ratings Query
- Collection: `rideRequests`
- Fields:
  - `driverId` (Ascending)
  - `isRated` (Ascending) 
  - `customerRatedAt` (Descending)

### Index 2: Driver Stats Fallback Query
- Collection: `rideRequests`
- Fields:
  - `driverId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)

## Verification
After indexes are created, you can revert to the optimized queries in DriverService.js for better performance.

## Current Status
✅ App works with simplified queries (no indexes required)
⏳ Indexes will improve performance once deployed 