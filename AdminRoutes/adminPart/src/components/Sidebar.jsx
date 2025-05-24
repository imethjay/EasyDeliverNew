import { Link } from 'react-router-dom';

const Sidebar = ({ onLogout }) => {
  return (
    <div className="sidebar">
      <h2>Admin Dashboard</h2>
      
      <nav className="nav">
        <ul>
          <li>
            <Link to="/dashboard">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/couriers">
              Couriers
            </Link>
          </li>
          <li>
            <Link to="/create-courier">
              Create Courier
            </Link>
          </li>
          <li>
            <Link to="/pricing">
              Pricing Management
            </Link>
          </li>
        </ul>
      </nav>
      
      <button onClick={onLogout}>
        Logout
      </button>
    </div>
  );
};

export default Sidebar; 