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
   * Get detailed earnings data for the driver - Enhanced version
   */
  static async getDriverEarnings(driverId) {
    try {
      console.log('💰 Fetching detailed earnings for:', driverId);
      
      const rideRequestsRef = collection(db, 'rideRequests');
      
      // First, try to get ALL rides for this driver (not just completed)
      const allRidesQuery = query(
        rideRequestsRef, 
        where('driverId', '==', driverId),
        limit(300) // Increased limit to get more data
      );
      
      const allRidesSnapshot = await getDocs(allRidesQuery);
      console.log(`📊 Found ${allRidesSnapshot.docs.length} total rides for driver`);
      
      const earnings = {
        totalEarnings: 0,
        completedTrips: 0,
        weeklyEarnings: [],
        monthlyEarnings: [],
        averagePerTrip: 0,
        recentEarnings: [],
        dailyBreakdown: new Map(),
        weeklyBreakdown: new Map(),
        monthlyBreakdown: new Map()
      };
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      // Process all rides and look for earnings in multiple ways
      allRidesSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Log each document for debugging
        console.log(`🔍 Processing ride ${doc.id}:`, {
          status: data.status,
          deliveryStatus: data.deliveryStatus,
          fare: data.fare,
          price: data.price,
          ridePrice: data.rideDetails?.price,
          totalPrice: data.totalPrice,
          driverEarnings: data.driverEarnings,
          hasRideDetails: !!data.rideDetails
        });
        
        // Check multiple status conditions for completed rides
        const isCompleted = data.status === 'completed' || 
                           data.deliveryStatus === 'completed' ||
                           data.status === 'delivered' ||
                           data.deliveryStatus === 'delivered';
        
        if (!isCompleted) {
          console.log(`⏭️ Skipping ride ${doc.id} - not completed (status: ${data.status}, deliveryStatus: ${data.deliveryStatus})`);
          return;
        }
        
        // Try to extract fare/earnings from multiple possible fields
        let fare = 0;
        
        // Priority order for fare extraction
        if (data.driverEarnings && data.driverEarnings > 0) {
          fare = Math.round(parseFloat(data.driverEarnings) * 100) / 100;
          console.log(`💰 Using driverEarnings: LKR ${fare}`);
        } else if (data.fare && data.fare > 0) {
          fare = Math.round(parseFloat(data.fare) * 100) / 100;
          console.log(`💰 Using fare: LKR ${fare}`);
        } else if (data.price && data.price > 0) {
          fare = Math.round(parseFloat(data.price) * 100) / 100;
          console.log(`💰 Using price: LKR ${fare}`);
        } else if (data.rideDetails?.price && data.rideDetails.price > 0) {
          // Driver typically gets 80% of ride price
          const ridePrice = parseFloat(data.rideDetails.price);
          fare = Math.round((ridePrice * 0.8) * 100) / 100;
          console.log(`💰 Calculated from rideDetails.price: LKR ${ridePrice} * 0.8 = LKR ${fare}`);
        } else if (data.totalPrice && data.totalPrice > 0) {
          // Driver typically gets 80% of total price
          const totalPrice = parseFloat(data.totalPrice);
          fare = Math.round((totalPrice * 0.8) * 100) / 100;
          console.log(`💰 Calculated from totalPrice: LKR ${totalPrice} * 0.8 = LKR ${fare}`);
        } else {
          console.log(`⚠️ No fare found for ride ${doc.id}`);
          return; // Skip if no fare found
        }
        
        // Handle different date formats
        let completedAt = null;
        if (data.completedAt) {
          completedAt = data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
        } else if (data.deliveredAt) {
          completedAt = data.deliveredAt.toDate ? data.deliveredAt.toDate() : new Date(data.deliveredAt);
        } else if (data.updatedAt) {
          completedAt = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
        } else if (data.createdAt) {
          completedAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        } else {
          completedAt = new Date(); // Fallback to current date
        }
        
        console.log(`✅ Adding earnings: LKR ${fare} for ride ${doc.id} completed at ${completedAt}`);
        
        earnings.totalEarnings += fare;
        earnings.completedTrips++;
        
        // Daily breakdown
        const dayKey = completedAt.toDateString();
        earnings.dailyBreakdown.set(dayKey, (earnings.dailyBreakdown.get(dayKey) || 0) + fare);
        
        // Weekly breakdown
        const weekStart = new Date(completedAt);
        weekStart.setDate(completedAt.getDate() - completedAt.getDay());
        const weekKey = weekStart.toDateString();
        earnings.weeklyBreakdown.set(weekKey, (earnings.weeklyBreakdown.get(weekKey) || 0) + fare);
        
        // Monthly breakdown
        const monthKey = `${completedAt.getFullYear()}-${completedAt.getMonth()}`;
        earnings.monthlyBreakdown.set(monthKey, (earnings.monthlyBreakdown.get(monthKey) || 0) + fare);
        
        // Weekly earnings (last 7 days)
        if (completedAt >= weekAgo) {
          earnings.weeklyEarnings.push({
            amount: fare,
            date: completedAt,
            tripId: doc.id,
            customerName: data.customerName || data.packageDetails?.senderName || 'Customer',
            pickupLocation: data.packageDetails?.pickupLocation || data.pickupLocation || 'Unknown'
          });
        }
        
        // Monthly earnings (last 30 days)
        if (completedAt >= monthAgo) {
          earnings.monthlyEarnings.push({
            amount: fare,
            date: completedAt,
            tripId: doc.id,
            customerName: data.customerName || data.packageDetails?.senderName || 'Customer',
            pickupLocation: data.packageDetails?.pickupLocation || data.pickupLocation || 'Unknown'
          });
        }
        
        // Recent earnings (last 3 months for better analytics)
        if (completedAt >= threeMonthsAgo) {
          earnings.recentEarnings.push({
            amount: fare,
            date: completedAt,
            tripId: doc.id,
            customerName: data.customerName || data.packageDetails?.senderName || 'Customer',
            pickupLocation: data.packageDetails?.pickupLocation || data.pickupLocation || 'Unknown',
            deliveryLocation: data.packageDetails?.deliveryLocation || data.packageDetails?.dropoffLocation || data.deliveryLocation || 'Unknown',
            distance: data.distance || 0,
            duration: data.duration || 0
          });
        }
      });
      
      // If no earnings found, try alternative approach - check for any rides with pricing data
      if (earnings.totalEarnings === 0 && allRidesSnapshot.docs.length > 0) {
        console.log('🔄 No earnings found with completed status, checking all rides for pricing data...');
        
        allRidesSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Look for any ride with pricing information, regardless of status
          let estimatedFare = 0;
          
          if (data.rideDetails?.price && data.rideDetails.price > 0) {
            estimatedFare = Math.round(parseFloat(data.rideDetails.price) * 0.8 * 100) / 100; // Driver gets 80%
          } else if (data.totalPrice && data.totalPrice > 0) {
            estimatedFare = Math.round(parseFloat(data.totalPrice) * 0.8 * 100) / 100;
          } else if (data.price && data.price > 0) {
            estimatedFare = Math.round(parseFloat(data.price) * 100) / 100;
          }
          
          if (estimatedFare > 0) {
            console.log(`📊 Found pricing data in ride ${doc.id}: LKR ${estimatedFare}`);
            
            const completedAt = data.createdAt?.toDate() || new Date();
            
            earnings.totalEarnings += estimatedFare;
            earnings.completedTrips++;
            
            earnings.recentEarnings.push({
              amount: estimatedFare,
              date: completedAt,
              tripId: doc.id,
              customerName: data.customerName || data.packageDetails?.senderName || 'Customer',
              pickupLocation: data.packageDetails?.pickupLocation || data.pickupLocation || 'Unknown',
              deliveryLocation: data.packageDetails?.deliveryLocation || data.packageDetails?.dropoffLocation || 'Unknown',
              distance: data.distance || 0,
              duration: data.duration || 0
            });
          }
        });
      }
      
      // Calculate averages and analytics
      earnings.averagePerTrip = earnings.completedTrips > 0 
        ? Math.round((earnings.totalEarnings / earnings.completedTrips) * 100) / 100 
        : 0;
      
      // Sort recent earnings by date (most recent first)
      earnings.recentEarnings.sort((a, b) => b.date - a.date);
      
      // Calculate additional analytics
      const analytics = {
        bestDay: { date: 'N/A', amount: 0 },
        worstDay: { date: 'N/A', amount: Infinity },
        averagePerDay: 0,
        totalDaysWorked: earnings.dailyBreakdown.size,
        bestWeek: { date: 'N/A', amount: 0 },
        bestMonth: { date: 'N/A', amount: 0 }
      };
      
      // Find best and worst days
      for (const [date, amount] of earnings.dailyBreakdown) {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount > analytics.bestDay.amount) {
          analytics.bestDay = { date, amount: roundedAmount };
        }
        if (roundedAmount < analytics.worstDay.amount && roundedAmount > 0) {
          analytics.worstDay = { date, amount: roundedAmount };
        }
      }
      
      // Calculate average per day worked
      if (analytics.totalDaysWorked > 0) {
        analytics.averagePerDay = Math.round((earnings.totalEarnings / analytics.totalDaysWorked) * 100) / 100;
      }
      
      // Find best week
      for (const [date, amount] of earnings.weeklyBreakdown) {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount > analytics.bestWeek.amount) {
          analytics.bestWeek = { date, amount: roundedAmount };
        }
      }
      
      // Find best month
      for (const [date, amount] of earnings.monthlyBreakdown) {
        const roundedAmount = Math.round(amount * 100) / 100;
        if (roundedAmount > analytics.bestMonth.amount) {
          analytics.bestMonth = { date, amount: roundedAmount };
        }
      }
      
      // Reset worst day if no valid data
      if (analytics.worstDay.amount === Infinity) {
        analytics.worstDay = { date: 'N/A', amount: 0 };
      }
      
      // Add analytics to earnings object
      earnings.analytics = analytics;
      
      // Round total earnings for display
      earnings.totalEarnings = Math.round(earnings.totalEarnings * 100) / 100;
      
      console.log(`✅ FINAL EARNINGS SUMMARY:`);
      console.log(`   Total Earnings: LKR ${earnings.totalEarnings}`);
      console.log(`   Completed Trips: ${earnings.completedTrips}`);
      console.log(`   Average per Trip: LKR ${earnings.averagePerTrip}`);
      console.log(`   Recent Earnings Count: ${earnings.recentEarnings.length}`);
      console.log(`   Analytics - Best Day: LKR ${analytics.bestDay.amount}, Average per Day: LKR ${analytics.averagePerDay}`);
      
      return earnings;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return {
        totalEarnings: 0,
        completedTrips: 0,
        weeklyEarnings: [],
        monthlyEarnings: [],
        averagePerTrip: 0,
        recentEarnings: [],
        analytics: {
          bestDay: { date: 'N/A', amount: 0 },
          worstDay: { date: 'N/A', amount: 0 },
          averagePerDay: 0,
          totalDaysWorked: 0,
          bestWeek: { date: 'N/A', amount: 0 },
          bestMonth: { date: 'N/A', amount: 0 }
        }
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

  /**
   * Debug function to investigate database structure for earnings
   */
  static async debugEarningsData(driverId) {
    try {
      console.log('🔍 DEBUG: Investigating earnings data for driver:', driverId);
      
      const rideRequestsRef = collection(db, 'rideRequests');
      const q = query(rideRequestsRef, where('driverId', '==', driverId), limit(50));
      const snapshot = await getDocs(q);
      
      console.log(`🔍 DEBUG: Found ${snapshot.docs.length} total documents for driver`);
      
      const statusCounts = {};
      const fieldAnalysis = {
        fare: 0,
        price: 0,
        rideDetailsPrice: 0,
        totalPrice: 0,
        driverEarnings: 0
      };
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        
        // Count statuses
        const status = data.status || 'unknown';
        const deliveryStatus = data.deliveryStatus || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        statusCounts[`delivery_${deliveryStatus}`] = (statusCounts[`delivery_${deliveryStatus}`] || 0) + 1;
        
        // Count field presence
        if (data.fare) fieldAnalysis.fare++;
        if (data.price) fieldAnalysis.price++;
        if (data.rideDetails?.price) fieldAnalysis.rideDetailsPrice++;
        if (data.totalPrice) fieldAnalysis.totalPrice++;
        if (data.driverEarnings) fieldAnalysis.driverEarnings++;
        
        // Log first few documents in detail
        if (index < 3) {
          console.log(`🔍 DEBUG: Document ${index + 1} (${doc.id}):`, {
            status: data.status,
            deliveryStatus: data.deliveryStatus,
            fare: data.fare,
            price: data.price,
            rideDetailsPrice: data.rideDetails?.price,
            totalPrice: data.totalPrice,
            driverEarnings: data.driverEarnings,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            completedAt: data.completedAt?.toDate?.() || data.completedAt,
            allFields: Object.keys(data)
          });
        }
      });
      
      console.log('🔍 DEBUG: Status distribution:', statusCounts);
      console.log('🔍 DEBUG: Field analysis:', fieldAnalysis);
      
      return {
        totalDocuments: snapshot.docs.length,
        statusCounts,
        fieldAnalysis
      };
    } catch (error) {
      console.error('🔍 DEBUG: Error investigating earnings data:', error);
      return null;
    }
  }
}

export default DriverService; 