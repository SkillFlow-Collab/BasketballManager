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

print(f"Testing Match API at: {API_URL}")

# Authentication data
auth_data = {
    "email": "admin@staderochelais.com",
    "password": "admin123"
}

# Authentication token
auth_token = None

# Test data for matches
test_match_u18 = {
    "team": "U18",
    "opponent": "Basket Club Rochelais",
    "match_date": "2024-12-20",
    "match_time": "15:00",
    "location": "Gymnase Gaston Neveur",
    "is_home": True,
    "competition": "Championnat Régional",
    "coach": "Léo"
}

test_match_u21 = {
    "team": "U21",
    "opponent": "La Rochelle Basket",
    "match_date": "2024-12-22",
    "match_time": "18:00",
    "location": "Salle Adversaire",
    "is_home": False,
    "competition": "Coupe Départementale",
    "coach": "David"
}

# Test data for match participations
test_participation_present_starter = {
    "match_id": "",  # Will be filled after match creation
    "player_id": "",  # Will be filled after player creation
    "is_present": True,
    "is_starter": True,
    "play_time": 30,
    "notes": "Excellent match"
}

test_participation_present_substitute = {
    "match_id": "",  # Will be filled after match creation
    "player_id": "",  # Will be filled after player creation
    "is_present": True,
    "is_starter": False,
    "play_time": 15,
    "notes": "Bon impact en sortie de banc"
}

test_participation_absent = {
    "match_id": "",  # Will be filled after match creation
    "player_id": "",  # Will be filled after player creation
    "is_present": False,
    "is_starter": False,
    "play_time": 0,
    "notes": "Absent pour raisons personnelles"
}

# Test player data
test_player = {
    "first_name": "Victor",
    "last_name": "Wembanyama",
    "date_of_birth": "2004-01-04",
    "position": "Pivot",
    "coach_referent": "Léo"
}

test_player_second = {
    "first_name": "Bilal",
    "last_name": "Coulibaly",
    "date_of_birth": "2004-07-26",
    "position": "Ailier",
    "coach_referent": "David"
}

