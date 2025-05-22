import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CreateCourier = () => {
  const [formData, setFormData] = useState({
    courierName: '',
    imageUrl: '',
    branchNumber: '',
    address: '',
    isActive: true
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Create courier document in Firestore
      await addDoc(collection(db, 'couriers'), {
        courierName: formData.courierName,
        imageUrl: formData.imageUrl,
        branchNumber: formData.branchNumber,
        address: formData.address,
        isActive: formData.isActive,
        createdAt: new Date(),
      });
      
      // Reset form
      setFormData({
        courierName: '',
        imageUrl: '',
        branchNumber: '',
        address: '',
        isActive: true
      });
      
      setSuccess(true);
    } catch (err) {
      console.error('Error creating courier:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <h1>Create New Courier Company</h1>
      
      {success && (
        <div className="success-message">
          Courier company created successfully!
        </div>
      )}
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="courierName">
            Courier Name
          </label>
          <input
            id="courierName"
            name="courierName"
            type="text"
            placeholder="Courier Company Name"
            value={formData.courierName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="imageUrl">
            Logo URL
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            value={formData.imageUrl}
            onChange={handleChange}
          />
          <small>Enter a direct URL to the company logo image</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="branchNumber">
            Main Branch Number
          </label>
          <input
            id="branchNumber"
            name="branchNumber"
            type="tel"
            placeholder="Branch Phone Number"
            value={formData.branchNumber}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            placeholder="Company Address"
            value={formData.address}
            onChange={handleChange}
            required
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            <span>Active</span>
          </label>
        </div>
        
        <div>
          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Courier'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourier; 