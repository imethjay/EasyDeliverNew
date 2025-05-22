import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCouriers: 0,
    activeCouriers: 0,
    totalDrivers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch couriers
        const couriersSnapshot = await getDocs(collection(db, 'couriers'));
        const couriersData = couriersSnapshot.docs.map(doc => doc.data());
        
        // Calculate courier stats
        const totalCouriers = couriersData.length;
        const activeCouriers = couriersData.filter(courier => courier.isActive).length;
        
        // Fetch drivers
        const driversSnapshot = await getDocs(collection(db, 'drivers'));
        const totalDrivers = driversSnapshot.size;
        
        setStats({
          totalCouriers,
          activeCouriers,
          totalDrivers
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="main-content">
      <h1>Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Total Couriers Card */}
        <div className="dashboard-card">
          <h3>Total Courier Companies</h3>
          <p>{stats.totalCouriers}</p>
        </div>
        
        {/* Active Couriers Card */}
        <div className="dashboard-card">
          <h3>Active Courier Companies</h3>
          <p>{stats.activeCouriers}</p>
        </div>
        
        {/* Total Drivers Card */}
        <div className="dashboard-card">
          <h3>Total Drivers</h3>
          <p>{stats.totalDrivers}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 