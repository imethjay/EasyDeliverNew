import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PricingManagement = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pricingData, setPricingData] = useState({});

  // Vehicle types and their default rates
  const vehicleTypes = [
    { id: 'bike', name: 'Bike', defaultRate: 50 },
    { id: 'tuk', name: 'Tuk', defaultRate: 70 },
    { id: 'car', name: 'Car', defaultRate: 120 },
    { id: 'miniLorry', name: 'Mini-Lorry', defaultRate: 160 },
    { id: 'lorry', name: 'Lorry', defaultRate: 250 },
    { id: 'carrier', name: 'Carrier', defaultRate: 700 }
  ];

  useEffect(() => {
    fetchCouriersAndPricing();
  }, []);

  const fetchCouriersAndPricing = async () => {
    setLoading(true);
    try {
      // Fetch all couriers
      const couriersSnapshot = await getDocs(collection(db, 'couriers'));
      const couriersList = couriersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCouriers(couriersList);

      // Fetch pricing data for each courier
      const pricingPromises = couriersList.map(async (courier) => {
        try {
          const pricingDoc = await getDoc(doc(db, 'courierPricing', courier.id));
          if (pricingDoc.exists()) {
            return { courierId: courier.id, pricing: pricingDoc.data() };
          } else {
            // Create default pricing if doesn't exist
            const defaultPricing = {
              minimumCharge: 300,
              vehicleRates: {}
            };
            
            vehicleTypes.forEach(vehicle => {
              defaultPricing.vehicleRates[vehicle.id] = vehicle.defaultRate;
            });

            return { courierId: courier.id, pricing: defaultPricing };
          }
        } catch (error) {
          console.error(`Error fetching pricing for courier ${courier.id}:`, error);
          return { courierId: courier.id, pricing: null };
        }
      });

      const pricingResults = await Promise.all(pricingPromises);
      const pricingDataMap = {};
      
      pricingResults.forEach(result => {
        if (result.pricing) {
          pricingDataMap[result.courierId] = result.pricing;
        }
      });

      setPricingData(pricingDataMap);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load pricing data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const updatePricing = (courierId, field, value) => {
    setPricingData(prev => ({
      ...prev,
      [courierId]: {
        ...prev[courierId],
        [field]: value
      }
    }));
  };

  const updateVehicleRate = (courierId, vehicleType, rate) => {
    setPricingData(prev => ({
      ...prev,
      [courierId]: {
        ...prev[courierId],
        vehicleRates: {
          ...prev[courierId]?.vehicleRates,
          [vehicleType]: parseFloat(rate) || 0
        }
      }
    }));
  };

  const savePricing = async (courierId) => {
    setSaving(true);
    try {
      const pricingRef = doc(db, 'courierPricing', courierId);
      await setDoc(pricingRef, {
        ...pricingData[courierId],
        updatedAt: new Date(),
        updatedBy: 'admin'
      });

      alert('Pricing updated successfully!');
    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveAllPricing = async () => {
    setSaving(true);
    try {
      const promises = couriers.map(courier => {
        const pricingRef = doc(db, 'courierPricing', courier.id);
        return setDoc(pricingRef, {
          ...pricingData[courier.id],
          updatedAt: new Date(),
          updatedBy: 'admin'
        });
      });

      await Promise.all(promises);
      alert('All pricing updated successfully!');
    } catch (error) {
      console.error('Error saving all pricing:', error);
      alert('Failed to save pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="main-content">Loading pricing data...</div>;
  }

  if (error) {
    return <div className="main-content error">{error}</div>;
  }

  return (
    <div className="main-content">
      <div className="header-actions">
        <h1>Pricing Management</h1>
        <button 
          onClick={saveAllPricing} 
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="pricing-management">
        {couriers.length === 0 ? (
          <p>No couriers found. Please create couriers first.</p>
        ) : (
          couriers.map((courier) => (
            <div key={courier.id} className="courier-pricing-card">
              <div className="courier-header">
                <div className="courier-info">
                  {courier.imageUrl && (
                    <img 
                      src={courier.imageUrl} 
                      alt={courier.courierName}
                      className="courier-logo-small"
                    />
                  )}
                  <h3>{courier.courierName}</h3>
                  <span className="branch-number">{courier.branchNumber}</span>
                </div>
                <button 
                  onClick={() => savePricing(courier.id)}
                  disabled={saving}
                  className="btn-save"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              <div className="pricing-section">
                <div className="minimum-charge">
                  <label>
                    Minimum Charge (LKR):
                    <input
                      type="number"
                      value={pricingData[courier.id]?.minimumCharge || 300}
                      onChange={(e) => updatePricing(courier.id, 'minimumCharge', parseFloat(e.target.value))}
                      min="0"
                      step="10"
                    />
                  </label>
                </div>

                <div className="vehicle-rates">
                  <h4>Vehicle Rates (LKR per km):</h4>
                  <div className="rates-grid">
                    {vehicleTypes.map((vehicle) => (
                      <div key={vehicle.id} className="rate-item">
                        <label>
                          {vehicle.name}:
                          <input
                            type="number"
                            value={pricingData[courier.id]?.vehicleRates?.[vehicle.id] || vehicle.defaultRate}
                            onChange={(e) => updateVehicleRate(courier.id, vehicle.id, e.target.value)}
                            min="0"
                            step="1"
                          />
                          <span className="rate-label">LKR/km</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .pricing-management {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .courier-pricing-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid #e0e0e0;
        }

        .courier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .courier-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .courier-logo-small {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          object-fit: cover;
        }

        .courier-info h3 {
          margin: 0;
          color: #333;
        }

        .branch-number {
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          color: #666;
        }

        .pricing-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .minimum-charge label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }

        .minimum-charge input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          width: 120px;
        }

        .vehicle-rates h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .rates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .rate-item label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-weight: 500;
        }

        .rate-item input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .rate-label {
          font-size: 0.8em;
          color: #666;
          font-weight: normal;
        }

        .btn-save {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
        }

        .btn-save:hover {
          background: #0056b3;
        }

        .btn-save:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          background: #218838;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default PricingManagement; 