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

# Test data
test_player = {
    "first_name": "LeBron",
    "last_name": "James",
    "date_of_birth": "1984-12-30",
    "position": "Forward",
    "coach_referent": "David"
}

# Authentication data
auth_data = {
    "email": "admin@staderochelais.com",
    "password": "admin123"
}

# Authentication token
auth_token = None

test_player_with_photo = {
    "first_name": "Stephen",
    "last_name": "Curry",
    "date_of_birth": "1988-03-14",
    "position": "Guard",
    "coach_referent": "Mike",
    "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
}

test_player_third = {
    "first_name": "Giannis",
    "last_name": "Antetokounmpo",
    "date_of_birth": "1994-12-06",
    "position": "Forward",
    "coach_referent": "Léo"
}

# Test data for collective sessions
test_collective_session = {
    "session_type": "U18",
    "session_date": date.today().isoformat(),
    "session_time": "18:00",
    "location": "Gymnase Gaston Neveur",
    "coach": "Léo",
    "notes": "Entraînement technique"
}

test_collective_session_u21 = {
    "session_type": "U21",
    "session_date": (date.today() + timedelta(days=1)).isoformat(),
    "session_time": "19:30",
    "location": "Gymnase Gaston Neveur",
    "coach": "David",
    "notes": "Entraînement tactique"
}

test_collective_session_cdf = {
    "session_type": "CDF",
    "session_date": (date.today() + timedelta(days=2)).isoformat(),
    "session_time": "20:00",
    "location": "Gymnase Gaston Neveur",
    "coach": "Mike",
    "notes": "Préparation match"
}

test_collective_session_musculation = {
    "session_type": "Musculation",
    "session_date": (date.today() + timedelta(days=3)).isoformat(),
    "session_time": "17:00",
    "location": "Salle de musculation",
    "coach": "J-E",
    "notes": "Renforcement musculaire"
}

# Test data for attendance
test_attendance_present = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "present",
    "notes": "Participation active"
}

test_attendance_absent = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "absent",
    "notes": "Absence non justifiée"
}

test_attendance_injured = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "injured",
    "notes": "Blessure à la cheville"
}

test_attendance_off = {
    "collective_session_id": "",  # Will be filled after session creation
    "player_id": "",  # Will be filled after player creation
    "status": "off",
    "notes": "Repos programmé"
}

# Player for evaluation testing
test_player_evaluation = {
    "first_name": "Salim",
    "last_name": "LIENAFA",
    "date_of_birth": "1998-05-20",
    "position": "Meneur",
    "coach_referent": "Léo"
}

# New format session with player_ids array, themes array, and trainers array
test_session = {
    "player_ids": [],  # Will be filled after player creation
    "session_date": "2023-05-15",
    "themes": ["Shooting Drills", "Ball Handling"],
    "trainers": ["Léo", "J-E"],
    "content_details": "Improved 3-point percentage and dribbling skills",
    "notes": "Focus on follow-through and hand positioning"
}

# Test evaluation data with all 8 themes
test_evaluation = {
    "player_id": "",  # Will be filled after player creation
    "themes": [
        {
            "name": "ADRESSE",
            "aspects": [
                {"name": "Tir en course", "score": 4},
                {"name": "Tir à mi-distance", "score": 3},
                {"name": "Tir à 3 points", "score": 5},
                {"name": "Lancers francs", "score": 4}
            ]
        },
        {
            "name": "AISANCE",
            "aspects": [
                {"name": "Dribble", "score": 4},
                {"name": "Coordination", "score": 3},
                {"name": "Vitesse", "score": 5}
            ]
        },
        {
            "name": "PASSE",
            "aspects": [
                {"name": "Précision", "score": 4},
                {"name": "Vision", "score": 5},
                {"name": "Timing", "score": 3}
            ]
        },
        {
            "name": "DEFENSE",
            "aspects": [
                {"name": "Sur porteur", "score": 3},
                {"name": "Sur non porteur", "score": 4},
                {"name": "Aide", "score": 2}
            ]
        },
        {
            "name": "REBOND",
            "aspects": [
                {"name": "Offensif", "score": 2},
                {"name": "Défensif", "score": 3},
                {"name": "Boxout", "score": 3}
            ]
        },
        {
            "name": "ATHLETE",
            "aspects": [
                {"name": "Explosivité", "score": 4},
                {"name": "Endurance", "score": 5},
                {"name": "Force", "score": 3}
            ]
        },
        {
            "name": "TACTIQUE",
            "aspects": [
                {"name": "Lecture de jeu", "score": 5},
                {"name": "Prise de décision", "score": 4},
                {"name": "Connaissance des systèmes", "score": 3}
            ]
        },
        {
            "name": "COACHABILITE",
            "aspects": [
                {"name": "Écoute", "score": 5},
                {"name": "Application", "score": 4},
                {"name": "Attitude", "score": 5}
            ]
        }
    ],
    "notes": "Excellent meneur avec une vision de jeu exceptionnelle. Doit améliorer sa défense.",
    "evaluation_type": "initial"
}

