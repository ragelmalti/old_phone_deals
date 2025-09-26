// Import React hooks and dependencies
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ManageListingsTab.module.css";

// Define available brands (used for dropdown + image auto-selection)
const BRANDS = [
    "Apple", "Samsung", "Huawei", "Sony", "Nokia",
    "HTC", "LG", "Motorola", "BlackBerry"
];

// Component for managing the user's phone listings
export default function ManageListingsTab({ user }) {
    // State to hold listings fetched from backend
    const [listings, setListings] = useState([]);
    // State to show loading state while fetching data
    const [loading, setLoading] = useState(true);
    // State to store any error or status messages
    const [message, setMessage] = useState("");

    // State to control whether the Add Listing form is shown
    const [showForm, setShowForm] = useState(false);
    // State to store validation errors for the form fields
    const [formErrors, setFormErrors] = useState({});

    // State to store values entered in the Add Listing form
    const [newListing, setNewListing] = useState({
        title: "",
        brand: "",
        price: "",
        stock: "",
        image: "",
    });

    // Fetch listings when component mounts
    useEffect(() => {
        const fetchListings = async () => {
            try {
                // GET request to fetch listings for the current user
                const res = await axios.get(`/api/users/${user.userID}/listings`);
                setListings(res.data);
            } catch (err) {
                console.error("Error fetching listings", err);
                setMessage("Failed to load listings.");
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [user.userID]); // Re-run effect if user ID changes

    // Handle input changes in the Add Listing form
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewListing({ ...newListing, [name]: value });
    };

    // Handle brand dropdown change and auto-select image path
    const handleBrandChange = (e) => {
        const brand = e.target.value;
        setNewListing({
            ...newListing,
            brand,
            image: `phone_default_images/${brand}.jpeg`, // Set image based on brand
        });
    };

    // Validate form before submission
    const validateForm = () => {
        const errors = {};
        const { title, brand, price, stock, image } = newListing;

        if (!title.trim()) {
            errors.title = "Title is required.";
        } else if (title.length > 100) {
            errors.title = "Title must be under 100 characters.";
        } else if (/^\d+$/.test(title.trim())) {
            errors.title = "Title cannot be numbers only.";
        }

        if (!brand) errors.brand = "Brand is required.";

        if (!price || isNaN(price) || Number(price) <= 0) {
            errors.price = "Price must be a positive number.";
        }

        if (!stock || isNaN(stock) || Number(stock) < 0) {
            errors.stock = "Stock must be a non-negative number.";
        } else if (!Number.isInteger(Number(stock))) {
            errors.stock = "Stock must be a whole number.";
        }

        return errors;
    };

    // Handle submission of a new listing
    const handleAddListing = async () => {
        // Run validation logic and store any errors in an object
        const errors = validateForm();

        // If there are any validation errors (i.e., the object is not empty)
        if (Object.keys(errors).length > 0) {
            // Update the formErrors state with the validation errors
            setFormErrors(errors);
            // Prevent form submission
            return;
        }

        // If no errors, clear previous error messages
        setFormErrors({});

        try {
            // POST request to add new listing to the database
            const res = await axios.post("/api/phones", {
                ...newListing,
                seller: user.userID,
                reviews: [],
            });

            // Update local state to include the new listing
            // - creates a new array with all the previous listings (...prev), plus the new listing (res.data) at the end
            setListings((prev) => [...prev, res.data]);
            // Reset form and close it
            setNewListing({ title: "", brand: "", price: "", stock: "", image: "" });
            setShowForm(false);
        }
        catch (err) {
            console.error("Error adding listing", err.response || err.message || err);
            setMessage(err?.response?.data?.error || "Add listing failed.");
        }
    };



    // Toggle listing status (disabled/active)
    const toggleListing = async (id, currentlyDisabled) => {
        try {
            // PATCH request to toggle the listing's disabled status
            // (PATCH is an HTTP method used to partially update a resource on the server)
            await axios.patch(`/api/phones/${id}`, {
                disabled: !currentlyDisabled,
            });
            // Update local state to reflect the new status
            setListings((prev) =>
                prev.map((item) =>
                    item._id === id ? { ...item, disabled: !currentlyDisabled } : item
                )
            );
        } catch (err) {
            console.error("Error toggling listing", err);
            setMessage("Update failed.");
        }
    };

    // Delete a listing
    const deleteListing = async (id) => {
        try {
            // DELETE request to remove the listing from the database
            await axios.delete(`/api/phones/${id}`);

            // Update local state to remove the deleted listing
            setListings((prev) => prev.filter((item) => item._id !== id));
        } catch (err) {
            console.error("Error deleting listing", err);
            setMessage("Delete failed.");
        }
    };




    // Show loading message while fetching listings
    if (loading) return <div>Loading listings...</div>;

    // Main render
    return (
        <div className={styles.wrapper}>
            {/* Header row */}
            <div className={styles.headerRow}>
                <h2>Manage Listings</h2>
                <button className={styles.addButton} onClick={() => setShowForm(!showForm)}>
                    Add New Listing
                </button>
            </div>

            {message && <p className={styles.error}>{message}</p>}

            {/* Add Form */}
            {showForm && (
                <div className={styles.card}>
                    <h3 className={styles.cardHeading}>Add Listing</h3>
                    <div className={styles.formContent}>
                        <div className={styles.formLeft}>
                            <div className={styles.formGroup}>
                                <label htmlFor="title">Title</label>
                                <input
                                    id="title"
                                    name="title"
                                    value={newListing.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Apple iPhone 15 Pro Max 256GB (Black)"
                                    required
                                    maxLength={100}
                                />
                                {formErrors.title && <span className={styles.error}>{formErrors.title}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="brand">Brand</label>
                                <select
                                    id="brand"
                                    name="brand"
                                    value={newListing.brand}
                                    onChange={handleBrandChange}
                                    required
                                >
                                    <option value="">Select a brand</option>
                                    {BRANDS.map((brand) => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                                {formErrors.brand && <span className={styles.error}>{formErrors.brand}</span>}
                            </div>

                            <div className={styles.inlineInputs}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="price">Price</label>
                                    <div className={styles.priceInput}>
                                        <span className={styles.dollar}>$</span>
                                        <input
                                            id="price"
                                            name="price"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={newListing.price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    {formErrors.price && <span className={styles.error}>{formErrors.price}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="stock">Stock</label>
                                    <input
                                        id="stock"
                                        name="stock"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={newListing.stock}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {formErrors.stock && <span className={styles.error}>{formErrors.stock}</span>}
                                </div>
                            </div>

                            <div className={styles.formRowRight}>
                                <button className={styles.submit} onClick={handleAddListing}>
                                    Submit
                                </button>
                            </div>
                        </div>

                        {/* Right: Image preview */}
                        {newListing.image && (
                            <div className={styles.previewImageBox}>
                                <img src={`/${newListing.image}`} alt="Preview" className={styles.previewImage} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            {listings.length === 0 ? (
                <p>No listings found.</p>
            ) : (
                <div className={styles.card}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Title</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listings.map((listing) => (
                                <tr key={listing._id}>
                                    <td>
                                        <img
                                            src={`/${listing.image}`}
                                            alt={listing.title}
                                            className={styles.image}
                                        />
                                    </td>
                                    <td>{listing.title}</td>
                                    <td>${Number(listing.price).toFixed(2)}</td>
                                    <td>{listing.stock}</td>
                                    <td>{listing.disabled ? "Disabled" : "Active"}</td>
                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button
                                                className={styles.toggle}
                                                onClick={() => toggleListing(listing._id, listing.disabled)}
                                            >
                                                {listing.disabled ? "Enable" : "Disable"}
                                            </button>
                                            <button
                                                className={styles.delete}
                                                onClick={() => deleteListing(listing._id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}