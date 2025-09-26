import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./EditProfileTab.module.css";
import { useAuth } from "../../../provider/authProvider";

export default function EditProfileTab({ user, refreshUser }) {
    const [form, setForm] = useState({
        firstname: "",
        lastname: "",
        email: "",
        password: ""
    });

    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false); // tracks if the message is an error
    const [errors, setErrors] = useState({});
    const { setToken } = useAuth();

    // Load current user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await axios.get("/api/account/profile");
                setForm((prev) => ({
                    ...prev,
                    firstname: res.data.firstname,
                    lastname: res.data.lastname,
                    email: res.data.email
                }));
            } catch (err) {
                console.error("Failed to fetch user", err);
                setMessage("Error loading profile.");
                setIsError(true);
            }
        };

        fetchUserData();
    }, []);

    // Clear feedback message and error state
    const clearFeedback = () => {
        setMessage("");
        setIsError(false);
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        clearFeedback();
    };


    // Validate form input
    const validate = () => {
        const errs = {};
        if (!form.firstname.trim()) errs.firstname = "First name is required.";
        if (!form.lastname.trim()) errs.lastname = "Last name is required.";
        if (!/\S+@\S+\.\S+/.test(form.email)) {
            errs.email = "Invalid email address.";
        }
        if (!form.password) {
            errs.password = "Password is required to update profile.";
        }
        return errs;
    };

    // Handle update submission
    const handleUpdate = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            setMessage("");
            return;
        }

        setErrors({}); // Clear field-level errors
        setMessage(""); // Clear prior message
        setIsError(false); // Reset error state

        try {
            const res = await axios.put("/api/account/update", form);
            setMessage(res.data.message || "Profile updated successfully.");
            setIsError(false);
            setForm((prev) => ({ ...prev, password: "" })); // Clear password field
            
            const token_res = await axios.post('http://localhost:5050/api/account/login', {
                email: form.email,
                password: form.password
            });
            console.log(token_res)
            const token = token_res.data.token;
            
            setToken(token);
            if (typeof refreshUser === "function") {
                await refreshUser(); // Re-fetch profile in parent
            }
        } catch (err) {
            const serverMsg = err.response?.data?.error;
            setMessage(serverMsg || "Failed to update profile. Please try again.");
            setIsError(true);
        }
    };

    return (
        <div className={styles.profileCard}>
            <h3 className={styles.profileHeading}>Edit Profile</h3>

            {/* Overall success/error message */}
            {message && (
                <p className={`${styles.message} ${isError ? styles.errorMessage : styles.successMessage}`}>
                    {message}
                </p>
            )}

            <div className={styles.profileGroup}>
                <label htmlFor="firstname">First Name</label>
                <input
                    id="firstname"
                    name="firstname"
                    type="text"
                    value={form.firstname}
                    onChange={handleChange}
                />
                {errors.firstname && <span className={styles.error}>{errors.firstname}</span>}
            </div>

            <div className={styles.profileGroup}>
                <label htmlFor="lastname">Last Name</label>
                <input
                    id="lastname"
                    name="lastname"
                    type="text"
                    value={form.lastname}
                    onChange={handleChange}
                />
                {errors.lastname && <span className={styles.error}>{errors.lastname}</span>}
            </div>

            <div className={styles.profileGroup}>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                />
                {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.profileGroup}>
                <label htmlFor="password">Current Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter current password to confirm"
                    autoComplete="off"
                />
                {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            <button
                className={styles.updateButton}
                onClick={handleUpdate}
                disabled={!form.password}
            >
                Update Profile
            </button>
        </div>
    );
}
