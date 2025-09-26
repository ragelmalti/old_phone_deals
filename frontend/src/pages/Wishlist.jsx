import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../provider/authProvider";
import PhoneDetails from "./PhoneDetails"; // Modal popup for viewing phone details
import styles from './Wishlist.module.css';

export default function Wishlist() {
    // Get authentication token from context
    const { token } = useAuth();
    // State to hold fetched wishlist items
    const [wishlist, setWishlist] = useState([]);
    // State to manage loading spinner
    const [loading, setLoading] = useState(true);
    // State to track which phone is being viewed in modal
    const [selectedPhoneId, setSelectedPhoneId] = useState(null);

    // Fetch wishlist data from backend on component mount
    useEffect(() => {
        const fetchWishlist = async () => {
            try {
                const res = await axios.get("/api/wishlist");
                setWishlist(res.data); // Set wishlist with phones returned from DB
            } catch (err) {
                console.error("Error fetching wishlist", err);
            } finally {
                setLoading(false); // Hide loading spinner
            }
        };

        fetchWishlist();
    }, [token]);

    // Remove a phone from the wishlist
    const handleRemove = async (id) => {
        try {
            await axios.delete(`/api/wishlist/${id}`); // Call backend to remove
            setWishlist((prev) => prev.filter((item) => item._id !== id)); // Remove from UI
        } catch (err) {
            console.error("Failed to remove from wishlist", err);
        }
    };

    // Refresh wishlist data after removing an item
    const refreshWishlist = async () => {
        try {
            const res = await axios.get("/api/wishlist");
            setWishlist(res.data);
        } catch (err) {
            console.error("Error refreshing wishlist", err);
        }
    };

    // Show spinner while loading
    if (loading) return <p>Loading wishlist...</p>;

    return (
        <div style={{ padding: "2rem" }}>
            <h2>Your Wishlist</h2>

            {/* If empty wishlist */}
            {wishlist.length === 0 ? (
                <p>No items in your wishlist.</p>
            ) : (
                wishlist.map((item) => (
                    <div
                        key={item._id}
                        style={{
                            display: "flex",
                            gap: "1rem",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "1rem",
                            marginBottom: "1rem",
                            backgroundColor: "#fff",
                            alignItems: "center",
                        }}
                    >
                        {/* Phone image */}
                        <img
                            src={`/${item.image}`}
                            alt={item.title}
                            style={{ height: "100px", borderRadius: "6px", objectFit: "cover" }}
                        />

                        {/* Phone info */}
                        <div style={{ flex: 1 }}>
                            <h3>{item.title}</h3>
                            <p>Brand: {item.brand}</p>
                            <p>Price: ${item.price}</p>
                            <p>Stock: {item.stock}</p>
                        </div>

                        {/* Action buttons */}
                        <div>
                            <button
                                onClick={() => setSelectedPhoneId(item._id)} // Open modal
                                style={{
                                    marginRight: "0.5rem",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "5px",
                                    backgroundColor: "#2196f3",
                                    color: "white",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                View
                            </button>
                            <button
                                onClick={() => handleRemove(item._id)} // Remove from wishlist
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "5px",
                                    backgroundColor: "#e53935",
                                    color: "white",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                ))
            )}

            {/* Modal for viewing detailed phone info */}
            {selectedPhoneId && (
                <div className="modal-overlay">
                    <PhoneDetails
                        id={selectedPhoneId}
                        onClose={() => setSelectedPhoneId(null)}
                        onWishlistChange={refreshWishlist}
                    />

                </div>
            )}
        </div>
    );
}