# Test data for final evaluation
test_evaluation_final = {
    "player_id": "",  # Will be filled after player creation
    "themes": [
        {
            "name": "ADRESSE",
            "aspects": [
                {"name": "Tir en course", "score": 5},
                {"name": "Tir à mi-distance", "score": 4},
                {"name": "Tir à 3 points", "score": 5},
                {"name": "Lancers francs", "score": 5}
            ]
        },
        {
            "name": "AISANCE",
            "aspects": [
                {"name": "Dribble", "score": 5},
                {"name": "Coordination", "score": 4},
                {"name": "Vitesse", "score": 5}
            ]
        },
        {
            "name": "PASSE",
            "aspects": [
                {"name": "Précision", "score": 5},
                {"name": "Vision", "score": 5},
                {"name": "Timing", "score": 4}
            ]
        },
        {
            "name": "DEFENSE",
            "aspects": [
                {"name": "Sur porteur", "score": 4},
                {"name": "Sur non porteur", "score": 5},
                {"name": "Aide", "score": 3}
            ]
        },
        {
            "name": "REBOND",
            "aspects": [
                {"name": "Offensif", "score": 3},
                {"name": "Défensif", "score": 4},
                {"name": "Boxout", "score": 4}
            ]
        },
        {
            "name": "ATHLETE",
            "aspects": [
                {"name": "Explosivité", "score": 5},
                {"name": "Endurance", "score": 5},
                {"name": "Force", "score": 4}
            ]
        },
        {
            "name": "TACTIQUE",
            "aspects": [
                {"name": "Lecture de jeu", "score": 5},
                {"name": "Prise de décision", "score": 5},
                {"name": "Connaissance des systèmes", "score": 4}
            ]
        },
        {
            "name": "COACHABILITE",
            "aspects": [
                {"name": "Écoute", "score": 5},
                {"name": "Application", "score": 5},
                {"name": "Attitude", "score": 5}
            ]
        }
    ],
    "notes": "Progression remarquable depuis l'évaluation initiale. Amélioration significative en défense.",
    "evaluation_type": "final"
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
def test_create_player():
    print("Creating a player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player['first_name'] and
        player_data['last_name'] == test_player['last_name'] and
        player_data['date_of_birth'] == test_player['date_of_birth'] and
        player_data['position'] == test_player['position'] and
        player_data['coach_referent'] == test_player['coach_referent']
    )

def test_create_player_with_photo():
    print("Creating a player with photo...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player_with_photo, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player_with_photo['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player_with_photo['first_name'] and
        player_data['last_name'] == test_player_with_photo['last_name'] and
        player_data['date_of_birth'] == test_player_with_photo['date_of_birth'] and
        player_data['position'] == test_player_with_photo['position'] and
        player_data['coach_referent'] == test_player_with_photo['coach_referent'] and
        player_data['photo'] == test_player_with_photo['photo']
    )

def test_create_player_third():
    print("Creating a third player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player_third, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player_third['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player_third['first_name'] and
        player_data['last_name'] == test_player_third['last_name'] and
        player_data['date_of_birth'] == test_player_third['date_of_birth'] and
        player_data['position'] == test_player_third['position'] and
        player_data['coach_referent'] == test_player_third['coach_referent']
    )

def test_get_players():
    print("Getting all players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/players", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    players = response.json()
    return isinstance(players, list) and len(players) >= 2

def test_get_player_by_id():
    print(f"Getting player by ID: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/players/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    return player_data['id'] == test_player['id']

def test_update_player():
    print(f"Updating player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "first_name": "Updated LeBron",
        "position": "Center"
    }
    
    response = requests.put(f"{API_URL}/players/{test_player['id']}", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    return (
        player_data['first_name'] == update_data['first_name'] and
        player_data['position'] == update_data['position'] and
        player_data['last_name'] == test_player['last_name']  # Unchanged field
    )

def test_create_session():
    print("Creating a multi-player session...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    session_data = test_session.copy()
    session_data['player_ids'] = [test_player['id'], test_player_with_photo['id']]
    
    response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_session['id'] = session_data['id']
    test_session['player_ids'] = session_data['player_ids']
    
    return (
        test_player['id'] in session_data['player_ids'] and
        test_player_with_photo['id'] in session_data['player_ids'] and
        session_data['themes'] == test_session['themes'] and
        session_data['trainers'] == test_session['trainers'] and
        session_data['content_details'] == test_session['content_details']
    )

def test_create_second_session():
    print("Creating a second session for a single player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    session_data = {
        "player_ids": [test_player['id']],
        "session_date": "2023-05-20",
        "themes": ["Defense Training", "Footwork"],
        "trainers": ["David", "Loan"],
        "content_details": "Improved defensive stance and lateral movement",
        "notes": "Work on lateral movement and defensive positioning"
    }
    
    response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return test_player['id'] in session_data['player_ids']

def test_create_session_for_second_player():
    print("Creating a session for the second player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    session_data = {
        "player_ids": [test_player_with_photo['id']],
        "session_date": "2023-05-18",
        "themes": ["3-Point Shooting", "Quick Release"],
        "trainers": ["Mike", "Léo"],
        "content_details": "Made 80% of attempts with improved release speed",
        "notes": "Excellent form and quick release"
    }
    
    response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return test_player_with_photo['id'] in session_data['player_ids']

def test_create_session_for_third_player():
    print("Creating a session for the third player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    session_data = {
        "player_ids": [test_player_third['id']],
        "session_date": "2023-05-22",
        "themes": ["Post Moves", "Strength Training"],
        "trainers": ["J-E", "David"],
        "content_details": "Improved post footwork and strength",
        "notes": "Focus on power moves and balance"
    }
    
    response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return test_player_third['id'] in session_data['player_ids']

def test_get_sessions():
    print("Getting all sessions...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/sessions", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions = response.json()
    return isinstance(sessions, list) and len(sessions) >= 4

def test_get_player_sessions():
    print(f"Getting sessions for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/sessions/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions = response.json()
    return (
        isinstance(sessions, list) and 
        len(sessions) >= 2 and
        all(test_player['id'] in session['player_ids'] for session in sessions)
    )

def test_get_session_by_id():
    print(f"Getting session by ID: {test_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/sessions/{test_session['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return session_data['id'] == test_session['id']

def test_update_session():
    print(f"Updating session: {test_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "themes": ["Updated Shooting Drills", "Advanced Ball Handling"],
        "content_details": "Significant improvement in shooting accuracy and dribbling control"
    }
    
    response = requests.put(f"{API_URL}/sessions/{test_session['id']}", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return (
        session_data['themes'] == update_data['themes'] and
        session_data['content_details'] == update_data['content_details'] and
        session_data['trainers'] == test_session['trainers']  # Unchanged field
    )

def test_player_report():
    print(f"Getting report for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/reports/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report_data = response.json()
    return (
        report_data['player']['id'] == test_player['id'] and
        report_data['total_sessions'] >= 2 and
        isinstance(report_data['content_breakdown'], dict) and
        isinstance(report_data['trainer_breakdown'], dict) and
        isinstance(report_data['recent_sessions'], list) and
        len(report_data['recent_sessions']) > 0
    )

def test_coach_report():
    print("Getting report for coach: Léo...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/reports/coach/Léo", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report_data = response.json()
    return (
        report_data['coach']['first_name'] == "Léo" and
        report_data['total_sessions'] >= 1 and
        isinstance(report_data['theme_breakdown'], dict) and
        isinstance(report_data['player_breakdown'], dict) and
        isinstance(report_data['recent_sessions'], list)
    )

def test_calendar_data():
    print("Getting calendar data...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/calendar", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    calendar_data = response.json()
    return (
        isinstance(calendar_data, list) and
        len(calendar_data) >= 4 and
        all(
            'id' in item and
            'title' in item and
            'date' in item and
            'player_names' in item and
            'themes' in item and
            'trainers' in item
            for item in calendar_data
        )
    )

def test_dashboard_analytics():
    print("Getting dashboard analytics...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/analytics/dashboard", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    analytics_data = response.json()
    return (
        isinstance(analytics_data, dict) and
        'theme_progression' in analytics_data and
        'coach_comparison' in analytics_data and
        'player_activity' in analytics_data and
        'least_active_players' in analytics_data and
        'monthly_evolution' in analytics_data and
        'total_players' in analytics_data and
        'total_sessions' in analytics_data and
        'average_sessions_per_player' in analytics_data
    )

def test_invalid_player_id():
    print("Testing error handling for invalid player ID...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    invalid_id = str(uuid.uuid4())
    response = requests.get(f"{API_URL}/players/{invalid_id}", headers=headers)
    print_response(response)
    
    return response.status_code == 404

def test_delete_session():
    print(f"Deleting session: {test_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/sessions/{test_session['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify session is deleted
    verify_response = requests.get(f"{API_URL}/sessions/{test_session['id']}", headers=headers)
    return verify_response.status_code == 404

def test_delete_player():
    print(f"Deleting player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/players/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify player is deleted
    verify_response = requests.get(f"{API_URL}/players/{test_player['id']}", headers=headers)
    return verify_response.status_code == 404

def test_delete_player_with_photo():
    print(f"Deleting player with photo: {test_player_with_photo['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/players/{test_player_with_photo['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify player is deleted
    verify_response = requests.get(f"{API_URL}/players/{test_player_with_photo['id']}", headers=headers)
    return verify_response.status_code == 404

# Evaluation test functions
def test_create_player_for_evaluation():
    print("Creating a player for evaluation testing...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player_evaluation, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player_evaluation['id'] = player_data['id']
    test_evaluation['player_id'] = player_data['id']  # Set player_id for evaluation tests
    
    return (
        player_data['first_name'] == test_player_evaluation['first_name'] and
        player_data['last_name'] == test_player_evaluation['last_name'] and
        player_data['position'] == test_player_evaluation['position']
    )

def test_create_evaluation():
    print("Creating a player evaluation...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/evaluations", json=test_evaluation, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    evaluation_data = response.json()
    test_evaluation['id'] = evaluation_data['id']
    
    # Verify all themes are present and averages are calculated
    themes_match = len(evaluation_data['themes']) == 8
    has_overall_average = 'overall_average' in evaluation_data and evaluation_data['overall_average'] > 0
    
    # Verify the structure of aspects within themes
    aspects_structure_valid = True
    for theme in evaluation_data['themes']:
        if 'name' not in theme or 'aspects' not in theme or 'average_score' not in theme:
            aspects_structure_valid = False
            break
        
        for aspect in theme['aspects']:
            if 'name' not in aspect or 'score' not in aspect:
                aspects_structure_valid = False
                break
    
    print(f"Themes match: {themes_match}")
    print(f"Has overall average: {has_overall_average}")
    print(f"Aspects structure valid: {aspects_structure_valid}")
    
    return (
        evaluation_data['player_id'] == test_evaluation['player_id'] and
        themes_match and
        has_overall_average and
        aspects_structure_valid
    )

def test_create_final_evaluation():
    print("Creating a final player evaluation...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set player_id for final evaluation
    test_evaluation_final['player_id'] = test_evaluation['player_id']
    
    response = requests.post(f"{API_URL}/evaluations", json=test_evaluation_final, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    evaluation_data = response.json()
    test_evaluation_final['id'] = evaluation_data['id']
    
    # Verify all themes are present and averages are calculated
    themes_match = len(evaluation_data['themes']) == 8
    has_overall_average = 'overall_average' in evaluation_data and evaluation_data['overall_average'] > 0
    correct_type = evaluation_data['evaluation_type'] == 'final'
    
    # Verify the structure of aspects within themes
    aspects_structure_valid = True
    for theme in evaluation_data['themes']:
        if 'name' not in theme or 'aspects' not in theme or 'average_score' not in theme:
            aspects_structure_valid = False
            break
        
        for aspect in theme['aspects']:
            if 'name' not in aspect or 'score' not in aspect:
                aspects_structure_valid = False
                break
    
    print(f"Themes match: {themes_match}")
    print(f"Has overall average: {has_overall_average}")
    print(f"Correct evaluation type: {correct_type}")
    print(f"Aspects structure valid: {aspects_structure_valid}")
    
    return (
        evaluation_data['player_id'] == test_evaluation_final['player_id'] and
        themes_match and
        has_overall_average and
        correct_type and
        aspects_structure_valid
    )

def test_get_player_evaluations():
    print(f"Getting all evaluations for player: {test_evaluation['player_id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/evaluations/player/{test_evaluation['player_id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    evaluations = response.json()
    
    # Verify we have both initial and final evaluations
    has_initial = False
    has_final = False
    for eval in evaluations:
        if eval['evaluation_type'] == 'initial':
            has_initial = True
        elif eval['evaluation_type'] == 'final':
            has_final = True
    
    # Verify the structure of each evaluation
    structure_valid = True
    for eval in evaluations:
        if not all(key in eval for key in ['id', 'player_id', 'evaluator_id', 'evaluation_date', 'evaluation_type', 'themes', 'overall_average']):
            structure_valid = False
            break
        
        # Verify themes structure
        for theme in eval['themes']:
            if not all(key in theme for key in ['name', 'aspects', 'average_score']):
                structure_valid = False
                break
            
            # Verify aspects structure
            for aspect in theme['aspects']:
                if not all(key in aspect for key in ['name', 'score']):
                    structure_valid = False
                    break
    
    print(f"Has initial evaluation: {has_initial}")
    print(f"Has final evaluation: {has_final}")
    print(f"Structure valid: {structure_valid}")
    
    return (
        isinstance(evaluations, list) and 
        len(evaluations) >= 2 and
        evaluations[0]['player_id'] == test_evaluation['player_id'] and
        has_initial and
        has_final and
        structure_valid
    )

def test_get_latest_player_evaluation():
    print(f"Getting latest evaluation for player: {test_evaluation['player_id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/evaluations/player/{test_evaluation['player_id']}/latest", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    evaluation = response.json()
    
    # Verify the structure of the evaluation
    structure_valid = all(key in evaluation for key in ['id', 'player_id', 'evaluator_id', 'evaluation_date', 'evaluation_type', 'themes', 'overall_average'])
    
    # Verify themes structure
    themes_valid = True
    for theme in evaluation['themes']:
        if not all(key in theme for key in ['name', 'aspects', 'average_score']):
            themes_valid = False
            break
        
        # Verify aspects structure
        for aspect in theme['aspects']:
            if not all(key in aspect for key in ['name', 'score']):
                themes_valid = False
                break
    
    # The latest evaluation should be the final one
    is_final = evaluation['evaluation_type'] == 'final'
    
    print(f"Structure valid: {structure_valid}")
    print(f"Themes valid: {themes_valid}")
    print(f"Is final evaluation: {is_final}")
    
    return (
        evaluation['player_id'] == test_evaluation['player_id'] and
        'overall_average' in evaluation and
        len(evaluation['themes']) == 8 and
        structure_valid and
        themes_valid and
        is_final
    )

def test_get_player_evaluation_average():
    print(f"Getting evaluation averages for player: {test_evaluation['player_id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/evaluations/player/{test_evaluation['player_id']}/average", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    averages = response.json()
    
    # Verify the structure of the response
    structure_valid = all(key in averages for key in ['player_id', 'theme_averages', 'overall_average', 'evaluation_count'])
    
    # Verify theme_averages structure
    themes_valid = True
    expected_themes = {'ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'}
    found_themes = set(averages['theme_averages'].keys())
    
    if not expected_themes.issubset(found_themes):
        print(f"Missing themes. Expected: {expected_themes}, Found: {found_themes}")
        themes_valid = False
    
    # Verify evaluation count
    count_valid = averages['evaluation_count'] >= 2  # Should have both initial and final
    
    print(f"Structure valid: {structure_valid}")
    print(f"Themes valid: {themes_valid}")
    print(f"Count valid: {count_valid}")
    
    return (
        averages['player_id'] == test_evaluation['player_id'] and
        'theme_averages' in averages and
        'overall_average' in averages and
        len(averages['theme_averages']) == 8 and
        structure_valid and
        themes_valid and
        count_valid
    )

def test_get_all_players_averages():
    print("Getting evaluation averages across all players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/evaluations/averages/all", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    averages = response.json()
    
    # Verify the structure of the response
    structure_valid = all(key in averages for key in ['theme_averages', 'overall_average', 'total_evaluations'])
    
    # Verify theme_averages structure
    themes_valid = True
    expected_themes = {'ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'}
    found_themes = set(averages['theme_averages'].keys())
    
    if not expected_themes.issubset(found_themes):
        print(f"Missing themes. Expected: {expected_themes}, Found: {found_themes}")
        themes_valid = False
    
    # Verify all theme averages are numeric values
    values_valid = True
    for theme, value in averages['theme_averages'].items():
        if not isinstance(value, (int, float)):
            print(f"Non-numeric value for theme {theme}: {value}")
            values_valid = False
            break
    
    print(f"Structure valid: {structure_valid}")
    print(f"Themes valid: {themes_valid}")
    print(f"Values valid: {values_valid}")
    
    return (
        'theme_averages' in averages and
        'overall_average' in averages and
        'total_evaluations' in averages and
        averages['total_evaluations'] >= 1 and
        structure_valid and
        themes_valid and
        values_valid
    )

def test_get_position_averages():
    print(f"Getting evaluation averages for position: {test_player_evaluation['position']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/evaluations/averages/position/{test_player_evaluation['position']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    averages = response.json()
    
    # Verify the structure of the response
    structure_valid = all(key in averages for key in ['position', 'theme_averages', 'overall_average', 'total_evaluations', 'players_count'])
    
    # Verify theme_averages structure
    themes_valid = True
    expected_themes = {'ADRESSE', 'AISANCE', 'PASSE', 'DEFENSE', 'REBOND', 'ATHLETE', 'TACTIQUE', 'COACHABILITE'}
    found_themes = set(averages['theme_averages'].keys())
    
    if not expected_themes.issubset(found_themes):
        print(f"Missing themes. Expected: {expected_themes}, Found: {found_themes}")
        themes_valid = False
    
    # Verify all theme averages are numeric values
    values_valid = True
    for theme, value in averages['theme_averages'].items():
        if not isinstance(value, (int, float)):
            print(f"Non-numeric value for theme {theme}: {value}")
            values_valid = False
            break
    
    # Verify position matches
    position_valid = averages['position'] == test_player_evaluation['position']
    
    print(f"Structure valid: {structure_valid}")
    print(f"Themes valid: {themes_valid}")
    print(f"Values valid: {values_valid}")
    print(f"Position valid: {position_valid}")
    
    return (
        averages['position'] == test_player_evaluation['position'] and
        'theme_averages' in averages and
        'overall_average' in averages and
        'total_evaluations' in averages and
        'players_count' in averages and
        averages['players_count'] >= 1 and
        structure_valid and
        themes_valid and
        values_valid and
        position_valid
    )

def test_update_evaluation():
    print(f"Updating evaluation for player: {test_evaluation['player_id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create a modified version of the evaluation with some different scores
    updated_evaluation = {
        "player_id": test_evaluation['player_id'],
        "themes": [
            {
                "name": "ADRESSE",
                "aspects": [
                    {"name": "Tir en course", "score": 5},  # Changed from 4 to 5
                    {"name": "Tir à mi-distance", "score": 4},  # Changed from 3 to 4
                    {"name": "Tir à 3 points", "score": 5},
                    {"name": "Lancers francs", "score": 4}
                ]
            },
            # Keep the rest of the themes the same
            {
                "name": "AISANCE",
                "aspects": [
                    {"name": "Dribble", "score": 4},
                    {"name": "Coordination", "score": 3},
                    {"name": "Vitesse", "score": 5}
                ]
            }
        ],
        "notes": "Mise à jour: Amélioration significative du tir."
    }
    
    response = requests.post(f"{API_URL}/evaluations", json=updated_evaluation, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    evaluation_data = response.json()
    
    # Check if the update was successful
    adresse_theme = next((theme for theme in evaluation_data['themes'] if theme['name'] == 'ADRESSE'), None)
    if not adresse_theme:
        return False
    
    # Check if the scores were updated
    tir_en_course = next((aspect for aspect in adresse_theme['aspects'] if aspect['name'] == 'Tir en course'), None)
    tir_mi_distance = next((aspect for aspect in adresse_theme['aspects'] if aspect['name'] == 'Tir à mi-distance'), None)
    
    return (
        tir_en_course and tir_en_course['score'] == 5 and
        tir_mi_distance and tir_mi_distance['score'] == 4 and
        evaluation_data['notes'] == updated_evaluation['notes']
    )

def test_delete_evaluation_player():
    print(f"Deleting evaluation player: {test_player_evaluation['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/players/{test_player_evaluation['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify player is deleted
    verify_response = requests.get(f"{API_URL}/players/{test_player_evaluation['id']}", headers=headers)
    return verify_response.status_code == 404

# Collective Sessions test functions
def test_create_collective_session():
    print("Creating a collective session (U18)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session['session_type'] and
        session_data['session_date'] == test_collective_session['session_date'] and
        session_data['session_time'] == test_collective_session['session_time'] and
        session_data['location'] == test_collective_session['location'] and
        session_data['coach'] == test_collective_session['coach'] and
        session_data['notes'] == test_collective_session['notes']
    )

def test_create_collective_session_u21():
    print("Creating a collective session (U21)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_u21, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_u21['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_u21['session_type'] and
        session_data['session_date'] == test_collective_session_u21['session_date'] and
        session_data['session_time'] == test_collective_session_u21['session_time']
    )

def test_create_collective_session_cdf():
    print("Creating a collective session (CDF)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_cdf, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_cdf['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_cdf['session_type'] and
        session_data['session_date'] == test_collective_session_cdf['session_date'] and
        session_data['session_time'] == test_collective_session_cdf['session_time']
    )

def test_create_collective_session_musculation():
    print("Creating a collective session (Musculation)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/collective-sessions", json=test_collective_session_musculation, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    test_collective_session_musculation['id'] = session_data['id']
    
    return (
        session_data['session_type'] == test_collective_session_musculation['session_type'] and
        session_data['session_date'] == test_collective_session_musculation['session_date'] and
        session_data['session_time'] == test_collective_session_musculation['session_time']
    )

def test_get_collective_sessions():
    print("Getting all collective sessions...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/collective-sessions", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions = response.json()
    return isinstance(sessions, list) and len(sessions) >= 4

def test_get_collective_sessions_with_filters():
    print("Getting collective sessions with filters (month, year, type)...")
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
    
    sessions_by_date = response.json()
    date_filter_works = isinstance(sessions_by_date, list) and len(sessions_by_date) >= 1
    
    # Test filter by session type
    response = requests.get(f"{API_URL}/collective-sessions?session_type=U18", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions_by_type = response.json()
    type_filter_works = isinstance(sessions_by_type, list) and all(session['session_type'] == 'U18' for session in sessions_by_type)
    
    # Test combined filters
    response = requests.get(f"{API_URL}/collective-sessions?month={month}&year={year}&session_type=U18", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    sessions_combined = response.json()
    combined_filter_works = isinstance(sessions_combined, list)
    
    return date_filter_works and type_filter_works and combined_filter_works

def test_get_collective_session_by_id():
    print(f"Getting collective session by ID: {test_collective_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/collective-sessions/{test_collective_session['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return session_data['id'] == test_collective_session['id']

def test_update_collective_session():
    print(f"Updating collective session: {test_collective_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Include all required fields in the update data
    update_data = {
        "session_type": test_collective_session['session_type'],
        "session_date": test_collective_session['session_date'],
        "session_time": "18:30",
        "notes": "Entraînement technique modifié",
        "location": "Gymnase Michel Crépeau"
    }
    
    response = requests.put(f"{API_URL}/collective-sessions/{test_collective_session['id']}", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    session_data = response.json()
    return (
        session_data['session_time'] == update_data['session_time'] and
        session_data['notes'] == update_data['notes'] and
        session_data['location'] == update_data['location'] and
        session_data['session_type'] == test_collective_session['session_type']  # Unchanged field
    )

# Attendance test functions
def test_create_attendance_present():
    print("Creating attendance record (present)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance_present['collective_session_id'] = test_collective_session['id']
    test_attendance_present['player_id'] = test_player['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance_present, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance_present['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance_present['collective_session_id'] and
        attendance_data['player_id'] == test_attendance_present['player_id'] and
        attendance_data['status'] == test_attendance_present['status'] and
        attendance_data['notes'] == test_attendance_present['notes']
    )

def test_create_attendance_absent():
    print("Creating attendance record (absent)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance_absent['collective_session_id'] = test_collective_session_u21['id']
    test_attendance_absent['player_id'] = test_player['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance_absent, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance_absent['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance_absent['collective_session_id'] and
        attendance_data['player_id'] == test_attendance_absent['player_id'] and
        attendance_data['status'] == test_attendance_absent['status']
    )

def test_create_attendance_injured():
    print("Creating attendance record (injured)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance_injured['collective_session_id'] = test_collective_session_cdf['id']
    test_attendance_injured['player_id'] = test_player_with_photo['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance_injured, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance_injured['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance_injured['collective_session_id'] and
        attendance_data['player_id'] == test_attendance_injured['player_id'] and
        attendance_data['status'] == test_attendance_injured['status']
    )

def test_create_attendance_off():
    print("Creating attendance record (off)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set session and player IDs
    test_attendance_off['collective_session_id'] = test_collective_session_musculation['id']
    test_attendance_off['player_id'] = test_player_third['id']
    
    response = requests.post(f"{API_URL}/attendances", json=test_attendance_off, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    test_attendance_off['id'] = attendance_data['id']
    
    return (
        attendance_data['collective_session_id'] == test_attendance_off['collective_session_id'] and
        attendance_data['player_id'] == test_attendance_off['player_id'] and
        attendance_data['status'] == test_attendance_off['status']
    )

def test_update_attendance():
    print(f"Updating attendance record: {test_attendance_present['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create update data with the same session and player IDs but different status
    update_data = {
        "collective_session_id": test_attendance_present['collective_session_id'],
        "player_id": test_attendance_present['player_id'],
        "status": "injured",
        "notes": "Blessure légère pendant l'entraînement"
    }
    
    response = requests.post(f"{API_URL}/attendances", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendance_data = response.json()
    return (
        attendance_data['collective_session_id'] == update_data['collective_session_id'] and
        attendance_data['player_id'] == update_data['player_id'] and
        attendance_data['status'] == update_data['status'] and
        attendance_data['notes'] == update_data['notes']
    )

def test_get_session_attendances():
    print(f"Getting attendances for session: {test_collective_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/attendances/session/{test_collective_session['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendances = response.json()
    return (
        isinstance(attendances, list) and 
        len(attendances) >= 1 and
        'player' in attendances[0]
    )

def test_get_player_attendances():
    print(f"Getting attendances for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/attendances/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    attendances = response.json()
    return (
        isinstance(attendances, list) and 
        len(attendances) >= 2 and
        'session' in attendances[0]
    )

def test_get_player_attendance_report():
    print(f"Getting attendance report for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/attendances/reports/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report = response.json()
    
    # Verify the complete structure of the report
    structure_valid = (
        'player' in report and
        'statistics' in report and
        report['player']['id'] == test_player['id'] and
        'total_sessions' in report['statistics'] and
        'present' in report['statistics'] and
        'absent' in report['statistics'] and
        'injured' in report['statistics'] and
        'off' in report['statistics'] and
        'by_type' in report['statistics'] and
        'recent_attendances' in report['statistics'] and
        'presence_rate' in report['statistics'] and
        'absence_rate' in report['statistics'] and
        'injury_rate' in report['statistics']
    )
    
    # Verify the by_type structure for each session type
    by_type_valid = True
    for session_type, stats in report['statistics']['by_type'].items():
        if not all(key in stats for key in ['total', 'present', 'absent', 'injured', 'off']):
            by_type_valid = False
            break
    
    # Verify recent_attendances structure
    recent_attendances_valid = True
    if report['statistics']['recent_attendances']:
        for attendance in report['statistics']['recent_attendances']:
            if not all(key in attendance for key in ['session_date', 'session_type', 'status']):
                recent_attendances_valid = False
                break
    
    # Print detailed validation results
    print(f"Structure validation: {structure_valid}")
    print(f"By-type validation: {by_type_valid}")
    print(f"Recent attendances validation: {recent_attendances_valid}")
    
    return structure_valid and by_type_valid and recent_attendances_valid

def test_delete_collective_session():
    print(f"Deleting collective session: {test_collective_session['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/collective-sessions/{test_collective_session['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify session is deleted
    verify_response = requests.get(f"{API_URL}/collective-sessions/{test_collective_session['id']}", headers=headers)
    return verify_response.status_code == 404

def test_salim_lienafa_attendance_report():
    print("Getting attendance report for Salim LIENAFA...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # First, create Salim LIENAFA if not already in the database
    salim_player = {
        "first_name": "Salim",
        "last_name": "LIENAFA",
        "date_of_birth": "1998-05-20",
        "position": "Meneur",
        "coach_referent": "Léo"
    }
    
    # Create the player
    response = requests.post(f"{API_URL}/players", json=salim_player, headers=headers)
    if response.status_code != 200:
        print("Failed to create Salim LIENAFA")
        return False
    
    salim_id = response.json()['id']
    print(f"Created Salim LIENAFA with ID: {salim_id}")
    
    # Create attendance records for Salim with different statuses
    # We'll use the existing collective sessions
    attendance_records = [
        {
            "collective_session_id": test_collective_session_u21['id'],
            "player_id": salim_id,
            "status": "present",
            "notes": "Excellent participation"
        },
        {
            "collective_session_id": test_collective_session_cdf['id'],
            "player_id": salim_id,
            "status": "absent",
            "notes": "Absent pour raisons familiales"
        },
        {
            "collective_session_id": test_collective_session_musculation['id'],
            "player_id": salim_id,
            "status": "injured",
            "notes": "Blessure à la cheville"
        }
    ]
    
    # Create the attendance records
    for record in attendance_records:
        response = requests.post(f"{API_URL}/attendances", json=record, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create attendance record: {response.text}")
            return False
        print(f"Created attendance record with status: {record['status']}")
    
    # Now get the attendance report
    response = requests.get(f"{API_URL}/attendances/reports/player/{salim_id}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report = response.json()
    
    # Verify the complete structure of the report
    structure_valid = (
        'player' in report and
        'statistics' in report and
        report['player']['id'] == salim_id and
        'total_sessions' in report['statistics'] and
        'present' in report['statistics'] and
        'absent' in report['statistics'] and
        'injured' in report['statistics'] and
        'off' in report['statistics'] and
        'by_type' in report['statistics'] and
        'recent_attendances' in report['statistics'] and
        'presence_rate' in report['statistics'] and
        'absence_rate' in report['statistics'] and
        'injury_rate' in report['statistics']
    )
    
    # Verify we have all 3 attendance records
    count_valid = (
        report['statistics']['total_sessions'] == 3 and
        report['statistics']['present'] == 1 and
        report['statistics']['absent'] == 1 and
        report['statistics']['injured'] == 1
    )
    
    # Verify the by_type structure for each session type
    by_type_valid = True
    expected_types = {'U21', 'CDF', 'Musculation'}
    found_types = set(report['statistics']['by_type'].keys())
    
    if not expected_types.issubset(found_types):
        print(f"Missing session types. Expected: {expected_types}, Found: {found_types}")
        by_type_valid = False
    
    for session_type, stats in report['statistics']['by_type'].items():
        if not all(key in stats for key in ['total', 'present', 'absent', 'injured', 'off']):
            print(f"Missing keys in by_type stats for {session_type}")
            by_type_valid = False
            break
    
    # Verify recent_attendances structure
    recent_attendances_valid = True
    if len(report['statistics']['recent_attendances']) != 3:
        print(f"Expected 3 recent attendances, found {len(report['statistics']['recent_attendances'])}")
        recent_attendances_valid = False
    
    for attendance in report['statistics']['recent_attendances']:
        if not all(key in attendance for key in ['session_date', 'session_type', 'status']):
            print(f"Missing keys in recent attendance: {attendance}")
            recent_attendances_valid = False
            break
    
    # Print detailed validation results
    print(f"Structure validation: {structure_valid}")
    print(f"Count validation: {count_valid}")
    print(f"By-type validation: {by_type_valid}")
    print(f"Recent attendances validation: {recent_attendances_valid}")
    
    # Clean up - delete the player
    delete_response = requests.delete(f"{API_URL}/players/{salim_id}", headers=headers)
    if delete_response.status_code != 200:
        print(f"Warning: Failed to delete test player: {delete_response.text}")
    
    return structure_valid and count_valid and by_type_valid and recent_attendances_valid

# Run tests
def run_all_tests():
    tests = [
        test_login,  # Login first to get authentication token
        test_create_player,
        test_create_player_with_photo,
        test_create_player_third,
        test_get_players,
        test_get_player_by_id,
        test_update_player,
        
        # Collective Sessions tests
        test_create_collective_session,
        test_create_collective_session_u21,
        test_create_collective_session_cdf,
        test_create_collective_session_musculation,
        test_get_collective_sessions,
        test_get_collective_sessions_with_filters,
        test_get_collective_session_by_id,
        test_update_collective_session,
        
        # Attendance tests
        test_create_attendance_present,
        test_create_attendance_absent,
        test_create_attendance_injured,
        test_create_attendance_off,
        test_update_attendance,
        test_get_session_attendances,
        test_get_player_attendances,
        test_get_player_attendance_report,
        test_salim_lienafa_attendance_report,  # Added the new test
        
        # Original tests
        test_create_session,
        test_create_second_session,
        test_create_session_for_second_player,
        test_create_session_for_third_player,
        test_get_sessions,
        test_get_player_sessions,
        test_get_session_by_id,
        test_update_session,
        test_player_report,
        test_coach_report,
        test_calendar_data,
        test_dashboard_analytics,
        test_invalid_player_id,
        
        # Evaluation tests
        test_create_player_for_evaluation,
        test_create_evaluation,
        test_create_final_evaluation,
        test_get_player_evaluations,
        test_get_latest_player_evaluation,
        test_get_player_evaluation_average,
        test_get_all_players_averages,
        test_get_position_averages,
        test_update_evaluation,
        
        # Cleanup tests
        test_delete_collective_session,
        test_delete_session,
        test_delete_player,
        test_delete_player_with_photo,
        test_delete_evaluation_player
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
