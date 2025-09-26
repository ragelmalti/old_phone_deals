import { Navigate, Outlet } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../provider/authProvider";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

/**
 * Guards nested routes based on JWT validity and optional role restrictions.
 * @param {{ allowedRoles?: string[] }} props
 */
export const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { token } = useAuth();
    const [isValid, setIsValid] = useState(null);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        const cancelTokenSource = axios.CancelToken.source();

        const validateToken = async () => {
            if (!token) {
                if (isMounted.current) {
                    setIsValid(false);
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await axios.get("http://localhost:5050/api/account/validate", {
                    headers: { Authorization: `Bearer ${token}` },
                    cancelToken: cancelTokenSource.token,
                });

                if (isMounted.current) {
                    setIsValid(response.status === 200);
                    setLoading(false);
                }
            } catch (error) {
                if (!axios.isCancel(error) && isMounted.current) {
                    console.error("Token validation failed:", error);
                    setIsValid(false);
                    setLoading(false);
                }
            }
        };

        validateToken();

        return () => {
            isMounted.current = false;
            cancelTokenSource.cancel("Component unmounted");
        };
    }, [token]);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!isValid) {
        if(!token) {
            return <Navigate to="/" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    // Role-based authorization (if roles specified)
    if (allowedRoles.length > 0) {
        try {
            const { role } = jwtDecode(token);
            if (!allowedRoles.includes(role)) {
                return <Navigate to="/login" replace />;
            }
        } catch {
            return <Navigate to="/login" replace />;
        }
    }

    return <Outlet />;
};
    