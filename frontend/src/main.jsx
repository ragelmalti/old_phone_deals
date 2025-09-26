// main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';

// Route protection wrapper
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';

// Layout component (shared header/footer structure)
import App from './App.jsx';

// Public pages
import Welcome from './pages/Welcome.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';

// Protected pages (require login)
import UsersTab from './pages/UsersTab.jsx';
import ReviewsTab from './pages/ReviewsTab.jsx';
import Cart from './pages/Cart.jsx';
import Wishlist from "./pages/Wishlist.jsx";

import Orders from './pages/Orders.jsx'
import Profile from './pages/Profile/Profile.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx';
import PhoneDetails from './pages/PhoneDetails.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
// Auth context provider for managing JWT and login state
import AuthProvider from './provider/authProvider.jsx';


const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<App />}>
        <Route index element={<Welcome />} />
        <Route path="login" element={<Login />} />
        <Route path="admin-login" element={<AdminLogin/>}/>
        <Route path="signup" element={<Signup />} />
        
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="admin" element={<AdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["user", "admin", "login"]} />}>
          <Route path="users" element={<UsersTab />} />
          <Route path="reviews" element={<ReviewsTab />} />
          <Route path="cart" element={<Cart />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>
    )
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);