test_player_third = {
    "first_name": "Killian",
    "last_name": "Hayes",
    "date_of_birth": "2001-07-27",
    "position": "Meneur",
    "coach_referent": "Léo"
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

# Test functions for players
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

def test_create_player_second():
    print("Creating a second player...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/players", json=test_player_second, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    player_data = response.json()
    test_player_second['id'] = player_data['id']
    
    return (
        player_data['first_name'] == test_player_second['first_name'] and
        player_data['last_name'] == test_player_second['last_name'] and
        player_data['date_of_birth'] == test_player_second['date_of_birth'] and
        player_data['position'] == test_player_second['position'] and
        player_data['coach_referent'] == test_player_second['coach_referent']
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

# Test functions for matches
def test_create_match_u18():
    print("Creating a U18 match...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/matches", json=test_match_u18, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    match_data = response.json()
    test_match_u18['id'] = match_data['id']
    
    return (
        match_data['team'] == test_match_u18['team'] and
        match_data['opponent'] == test_match_u18['opponent'] and
        match_data['match_date'] == test_match_u18['match_date'] and
        match_data['match_time'] == test_match_u18['match_time'] and
        match_data['location'] == test_match_u18['location'] and
        match_data['is_home'] == test_match_u18['is_home'] and
        match_data['competition'] == test_match_u18['competition'] and
        match_data['coach'] == test_match_u18['coach']
    )

def test_create_match_u21():
    print("Creating a U21 match...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(f"{API_URL}/matches", json=test_match_u21, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    match_data = response.json()
    test_match_u21['id'] = match_data['id']
    
    return (
        match_data['team'] == test_match_u21['team'] and
        match_data['opponent'] == test_match_u21['opponent'] and
        match_data['match_date'] == test_match_u21['match_date'] and
        match_data['match_time'] == test_match_u21['match_time'] and
        match_data['location'] == test_match_u21['location'] and
        match_data['is_home'] == test_match_u21['is_home'] and
        match_data['competition'] == test_match_u21['competition'] and
        match_data['coach'] == test_match_u21['coach']
    )

def test_get_matches():
    print("Getting all matches...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/matches", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    matches = response.json()
    return isinstance(matches, list) and len(matches) >= 2

def test_get_matches_with_filters():
    print("Getting matches with filters...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Get matches for December 2024
    response = requests.get(f"{API_URL}/matches?month=12&year=2024", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    matches_by_date = response.json()
    date_filter_works = isinstance(matches_by_date, list) and len(matches_by_date) >= 2
    
    # Get matches for U18 team
    response = requests.get(f"{API_URL}/matches?team=U18", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    matches_by_team = response.json()
    team_filter_works = isinstance(matches_by_team, list) and all(match['team'] == 'U18' for match in matches_by_team)
    
    return date_filter_works and team_filter_works

def test_get_match_by_id():
    print(f"Getting match by ID: {test_match_u18['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/matches/{test_match_u18['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    match_data = response.json()
    return match_data['id'] == test_match_u18['id']

def test_update_match():
    print(f"Updating match: {test_match_u18['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "match_time": "16:30",
        "notes": "Horaire modifié",
        "final_score_us": 78,
        "final_score_opponent": 65
    }
    
    response = requests.put(f"{API_URL}/matches/{test_match_u18['id']}", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    match_data = response.json()
    return (
        match_data['match_time'] == update_data['match_time'] and
        match_data['notes'] == update_data['notes'] and
        match_data['final_score_us'] == update_data['final_score_us'] and
        match_data['final_score_opponent'] == update_data['final_score_opponent'] and
        match_data['team'] == test_match_u18['team']  # Unchanged field
    )

# Test functions for match participations
def test_create_participation_present_starter():
    print("Creating match participation (present, starter)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set match and player IDs
    test_participation_present_starter['match_id'] = test_match_u18['id']
    test_participation_present_starter['player_id'] = test_player['id']
    
    response = requests.post(f"{API_URL}/match-participations", json=test_participation_present_starter, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participation_data = response.json()
    test_participation_present_starter['id'] = participation_data['id']
    
    return (
        participation_data['match_id'] == test_participation_present_starter['match_id'] and
        participation_data['player_id'] == test_participation_present_starter['player_id'] and
        participation_data['is_present'] == test_participation_present_starter['is_present'] and
        participation_data['is_starter'] == test_participation_present_starter['is_starter'] and
        participation_data['play_time'] == test_participation_present_starter['play_time'] and
        participation_data['notes'] == test_participation_present_starter['notes']
    )

def test_create_participation_present_substitute():
    print("Creating match participation (present, substitute)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set match and player IDs
    test_participation_present_substitute['match_id'] = test_match_u18['id']
    test_participation_present_substitute['player_id'] = test_player_second['id']
    
    response = requests.post(f"{API_URL}/match-participations", json=test_participation_present_substitute, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participation_data = response.json()
    test_participation_present_substitute['id'] = participation_data['id']
    
    return (
        participation_data['match_id'] == test_participation_present_substitute['match_id'] and
        participation_data['player_id'] == test_participation_present_substitute['player_id'] and
        participation_data['is_present'] == test_participation_present_substitute['is_present'] and
        participation_data['is_starter'] == test_participation_present_substitute['is_starter'] and
        participation_data['play_time'] == test_participation_present_substitute['play_time']
    )

def test_create_participation_absent():
    print("Creating match participation (absent)...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Set match and player IDs
    test_participation_absent['match_id'] = test_match_u18['id']
    test_participation_absent['player_id'] = test_player_third['id']
    
    response = requests.post(f"{API_URL}/match-participations", json=test_participation_absent, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participation_data = response.json()
    test_participation_absent['id'] = participation_data['id']
    
    return (
        participation_data['match_id'] == test_participation_absent['match_id'] and
        participation_data['player_id'] == test_participation_absent['player_id'] and
        participation_data['is_present'] == test_participation_absent['is_present'] and
        participation_data['is_starter'] == test_participation_absent['is_starter'] and
        participation_data['play_time'] == test_participation_absent['play_time']
    )

def test_get_match_participations():
    print(f"Getting participations for match: {test_match_u18['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/match-participations/match/{test_match_u18['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participations = response.json()
    return (
        isinstance(participations, list) and 
        len(participations) >= 3 and
        'participation' in participations[0] and
        'player' in participations[0]
    )

def test_get_player_match_participations():
    print(f"Getting match participations for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/match-participations/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participations = response.json()
    return (
        isinstance(participations, list) and 
        len(participations) >= 1 and
        'participation' in participations[0] and
        'match' in participations[0]
    )

def test_update_participation():
    print(f"Updating match participation: {test_participation_present_starter['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "play_time": 35,
        "notes": "Performance exceptionnelle, temps de jeu augmenté"
    }
    
    response = requests.put(f"{API_URL}/match-participations/{test_participation_present_starter['id']}", json=update_data, headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    participation_data = response.json()
    return (
        participation_data['play_time'] == update_data['play_time'] and
        participation_data['notes'] == update_data['notes'] and
        participation_data['is_present'] == test_participation_present_starter['is_present'] and  # Unchanged field
        participation_data['is_starter'] == test_participation_present_starter['is_starter']  # Unchanged field
    )

def test_player_report_with_match_stats():
    print(f"Getting player report with match stats for player: {test_player['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{API_URL}/reports/player/{test_player['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    report_data = response.json()
    
    # Verify match_stats is included in the report
    match_stats_included = (
        'match_stats' in report_data and
        report_data['match_stats'] is not None and
        'total_matches' in report_data['match_stats'] and
        'matches_played' in report_data['match_stats'] and
        'matches_started' in report_data['match_stats'] and
        'total_play_time' in report_data['match_stats'] and
        'average_play_time' in report_data['match_stats'] and
        'team_breakdown' in report_data['match_stats'] and
        'recent_matches' in report_data['match_stats']
    )
    
    # Verify the values are correct
    match_stats_correct = (
        report_data['match_stats']['total_matches'] >= 1 and
        report_data['match_stats']['matches_played'] >= 1 and
        report_data['match_stats']['matches_started'] >= 1 and
        report_data['match_stats']['total_play_time'] >= 30
    )
    
    return match_stats_included and match_stats_correct

def test_delete_participation():
    print(f"Deleting match participation: {test_participation_absent['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/match-participations/{test_participation_absent['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify participation is deleted
    verify_response = requests.get(f"{API_URL}/match-participations/match/{test_match_u18['id']}", headers=headers)
    participations = verify_response.json()
    
    # Check that the deleted participation is not in the list
    for participation_data in participations:
        if participation_data['participation']['id'] == test_participation_absent['id']:
            return False
    
    return True

def test_delete_match():
    print(f"Deleting match: {test_match_u18['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/matches/{test_match_u18['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify match is deleted
    verify_response = requests.get(f"{API_URL}/matches/{test_match_u18['id']}", headers=headers)
    return verify_response.status_code == 404

def test_delete_match_u21():
    print(f"Deleting match: {test_match_u21['id']}...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(f"{API_URL}/matches/{test_match_u21['id']}", headers=headers)
    print_response(response)
    
    if response.status_code != 200:
        return False
    
    # Verify match is deleted
    verify_response = requests.get(f"{API_URL}/matches/{test_match_u21['id']}", headers=headers)
    return verify_response.status_code == 404

def test_delete_players():
    print("Deleting test players...")
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Delete all three test players
    success = True
    for player_id in [test_player['id'], test_player_second['id'], test_player_third['id']]:
        response = requests.delete(f"{API_URL}/players/{player_id}", headers=headers)
        if response.status_code != 200:
            print(f"Failed to delete player {player_id}: {response.text}")
            success = False
    
    return success

# Run tests
def run_all_tests():
    tests = [
        test_login,  # Login first to get authentication token
        
        # Player tests
        test_create_player,
        test_create_player_second,
        test_create_player_third,
        
        # Match tests
        test_create_match_u18,
        test_create_match_u21,
        test_get_matches,
        test_get_matches_with_filters,
        test_get_match_by_id,
        test_update_match,
        
        # Match participation tests
        test_create_participation_present_starter,
        test_create_participation_present_substitute,
        test_create_participation_absent,
        test_get_match_participations,
        test_get_player_match_participations,
        test_update_participation,
        test_player_report_with_match_stats,
        
        # Cleanup tests
        test_delete_participation,
        test_delete_match,
        test_delete_match_u21,
        test_delete_players
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