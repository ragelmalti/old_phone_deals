import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast, { toastConfig } from 'react-simple-toasts';
import { useAuth } from "../provider/authProvider";
import { Link } from "react-router-dom";
import './PhoneDetails.css';


// We give onWishlistChange as a callback prop, so the function 'refreshWishlist'
// can be called from the parent component (Wishlist.jsx) to refresh the wishlist
// when the user adds or removes a phone from the wishlist
export default function PhoneDetails({ id, onClose, onWishlistChange }) {
    const [phone, setPhone] = useState(null);
    const [error, setError] = useState(null);
    const [visibleReviews, setVisibleReviews] = useState(3);
    const [expandedComments, setExpandedComments] = useState({});
    const [inWishlist, setInWishlist] = useState(false);
    const { token } = useAuth();

    // store what the user types in their comment in the input field
    // and the rating they select 
    const [newComment, setNewComment] = useState("");
    const [newRating, setNewRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await axios.get(`http://localhost:5050/api/phones/${id}/details`);
                setPhone(res.data);
            } catch (err) {
                console.error("Failed to load phone details", err);
                setError("Failed to load phone details")
            }
        };

        // check if the phone is already in the wishlist
        const checkWishlist = async () => {
            try {
                const wishlistRes = await axios.get("/api/wishlist");
                const wishlistIds = wishlistRes.data.map(item => item._id);
                setInWishlist(wishlistIds.includes(id));
            } catch (err) {
                console.warn("Could not check wishlist status", err);
            }
        };

        fetchDetails();
        checkWishlist();
    }, [id]);

    const toggleComment = (index) => {
        setExpandedComments(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const showMoreReviews = () => {
        setVisibleReviews(prev => prev + 3);
    };

    // toggle wishlist: add or remove
    const handleToggleWishlist = async () => {
        try {
            if (inWishlist) {
                await axios.delete(`/api/wishlist/${id}`);
                setInWishlist(false);
            } else {
                await axios.post(`/api/wishlist/${id}`, {}, { withCredentials: true });
                setInWishlist(true);
            }

            // Notify parent wishlist has changed
            if (onWishlistChange) {
                onWishlistChange();
            }

        } catch (err) {
            console.error("Wishlist update failed", err);
            toast(`ERROR: Could not update wishlist.`, { duration: 5000, className: 'warning-toast' })
        }
    };
    const handleAddToCart = async () => {
        try {
            await axios.post('http://localhost:5050/api/cart/add',
                {
                    cart: [
                        { itemID: id, quantity: quantity }
                    ]
                },
                { headers: { "Authorization": `Bearer ${token}` } }
            );
            toast(`SUCCESS: Added to cart!`, { duration: 5000, className: 'success-toast' })
        } catch (err) {
            console.error("Failed to add to cart", err);
            toast(`ERROR: Failed to add to cart`, { duration: 5000, className: 'warning-toast' })
            //toast(`${err}`, { duration: 5000, className: 'warning-toast' })
        }
    };

    const handleSubmitReview = async () => {
        try {
            // Set the loading state so the submit button is disabled during the request
            setIsSubmitting(true);

            // Send the review data to the backend API with the user's token for authentication
            const res = await axios.post(
                `/api/phones/${id}/reviews`, // API endpoint for submitting a review for this phone
                { rating: newRating, comment: newComment }, // Request body with user's input
                { headers: { Authorization: `Bearer ${token}` } } // Authorization header
            );

            // Extract the submitted review from the response
            const submittedReview = res.data.review;

            // Update the local phone state to include the new review at the end of the reviews array
            setPhone((prev) => ({// keep existing phone data
                ...prev,
                reviews: [
                    ...prev.reviews, // preserve all previous reviews
                    {
                        rating: submittedReview.rating,
                        comment: submittedReview.comment,
                        fullname: submittedReview.fullname,
                        hidden: false // show the review by default
                    }
                ]
            }));

            // Show success notification and reset input fields
            toast("Review submitted!", { className: "success-toast" });
            setNewComment(""); // clear the comment box
            setNewRating(5);   // reset the rating to default
        } catch (err) {
            // If something goes wrong, show an error message
            console.error("Review submission failed", err.response?.data || err.message);
            toast("Could not submit review.", { className: "warning-toast" });
        } finally {
            // Whether success or failure, allow user to submit again
            setIsSubmitting(false);
        }
    };




    if (error) return <p style={{ color: "red" }}>{error}</p>
    if (!phone) return <p>Loading phone details...</p>;

    return (
        <div className="phone-details">
            <h2>{phone.title}</h2>
            <p><strong>Brand:</strong> {phone.brand}</p>
            <img src={`/${phone.image}`} alt={phone.title} className="phone-img" />
            <p><strong>Stock:</strong> {phone.stock}</p>
            <p><strong>Price:</strong> ${phone.price}</p>
            <p><strong>Seller:</strong> {phone.sellerInfo.firstname} {phone.sellerInfo.lastname}</p>

            {/* ✅ Wishlist Button */}
            <button onClick={handleAddToCart} className="wishlist-button">
                🛒 Add to cart
            </button>

            <input className="cart-quantity"
                type="number"
                value={quantity}
                min="1"
                onChange={(e) => setQuantity(parseInt(e.target.value))}
            />

            <button
                onClick={handleToggleWishlist}
                className={`wishlist-button ${inWishlist ? "added" : ""}`}
            >
                {inWishlist ? "🤍 Remove from Wishlist" : "❤️ Add to Wishlist"}
            </button>

            <h3>Reviews</h3>
            {phone.reviews.slice(0, visibleReviews).map((review, index) => (
                <div key={index} className={`review ${review.hidden ? "hidden" : ""}`}>
                    <p><strong>{review.fullname}</strong> - Rating: {review.rating}</p>
                    <p>
                        {expandedComments[index] || review.comment.length <= 200
                            ? review.comment
                            : `${review.comment.slice(0, 200)}...`}
                        {review.comment.length > 200 && (
                            <button onClick={() => toggleComment(index)}>
                                {expandedComments[index] ? "Show Less" : "Show More"}
                            </button>
                        )}
                    </p>
                </div>
            ))}

            {visibleReviews < phone.reviews.length && (
                <button onClick={showMoreReviews}>Show More Reviews</button>
            )}

            <h3>Leave a Review</h3>
            {token ? (
                <>
                    <div className="review-form">
                        {/* Rating dropdown */}
                        <label>
                            Rating:
                            <select
                                value={newRating}
                                onChange={(e) => setNewRating(Number(e.target.value))}
                            >
                                {[5, 4, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </label>

                        {/* Text area */}
                        <textarea
                            placeholder="Write your review here..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                        />

                        {/* Submit button */}
                        <button
                            onClick={handleSubmitReview}
                            disabled={isSubmitting || !newComment.trim()}
                        >
                            {isSubmitting ? "Submitting..." : "Post Review"}
                        </button>
                    </div>
                </>
            ) : (
                <p className="login-warning">
                    Please <Link to="/login">log in</Link> to leave a review.
                </p>
            )}



        </div>
    );
}