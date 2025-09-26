// Import React hooks and dependencies
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./ViewCommentsTab.module.css";

// Component to view comments on user's listings
export default function ViewCommentsTab({ user }) {
    const [commentsData, setCommentsData] = useState([]); // listings + reviews
    const [error, setError] = useState(""); // error message

    // Fetch comments from backend when the component mounts
    useEffect(() => {
        const fetchComments = async () => {
            try {
                const res = await axios.get(`/api/users/${user.userID}/comments`);
                setCommentsData(res.data);
            } catch (err) {
                console.error("Error fetching comments", err);
                setError("Failed to load comments.");
            }
        };

        fetchComments();
    }, [user.userID]);

    // Toggle visibility (hide/show) of a specific comment
    const toggleVisibility = async (phoneId, index) => {
        try {
            // Deep clone the listings array
            const updated = JSON.parse(JSON.stringify(commentsData));
            const targetPhone = updated.find(p => p.phoneId === phoneId);
            const comment = targetPhone.reviews[index];

            // Flip the hidden status
            comment.hidden = !comment.hidden;

            // Update in backend
            await axios.patch(`/api/phones/${phoneId}/reviews/${index}`, {
                hidden: comment.hidden,
            });

            // Update UI
            setCommentsData(updated);
        } catch (err) {
            console.error("Error updating comment", err);
            setError("Could not update comment.");
        }
    };

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <div className={styles.headerRow}>
                <h2>Comments</h2>
            </div>

            {/* Error message */}
            {error && <p className={styles.error}>{error}</p>}

            {/* Comments Table */}
            {commentsData.length === 0 ? (
                <p>No comments available.</p>
            ) : (
                <div className={styles.card}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th></th>
                                <th>Product</th>
                                <th>Rating</th>
                                <th>Review</th>
                                <th>Reviewer</th>
                                <th>Status</th>
                                <th>Toggle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commentsData.map((listing) =>
                                listing.reviews.map((review, idx) => (
                                    <tr key={`${listing.phoneId}-${idx}`}>
                                        <td>
                                            <img
                                                src={`/${listing.image}`}
                                                alt={listing.title}
                                                className={styles.image}
                                            />
                                        </td>
                                        <td>{listing.title}</td>
                                        <td>
                                            {"★".repeat(review.rating) + "☆".repeat(5 - review.rating)}
                                        </td>
                                        <td>{review.comment || <i>No comment</i>}</td>
                                        <td>{review.reviewer || <i>Unknown</i>}</td>
                                        <td>{review.hidden ? "Hidden" : "Visible"}</td>
                                        <td>
                                            <button
                                                className={styles.toggle}
                                                onClick={() => toggleVisibility(listing.phoneId, idx)}
                                            >
                                                {review.hidden ? "Show" : "Hide"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
