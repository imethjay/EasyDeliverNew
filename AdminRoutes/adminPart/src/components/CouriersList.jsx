import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CouriersList = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    setLoading(true);
    try {
      const couriersSnapshot = await getDocs(collection(db, 'couriers'));
      const couriersList = couriersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCouriers(couriersList);
    } catch (err) {
      console.error("Error fetching couriers:", err);
      setError("Failed to load couriers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourierStatus = async (courierId, currentStatus) => {
    try {
      const courierRef = doc(db, 'couriers', courierId);
      await updateDoc(courierRef, {
        isActive: !currentStatus
      });
      
      // Update local state
      setCouriers(couriers.map(courier => 
        courier.id === courierId ? { ...courier, isActive: !courier.isActive } : courier
      ));
    } catch (err) {
      console.error("Error updating courier status:", err);
      alert("Failed to update courier status. Please try again.");
    }
  };

  if (loading) {
    return <div className="main-content">Loading couriers...</div>;
  }

  if (error) {
    return <div className="main-content error-message">{error}</div>;
  }

  return (
    <div className="main-content">
      <h1>Courier Companies</h1>
      
      {couriers.length === 0 ? (
        <p>No couriers found.</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Logo</th>
                <th>Courier Name</th>
                <th>Branch Number</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((courier) => (
                <tr key={courier.id}>
                  <td>
                    {courier.imageUrl ? (
                      <img 
                        src={courier.imageUrl} 
                        alt={courier.courierName} 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }} 
                      />
                    ) : (
                      <div 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: '#E5E7EB',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ color: '#9CA3AF' }}>No logo</span>
                      </div>
                    )}
                  </td>
                  <td>{courier.courierName}</td>
                  <td>{courier.branchNumber}</td>
                  <td>{courier.address}</td>
                  <td>
                    <span className={courier.isActive ? 'status-active' : 'status-inactive'}>
                      {courier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleCourierStatus(courier.id, courier.isActive)}
                      className={courier.isActive ? 'btn-deactivate' : 'btn-activate'}
                    >
                      {courier.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CouriersList; 