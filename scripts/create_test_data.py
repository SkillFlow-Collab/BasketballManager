#!/usr/bin/env python3
import requests
import json
import datetime
from datetime import date, datetime, timedelta
import random
import os
from dotenv import load_dotenv

# Load environment variables from frontend/.env
load_dotenv('/app/frontend/.env')

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
API_URL = f"{BACKEND_URL}/api"

print(f"Creating test data using API at: {API_URL}")

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

def create_players(auth_token):
    """Create 16 test players"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    players_data = [
        {"first_name": "Antoine", "last_name": "Dupont", "date_of_birth": "1996-11-15", "position": "Meneur", "coach_referent": "Léo"},
        {"first_name": "Romain", "last_name": "Ntamack", "date_of_birth": "1999-05-01", "position": "Arrière", "coach_referent": "David"},
        {"first_name": "Damian", "last_name": "Penaud", "date_of_birth": "1996-09-27", "position": "Ailier", "coach_referent": "Mike"},
        {"first_name": "Thomas", "last_name": "Ramos", "date_of_birth": "1995-01-23", "position": "Arrière", "coach_referent": "Léo"},
        {"first_name": "Grégory", "last_name": "Alldritt", "date_of_birth": "1997-03-13", "position": "Centre", "coach_referent": "David"},
        {"first_name": "Dylan", "last_name": "Cretin", "date_of_birth": "1996-12-05", "position": "Ailier Fort", "coach_referent": "Mike"},
        {"first_name": "Cameron", "last_name": "Woki", "date_of_birth": "1998-06-16", "position": "Centre", "coach_referent": "Léo"},
        {"first_name": "Paul", "last_name": "Willemse", "date_of_birth": "1991-08-01", "position": "Pivot", "coach_referent": "David"},
        {"first_name": "Cyril", "last_name": "Baille", "date_of_birth": "1993-02-25", "position": "Ailier Fort", "coach_referent": "Mike"},
        {"first_name": "Julien", "last_name": "Marchand", "date_of_birth": "1995-09-11", "position": "Pivot", "coach_referent": "Léo"},
        {"first_name": "Mohamed", "last_name": "Haouas", "date_of_birth": "1994-06-03", "position": "Ailier Fort", "coach_referent": "David"},
        {"first_name": "Romain", "last_name": "Taofifenua", "date_of_birth": "1990-05-19", "position": "Centre", "coach_referent": "Mike"},
        {"first_name": "Arthur", "last_name": "Vincent", "date_of_birth": "1999-11-30", "position": "Centre", "coach_referent": "Léo"},
        {"first_name": "Gabin", "last_name": "Villière", "date_of_birth": "1996-02-14", "position": "Ailier", "coach_referent": "David"},
        {"first_name": "Melvyn", "last_name": "Jaminet", "date_of_birth": "1999-06-30", "position": "Arrière", "coach_referent": "Mike"},
        {"first_name": "Matthieu", "last_name": "Jalibert", "date_of_birth": "1998-12-06", "position": "Meneur", "coach_referent": "Léo"}
    ]
    
    created_players = []
    
    for player_data in players_data:
        response = requests.post(f"{API_URL}/players", json=player_data, headers=headers)
        if response.status_code == 200:
            player = response.json()
            created_players.append(player)
            print(f"✅ Created player: {player['first_name']} {player['last_name']}")
        else:
            print(f"❌ Failed to create player: {player_data['first_name']} {player_data['last_name']}")
    
    return created_players

def create_coaches(auth_token):
    """Create test coaches"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    coaches_data = [
        {"first_name": "Léo", "last_name": "Martin", "specialite": "Technique individuelle"},
        {"first_name": "David", "last_name": "Dubois", "specialite": "Préparation physique"},
        {"first_name": "Mike", "last_name": "Johnson", "specialite": "Tactique collective"},
        {"first_name": "Pierre", "last_name": "Moreau", "specialite": "Mental"},
        {"first_name": "Jean", "last_name": "Lambert", "specialite": "Défense"}
    ]
    
    created_coaches = []
    
    for coach_data in coaches_data:
        response = requests.post(f"{API_URL}/coaches", json=coach_data, headers=headers)
        if response.status_code == 200:
            coach = response.json()
            created_coaches.append(coach)
            print(f"✅ Created coach: {coach['first_name']} {coach['last_name']}")
        else:
            print(f"❌ Failed to create coach: {coach_data['first_name']} {coach_data['last_name']}")
    
    return created_coaches

