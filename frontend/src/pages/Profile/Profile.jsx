import { useState, useEffect } from "react";
import { useAuth } from "../../provider/authProvider";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from './Profile.module.css';

// Tab components
import EditProfileTab from './tabs/EditProfileTab.jsx';
import ChangePasswordTab from './tabs/ChangePasswordTab.jsx';
import ManageListingsTab from './tabs/ManageListingsTab.jsx';
import ViewCommentsTab from './tabs/ViewCommentsTab.jsx';

export default function Profile() {
    // get authentication token and signOut function from the auth provider
    const { token, signOut } = useAuth();
    // declare state for storing user data fetched from the backend (null initially)
    const [user, setUser] = useState(null);       // 'model'
    // declare state for tracking which tab is currently active (default: 'edit')
    const [activeTab, setActiveTab] = useState(null);  // 'viewmodel'
    // create navigate function to allow you to programmatically redirect within the app
    const navigate = useNavigate();

    // define async function to handle asynchronous axios.get() call
    const fetchUser = async () => {
        try {
            // send an HTTP GET request to your backend API and retrieve the user's profile
            const res = await axios.get("/api/account/profile");
            setUser({ ...res.data });
        } catch (err) {
            console.error("Failed to load profile", err);
            // REVIEW fallback: maybe redirect or show error
        }
    };



    // load user data when component mounts
    useEffect(() => {
        // if no token is available (i.e., user not logged in), redirect to login page
        if (!token) {
            navigate("/login");
            return;
        }

        fetchUser();
        // Re-run this effect if token changes, or navigate function changes
        // - Navigate function rarely changes, but adding navigate to dependencies
        // avoids lint warnings with react
    }, [token, navigate]);

    // If user data is not yet loaded, show a loading message
    if (!user) return <div>Loading profile...</div>;

    return (
        <div className={styles.container}>
            {/* Top bar with Logout button */}
            <div className={styles.topBar}>
                <div className={styles.topLeft}>
                    <h1 className={styles.title}>Hi {user.firstname}!</h1>
                </div>
                <button
                    className={styles.logoutButton}



                    // When the button is clicked, navigate to the homepage
                    onClick={() => {
                        // Show a confirmation dialog before logging out
                        const confirmLogout = window.confirm("Are you sure you want to log out?");
                        if (!confirmLogout) return;

                        // If user confirms, navigate to homepage and remove token
                        navigate("/");       // Go to homepage first
                        setTimeout(() => {
                            signOut();         // Then remove the token (which will trigger redirect logic elsewhere)
                        }, 50);              // small delay ensures navigate() happens before redirect logic
                    }}

                >
                    Log Out
                </button>
            </div>


            {/* User information */}
            <div className={styles.userInfo}>
                <p><strong>First name:</strong> {user.firstname}</p>
                <p><strong>Last name:</strong> {user.lastname}</p>
                <p><strong>Email:</strong> {user.email}</p>
            </div>


            <div className={styles.tabs}>
                {/* Loop through tab identifiers and create a button for each tab  */}
                {["edit", "password", "listings", "comments"].map((tab) => (
                    // If tab is selected, we add the styles.active class to
                    // highlight it
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${styles.button} ${activeTab === tab ? styles.active : ""}`}
                    >
                        {/* map internal tab IDs to human-friendly labels */}
                        {{
                            edit: "Edit Profile",
                            password: "Change Password",
                            listings: "Manage Listings",
                            comments: "View Comments"
                        }[tab]}
                    </button>
                ))}
            </div>

            <div className={styles.content}>
                {activeTab === "edit" && <EditProfileTab user={user} refreshUser={fetchUser} />}
                {activeTab === "password" && <ChangePasswordTab user={user} />}
                {activeTab === "listings" && <ManageListingsTab user={user} />}
                {activeTab === "comments" && <ViewCommentsTab user={user} />}
            </div>
        </div>
    );
}