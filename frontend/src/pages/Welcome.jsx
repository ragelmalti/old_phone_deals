// src/components/Welcome.jsx
import React, { useEffect, useState } from 'react';
import axios from "axios";
import { useAuth } from "../provider/authProvider";
import PhoneDetails from './PhoneDetails';
import './Welcome.css';
import { useLocation } from 'react-router-dom';

export default function Welcome() {
  const [soldOutPhones, setSoldOutPhones] = useState([]);
  const [bestSellerPhones, setBestSellerPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoneId, setSelectedPhoneId] = useState(null);
  const { token } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await fetchHomePhones();
      } catch (err) {
        console.error(err);
        setError("Failed to load initial data.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setSelectedPhoneId(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleHomeClick = () => setSelectedPhoneId(null);
    window.addEventListener("homeClicked", handleHomeClick);
    return () => window.removeEventListener("homeClicked", handleHomeClick);
  }, []);

  const fetchHomePhones = async () => {
    const [soldOutRes, bestSellersRes] = await Promise.all([
      axios.get("http://localhost:5050/api/phones/soldoutsoon"),
      axios.get("http://localhost:5050/api/phones/bestsellers"),
    ]);
    setSoldOutPhones(soldOutRes.data);
    setBestSellerPhones(bestSellersRes.data);
  }

  if (loading) return <p>Loading listings...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const PhoneCard = ({ phone, showStock }) => (
    <div className="phone-card">
        <img src={`/${phone.image}`} alt={phone.title} className="phone-img" />
        <p>${phone.price}</p>
        {showStock ? (
            <p>Stock: {phone.stock}</p>
        ) : (
            <p>Rating: {phone.averageRating?.toFixed(1)}</p>
        )}
        <button 
          className="view-button"
          onClick={() => setSelectedPhoneId(phone._id)}
        >
          View
        </button>
    </div>
  );

  return (
    <div className="main-page">
      <main>
        {selectedPhoneId ? (
          <div>
            <button
              style={{ marginTop: "10px" }}
              onClick={() => setSelectedPhoneId(null)}
            >
              Back
            </button>
            <PhoneDetails id={selectedPhoneId} onClose={() => setSelectedPhoneId(null)} />
          </div>
        ) : (
          <>
            <section>
            <h2>Sold Out Soon</h2>
            <div className="card-row">
              {soldOutPhones.map((phone) => (
                  <PhoneCard key={phone._id} phone={phone} showStock={true} />
              ))}
            </div>
          </section>
          <section>
            <h2>Best Sellers</h2>
            <div className="card-row"> 
              {bestSellerPhones.map((phone) => (
                  <PhoneCard key={phone._id} phone={phone} showStock={false} />
              ))}
            </div>
          </section>
        </>
        )}
      </main>
    </div>
  );
}
  