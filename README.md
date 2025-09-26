# 📱 Old Phone Deals – Full Stack App

This is a full-stack MERN-style application for listing and managing second-hand phone deals. It consists of a **React + Vite frontend** and an **Express.js + MongoDB backend**, with Swagger documentation and secure environment setup.

---

## 🔧 Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Database**: MongoDB (via Atlas)
- **Other Tools**:
  - Nodemon (development)
  - Swagger (API documentation)
  - JWT (authentication)
  - dotenv (`config.env`)
  - concurrently (to run frontend & backend)

---

## 🚀 Getting Started

### 1. Clone the repo

```
git clone <repo-url>
cd A2_OLD_PHONE_DEALS
```

### 2. Install root dev dependencies (concurrently)

```
npm install
```

### 3. Install frontend and backend dependencies

```
cd frontend && npm install
cd ../backend && npm install
```

### 4. Initalise the database
#### Automated python script
Before you run the web application, you need to run the `initalise_db.py` python script, to ensure the database is initalised with the proper.

Note that you'll have to install the depencies outlined in the `requirements.txt` file.

Sample data is contained in the `dataset_dev.zip` file. The zip contains two files:
- `phonelisting.json`: includes phone data (title, brand, image placeholder, stock, price, seller, reviews, etc.)
- `userlist.json`: includes user data with encrypted password field
---

Then, run the command as follows:
```sh
python initalise_db.py --config <path-to-env-file> --users <path-to-userlist> --phones <path-to-phonelisting>
```
#### Manual entry
If the python script doesn't work, then you can create the collections in the database manually, and import the JSON data from the `dataset_dev.zip` file (as described in the prior section).

The web app is set up to read data from 3 collections:
1. `phones` - Contains a list of phones - import `phonelisting.json`
2. `users` - Contains a list of users - import `userlist.json`
3. `transactions` - Contains a list of transactions

The new fields contained in the `users` collection are described in the following query:
```python
db["users"].update_many(
    {
        "$or": [
            {"disabled": {"$exists": False}},
            {"lastLogin": {"$exists": False}},
            {"registered": {"$exists": False}},
            {"verified": {"$exists": False}},
            {"cart": {"$exists": False}},
        ]
    },
    {
        "$set": {
            "disabled": False,
            "lastLogin": current_time,
            "registered": current_time,
            "verified": False,
            "cart": []
        }
    }
)
```

```python
    db["phones"].update_many(
    {},
    [
        {
            "$set": {
                "image": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$brand", "Apple"]}, "then": "phone_default_images/Apple.jpeg"},
                            {"case": {"$eq": ["$brand", "HTC"]}, "then": "phone_default_images/HTC.jpeg"},
                            {"case": {"$eq": ["$brand", "Huawei"]}, "then": "phone_default_images/Huawei.jpeg"},
                            {"case": {"$eq": ["$brand", "LG"]}, "then": "phone_default_images/LG.jpeg"},
                            {"case": {"$eq": ["$brand", "Motorola"]}, "then": "phone_default_images/Motorola.jpeg"},
                            {"case": {"$eq": ["$brand", "Nokia"]}, "then": "phone_default_images/Nokia.jpeg"},
                            {"case": {"$eq": ["$brand", "Samsung"]}, "then": "phone_default_images/Samsung.jpeg"},
                            {"case": {"$eq": ["$brand", "Sony"]}, "then": "phone_default_images/Sony.jpeg"}
                        ],
                        "default": "phone_default_images/Default.jpeg"  # Default image if brand doesn't match any condition
                    }
                }
            }
        }
    ]
)
```

## ⚙️ Environment Variables

Create a file named `config.env` in the `root` folder with the following contents:

```
ATLAS_URI=<your-mongodb-connection-string>
DATABASE_NAME=<your-mongodb-database-name>
JWT_SECRET=<your-jwt-secret>
GMAIL_ADDRESS=<your-gmail-address>
GOOGLE_APP_PASSWORD=<your-google-app-password>
BACKEND_PORT=5050
ADMIN_FIRSTNAME=<your-admin-firstname>
ADMIN_LASTNAME=<your-admin-lastname>
ADMIN_EMAIL=<your-admin-email>
ADMIN_PASSWORD=<your-admin-password>
```

- `ATLAS_URI`: Your MongoDB connection string (e.g., from MongoDB Atlas)
- `JWT_SECRET`: Any random string used for signing JWTs
- `GOOGLE_APP_PASSWORD`: Generated from https://myaccount.google.com/apppasswords
- `ADMIN`: Hardcoded credentials for the admin user. Credentials don't have to be real.
---

## 🧪 Running the App

From the **root directory**, run:

```
npm run dev
```

This uses `concurrently` to run:
- the **frontend** on http://localhost:5173
- the **backend API** on http://localhost:5050

---

## 📘 API Documentation

Swagger docs are auto-generated.

Once the backend is running, access:

```
http://localhost:5050/doc
```

---

## 🔒 Git Ignore

Make sure `config.env` is listed in your `.gitignore` so secrets are not committed.
