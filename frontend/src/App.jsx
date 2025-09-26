// App.jsx
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import './App.css';
import { useAuth } from "./provider/authProvider";
import PhoneDetails from "./pages/PhoneDetails";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const { isAuthenticated, isAdmin, setToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null)
  const [actualMaxPrice, setActualMaxPrice] = useState(1000);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [selectedPhoneId, setSelectedPhoneId] = useState(null);


  useEffect(() => {
      const fetchMaxPrice = async () => {
          try {
              const res = await axios.get("http://localhost:5050/api/phones/metadata");
              const fetchedMax = res.data.maxPrice;
              setActualMaxPrice(fetchedMax > 1000 ? fetchedMax : 1000);
              setMaxPrice(fetchedMax > 1000 ? fetchedMax : 1000);
              setBrands(res.data.brands.sort((a, b) => a.localeCompare(b)));
          } catch (err) {
              console.error("Failed to fetch max price", err);
          }
      };
      fetchMaxPrice();
  }, []);

  useEffect(() => {
      if (showOverlay) {
          fetchSearchResults();
      }
  }, [searchTerm, brandFilter, maxPrice]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setShowOverlay(false);
      setSelectedPhoneId(null);
    }
  }, [location.pathname]);

  const fetchSearchResults = async () => {
    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await axios.get("http://localhost:5050/api/phones", {
        params: {
          search: searchTerm || undefined,
          maxPrice: maxPrice !== actualMaxPrice ? maxPrice : undefined,
          brand: brandFilter || undefined
        }
      });
      const sorted = res.data.sort((a, b) => a.brand.localeCompare(b.brand));
      setSearchResults(sorted);
      console.log(res.data);
    } catch (err) {
      setSearchError("Failed to fetch search results.");
    } finally {
      setSearchLoading(false); 
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if(confirmLogout) {
      navigate('/');
      window.dispatchEvent(new Event("homeClicked"));
      localStorage.removeItem('token');
      setToken(null); 
      setShowOverlay(false);
      setSelectedPhoneId(null);
      setSearchTerm("")
      setBrandFilter("")
      setMaxPrice(actualMaxPrice);
    }
  };

  const handleSearch = () => {
    if (!showOverlay) {
      setShowOverlay(true);
      fetchSearchResults();
    }
  };
  
  return (
    <div className="app-layout">
      <header>
        <h1>OldPhoneDeals</h1>
        <nav className="navbar">
          <ul className="navbar-links">
          {isAuthenticated ? (
              <>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/");
                    window.dispatchEvent(new Event("homeClicked"));
                  }}
                >
                  Home
                </button>
                {isAdmin && (
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("");
                    setBrandFilter("");
                    setMaxPrice(actualMaxPrice);
                    navigate("/admin");
                  }}
                >
                  Admin
                </button>
              )}
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/cart");
                  }}
                >
                  Cart
                </button>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/wishlist");
                  }}
                >
                  Wishlist
                </button>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/orders");
                  }}
                >
                  Orders
                </button>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/profile");
                  }}
                >
                  Profile
                </button>
                <button className="nav-button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/");
                    window.dispatchEvent(new Event("homeClicked"));
                  }}
                >
                  Home
                </button>
                <button
                  className="nav-button"  
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/login");
                  }}
                >
                  Login
                </button>
                <button 
                  className="nav-button" 
                  onClick={() => {
                    setShowOverlay(false);
                    setSelectedPhoneId(null);
                    setSearchTerm("")
                    setBrandFilter("")
                    setMaxPrice(actualMaxPrice);
                    navigate("/signup");
                  }}
                >
                  Signup
                </button>
              </>
            )}
          </ul>
          {isHomePage && (
            <div className="nav-search-row">
            {showOverlay && (
              <>
                <div className="filter-inline price-slider-container">
                  <span>$0</span>
                  <input
                    id="priceSlider"
                    type="range"
                    min={0}
                    max={actualMaxPrice}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                  <span>${maxPrice}</span>
                </div>
                <div className="filter-inline">
                  <select
                    id="brandselect"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <input
              type="text"
              placeholder="Search phones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="nav-button" onClick={handleSearch}>Search</button>
          </div>
          )}
        </nav>
      </header>
      <main>
        {!showOverlay && <Outlet />}
        {showOverlay && (
          selectedPhoneId ? (
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
            <div>
              <div className="overlay-header">
                <h2>Search Results for "{searchTerm || 'All Phones'}"</h2>
              </div>
              {searchLoading ? (
                <p>Loading...</p>
              ) : searchError ? (
                <p style={{ color: 'red' }}>{searchError}</p>
              ) : (
                <div className="card-row">
                  {searchResults.length === 0 ? (
                    <p>No results found.</p>
                  ) : (
                    searchResults.map((phone) => (
                      <div className="phone-card" key={phone._id}>
                        <img src={`/${phone.image}`} alt={phone.title} className="phone-img" />
                        <p>${phone.price}</p>
                        <p>Brand: {phone.brand}</p>
                        <p>Rating: {phone.averageRating?.toFixed(1)}</p>
                        <button 
                          className="view-button"
                          onClick={() => setSelectedPhoneId(phone._id)}
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        )}
      </main>
      <footer>
      </footer>
    </div>
  );
}
