import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Code adapted from https://dev.to/sanjayttg/jwt-authentication-in-react-with-react-router-1d03

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // State to hold the authentication token
  const [token, setToken_] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to set the authentication token
  const setToken = (newToken) => {
    setToken_(newToken);
  };

  const signOut = () => {
    setToken_(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (token) {
      const decodedToken = jwtDecode(token);
      console.log("The token has changed!")
      axios.defaults.headers.common["Authorization"] = "Bearer " + token;
      localStorage.setItem('token',token);
      setIsAuthenticated(true);
      if(decodedToken.role === "admin") {
        setIsAdmin(true);
      }
      else {
        setIsAdmin(false);
      }
    } else {
      console.log("The token been removed!")
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem('token')
      setIsAuthenticated(false);
    }
  }, [token]);

  // Memoized value of the authentication context
  const contextValue = useMemo(
    () => ({
      token,
      isAuthenticated,
      isAdmin,
      setToken,
      signOut,
      setIsAdmin
    }),
    [token, isAuthenticated, isAdmin]
  );

  // Provide the authentication context to the children components
  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;
