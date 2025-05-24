import { auth, db } from '../firebase/init';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

class DriverService {
  /**
   * Fetch complete driver profile data including stats and ratings
   */
  static async getDriverProfile() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Get driver data from drivers collection
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Driver profile not found');
      }

      const driverDoc = querySnapshot.docs[0];
      const driverData = {
        id: driverDoc.id,
        ...driverDoc.data()
      };

      // Get driver statistics
      const stats = await this.getDriverStats(driverData.id);
      
      // Get driver ratings and reviews
      const ratingsData = await this.getDriverRatings(driverData.id);

      return {
        ...driverData,
        stats,
        ratings: ratingsData
      };
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      throw error;
    }
  }

  /**
   * Get driver statistics (trips, experience, success rate)
   */
  static async getDriverStats(driverId) {
    try {
      console.log('📊 Fetching driver stats for:', driverId);
      
      // Simple query without complex indexes
      const rideRequestsRef = collection(db, 'rideRequests');
      const q = query(
        rideRequestsRef, 
        where('driverId', '==', driverId),
        limit(100) // Get enough results to calculate meaningful stats
      );
      const querySnapshot = await getDocs(q);
      
      let totalTrips = 0;
      let completedTrips = 0;
      let totalEarnings = 0;
      let acceptedTrips = 0; // Track accepted trips for success rate
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        
        // Count only trips that were actually accepted (not just created)
        if (data.status === 'accepted' || 
            data.status === 'collecting' || 
            data.status === 'in_transit' || 
            data.status === 'completed') {
          totalTrips++;
          acceptedTrips++;
          
          if (data.status === 'completed') {
            completedTrips++;
            totalEarnings += data.fare || data.price || 0;
          }
        }
      });

      // Calculate success rate based on completed vs accepted trips
      const successRate = acceptedTrips > 0 ? Math.round((completedTrips / acceptedTrips) * 100) : 98;
      
      // Get driver document to check registration date
      let experienceYears = 1; // Default
      try {
        const driverDoc = await getDoc(doc(db, 'drivers', driverId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          
          // Try to get registration date from various possible fields
          const registrationDate = driverData.registeredAt?.toDate() || 
                                   driverData.createdAt?.toDate() || 
                                   driverData.dateRegistered?.toDate() ||
                                   new Date(2020, 0, 1); // Fallback to 2020
          
          const currentDate = new Date();
          const timeDiff = currentDate - registrationDate;
          experienceYears = Math.max(1, Math.floor(timeDiff / (365.25 * 24 * 60 * 60 * 1000)));
        }
      } catch (error) {
        console.log('Could not fetch driver registration date:', error);
        // Use trip count to estimate experience if no registration date
        experienceYears = Math.max(1, Math.floor(totalTrips / 100)); // Rough estimate: 100 trips per year
      }

      console.log(`✅ Driver stats: ${acceptedTrips} trips, ${completedTrips} completed, ${successRate}% success rate`);

      return {
        totalTrips: acceptedTrips, // Show only accepted trips
        completedTrips,
        successRate,
        experienceYears,
        totalEarnings: Math.round(totalEarnings),
        // Additional stats that might be useful
        pendingTrips: acceptedTrips - completedTrips,
        averageEarningsPerTrip: completedTrips > 0 ? Math.round(totalEarnings / completedTrips) : 0
      };
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      return {
        totalTrips: 0,
        completedTrips: 0,
        successRate: 98,
        experienceYears: 1,
        totalEarnings: 0,
        pendingTrips: 0,
        averageEarningsPerTrip: 0
      };
    }
  }

  /**
   * Get driver ratings and recent reviews
   */
  static async getDriverRatings(driverId) {
    try {
      console.log('🔍 Fetching driver ratings for:', driverId);
      
      // Simple query without complex indexes - just filter by driverId first
      const rideRequestsRef = collection(db, 'rideRequests');
      const q = query(
        rideRequestsRef, 
        where('driverId', '==', driverId),
        limit(50) // Get more results to filter client-side
      );
      
      const querySnapshot = await getDocs(q);
      const reviews = [];
      let totalRating = 0;
      let ratingCount = 0;

      // Filter and process results client-side to avoid index requirements
      const sortedReviews = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        
        // Only include rated rides
        if (data.isRated && data.customerRating) {
          totalRating += data.customerRating;
          ratingCount++;
          
          sortedReviews.push({
            id: doc.id,
            rating: data.customerRating,
            customerName: data.customerName || 'Customer',
            customerPhoto: data.customerPhoto || null,
            comment: data.customerComment || 'Great service!',
            createdAt: data.customerRatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            rideRequestId: doc.id,
            // Include package details for context
            packageName: data.packageDetails?.packageName || 'Package',
            pickupLocation: data.packageDetails?.pickupLocation || 'Unknown',
            dropoffLocation: data.packageDetails?.dropoffLocation || 'Unknown'
          });
        }
      });

      // Sort by date client-side (most recent first)
      sortedReviews.sort((a, b) => b.createdAt - a.createdAt);

      const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 4.9;

      console.log(`✅ Found ${ratingCount} ratings with average: ${averageRating}`);

      return {
        averageRating: parseFloat(averageRating),
        totalReviews: ratingCount,
        recentReviews: sortedReviews.slice(0, 5) // Get 5 most recent reviews
      };
    } catch (error) {
      console.error('Error fetching driver ratings:', error);
      
      // Simplified fallback: just get completed rides for this driver
      try {
        console.log('🔄 Trying simplified fallback method...');
        const fallbackQuery = query(
          collection(db, 'rideRequests'),
          where('driverId', '==', driverId),
          limit(20)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        let fallbackTotal = 0;
        let fallbackCount = 0;
        const fallbackReviews = [];
        
        fallbackSnapshot.forEach(doc => {
          const data = doc.data();
          // Check for any completed rides with ratings
          if (data.customerRating && (data.status === 'completed' || data.isRated)) {
            fallbackTotal += data.customerRating;
            fallbackCount++;
            
            fallbackReviews.push({
              id: doc.id,
              rating: data.customerRating,
              customerName: 'Customer',
              comment: 'Thank you for the great service!',
              createdAt: data.customerRatedAt?.toDate() || data.createdAt?.toDate() || new Date()
            });
          }
        });
        
        if (fallbackCount > 0) {
          console.log(`✅ Fallback found ${fallbackCount} ratings`);
          return {
            averageRating: parseFloat((fallbackTotal / fallbackCount).toFixed(1)),
            totalReviews: fallbackCount,
            recentReviews: fallbackReviews.slice(0, 5)
          };
        }
      } catch (fallbackError) {
        console.error('Fallback rating fetch also failed:', fallbackError);
      }
      
      // Return default values if both methods fail
      console.log('⚠️ Using default rating values');
      return {
        averageRating: 4.9,
        totalReviews: 0,
        recentReviews: []
      };
    }
  }

  /**
   * Update driver profile data
   */
  static async updateDriverProfile(driverId, updateData) {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating driver profile:', error);
      throw error;
    }
  }

  /**
   * Handle driver logout
   */
  static async logout() {
    try {
      const user = auth.currentUser;
      
      if (user) {
        // Update driver status to offline before logging out
        const driversRef = collection(db, 'drivers');
        const q = query(driversRef, where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const driverDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'drivers', driverDoc.id), {
            isOnline: false,
            isAvailable: false,
            lastUpdated: new Date()
          });
        }
      }

      // Sign out from Firebase Auth
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  /**
   * Get formatted time difference for reviews
   */
  static getTimeAgo(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return '1d ago';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months}mo ago`;
    }
  }

  /**
   * Get detailed earnings data for the driver
   */
  static async getDriverEarnings(driverId) {
    try {
      console.log('💰 Fetching detailed earnings for:', driverId);
      
      const rideRequestsRef = collection(db, 'rideRequests');
      const q = query(
        rideRequestsRef, 
        where('driverId', '==', driverId),
        where('status', '==', 'completed'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const earnings = {
        totalEarnings: 0,
        completedTrips: 0,
        weeklyEarnings: [],
        monthlyEarnings: [],
        averagePerTrip: 0,
        recentEarnings: []
      };
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const fare = data.fare || data.price || 0;
        const completedAt = data.completedAt?.toDate() || data.createdAt?.toDate();
        
        earnings.totalEarnings += fare;
        earnings.completedTrips++;
        
        if (completedAt && completedAt >= weekAgo) {
          earnings.weeklyEarnings.push({
            amount: fare,
            date: completedAt,
            tripId: doc.id
          });
        }
        
        if (completedAt && completedAt >= monthAgo) {
          earnings.monthlyEarnings.push({
            amount: fare,
            date: completedAt,
            tripId: doc.id
          });
        }
        
        earnings.recentEarnings.push({
          amount: fare,
          date: completedAt || new Date(),
          tripId: doc.id,
          customerName: data.customerName || 'Customer',
          pickupLocation: data.packageDetails?.pickupLocation || 'Unknown'
        });
      });
      
      earnings.averagePerTrip = earnings.completedTrips > 0 
        ? Math.round(earnings.totalEarnings / earnings.completedTrips) 
        : 0;
      
      // Sort recent earnings by date (most recent first)
      earnings.recentEarnings.sort((a, b) => b.date - a.date);
      earnings.recentEarnings = earnings.recentEarnings.slice(0, 10);
      
      console.log(`✅ Total earnings: $${earnings.totalEarnings} from ${earnings.completedTrips} trips`);
      
      return earnings;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return {
        totalEarnings: 0,
        completedTrips: 0,
        weeklyEarnings: [],
        monthlyEarnings: [],
        averagePerTrip: 0,
        recentEarnings: []
      };
    }
  }

  /**
   * Update driver profile with image upload support
   */
  static async updateDriverProfileWithImage(driverId, updateData) {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      
      // Handle profile image separately if it's base64
      const updatePayload = {
        ...updateData,
        updatedAt: new Date()
      };
      
      // If profile image is base64, we'll store it directly
      // In a production app, you might want to upload to Firebase Storage
      if (updateData.profileImage && updateData.profileImage.startsWith('data:image')) {
        updatePayload.profileImage = updateData.profileImage;
      }
      
      await updateDoc(driverRef, updatePayload);
      
      console.log('✅ Driver profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating driver profile with image:', error);
      throw error;
    }
  }
}

export default DriverService; 