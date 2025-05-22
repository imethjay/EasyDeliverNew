import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link } from 'react-router-dom';

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

      // Update the state
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
    return <div className="main-content error">{error}</div>;
  }

  return (
    <div className="main-content">
      <div className="header-actions">
        <h1>Courier Companies</h1>
      </div>
      {couriers.length === 0 ? (
        <p>No couriers found.</p>
      ) : (
        <div className="couriers-list">
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
                        className="courier-logo"
                      />
                    ) : (
                      <div className="courier-logo-placeholder">
                        {courier.courierName.charAt(0)}
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
                  <td className="actions">
                    <button
                      onClick={() => toggleCourierStatus(courier.id, courier.isActive)}
                      className={courier.isActive ? 'btn-deactivate' : 'btn-activate'}
                    >
                      {courier.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link to={`/courier/${courier.id}`} className="btn-view">
                      View Details
                    </Link>
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