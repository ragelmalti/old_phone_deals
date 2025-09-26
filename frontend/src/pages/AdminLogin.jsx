import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../provider/authProvider";

export default function AdminLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const { setToken }            = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // hit the new admin login route
      const { data } = await axios.post(
        "http://localhost:5050/api/account/admin/login",
        { email, password }
      );
      setToken(data.token);

      // decode to check the role
      const decoded = jwtDecode(data.token);
      if (decoded.role === "admin") {
        navigate("/admin");
      } else {
        // error handle or redirect
        navigate("/");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="account-page">
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign In as Admin</button>
      </form>
    </div>
  );
}
