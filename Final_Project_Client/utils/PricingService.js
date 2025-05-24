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
   * Calculate price for a vehicle type based on distance
   * @param {string} vehicleType - Vehicle type (bike, tuk, car, etc.)
   * @param {number} distanceKm - Distance in kilometers
   * @param {Object} pricingData - Pricing data from getCourierPricing
   * @returns {number} Calculated price
   */
  static calculatePrice(vehicleType, distanceKm, pricingData) {
    const rate = pricingData.vehicleRates[vehicleType] || this.defaultRates[vehicleType] || 50;
    const calculatedPrice = rate * distanceKm;
    const finalPrice = Math.max(calculatedPrice, pricingData.minimumCharge);
    
    console.log(`💰 Price calculation for ${vehicleType}:`, {
      rate,
      distanceKm,
      calculatedPrice,
      minimumCharge: pricingData.minimumCharge,
      finalPrice: Math.round(finalPrice)
    });

    return Math.round(finalPrice);
  }

  /**
   * Calculate prices for all vehicle types
   * @param {number} distanceKm - Distance in kilometers
   * @param {Object} pricingData - Pricing data from getCourierPricing
   * @returns {Object} Prices for all vehicle types
   */
  static calculateAllPrices(distanceKm, pricingData) {
    const vehicleTypes = [
      { id: 'bike', name: 'Bike', vehicleType: 'Bike' },
      { id: 'tuk', name: 'Tuk', vehicleType: 'Tuk' },
      { id: 'car', name: 'Car', vehicleType: 'Car' },
      { id: 'miniLorry', name: 'Mini-Lorry', vehicleType: 'Mini-Lorry' },
      { id: 'lorry', name: 'Lorry', vehicleType: 'Truck' }, // Note: Truck in DB, Lorry in display
      { id: 'carrier', name: 'Carrier', vehicleType: 'Carrier' }
    ];

    return vehicleTypes.map((vehicle, index) => ({
      id: index + 1,
      name: vehicle.name,
      price: this.calculatePrice(vehicle.id, distanceKm, pricingData),
      vehicleType: vehicle.vehicleType,
      ratePerKm: pricingData.vehicleRates[vehicle.id] || this.defaultRates[vehicle.id]
    }));
  }
}

export default PricingService; 