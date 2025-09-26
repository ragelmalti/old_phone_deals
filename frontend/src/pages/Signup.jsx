import { useNavigate } from "react-router-dom"; // Import useNavigate
import { useState, useEffect } from "react";
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../provider/authProvider";
import toast, { toastConfig } from 'react-simple-toasts';
import 'react-simple-toasts/dist/style.css';

export default function Signup() {
    const [firstname, setFirstname] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setToken } = useAuth();
    const navigate = useNavigate();
    const login = async (e) => {
        
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5050/api/account/signup', {
                firstname: firstname,
                lastname: surname,
                email: email,
                password: password
            });            
            console.log("Signup succesful!")
            console.log(response.data);
            toast(`SUCCESS: ${JSON.stringify(response.data.verify)}`, {duration: 5000, className: 'success-toast'})
        } catch(error) {
            if (error.response.data.error) {
                toast(`ERROR: ${JSON.stringify(error.response.data.error)}`, {duration: 5000, className: 'warning-toast'})
            }
            else if (error.response.data.errors) {
                error.response.data.errors.map((item) => {
                    toast(`ERROR: ${JSON.stringify(item.msg)}`, {duration: 5000, className: 'warning-toast'})
                })
                
            }
            
            //alert(`${JSON.stringify(error.response.data)}`)
        }
    }

    return (
        <>
            <div className="account-page">
                <h1>Signup</h1>
                <form onSubmit={login}>
                    <div>
                        <input placeholder="Firstname" type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} required></input>
                    </div>
                    <div>
                        <input placeholder="Surname" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} required></input>
                    </div>
                    <div>
                        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required></input>
                    </div>
                    <div>
                        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required></input>
                    </div>
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </>
    );
}