def create_individual_sessions(auth_token, players, coaches):
    """Create individual training sessions"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    themes = [
        "Technique de dribble", "Shoot extérieur", "Pénétration", "Défense individuelle",
        "Rebond", "Passes", "Jeu de pieds", "Condition physique", "Mental",
        "Finition", "Lecture de jeu", "Explosivité"
    ]
    
    trainers = [f"{coach['first_name']} {coach['last_name']}" for coach in coaches]
    
    sessions_created = 0
    
    # Create sessions for the last 60 days
    for i in range(60):
        session_date = date.today() - timedelta(days=i)
        
        # Create 2-4 sessions per day randomly
        num_sessions = random.randint(2, 4)
        
        for _ in range(num_sessions):
            # Select random players (1-3 players per session)
            num_players = random.randint(1, 3)
            selected_players = random.sample(players, num_players)
            player_ids = [p['id'] for p in selected_players]
            
            # Select random themes (1-2 themes per session)
            selected_themes = random.sample(themes, random.randint(1, 2))
            
            # Select random trainers (1-2 trainers per session)
            selected_trainers = random.sample(trainers, random.randint(1, 2))
            
            session_data = {
                "player_ids": player_ids,
                "session_date": session_date.isoformat(),
                "themes": selected_themes,
                "trainers": selected_trainers,
                "content_details": f"Travail sur {', '.join(selected_themes).lower()}. Session productive avec focus sur la progression technique.",
                "notes": random.choice([
                    "Très bonne séance", "Progression notable", "Efforts soutenus",
                    "Bon investissement", "À retravailler", ""
                ])
            }
            
            response = requests.post(f"{API_URL}/sessions", json=session_data, headers=headers)
            if response.status_code == 200:
                sessions_created += 1
                if sessions_created % 10 == 0:
                    print(f"✅ Created {sessions_created} individual sessions...")
            else:
                print(f"❌ Failed to create session: {response.status_code}")
    
    print(f"✅ Total individual sessions created: {sessions_created}")
    return sessions_created

def create_collective_sessions(auth_token, players):
    """Create collective sessions with attendance"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    session_types = ['U18', 'U21', 'CDF', 'Musculation']
    coaches = ['Léo Martin', 'David Dubois', 'Mike Johnson', 'Pierre Moreau']
    locations = ['Gymnase Gaston Neveur', 'Gymnase Michel Crépeau', 'Salle de musculation']
    
    sessions_created = 0
    
    # Create sessions for the last 30 days
    for i in range(30):
        session_date = date.today() - timedelta(days=i)
        
        # Create 1-2 collective sessions per day
        num_sessions = random.randint(1, 2)
        
        for _ in range(num_sessions):
            session_data = {
                "session_type": random.choice(session_types),
                "session_date": session_date.isoformat(),
                "session_time": random.choice(["18:00", "19:00", "20:00"]),
                "location": random.choice(locations),
                "coach": random.choice(coaches),
                "notes": random.choice([
                    "Entraînement intensif", "Focus défense", "Travail offensif",
                    "Préparation match", "Récupération", ""
                ])
            }
            
            # Create the session
            response = requests.post(f"{API_URL}/collective-sessions", json=session_data, headers=headers)
            if response.status_code == 200:
                session = response.json()
                sessions_created += 1
                
                # Create attendance for each player
                for player in players:
                    # 80% chance present, 10% absent, 5% injured, 5% off
                    status_weights = ['present'] * 80 + ['absent'] * 10 + ['injured'] * 5 + ['off'] * 5
                    status = random.choice(status_weights)
                    
                    attendance_data = {
                        "collective_session_id": session['id'],
                        "player_id": player['id'],
                        "status": status
                    }
                    
                    requests.post(f"{API_URL}/attendances", json=attendance_data, headers=headers)
                
                if sessions_created % 5 == 0:
                    print(f"✅ Created {sessions_created} collective sessions with attendance...")
    
    print(f"✅ Total collective sessions created: {sessions_created}")
    return sessions_created

