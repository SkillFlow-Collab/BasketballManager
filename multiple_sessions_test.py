import requests
import json
import datetime
import uuid
import os
import sys
from dotenv import load_dotenv
import time
from datetime import date, datetime, timedelta

# Load environment variables from frontend/.env
load_dotenv('/app/frontend/.env')

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
API_URL = f"{BACKEND_URL}/api"

print(f"Testing API at: {API_URL}")

# Authentication data
auth_data = {
    "email": "admin@staderochelais.com",
    "password": "admin123"
}

# Authentication token
auth_token = None

# Test data for collective sessions on the same day
today = date.today()
test_collective_session_morning = {
    "session_type": "U18",
    "session_date": today.isoformat(),
    "session_time": "09:00",
    "location": "Gymnase Gaston Neveur",
    "coach": "Léo",
    "notes": "Entraînement technique matinal"
}

test_collective_session_afternoon = {
    "session_type": "U18",
    "session_date": today.isoformat(),
    "session_time": "15:00",
    "location": "Gymnase Gaston Neveur",
    "coach": "David",
    "notes": "Entraînement tactique après-midi"
}

test_collective_session_u21_same_day = {
    "session_type": "U21",
    "session_date": today.isoformat(),
    "session_time": "18:00",
    "location": "Gymnase Gaston Neveur",
    "coach": "Mike",
    "notes": "Entraînement U21 soirée"
}

test_collective_session_musculation_same_day = {
    "session_type": "Musculation",
    "session_date": today.isoformat(),
    "session_time": "12:00",
    "location": "Salle de musculation",
    "coach": "J-E",
    "notes": "Renforcement musculaire midi"
}

# Test data for players
test_player1 = {
    "first_name": "Antoine",
    "last_name": "Dupont",
    "date_of_birth": "1996-11-15",
    "position": "Meneur",
    "coach_referent": "Léo"
}

test_player2 = {
    "first_name": "Romain",
    "last_name": "Ntamack",
    "date_of_birth": "1999-05-01",
    "position": "Arrière",
    "coach_referent": "David"
}

# Test data for attendance
test_attendance1 = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "present",
    "notes": "Participation active"
}

test_attendance2 = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "present",
    "notes": "Très bonne séance"
}

# Helper functions
def print_separator():
    print("\n" + "="*80 + "\n")

def print_response(response):
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

def run_test(test_func):
    print_separator()
    print(f"Running test: {test_func.__name__}")
    try:
        result = test_func()
        print(f"Test {test_func.__name__} {'PASSED' if result else 'FAILED'}")
        return result
    except Exception as e:
        print(f"Test {test_func.__name__} FAILED with exception: {str(e)}")
        return False

def test_login():
    print("Logging in...")
    response = requests.post(f"{API_URL}/auth/login", json=auth_data)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    login_data = response.json()
    global auth_token
    auth_token = login_data['token']
    
    return auth_token is not None and len(auth_token) > 0

# Test functions
def test_create_player1():
    print("Creating player 1...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player1, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player1['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player1['first_name'] and
        player_data['last_name'] == test_player1['last_name'] and
        player_data['position'] == test_player1['position']
    )

def test_create_player2():
    print("Creating player 2...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player2, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player2['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player2['first_name'] and
        player_data['last_name'] == test_player2['last_name'] and
        player_data['position'] == test_player2['position']
    )

def test_create_morning_session():
    print("Creating morning collective session...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_morning, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_morning['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_morning['session_type'] and
        session_data['session_date'] == test_collective_session_morning['session_date'] and
        session_data['session_time'] == test_collective_session_morning['session_time'] and
        session_data['location'] == test_collective_session_morning['location']
    )

def test_create_afternoon_session():
    print("Creating afternoon collective session...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_afternoon, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_afternoon['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_afternoon['session_type'] and
        session_data['session_date'] == test_collective_session_afternoon['session_date'] and
        session_data['session_time'] == test_collective_session_afternoon['session_time'] and
        session_data['location'] == test_collective_session_afternoon['location']
    )

def test_create_u21_session():
    print("Creating U21 collective session on the same day...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_u21_same_day, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_u21_same_day['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_u21_same_day['session_type'] and
        session_data['session_date'] == test_collective_session_u21_same_day['session_date'] and
        session_data['session_time'] == test_collective_session_u21_same_day['session_time'] and
        session_data['location'] == test_collective_session_u21_same_day['location']
    )

def test_create_musculation_session():
    print("Creating Musculation collective session on the same day...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_musculation_same_day, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_musculation_same_day['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_musculation_same_day['session_type'] and
        session_data['session_date'] == test_collective_session_musculation_same_day['session_date'] and
        session_data['session_time'] == test_collective_session_musculation_same_day['session_time'] and
        session_data['location'] == test_collective_session_musculation_same_day['location']
    )

