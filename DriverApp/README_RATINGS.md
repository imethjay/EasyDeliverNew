# Driver Rating System Documentation

## Overview
The driver rating system connects the Final_Project_Client app (where customers rate drivers) with the DriverApp (where drivers view their ratings).

## How It Works

### 1. Customer Rating Process (Final_Project_Client)
- After delivery completion, customers are prompted to rate the driver on the `DeliveryComplete` screen
- Ratings are stored in the `rideRequests` collection with these fields:
  ```javascript
  {
    customerRating: 1-5,           // Star rating given by customer
    customerRatedAt: timestamp,    // When the rating was given
    isRated: true,                 // Flag to indicate this ride has been rated
    customerComment: "text",       // Optional comment (not currently implemented)
    driverId: "driver_id",         // ID of the driver who was rated
    status: "completed"            // Ride must be completed to be rated
  }
  ```

### 2. Driver Profile Display (DriverApp)
- The `DriverService.js` fetches ratings from the `rideRequests` collection
- Calculates average rating and displays recent reviews
- Shows driver statistics including total trips and success rate

## Data Flow

```
Customer rates driver → rideRequests collection → DriverService → Driver Profile
```

## Key Files

### Final_Project_Client
- `components/DeliveryComplete.jsx` - Rating submission UI
- `components/MyOrder.jsx` - Shows customer's past ratings

### DriverApp
- `utils/DriverService.js` - Fetches and calculates ratings
- `components/Profile.jsx` - Displays driver ratings and stats

## Database Structure

### rideRequests Collection
```javascript
{
  id: "ride_request_id",
  driverId: "driver_document_id",
  customerRating: 4,                    // 1-5 stars
  customerRatedAt: Timestamp,
  isRated: true,
  customerComment: "Great service!",    // Future feature
  customerName: "Customer Name",        // For display in driver app
  customerPhoto: "photo_url",           // For display in driver app
  status: "completed",
  packageDetails: {
    packageName: "Package description",
    pickupLocation: "Address",
    dropoffLocation: "Address"
  }
}
```

## Rating Calculation

1. **Average Rating**: Sum of all customerRating values / Count of rated rides
2. **Total Reviews**: Count of rides where `isRated: true`
3. **Success Rate**: (Completed rides / Accepted rides) * 100

## Features

### Current Features
- ✅ Customer can rate driver after delivery
- ✅ Driver can view average rating and total review count
- ✅ Driver profile shows recent reviews
- ✅ Real-time rating updates
- ✅ Fallback to default content when no reviews exist

### Future Enhancements
- 📝 Customer comments/reviews
- 📊 Rating trends over time
- 🎯 Rating goals and achievements
- 📱 Push notifications for new ratings

## Usage

### For Customers (Final_Project_Client)
1. Complete a delivery
2. Rate the driver (1-5 stars)
3. View your past ratings in "My Orders"

### For Drivers (DriverApp)
1. Open Profile page
2. View average rating and total reviews
3. See recent customer feedback
4. Check delivery statistics

## Error Handling

- If no ratings exist: Shows "No reviews yet" message
- If database query fails: Falls back to default values
- If authentication fails: Prompts user to login
- Network errors: Shows retry option

## Security

- Only authenticated users can submit ratings
- Ratings are tied to specific completed rides
- Drivers can only view their own ratings
- No ability to edit or delete ratings once submitted 