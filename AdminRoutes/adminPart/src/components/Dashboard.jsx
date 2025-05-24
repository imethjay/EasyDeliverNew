import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCouriers: 0,
    activeCouriers: 0,
    inactiveCouriers: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    scheduledOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalUsers: 0,
    ratingAverage: 0,
  });

  const [chartData, setChartData] = useState({
    weeklyOrders: {
      labels: [],
      datasets: []
    },
    courierPerformance: {
      labels: [],
      datasets: []
    },
    orderStatus: {
      labels: [],
      datasets: []
    },
    monthlyRevenue: {
      labels: [],
      datasets: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch couriers data
        const couriersSnapshot = await getDocs(collection(db, 'couriers'));
        const couriersData = couriersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch drivers data
        const driversSnapshot = await getDocs(collection(db, 'drivers'));
        const driversData = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch ride requests data (main orders collection)
        const ordersSnapshot = await getDocs(collection(db, 'rideRequests'));
        const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch users data
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate basic stats
        const totalCouriers = couriersData.length;
        const activeCouriers = couriersData.filter(courier => courier.isActive).length;
        const inactiveCouriers = totalCouriers - activeCouriers;
        
        const totalDrivers = driversData.length;
        const activeDrivers = driversData.filter(driver => driver.status === 'active' || driver.isActive).length;
        
        const totalUsers = usersData.length;
        
        const totalOrders = ordersData.length;
        const completedOrders = ordersData.filter(order => 
          order.deliveryStatus === 'delivered' || order.status === 'completed'
        ).length;
        const pendingOrders = ordersData.filter(order => 
          order.deliveryStatus === 'pending' || order.status === 'pending'
        ).length;
        const scheduledOrders = ordersData.filter(order => 
          order.status === 'scheduled' || order.deliveryStatus === 'scheduled'
        ).length;
        
        // Calculate revenue (using fare or amount fields)
        const totalRevenue = ordersData
          .filter(order => order.deliveryStatus === 'delivered' || order.status === 'completed')
          .reduce((sum, order) => sum + (order.fare || order.amount || order.totalCost || 0), 0);
        
        const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

        // Calculate average rating
        const ratedOrders = ordersData.filter(order => order.customerRating && order.customerRating > 0);
        const ratingAverage = ratedOrders.length > 0 
          ? ratedOrders.reduce((sum, order) => sum + order.customerRating, 0) / ratedOrders.length 
          : 0;

        setStats({
          totalCouriers,
          activeCouriers,
          inactiveCouriers,
          totalDrivers,
          activeDrivers,
          totalOrders,
          completedOrders,
          pendingOrders,
          scheduledOrders,
          totalRevenue,
          averageOrderValue,
          totalUsers,
          ratingAverage,
        });

        // Generate chart data
        await generateChartData(ordersData, couriersData);
        
        // Get recent activity
        const recentOrders = ordersData
          .sort((a, b) => new Date(b.createdAt?.seconds * 1000) - new Date(a.createdAt?.seconds * 1000))
          .slice(0, 5);
        
        setRecentActivity(recentOrders);
        
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const generateChartData = async (ordersData, couriersData) => {
    // Weekly orders data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'MMM dd');
    });

    const weeklyOrderCounts = last7Days.map(day => {
      const dayOrders = ordersData.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt.seconds * 1000);
        return format(orderDate, 'MMM dd') === day;
      });
      return dayOrders.length;
    });

    // Courier performance data
    const courierPerformance = couriersData.slice(0, 5).map(courier => ({
      name: courier.companyName || courier.name || 'Unknown',
      orders: ordersData.filter(order => order.courierId === courier.id).length
    }));

    // Order status data with proper mapping
    const statusCounts = {
      'Delivered': ordersData.filter(order => 
        order.deliveryStatus === 'delivered' || order.status === 'completed'
      ).length,
      'Pending': ordersData.filter(order => 
        order.deliveryStatus === 'pending' || order.status === 'pending'
      ).length,
      'In Transit': ordersData.filter(order => 
        order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'collecting'
      ).length,
      'Scheduled': ordersData.filter(order => 
        order.status === 'scheduled' || order.deliveryStatus === 'scheduled'
      ).length,
      'Cancelled': ordersData.filter(order => 
        order.deliveryStatus === 'cancelled' || order.status === 'cancelled'
      ).length,
    };

    // Monthly revenue data (last 6 months)
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: format(date, 'MMM'),
        revenue: ordersData
          .filter(order => {
            if (!order.createdAt || (order.deliveryStatus !== 'delivered' && order.status !== 'completed')) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, order) => sum + (order.fare || order.amount || order.totalCost || 0), 0)
      };
    });

    setChartData({
      weeklyOrders: {
        labels: last7Days,
        datasets: [
          {
            label: 'Orders',
            data: weeklyOrderCounts,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      courierPerformance: {
        labels: courierPerformance.map(c => c.name),
        datasets: [
          {
            label: 'Orders Completed',
            data: courierPerformance.map(c => c.orders),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ],
          },
        ],
      },
      orderStatus: {
        labels: Object.keys(statusCounts),
        datasets: [
          {
            data: Object.values(statusCounts),
            backgroundColor: [
              '#10b981', // Delivered
              '#f59e0b', // Pending
              '#3b82f6', // In Transit
              '#8b5cf6', // Scheduled
              '#ef4444', // Cancelled
            ],
          },
        ],
      },
      monthlyRevenue: {
        labels: monthlyData.map(d => d.month),
        datasets: [
          {
            label: 'Revenue ($)',
            data: monthlyData.map(d => d.revenue),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      },
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  const getOrderStatusBadge = (order) => {
    if (order.deliveryStatus === 'delivered' || order.status === 'completed') return '✅';
    if (order.deliveryStatus === 'pending' || order.status === 'pending') return '⏳';
    if (order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'collecting') return '🚚';
    if (order.status === 'scheduled') return '📅';
    if (order.deliveryStatus === 'cancelled') return '❌';
    return '📦';
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-state">
          <h2>Loading Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="header-actions">
        <h1>Admin Dashboard</h1>
        <div className="dashboard-refresh">
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/create-courier" className="quick-action-card">
            <div className="action-icon">➕</div>
            <div className="action-content">
              <h3>Add New Courier</h3>
              <p>Register a new courier company</p>
            </div>
          </Link>
          
          <Link to="/couriers" className="quick-action-card">
            <div className="action-icon">👀</div>
            <div className="action-content">
              <h3>View All Couriers</h3>
              <p>Manage existing courier companies</p>
            </div>
          </Link>
          
          <Link to="/pricing" className="quick-action-card">
            <div className="action-icon">💰</div>
            <div className="action-content">
              <h3>Manage Pricing</h3>
              <p>Update delivery pricing rates</p>
            </div>
          </Link>
          
          <div className="quick-action-card" onClick={() => window.location.reload()}>
            <div className="action-icon">🔄</div>
            <div className="action-content">
              <h3>Refresh Data</h3>
              <p>Get latest statistics</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="analytics-grid">
        <div className="analytics-card primary">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h3>Total Orders</h3>
            <p className="main-stat">{stats.totalOrders.toLocaleString()}</p>
            <span className="stat-label">All time deliveries</span>
          </div>
        </div>
        
        <div className="analytics-card success">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>Completed Orders</h3>
            <p className="main-stat">{stats.completedOrders.toLocaleString()}</p>
            <span className="stat-label">{((stats.completedOrders/stats.totalOrders)*100).toFixed(1)}% completion rate</span>
          </div>
        </div>
        
        <div className="analytics-card info">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Scheduled Orders</h3>
            <p className="main-stat">{stats.scheduledOrders.toLocaleString()}</p>
            <span className="stat-label">Future deliveries</span>
          </div>
        </div>
        
        <div className="analytics-card revenue">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Revenue</h3>
            <p className="main-stat">{formatCurrency(stats.totalRevenue)}</p>
            <span className="stat-label">From completed orders</span>
          </div>
        </div>
        
        <div className="analytics-card courier">
          <div className="card-icon">🚚</div>
          <div className="card-content">
            <h3>Active Couriers</h3>
            <p className="main-stat">{stats.activeCouriers}/{stats.totalCouriers}</p>
            <span className="stat-label">{((stats.activeCouriers/stats.totalCouriers)*100).toFixed(1)}% active</span>
          </div>
        </div>
        
        <div className="analytics-card driver">
          <div className="card-icon">👨‍💼</div>
          <div className="card-content">
            <h3>Active Drivers</h3>
            <p className="main-stat">{stats.activeDrivers}/{stats.totalDrivers}</p>
            <span className="stat-label">{((stats.activeDrivers/stats.totalDrivers)*100).toFixed(1)}% active</span>
          </div>
        </div>

        <div className="analytics-card info">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>Total Users</h3>
            <p className="main-stat">{stats.totalUsers.toLocaleString()}</p>
            <span className="stat-label">Registered customers</span>
          </div>
        </div>

        <div className="analytics-card success">
          <div className="card-icon">⭐</div>
          <div className="card-content">
            <h3>Average Rating</h3>
            <p className="main-stat">{stats.ratingAverage.toFixed(1)}</p>
            <span className="stat-label">Customer satisfaction</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-row">
          <div className="chart-container large">
            <h3>Weekly Orders Trend</h3>
            <Line 
              data={chartData.weeklyOrders}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
          
          <div className="chart-container small">
            <h3>Order Status Distribution</h3>
            <Doughnut 
              data={chartData.orderStatus}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="chart-row">
          <div className="chart-container medium">
            <h3>Monthly Revenue</h3>
            <Bar 
              data={chartData.monthlyRevenue}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value);
                      }
                    }
                  },
                },
              }}
            />
          </div>
          
          <div className="chart-container medium">
            <h3>Top Courier Performance</h3>
            <Bar 
              data={chartData.courierPerformance}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Order Activity</h3>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((order, index) => (
              <div key={order.id || index} className="activity-item">
                <div className="activity-icon">
                  {getOrderStatusBadge(order)}
                </div>
                <div className="activity-content">
                  <p><strong>Order #{order.id?.substring(0, 8) || 'N/A'}</strong></p>
                  <p>Status: {order.deliveryStatus || order.status || 'Unknown'}</p>
                  <p>Amount: {formatCurrency(order.fare || order.amount || order.totalCost || 0)}</p>
                  <span className="activity-time">{formatDate(order.createdAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-activity">No recent activity found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 