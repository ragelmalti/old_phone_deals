// src/components/ListingsTab.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { jwtDecode } from 'jwt-decode';
import { useAuth } from "../provider/authProvider";
import toast, { toastConfig } from 'react-simple-toasts';
import 'react-simple-toasts/dist/style.css';

export default function Cart() {
    const [cartContents, setCart] = useState([]);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    const fetchUserName = () => {
        if (token) {
            const decodedToken = jwtDecode(token);
            console.log(decodedToken);
            setUsername(decodedToken.firstname || "Johnus Smithus");
        }
    }

    const fetchCartContents = async () => {
        try {
            const response = await axios.get("http://localhost:5050/api/cart", {
                headers: { "Authorization": `Bearer ${token}` },
            });
            setCart(response.data);
            setLoading(false);
        } catch (error) {
            console.log(error);
            setError(error);
            setLoading(false);
        }
    }
    
    const updateQuantity = async (itemID, quantity) => {
        if(quantity > 0) {
            try {
                console.log(itemID)
                console.log(quantity)
                const response = await axios.post("http://localhost:5050/api/cart/update",
                    {cart: [{itemID: itemID, quantity: quantity}]},
                    {headers: { "Authorization": `Bearer ${token}` },
                });
                fetchCartContents();
                /*
                setCart((prevCart) => {
                    const updatedCart = prevCart.cart.map((item) => 
                        item.itemID === itemID ? {...item, quantity: quantity} : item
                    );
                    return {... prevCart, cart: updatedCart};
                })
                */
            }
            catch (error) { 
                if (error.response.data.errors) {
                    error.response.data.errors.map((item) => {
                        console.log(item)
                        toast(`ERROR: ${JSON.stringify(item.error)}`, {duration: 5000, className: 'warning-toast'})
                    })
                    
                }
            }
        }
    }

    const removeItemFromCart = async (itemID) => {
        try {
            console.log(itemID)
            const response = await axios.post("http://localhost:5050/api/cart/delete",
                {cart: [{itemID: itemID}]},
                {headers: { "Authorization": `Bearer ${token}` },
            });
            fetchCartContents();
        } catch (error) {
            if(error.response) {
                console.log(`${error.response.status}: ${JSON.stringify(error.response.data)}`);
            }
            else {
                console.log("Error:", error.message);
            }
        }
    }

    const checkout = async () => {
        try {
            const response = await axios.get("http://localhost:5050/api/cart/checkout",
                {headers: { "Authorization": `Bearer ${token}` }
            });
            console.log(response.data);
            toast(`SUCCESS: order placed!`, {duration: 5000, className: 'success-toast'})
            fetchCartContents();
        } catch (error) {
            if(error.response) {
                console.log(`${error.response.status}: ${JSON.stringify(error.response.data)}`);
            }
            else {
                console.log("Error:", error.message);
            }
        }
    }

    useEffect(() => {
        console.log("Token:", token);
        if (token) {
            fetchUserName(); // Decode token and get username
            fetchCartContents(); // Fetch cart contents from API
          }
    }, [token]);

    if (loading) return <p>Loading cart contents</p>;
    if (error) return <p>{error}</p>;

    return (
        <>
        <div class="cart-page">
            <h2>Cart of {username}</h2>
            {cartContents.cart.length === 0 ? (
                <p>Cart is empty!</p>
            ) : (
                <>
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
                        {cartContents.cart.map((item) => (
                        <tr key={item.itemID}>
                            <td>{item.name}</td>
                            <td>{item.brand}</td>
                            <td>
                                <input
                                    type="number"
                                    value={item.quantity}
                                    min="1"
                                    onChange={(e) => updateQuantity(item.itemID, parseInt(e.target.value))}
                                />
                            </td>
                        <td>${item.price}</td>
                        <td>{item.sellerName}</td>
                        <td>
                            <button onClick={() => removeItemFromCart(item.itemID)}>
                                Remove
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                    </table>
                    <p><b>Total:</b> ${cartContents.total}</p>
                    <button onClick={() => checkout()}>
                    Checkout
                    </button>
                </>
            )}
        </div>
        </>
      );}
