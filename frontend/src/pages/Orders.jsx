// src/components/ListingsTab.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';
import { useAuth } from "../provider/authProvider";
import { saveAs } from 'file-saver';
import toast, { toastConfig } from 'react-simple-toasts';
import 'react-simple-toasts/dist/style.css';

export default function Cart() {
    const [cartContents, setCart] = useState([]);
    const [orderContents, setOrderContents] = useState([]);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const handleExportToJSON = () => {
      const blob = new Blob([JSON.stringify(orderContents, null, 2)], { type: 'application/json' });
      saveAs(blob, `orders_${username}.json`);
    }

    const fetchUserName = () => {
        if (token) {
            const decodedToken = jwtDecode(token);
            console.log(decodedToken);
            setUsername(decodedToken.firstname || "Johnus Smithus");
        }
    }

    const fetchOrderContents = async () => {
        try {
            const response = await axios.get("http://localhost:5050/api/orders", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            console.log("API Response:", response.data);
            setOrderContents(response.data);
            setLoading(false);
        } catch (error) {
            console.log(error);
            setError(error);
            setLoading(false);
        }
    }

    useEffect(() => {
        console.log("Token:", token);
        if (token) {
            fetchUserName(); // Decode token and get username
            fetchOrderContents(); // Fetch order contents from API
          }
    }, [token]);

    if (loading) return <p>Loading order contents</p>;
    if (error) return <p>{error}</p>;

    return (
        <>
          <div className="cart-page">
            <h2>Orders of {username}</h2>
            <button onClick={handleExportToJSON} className="button">Export Orders to JSON</button>
            {orderContents.length === 0 ? (
              <p>No orders for {username}!</p>
            ) : (
              orderContents.map((order, index) => (
                <div key={index} className="order">
                  <h3>Order placed at {order.timestamp}</h3>
      
                  <table border="1" cellPadding="5">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Brand</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Seller Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.cart.map((item) => (
                        <tr key={item.itemID}>
                          <td>{item.name}</td>
                          <td>{item.brand}</td>
                          <td>{item.quantity}</td>
                          <td>${item.price}</td>
                          <td>{item.sellerName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
      
                  <p><b>Total: </b> ${order.total}</p>
                  <p><b>Delivered? </b>- {order.delivered ? "True" : "False"}</p>
                </div>
              ))
            )}
          </div>
        </>
      );}      
