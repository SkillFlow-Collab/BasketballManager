import requests
import json
import datetime
import uuid
import os
import sys
from dotenv import load_dotenv
import time
from datetime import date, datetime, timedelta
import random

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
    print("Logging in with admin@staderochelais.com / admin123...")
    response = requests.post(f"{API_URL}/auth/login", json=auth_data)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    login_data = response.json()
    global auth_token
    auth_token = login_data['token']
    
    return auth_token is not None and len(auth_token) > 0

# Player data for November 2024 simulation
players_data = [
    {
        "first_name": "Lucas",
        "last_name": "Martin",
        "date_of_birth": "2004-05-15",
        "position": "Meneur",
        "coach_referent": "Jean-Pierre Moreau"
    },
    {
        "first_name": "Thomas",
        "last_name": "Dubois",
        "date_of_birth": "2002-08-22",
        "position": "Arrière",
        "coach_referent": "David Lefevre"
    },
    {
        "first_name": "Antoine",
        "last_name": "Moreau",
        "date_of_birth": "2005-03-10",
        "position": "Ailier",
        "coach_referent": "Marie Durand"
    },
    {
        "first_name": "Pierre",
        "last_name": "Rousseau",
        "date_of_birth": "2000-11-05",
        "position": "Ailier-Fort",
        "coach_referent": "Alex Martinez"
    },
    {
        "first_name": "Maxime",
        "last_name": "Leroy",
        "date_of_birth": "2003-07-18",
        "position": "Pivot",
        "coach_referent": "Jean-Pierre Moreau"
    },
    {
        "first_name": "Nathan",
        "last_name": "Bernard",
        "date_of_birth": "2007-09-30",
        "position": "Meneur",
        "coach_referent": "Marie Durand"
    },
    {
        "first_name": "Hugo",
        "last_name": "Petit",
        "date_of_birth": "2006-04-12",
        "position": "Arrière",
        "coach_referent": "David Lefevre"
    },
    {
        "first_name": "Dylan",
        "last_name": "Garcia",
        "date_of_birth": "2001-02-28",
        "position": "Ailier",
        "coach_referent": "Alex Martinez"
    },
    {
        "first_name": "Enzo",
        "last_name": "Rodriguez",
        "date_of_birth": "2004-12-15",
        "position": "Ailier-Fort",
        "coach_referent": "Jean-Pierre Moreau"
    },
    {
        "first_name": "Léo",
        "last_name": "Gonzalez",
        "date_of_birth": "1999-06-20",
        "position": "Pivot",
        "coach_referent": "David Lefevre"
    },
    {
        "first_name": "Mathis",
        "last_name": "Lopez",
        "date_of_birth": "2008-01-25",
        "position": "Meneur",
        "coach_referent": "Marie Durand"
    },
    {
        "first_name": "Julien",
        "last_name": "Silva",
        "date_of_birth": "2005-10-08",
        "position": "Arrière",
        "coach_referent": "Alex Martinez"
    }
]

# Coach data
coaches_data = [
    {
        "first_name": "Jean-Pierre",
        "last_name": "Moreau",
        "specialite": "Tactique"
    },
    {
        "first_name": "David",
        "last_name": "Lefevre",
        "specialite": "Physique"
    },
    {
        "first_name": "Marie",
        "last_name": "Durand",
        "specialite": "Technique"
    },
    {
        "first_name": "Alex",
        "last_name": "Martinez",
        "specialite": "Préparation physique"
    }
]

# Training themes
training_themes = [
    "Technique individuelle",
    "Tactique offensive",
    "Tactique défensive",
    "Préparation physique",
    "Tir à 3 points",
    "Rebonds",
    "Jeu en contre-attaque",
    "Jeu collectif",
    "Préparation mentale",
    "Échauffement/étirements"
]

