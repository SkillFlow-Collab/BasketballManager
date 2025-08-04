#!/usr/bin/env python3
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from frontend/.env
load_dotenv('/app/frontend/.env')

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
API_URL = f"{BACKEND_URL}/api"

print(f"Cleaning all evaluations at: {API_URL}")

# Authentication data
auth_data = {
    "email": "admin@staderochelais.com",
    "password": "admin123"
}

def login():
    """Login and get auth token"""
    response = requests.post(f"{API_URL}/auth/login", json=auth_data)
    if response.status_code == 200:
        return response.json()['token']
    else:
        print(f"Login failed: {response.status_code}")
        return None

def delete_all_evaluations(auth_token):
    """Delete all evaluations from the database"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    try:
        # Get all evaluations first
        response = requests.get(f"{API_URL}/evaluations", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get evaluations: {response.status_code}")
            return False
        
        evaluations = response.json()
        print(f"Found {len(evaluations)} evaluations to delete")
        
        if len(evaluations) == 0:
            print("No evaluations to delete")
            return True
        
        # Delete each evaluation
        deleted_count = 0
        for evaluation in evaluations:
            delete_response = requests.delete(f"{API_URL}/evaluations/{evaluation['id']}", headers=headers)
            if delete_response.status_code == 200:
                deleted_count += 1
                print(f"✅ Deleted evaluation {evaluation['id']} for player {evaluation.get('player_id', 'unknown')}")
            else:
                print(f"❌ Failed to delete evaluation {evaluation['id']}: {delete_response.status_code}")
        
        print(f"\n🎉 Successfully deleted {deleted_count}/{len(evaluations)} evaluations")
        return deleted_count == len(evaluations)
        
    except Exception as e:
        print(f"Error deleting evaluations: {str(e)}")
        return False

def main():
    print("🗑️  CLEANING ALL EVALUATIONS")
    print("=" * 50)
    
    # Login
    auth_token = login()
    if not auth_token:
        print("Failed to login. Exiting.")
        return
    
    print("✅ Logged in successfully")
    
    # Delete all evaluations
    success = delete_all_evaluations(auth_token)
    
    if success:
        print("\n✅ All evaluations have been successfully deleted!")
        print("🆕 You can now test the new evaluation system from scratch")
    else:
        print("\n❌ Some evaluations could not be deleted")

if __name__ == "__main__":
    main()