def test_get_sessions_for_today():
    print("Getting all collective sessions for today...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Get current month and year
    today = date.today()
    month = today.month
    year = today.year
    
    # Test filter by month and year
    response = requests.get(f"{API_URL}/collective-sessions?month={month}&year={year}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions = response.json()
    
    # Filter sessions for today
    today_str = today.isoformat()
    today_sessions = [s for s in sessions if s['session_date'] == today_str]
    
    # Verify we have at least 4 sessions for today
    if len(today_sessions) < 4:
        print(f"Expected at least 4 sessions for today, found {len(today_sessions)}")
        return False
    
    # Verify we have both U18 sessions
    u18_sessions = [s for s in today_sessions if s['session_type'] == 'U18']
    if len(u18_sessions) < 2:
        print(f"Expected at least 2 U18 sessions for today, found {len(u18_sessions)}")
        return False
    
    # Verify we have the U21 session
    u21_sessions = [s for s in today_sessions if s['session_type'] == 'U21']
    if len(u21_sessions) < 1:
        print(f"Expected at least 1 U21 session for today, found {len(u21_sessions)}")
        return False
    
    # Verify we have the Musculation session
    musculation_sessions = [s for s in today_sessions if s['session_type'] == 'Musculation']
    if len(musculation_sessions) < 1:
        print(f"Expected at least 1 Musculation session for today, found {len(musculation_sessions)}")
        return False
    
    return True

def test_create_attendance_for_morning_session():
    print("Creating attendance for morning session...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance1['collective_session_id'] = test_collective_session_morning['id']
    test_attendance1['player_id'] = test_player1['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance1, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance1['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance1['collective_session_id'] and
        attendance_data['player_id'] == test_attendance1['player_id'] and
        attendance_data['status'] == test_attendance1['status']
    )

def test_create_attendance_for_afternoon_session():
    print("Creating attendance for afternoon session...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance2['collective_session_id'] = test_collective_session_afternoon['id']
    test_attendance2['player_id'] = test_player1['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance2, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance2['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance2['collective_session_id'] and
        attendance_data['player_id'] == test_attendance2['player_id'] and
        attendance_data['status'] == test_attendance2['status']
    )

def test_get_player_attendances():
    print(f"Getting attendances for player: {test_player1['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/attendances/player/{test_player1['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendances = response.json()
    
    # Verify we have at least 2 attendance records for the player
    if len(attendances) < 2:
        print(f"Expected at least 2 attendance records, found {len(attendances)}")
        return False
    
    # Verify the attendance records are for different sessions
    session_ids = [a['collective_session_id'] for a in attendances]
    if len(set(session_ids)) < 2:
        print(f"Expected attendance records for different sessions, found {len(set(session_ids))} unique sessions")
        return False
    
    # Verify the attendance records include both morning and afternoon sessions
    morning_session_found = test_collective_session_morning['id'] in session_ids
    afternoon_session_found = test_collective_session_afternoon['id'] in session_ids
    
    if not morning_session_found:
        print("Morning session attendance not found")
    if not afternoon_session_found:
        print("Afternoon session attendance not found")
    
    return morning_session_found and afternoon_session_found

def test_get_player_attendance_report():
    print(f"Getting attendance report for player: {test_player1['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/attendances/reports/player/{test_player1['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report = response.json()
    
    # Verify the complete structure of the report
    structure_valid = (
        'player' in report and
        'statistics' in report and
        report['player']['id'] == test_player1['id'] and
        'total_sessions' in report['statistics'] and
        'present' in report['statistics'] and
        'by_type' in report['statistics'] and
        'recent_attendances' in report['statistics']
    )
    
    # Verify we have at least 2 attendance records
    if report['statistics']['total_sessions'] < 2:
        print(f"Expected at least 2 attendance records, found {report['statistics']['total_sessions']}")
        return False
    
    # Verify we have attendance records for U18 sessions
    if 'U18' not in report['statistics']['by_type']:
        print("No attendance records found for U18 sessions")
        return False
    
    # Verify the U18 attendance count is at least 2
    if report['statistics']['by_type']['U18']['total'] < 2:
        print(f"Expected at least 2 U18 attendance records, found {report['statistics']['by_type']['U18']['total']}")
        return False
    
    return structure_valid

def test_cleanup():
    print("Cleaning up test data...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Delete collective sessions
    for session_id in [
        test_collective_session_morning['id'],
        test_collective_session_afternoon['id'],
        test_collective_session_u21_same_day['id'],
        test_collective_session_musculation_same_day['id']
    ]:
        response = requests.delete(f"{API_URL}/collective-sessions/{session_id}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to delete session {session_id}: {response.text}")
            return False
    
    # Delete players
    for player_id in [test_player1['id'], test_player2['id']]:
        response = requests.delete(f"{API_URL}/players/{player_id}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to delete player {player_id}: {response.text}")
            return False
    
    return True

# Run tests
def run_all_tests():
    tests = [
        test_login,  # Login first to get authentication token
        
        # Create test players
        test_create_player1,
        test_create_player2,
        
        # Create multiple sessions on the same day
        test_create_morning_session,
        test_create_afternoon_session,
        test_create_u21_session,
        test_create_musculation_session,
        
        # Verify sessions were created
        test_get_sessions_for_today,
        
        # Create attendance records for multiple sessions
        test_create_attendance_for_morning_session,
        test_create_attendance_for_afternoon_session,
        
        # Verify attendance records
        test_get_player_attendances,
        test_get_player_attendance_report,
        
        # Cleanup
        test_cleanup
    ]
    
    results = []
    for test in tests:
        results.append(run_test(test))
    
    print_separator()
    print("Test Summary:")
    for i, test in enumerate(tests):
        print(f"{test.__name__}: {'PASSED' if results[i] else 'FAILED'}")
    
    print_separator()
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {results.count(True)}")
    print(f"Failed: {results.count(False)}")
    
    return all(results)

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)