import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../App.css';

const CourierDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courier, setCourier] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch courier details
        const courierRef = doc(db, 'couriers', id);
        const courierSnap = await getDoc(courierRef);
        
        if (courierSnap.exists()) {
          setCourier({ id: courierSnap.id, ...courierSnap.data() });
          
          // Fetch drivers associated with this courier
          const driversQuery = query(
            collection(db, 'drivers'),
            where('courierId', '==', id)
          );
          
          const driversSnapshot = await getDocs(driversQuery);
          const driversList = driversSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setDrivers(driversList);
        } else {
          setError('Courier not found');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  const handleDriverStatusUpdate = async (driverId, newStatus) => {
    try {
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setDrivers(drivers.map(driver => 
        driver.id === driverId ? { ...driver, status: newStatus } : driver
      ));
    } catch (err) {
      console.error('Error updating driver status:', err);
      alert('Failed to update driver status. Please try again.');
    }
  };

  if (loading) return <div className="main-content">Loading...</div>;
  if (error) return <div className="main-content error">{error}</div>;
  if (!courier) return <div className="main-content">Courier not found</div>;

  return (
    <div className="main-content">
      <div className="header-actions">
        <button onClick={() => navigate('/couriers')} className="btn-back">
          Back to Couriers
        </button>
      </div>
      
      <div className="courier-details">
        <h1>{courier.courierName}</h1>
        
        <div className="courier-info">
          <div className="info-item">
            <strong>Branch Number:</strong> {courier.branchNumber || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Address:</strong> {courier.address || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Status:</strong> 
            <span className={courier.isActive ? 'status-active' : 'status-inactive'}>
              {courier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        
        <h2>Drivers ({drivers.length})</h2>
        
        {drivers.length === 0 ? (
          <p>No drivers registered with this courier yet.</p>
        ) : (
          <div className="drivers-list">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id}>
                    <td>{driver.fullName}</td>
                    <td>{driver.email}</td>
                    <td>{driver.vehicleType} ({driver.vehicleNumber})</td>
                    <td>
                      <span className={`status-${driver.status}`}>
                        {driver.status === 'pending' ? 'Pending Approval' : 
                         driver.status === 'approved' ? 'Approved' : 
                         driver.status === 'suspended' ? 'Suspended' : 'Unknown'}
                      </span>
                    </td>
                    <td className="actions">
                      {driver.status === 'pending' && (
                        <button 
                          onClick={() => handleDriverStatusUpdate(driver.id, 'approved')}
                          className="btn-approve"
                        >
                          Approve
                        </button>
                      )}
                      
                      {driver.status === 'approved' && (
                        <button 
                          onClick={() => handleDriverStatusUpdate(driver.id, 'suspended')}
                          className="btn-suspend"
                        >
                          Suspend
                        </button>
                      )}
                      
                      {driver.status === 'suspended' && (
                        <button 
                          onClick={() => handleDriverStatusUpdate(driver.id, 'approved')}
                          className="btn-activate"
                        >
                          Reactivate
                        </button>
                      )}
                      
                      <button 
                        onClick={() => window.open(`/driver/${driver.id}`, '_blank')}
                        className="btn-view"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourierDetails; 