# Evaluation themes and aspects
evaluation_themes = {
    "ADRESSE": ["Tir en course", "Tir à mi-distance", "Tir à 3 points", "Lancers francs"],
    "AISANCE": ["Dribble", "Coordination", "Vitesse"],
    "PASSE": ["Précision", "Vision", "Timing"],
    "DEFENSE": ["Sur porteur", "Sur non porteur", "Aide"],
    "REBOND": ["Offensif", "Défensif", "Boxout"],
    "ATHLETE": ["Explosivité", "Endurance", "Force"],
    "TACTIQUE": ["Lecture de jeu", "Prise de décision", "Connaissance des systèmes"],
    "COACHABILITE": ["Écoute", "Application", "Attitude"]
}

# Store created entities
created_players = []
created_coaches = []
created_individual_sessions = []
created_collective_sessions = []

# Test functions
def test_create_players():
    print("Creating players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    for player_data in players_data:
        response = requests.post(f"{API_URL}/players", json=player_data, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create player {player_data['first_name']} {player_data['last_name']}")
            success = False
            continue
        
        player = response.json()
        created_players.append(player)
        print(f"Created player: {player['first_name']} {player['last_name']} (ID: {player['id']})")
    
    print(f"Created {len(created_players)} players")
    return success and len(created_players) > 0

def test_create_coaches():
    print("Creating coaches...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    for coach_data in coaches_data:
        response = requests.post(f"{API_URL}/coaches", json=coach_data, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create coach {coach_data['first_name']} {coach_data['last_name']}")
            success = False
            continue
        
        coach = response.json()
        created_coaches.append(coach)
        print(f"Created coach: {coach['first_name']} {coach['last_name']} (ID: {coach['id']})")
    
    print(f"Created {len(created_coaches)} coaches")
    return success and len(created_coaches) > 0

def test_create_initial_evaluations():
    print("Creating initial evaluations for all players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    for player in created_players:
        # Create evaluation data with all 8 themes
        evaluation_data = {
            "player_id": player["id"],
            "themes": [],
            "notes": f"Évaluation initiale pour {player['first_name']} {player['last_name']}",
            "evaluation_type": "initial"
        }
        
        # Add all themes with random scores
        for theme_name, aspects in evaluation_themes.items():
            theme_data = {
                "name": theme_name,
                "aspects": []
            }
            
            for aspect in aspects:
                # Generate random score between 1-5
                score = random.randint(1, 5)
                theme_data["aspects"].append({
                    "name": aspect,
                    "score": score
                })
            
            evaluation_data["themes"].append(theme_data)
        
        response = requests.post(f"{API_URL}/evaluations", json=evaluation_data, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create initial evaluation for {player['first_name']} {player['last_name']}")
            success = False
            continue
        
        print(f"Created initial evaluation for {player['first_name']} {player['last_name']}")
    
    return success

def test_create_final_evaluations():
    print("Creating final evaluations for all players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    for player in created_players:
        # Create evaluation data with all 8 themes
        evaluation_data = {
            "player_id": player["id"],
            "themes": [],
            "notes": f"Évaluation finale pour {player['first_name']} {player['last_name']}",
            "evaluation_type": "final"
        }
        
        # Add all themes with random scores (slightly higher than initial)
        for theme_name, aspects in evaluation_themes.items():
            theme_data = {
                "name": theme_name,
                "aspects": []
            }
            
            for aspect in aspects:
                # Generate random score between 2-5 (improvement)
                score = random.randint(2, 5)
                theme_data["aspects"].append({
                    "name": aspect,
                    "score": score
                })
            
            evaluation_data["themes"].append(theme_data)
        
        response = requests.post(f"{API_URL}/evaluations", json=evaluation_data, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create final evaluation for {player['first_name']} {player['last_name']}")
            success = False
            continue
        
        print(f"Created final evaluation for {player['first_name']} {player['last_name']}")
    
    return success

def create_november_2024_dates():
    # Create a list of dates for November 2024
    november_dates = []
    for day in range(1, 31):  # November has 30 days
        november_dates.append(date(2024, 11, day))
    return november_dates

def test_create_individual_sessions():
    print("Creating individual training sessions for November 2024...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    november_dates = create_november_2024_dates()
    success = True
    
    # Create approximately 5 sessions per player throughout the month
    for player in created_players:
        # Select random dates for this player's sessions
        session_dates = random.sample(november_dates, min(5, len(november_dates)))
        
        for session_date in session_dates:
            # Randomly select 1-3 themes
            selected_themes = random.sample(training_themes, random.randint(1, 3))
            
            # Randomly select 1-2 trainers
            coach_names = [f"{coach['first_name']} {coach['last_name']}" for coach in created_coaches]
            selected_trainers = random.sample(coach_names, random.randint(1, 2))
            
            # Create session data
            session_data = {
                "player_ids": [player["id"]],
                "session_date": session_date.isoformat(),
                "themes": selected_themes,
                "trainers": selected_trainers,
                "content_details": f"Séance individuelle pour {player['first_name']} {player['last_name']} - {', '.join(selected_themes)}",
                "notes": f"Travail sur {', '.join(selected_themes).lower()}"
            }
            
            response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
            if response.status_code != 200:
                print(f"Failed to create individual session for {player['first_name']} {player['last_name']} on {session_date}")
                success = False
                continue
            
            session = response.json()
            created_individual_sessions.append(session)
            print(f"Created individual session for {player['first_name']} {player['last_name']} on {session_date}")
    
    # Create some multi-player sessions (2-3 players)
    for _ in range(10):
        # Select random date
        session_date = random.choice(november_dates)
        
        # Select 2-3 random players
        selected_players = random.sample(created_players, random.randint(2, 3))
        player_ids = [player["id"] for player in selected_players]
        player_names = [f"{player['first_name']} {player['last_name']}" for player in selected_players]
        
        # Randomly select 1-3 themes
        selected_themes = random.sample(training_themes, random.randint(1, 3))
        
        # Randomly select 1-2 trainers
        coach_names = [f"{coach['first_name']} {coach['last_name']}" for coach in created_coaches]
        selected_trainers = random.sample(coach_names, random.randint(1, 2))
        
        # Create session data
        session_data = {
            "player_ids": player_ids,
            "session_date": session_date.isoformat(),
            "themes": selected_themes,
            "trainers": selected_trainers,
            "content_details": f"Séance collective pour {', '.join(player_names)} - {', '.join(selected_themes)}",
            "notes": f"Travail en groupe sur {', '.join(selected_themes).lower()}"
        }
        
        response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
        if response.status_code != 200:
            print(f"Failed to create multi-player session on {session_date}")
            success = False
            continue
        
        session = response.json()
        created_individual_sessions.append(session)
        print(f"Created multi-player session for {len(player_ids)} players on {session_date}")
    
    print(f"Created {len(created_individual_sessions)} individual training sessions")
    return success and len(created_individual_sessions) > 0

def test_create_collective_sessions():
    print("Creating collective sessions for November 2024...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    november_dates = create_november_2024_dates()
    success = True
    
    # Create different types of collective sessions throughout the month
    session_types = ["U18", "U21", "CDF", "Musculation"]
    
    # Create 5 sessions of each type
    for session_type in session_types:
        # Select random dates for this session type
        session_dates = random.sample(november_dates, 5)
        
        for session_date in session_dates:
            # Random time based on session type
            if session_type == "Musculation":
                session_time = f"{random.randint(9, 11)}:00"
            elif session_type == "U18":
                session_time = f"{random.randint(16, 17)}:30"
            elif session_type == "U21":
                session_time = f"{random.randint(18, 19)}:00"
            else:  # CDF
                session_time = f"{random.randint(19, 20)}:30"
            
            # Random coach
            coach = random.choice(created_coaches)
            coach_name = f"{coach['first_name']} {coach['last_name']}"
            
            # Create session data
            session_data = {
                "session_type": session_type,
                "session_date": session_date.isoformat(),
                "session_time": session_time,
                "location": "Gymnase Gaston Neveur" if session_type != "Musculation" else "Salle de musculation",
                "coach": coach_name,
                "notes": f"Séance collective {session_type} - {session_date.strftime('%d/%m/%Y')}"
            }
            
            response = requests.post(f"{API_URL}/collective-sessions", json=session_data, headers=headers)
            if response.status_code != 200:
                print(f"Failed to create collective session {session_type} on {session_date}")
                success = False
                continue
            
            session = response.json()
            created_collective_sessions.append(session)
            print(f"Created collective session {session_type} on {session_date}")
    
    print(f"Created {len(created_collective_sessions)} collective sessions")
    return success and len(created_collective_sessions) > 0

def test_create_attendance_records():
    print("Creating attendance records for collective sessions...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    
    # Define attendance patterns for players
    attendance_patterns = {
        "very_regular": {"present": 0.9, "absent": 0.05, "injured": 0.03, "off": 0.02},
        "regular": {"present": 0.8, "absent": 0.1, "injured": 0.05, "off": 0.05},
        "average": {"present": 0.7, "absent": 0.15, "injured": 0.1, "off": 0.05},
        "irregular": {"present": 0.6, "absent": 0.2, "injured": 0.1, "off": 0.1}
    }
    
    # Assign patterns to players
    player_patterns = {}
    pattern_distribution = ["very_regular"] * 4 + ["regular"] * 4 + ["average"] * 3 + ["irregular"] * 1
    
    for i, player in enumerate(created_players):
        pattern = pattern_distribution[i % len(pattern_distribution)]
        player_patterns[player["id"]] = pattern
    
    # Create attendance records for each collective session
    for session in created_collective_sessions:
        for player in created_players:
            # Determine attendance status based on player's pattern
            pattern = player_patterns[player["id"]]
            probabilities = attendance_patterns[pattern]
            
            # Generate random number to determine status
            rand = random.random()
            
            if rand < probabilities["present"]:
                status = "present"
                notes = "Participation active"
            elif rand < probabilities["present"] + probabilities["absent"]:
                status = "absent"
                notes = random.choice(["Absence non justifiée", "Raisons personnelles", "Raisons familiales", "Études"])
            elif rand < probabilities["present"] + probabilities["absent"] + probabilities["injured"]:
                status = "injured"
                notes = random.choice(["Blessure légère", "Récupération", "Douleur musculaire", "Entorse"])
            else:
                status = "off"
                notes = "Repos programmé"
            
            # Create attendance record
            attendance_data = {
                "collective_session_id": session["id"],
                "player_id": player["id"],
                "status": status,
                "notes": notes
            }
            
            response = requests.post(f"{API_URL}/attendances", json=attendance_data, headers=headers)
            if response.status_code != 200:
                print(f"Failed to create attendance record for player {player['id']} in session {session['id']}")
                success = False
                continue
    
    print(f"Created attendance records for {len(created_collective_sessions)} collective sessions and {len(created_players)} players")
    return success

def test_get_player_reports():
    print("Testing player reports...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    
    # Test reports for a few players
    test_players = random.sample(created_players, min(3, len(created_players)))
    
    for player in test_players:
        response = requests.get(f"{API_URL}/reports/player/{player['id']}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get report for player {player['first_name']} {player['last_name']}")
            success = False
            continue
        
        report = response.json()
        print(f"Got report for {player['first_name']} {player['last_name']}")
        print(f"  Total sessions: {report['total_sessions']}")
        print(f"  Content breakdown: {len(report['content_breakdown'])} themes")
        print(f"  Trainer breakdown: {len(report['trainer_breakdown'])} trainers")
        print(f"  Recent sessions: {len(report['recent_sessions'])}")
    
    return success

def test_get_coach_reports():
    print("Testing coach reports...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    
    # Test reports for all coaches
    for coach in created_coaches:
        coach_name = f"{coach['first_name']} {coach['last_name']}"
        response = requests.get(f"{API_URL}/reports/coach/{coach_name}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get report for coach {coach_name}")
            success = False
            continue
        
        report = response.json()
        print(f"Got report for coach {coach_name}")
        print(f"  Total sessions: {report['total_sessions']}")
        print(f"  Theme breakdown: {len(report['theme_breakdown'])} themes")
        print(f"  Player breakdown: {len(report['player_breakdown'])} players")
        print(f"  Recent sessions: {len(report['recent_sessions'])}")
    
    return success

def test_get_attendance_reports():
    print("Testing attendance reports...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    
    # Test attendance reports for a few players
    test_players = random.sample(created_players, min(3, len(created_players)))
    
    for player in test_players:
        response = requests.get(f"{API_URL}/attendances/reports/player/{player['id']}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get attendance report for player {player['first_name']} {player['last_name']}")
            success = False
            continue
        
        report = response.json()
        print(f"Got attendance report for {player['first_name']} {player['last_name']}")
        print(f"  Total sessions: {report['statistics']['total_sessions']}")
        print(f"  Present: {report['statistics']['present']}")
        print(f"  Absent: {report['statistics']['absent']}")
        print(f"  Injured: {report['statistics']['injured']}")
        print(f"  Off: {report['statistics']['off']}")
        print(f"  Presence rate: {report['statistics']['presence_rate']}%")
        print(f"  Session types: {list(report['statistics']['by_type'].keys())}")
    
    return success

def test_get_evaluation_averages():
    print("Testing evaluation averages...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    success = True
    
    # Test all players averages
    response = requests.get(f"{API_URL}/evaluations/averages/all", headers=headers)
    if response.status_code != 200:
        print("Failed to get evaluation averages for all players")
        success = False
    else:
        averages = response.json()
        print("Got evaluation averages for all players")
        print(f"  Overall average: {averages['overall_average']}")
        print(f"  Total evaluations: {averages['total_evaluations']}")
        print(f"  Theme averages: {list(averages['theme_averages'].keys())}")
    
    # Test position averages
    positions = ["Meneur", "Arrière", "Ailier", "Ailier-Fort", "Pivot"]
    
    for position in positions:
        response = requests.get(f"{API_URL}/evaluations/averages/position/{position}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to get evaluation averages for position {position}")
            success = False
            continue
        
        averages = response.json()
        print(f"Got evaluation averages for position {position}")
        print(f"  Overall average: {averages['overall_average']}")
        print(f"  Total evaluations: {averages['total_evaluations']}")
        print(f"  Players count: {averages['players_count']}")
        print(f"  Theme averages: {list(averages['theme_averages'].keys())}")
    
    return success

def test_get_dashboard_analytics():
    print("Testing dashboard analytics...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    response = requests.get(f"{API_URL}/analytics/dashboard", headers=headers)
    if response.status_code != 200:
        print("Failed to get dashboard analytics")
        return False
    
    analytics = response.json()
    print("Got dashboard analytics")
    print(f"  Total players: {analytics['total_players']}")
    print(f"  Total sessions: {analytics['total_sessions']}")
    print(f"  Average sessions per player: {analytics['average_sessions_per_player']}")
    print(f"  Theme progression: {list(analytics['theme_progression'].keys())}")
    print(f"  Coach comparison: {list(analytics['coach_comparison'].keys())}")
    print(f"  Player activity: {len(analytics['player_activity'])} players")
    print(f"  Monthly evolution: {list(analytics['monthly_evolution'].keys())}")
    
    return True

def run_simulation():
    tests = [
        test_login,
        test_create_players,
        test_create_coaches,
        test_create_initial_evaluations,
        test_create_individual_sessions,
        test_create_collective_sessions,
        test_create_attendance_records,
        test_create_final_evaluations,
        test_get_player_reports,
        test_get_coach_reports,
        test_get_attendance_reports,
        test_get_evaluation_averages,
        test_get_dashboard_analytics
    ]
    
    results = []
    for test in tests:
        results.append(run_test(test))
    
    print_separator()
    print("Simulation Summary:")
    for i, test in enumerate(tests):
        print(f"{test.__name__}: {'PASSED' if results[i] else 'FAILED'}")
    
    print_separator()
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {results.count(True)}")
    print(f"Failed: {results.count(False)}")
    
    print_separator()
    print("Simulation Statistics:")
    print(f"Players created: {len(created_players)}")
    print(f"Coaches created: {len(created_coaches)}")
    print(f"Individual sessions created: {len(created_individual_sessions)}")
    print(f"Collective sessions created: {len(created_collective_sessions)}")
    print(f"Attendance records created: {len(created_players) * len(created_collective_sessions)}")
    
    return all(results)

if __name__ == "__main__":
    success = run_simulation()
    sys.exit(0 if success else 1)