def create_evaluations(auth_token, players, coaches):
    """Create player evaluations with standardized themes"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Standardized themes matching the frontend
    themes = [
        {
            "name": "Technique",
            "aspects": [
                {"name": "Dribble", "score": 0},
                {"name": "Shoot", "score": 0},
                {"name": "Passes", "score": 0}
            ]
        },
        {
            "name": "Physique",
            "aspects": [
                {"name": "Vitesse", "score": 0},
                {"name": "Endurance", "score": 0},
                {"name": "Force", "score": 0}
            ]
        },
        {
            "name": "Tactique",
            "aspects": [
                {"name": "Lecture de jeu", "score": 0},
                {"name": "Positionnement", "score": 0},
                {"name": "Prise de décision", "score": 0}
            ]
        },
        {
            "name": "Mental",
            "aspects": [
                {"name": "Concentration", "score": 0},
                {"name": "Confiance", "score": 0},
                {"name": "Gestion stress", "score": 0}
            ]
        },
        {
            "name": "Défense",
            "aspects": [
                {"name": "Défense individuelle", "score": 0},
                {"name": "Défense collective", "score": 0},
                {"name": "Récupération", "score": 0}
            ]
        },
        {
            "name": "Attaque",
            "aspects": [
                {"name": "Finition", "score": 0},
                {"name": "Pénétration", "score": 0},
                {"name": "Création", "score": 0}
            ]
        },
        {
            "name": "Jeu collectif",
            "aspects": [
                {"name": "Communication", "score": 0},
                {"name": "Esprit d'équipe", "score": 0},
                {"name": "Coachabilité", "score": 0}
            ]
        },
        {
            "name": "Condition physique",
            "aspects": [
                {"name": "Cardio", "score": 0},
                {"name": "Musculation", "score": 0},
                {"name": "Souplesse", "score": 0}
            ]
        }
    ]
    
    evaluations_created = 0
    
    for player in players:
        # Create 2-3 evaluations per player over time
        num_evaluations = random.randint(2, 3)
        
        for i in range(num_evaluations):
            eval_date = datetime.now() - timedelta(days=random.randint(1, 90))
            
            # Create evaluation with random scores for all 8 themes
            eval_themes = []
            for theme in themes:
                theme_copy = theme.copy()
                theme_copy["aspects"] = []
                
                for aspect in theme["aspects"]:
                    aspect_copy = aspect.copy()
                    aspect_copy["score"] = random.randint(2, 5)  # Scores between 2-5
                    theme_copy["aspects"].append(aspect_copy)
                
                # Calculate theme average
                theme_total = sum(a["score"] for a in theme_copy["aspects"])
                theme_copy["average_score"] = round(theme_total / len(theme_copy["aspects"]), 2)
                eval_themes.append(theme_copy)
            
            evaluation_data = {
                "player_id": player['id'],
                "themes": eval_themes,
                "evaluation_date": eval_date.isoformat(),
                "notes": random.choice([
                    "Bonne progression générale", "Points à travailler identifiés",
                    "Très bon niveau technique", "Marge de progression importante",
                    "Joueur prometteur", ""
                ])
            }
            
            response = requests.post(f"{API_URL}/evaluations", json=evaluation_data, headers=headers)
            if response.status_code == 200:
                evaluations_created += 1
                if evaluations_created % 10 == 0:
                    print(f"✅ Created {evaluations_created} evaluations...")
    
    print(f"✅ Total evaluations created: {evaluations_created}")
    return evaluations_created

def main():
    print("🏀 Creating test data for Stade Rochelais Basketball Management System")
    print("=" * 70)
    
    # Login
    auth_token = login()
    if not auth_token:
        print("Failed to login. Exiting.")
        return
    
    print("✅ Logged in successfully")
    
    # Create players
    print("\n📝 Creating players...")
    players = create_players(auth_token)
    
    # Create coaches
    print("\n👨‍🏫 Creating coaches...")
    coaches = create_coaches(auth_token)
    
    # Create individual sessions
    print("\n🏋️‍♂️ Creating individual training sessions...")
    individual_sessions = create_individual_sessions(auth_token, players, coaches)
    
    # Create collective sessions
    print("\n👥 Creating collective sessions with attendance...")
    collective_sessions = create_collective_sessions(auth_token, players)
    
    # Create evaluations
    print("\n⭐ Creating player evaluations...")
    evaluations = create_evaluations(auth_token, players, coaches)
    
    print("\n" + "=" * 70)
    print("🎉 Test data creation completed!")
    print(f"📊 Summary:")
    print(f"   - Players: {len(players)}")
    print(f"   - Coaches: {len(coaches)}")
    print(f"   - Individual sessions: {individual_sessions}")
    print(f"   - Collective sessions: {collective_sessions}")
    print(f"   - Evaluations: {evaluations}")

if __name__ == "__main__":
    main()