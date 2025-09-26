import { useState } from "react";
import axios from "axios";
import styles from "./ChangePasswordTab.module.css"; // Create or reuse CSS

export default function ChangePasswordTab() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: ""
    });

    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const errs = {};
        if (!form.currentPassword) {
            errs.currentPassword = "Current password is required.";
        }
        if (!form.newPassword)
            errs.newPassword = "New password is required.";
        else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.newPassword)) {
            errs.newPassword =
                "Password must be at least 8 characters, including a capital letter, a lowercase letter, a number, and a symbol.";
        }

        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            setMessage("");
            return;
        }

        setLoading(true); // Start loading

        try {
            const res = await axios.put("/api/account/change-password", form);
            setMessage(res.data.message);
            setForm({ currentPassword: "", newPassword: "" });
            setErrors({});
        } catch (err) {
            const errorMsg =
                err.response?.data?.error || "Failed to change password.";
            setMessage(errorMsg);
        } finally {
            setLoading(false); // Stop loading
        }
    };


    return (
        <div className={styles.container}>
            <h3>Change Password</h3>

            {message && <p className={styles.message}>{message}</p>}

            <div className={styles.inputGroup}>
                <label htmlFor="currentPassword">Current Password</label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={handleChange}
                    autoComplete="off"
                />
                {errors.currentPassword && (
                    <span className={styles.error}>{errors.currentPassword}</span>
                )}
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="newPassword">New Password</label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={handleChange}
                    autoComplete="off"
                />
                {errors.newPassword && (
                    <span className={styles.error}>{errors.newPassword}</span>
                )}
            </div>

            <button
                className={styles.button}
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Changing Password..." : "Confirm Change"}
                {loading && <span className={styles.spinner}></span>}
            </button>

        </div>
    );
}
