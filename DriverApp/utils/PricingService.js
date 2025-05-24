import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/init';

class PricingService {
  // Default rates as fallback
  static defaultRates = {
    bike: 50,
    tuk: 70,
    car: 120,
    miniLorry: 160,
    lorry: 250,
    carrier: 700
  };

  static defaultMinimumCharge = 300;

  /**
   * Fetch pricing data for a specific courier
   * @param {string} courierId - The courier ID
   * @returns {Promise<Object>} Pricing data with vehicle rates and minimum charge
   */
  static async getCourierPricing(courierId) {
    try {
      if (!courierId) {
        console.warn('No courier ID provided, using default pricing');
        return this.getDefaultPricing();
      }

      console.log('🔍 Fetching pricing for courier:', courierId);
      
      const pricingDoc = await getDoc(doc(db, 'courierPricing', courierId));
      
      if (pricingDoc.exists()) {
        const pricingData = pricingDoc.data();
        console.log('✅ Found custom pricing for courier:', courierId, pricingData);
        
        // Ensure all vehicle types have rates
        const vehicleRates = {
          ...this.defaultRates,
          ...pricingData.vehicleRates
        };

        return {
          vehicleRates,
          minimumCharge: pricingData.minimumCharge || this.defaultMinimumCharge,
          lastUpdated: pricingData.updatedAt
        };
      } else {
        console.log('⚠️ No custom pricing found for courier:', courierId, 'using defaults');
        return this.getDefaultPricing();
      }
    } catch (error) {
      console.error('❌ Error fetching courier pricing:', error);
      return this.getDefaultPricing();
    }
  }

  /**
   * Get default pricing when custom pricing is not available
   * @returns {Object} Default pricing data
   */
  static getDefaultPricing() {
    return {
      vehicleRates: { ...this.defaultRates },
      minimumCharge: this.defaultMinimumCharge,
      isDefault: true
    };
  }

  /**
   * Calculate earnings for driver (80% of total price)
   * @param {string} vehicleType - Vehicle type (Bike, Tuk, Car, etc.)
   * @param {number} distanceKm - Distance in kilometers
   * @param {Object} pricingData - Pricing data from getCourierPricing
   * @returns {number} Driver earnings (80% of total price)
   */
  static calculateDriverEarnings(vehicleType, distanceKm, pricingData) {
    // Map vehicle types to pricing keys
    const vehicleTypeMap = {
      'Bike': 'bike',
      'Tuk': 'tuk',
      'Car': 'car',
      'Mini-Lorry': 'miniLorry',
      'Truck': 'lorry',
      'Lorry': 'lorry',
      'Carrier': 'carrier'
    };

    const pricingKey = vehicleTypeMap[vehicleType] || 'bike';
    const rate = pricingData.vehicleRates[pricingKey] || this.defaultRates[pricingKey] || 50;
    const calculatedPrice = rate * distanceKm;
    const totalPrice = Math.max(calculatedPrice, pricingData.minimumCharge);
    const driverEarnings = totalPrice * 0.8; // Driver gets 80%
    
    console.log(`💰 Driver earnings calculation for ${vehicleType}:`, {
      rate,
      distanceKm,
      calculatedPrice,
      minimumCharge: pricingData.minimumCharge,
      totalPrice: Math.round(totalPrice),
      driverEarnings: Math.round(driverEarnings)
    });

    return Math.round(driverEarnings);
  }

  /**
   * Calculate total price for a delivery
   * @param {string} vehicleType - Vehicle type
   * @param {number} distanceKm - Distance in kilometers
   * @param {Object} pricingData - Pricing data from getCourierPricing
   * @returns {number} Total delivery price
   */
  static calculateTotalPrice(vehicleType, distanceKm, pricingData) {
    const vehicleTypeMap = {
      'Bike': 'bike',
      'Tuk': 'tuk',
      'Car': 'car',
      'Mini-Lorry': 'miniLorry',
      'Truck': 'lorry',
      'Lorry': 'lorry',
      'Carrier': 'carrier'
    };

    const pricingKey = vehicleTypeMap[vehicleType] || 'bike';
    const rate = pricingData.vehicleRates[pricingKey] || this.defaultRates[pricingKey] || 50;
    const calculatedPrice = rate * distanceKm;
    const totalPrice = Math.max(calculatedPrice, pricingData.minimumCharge);

    return Math.round(totalPrice);
  }
}

export default PricingService; 