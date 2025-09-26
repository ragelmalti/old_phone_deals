import os
import json
from pymongo import MongoClient
from pymongo.errors import CollectionInvalid
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
import sys
import argparse


required_vars = ["ATLAS_URI", "DATABASE_NAME"]
parser = argparse.ArgumentParser(description="Intialise MongoDB database for Old Phone Deals web application")
parser.add_argument("--users", required=True, help="Path to userlist.json")
parser.add_argument("--phones", required=True, help="Path to phonelisting.json")
parser.add_argument("--config", required=True, help="Path to config.env")
args = parser.parse_args()
load_dotenv(args.config)

missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    print(f"Error: Missing environment variables: {', '.join(missing_vars)}", file=sys.stderr)
    sys.exit(1)

MONGO_URI = os.getenv("ATLAS_URI")
DB_NAME = os.getenv("DATABASE_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def import_json_to_collection(collection_name, json_path):
    print(f"Importing {json_path} into {collection_name} collection")
    with open(json_path, 'r', encoding='utf-8') as file:
        raw_data = json.load(file)
        if isinstance(raw_data, dict):
            raw_data = [raw_data]
        elif not isinstance(raw_data, list):
            raise ValueError(f"Invalid JSON structure in {json_path}")
        
        def convert_extended_json(doc):
            if "_id" in doc and isinstance(doc["_id"], dict) and "$oid" in doc["_id"]:
                doc["_id"] = ObjectId(doc["_id"]["$oid"])
            return doc
        
        data = [convert_extended_json(doc) for doc in raw_data]

        if data:
            db[collection_name].insert_many(data)
            print(f"Inserted {len(data)} documents into {collection_name}.")
        else:
            print(f"No data found in {json_path}.")

def create_collection(collection_name):
    try:
        db.create_collection(collection_name)
        print(f"Collection '${collection_name}' created")
    except CollectionInvalid:
        print(f"Collection '${collection_name}' already exists")

def init_phones_collection(json_path):
    create_collection("phones")
    import_json_to_collection("phones", json_path)
    # TODO: Add field that updates image path
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


def init_users_collection(json_path):
    create_collection("users")
    import_json_to_collection("users", json_path)
    current_time = datetime.utcnow()
    db["users"].update_many(
    {
        "$or": [
            {"disabled": {"$exists": False}},
            {"lastLogin": {"$exists": False}},
            {"registered": {"$exists": False}},
            {"verified": {"$exists": False}},
            {"cart": {"$exists": False}},
            {"wishlist": {"$exists": False}},
        ]
    },
    {
        "$set": {
            "disabled": False,
            "lastLogin": current_time,
            "registered": current_time,
            "verified": False,
            "cart": [],
            "wishlist": []
        }
    }
)

def init_transactions_collection():
    create_collection("transactions")

def init_audit_log_collection():
    create_collection("audit_log")

def main():
    init_phones_collection(args.phones)
    init_users_collection(args.users)
    init_transactions_collection()
    init_audit_log_collection()
    pass

if __name__ == "__main__":
    main()
