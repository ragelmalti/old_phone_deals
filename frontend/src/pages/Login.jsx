import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../provider/authProvider";
import toast from 'react-simple-toasts';
import 'react-simple-toasts/dist/style.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:5050/api/account/login',
        { email, password }
      );
      const token = response.data.token;
      setToken(token);

      // Decode JWT and redirect based on role
      const { role } = jwtDecode(token);
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      const err = error.response?.data;
      if (err?.error) {
        toast(`ERROR: ${JSON.stringify(err.error)}`, { duration: 5000, className: 'warning-toast' });
      } else if (err?.errors) {
        err.errors.forEach(item => {
          toast(`ERROR: ${item.msg}`, { duration: 5000, className: 'warning-toast' });
        });
      } else {
        toast('Login failed', { duration: 5000, className: 'warning-toast' });
      }
    }
  }

  return (
    <div className="account-page">
      <h1>Login</h1>
      <form onSubmit={login}>
        <div>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
}
