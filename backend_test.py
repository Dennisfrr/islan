#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CRM Kanban Application
Tests all backend endpoints and functionality
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_URL = f"{BASE_URL}/api"
print(f"Testing backend API at: {API_URL}")

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(test_name, success, message=""):
    """Log test results"""
    if success:
        test_results["passed"] += 1
        print(f"✅ {test_name}: PASSED {message}")
    else:
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {message}")
        print(f"❌ {test_name}: FAILED {message}")

def test_initialize_endpoint():
    """Test the /initialize endpoint for default data creation"""
    print("\n=== Testing Default Data Initialization ===")
    
    try:
        response = requests.post(f"{API_URL}/initialize", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test("Initialize Endpoint", True, f"Status: {response.status_code}, Message: {data['message']}")
                return True
            else:
                log_test("Initialize Endpoint", False, f"Missing message in response: {data}")
                return False
        else:
            log_test("Initialize Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
    except Exception as e:
        log_test("Initialize Endpoint", False, f"Exception: {str(e)}")
        return False

def test_board_management():
    """Test board creation and retrieval"""
    print("\n=== Testing Board Management ===")
    
    # Test getting boards
    try:
        response = requests.get(f"{API_URL}/boards", timeout=10)
        if response.status_code == 200:
            boards = response.json()
            log_test("Get Boards", True, f"Retrieved {len(boards)} boards")
            
            if boards:
                board_id = boards[0]["id"]
                
                # Test getting board columns
                response = requests.get(f"{API_URL}/boards/{board_id}/columns", timeout=10)
                if response.status_code == 200:
                    columns = response.json()
                    log_test("Get Board Columns", True, f"Retrieved {len(columns)} columns for board {board_id}")
                    return board_id, columns
                else:
                    log_test("Get Board Columns", False, f"Status: {response.status_code}")
                    return None, None
            else:
                log_test("Get Boards", False, "No boards found after initialization")
                return None, None
        else:
            log_test("Get Boards", False, f"Status: {response.status_code}")
            return None, None
            
    except Exception as e:
        log_test("Board Management", False, f"Exception: {str(e)}")
        return None, None

def test_card_crud_operations(columns):
    """Test card CRUD operations"""
    print("\n=== Testing Card CRUD Operations ===")
    
    if not columns:
        log_test("Card CRUD Setup", False, "No columns available for testing")
        return None
    
    column_id = columns[0]["id"]
    
    # Test creating a card
    card_data = {
        "title": "Test Deal - API Testing",
        "description": "This is a test card created during API testing",
        "contact_name": "Jane Doe",
        "contact_email": "jane.doe@testcompany.com",
        "contact_phone": "+1 (555) 987-6543",
        "estimated_value": 15000.0,
        "priority": "high",
        "assigned_to": "Test User",
        "tags": ["api-test", "automation"],
        "column_id": column_id
    }
    
    try:
        # CREATE card
        response = requests.post(f"{API_URL}/cards", json=card_data, timeout=10)
        if response.status_code == 200:
            created_card = response.json()
            card_id = created_card["id"]
            log_test("Create Card", True, f"Created card with ID: {card_id}")
            
            # READ cards
            response = requests.get(f"{API_URL}/cards", timeout=10)
            if response.status_code == 200:
                all_cards = response.json()
                log_test("Get All Cards", True, f"Retrieved {len(all_cards)} cards")
                
                # READ cards by column
                response = requests.get(f"{API_URL}/cards?column_id={column_id}", timeout=10)
                if response.status_code == 200:
                    column_cards = response.json()
                    log_test("Get Cards by Column", True, f"Retrieved {len(column_cards)} cards for column")
                    
                    # UPDATE card
                    update_data = {
                        "title": "Updated Test Deal - API Testing",
                        "estimated_value": 20000.0,
                        "priority": "medium"
                    }
                    
                    response = requests.put(f"{API_URL}/cards/{card_id}", json=update_data, timeout=10)
                    if response.status_code == 200:
                        updated_card = response.json()
                        if updated_card["title"] == update_data["title"] and updated_card["estimated_value"] == update_data["estimated_value"]:
                            log_test("Update Card", True, f"Successfully updated card {card_id}")
                            
                            # DELETE card
                            response = requests.delete(f"{API_URL}/cards/{card_id}", timeout=10)
                            if response.status_code == 200:
                                log_test("Delete Card", True, f"Successfully deleted card {card_id}")
                                return True
                            else:
                                log_test("Delete Card", False, f"Status: {response.status_code}")
                        else:
                            log_test("Update Card", False, "Card data not updated correctly")
                    else:
                        log_test("Update Card", False, f"Status: {response.status_code}")
                else:
                    log_test("Get Cards by Column", False, f"Status: {response.status_code}")
            else:
                log_test("Get All Cards", False, f"Status: {response.status_code}")
        else:
            log_test("Create Card", False, f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Card CRUD Operations", False, f"Exception: {str(e)}")
        return False
    
    return False

def test_drag_drop_api(columns):
    """Test the drag and drop API endpoint"""
    print("\n=== Testing Drag and Drop API ===")
    
    if not columns or len(columns) < 2:
        log_test("Drag Drop Setup", False, "Need at least 2 columns for drag drop testing")
        return False
    
    source_column = columns[0]["id"]
    dest_column = columns[1]["id"]
    
    # First create a card to move
    card_data = {
        "title": "Drag Drop Test Card",
        "description": "Card for testing drag and drop functionality",
        "contact_name": "Test Contact",
        "estimated_value": 5000.0,
        "priority": "low",
        "column_id": source_column
    }
    
    try:
        # Create card
        response = requests.post(f"{API_URL}/cards", json=card_data, timeout=10)
        if response.status_code == 200:
            card = response.json()
            card_id = card["id"]
            
            # Test moving the card
            move_data = {
                "card_id": card_id,
                "destination_column_id": dest_column,
                "position": 0
            }
            
            response = requests.post(f"{API_URL}/cards/move", json=move_data, timeout=10)
            if response.status_code == 200:
                log_test("Move Card API", True, f"Successfully moved card {card_id} to column {dest_column}")
                
                # Verify the card was moved
                response = requests.get(f"{API_URL}/cards?column_id={dest_column}", timeout=10)
                if response.status_code == 200:
                    dest_cards = response.json()
                    moved_card = next((c for c in dest_cards if c["id"] == card_id), None)
                    if moved_card and moved_card["column_id"] == dest_column:
                        log_test("Verify Card Move", True, "Card successfully moved to destination column")
                        
                        # Clean up - delete the test card
                        requests.delete(f"{API_URL}/cards/{card_id}", timeout=10)
                        return True
                    else:
                        log_test("Verify Card Move", False, "Card not found in destination column")
                else:
                    log_test("Verify Card Move", False, f"Could not verify move: {response.status_code}")
            else:
                log_test("Move Card API", False, f"Status: {response.status_code}, Response: {response.text}")
        else:
            log_test("Create Test Card for Drag Drop", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Drag Drop API", False, f"Exception: {str(e)}")
        return False
    
    return False

def test_analytics_endpoint():
    """Test the analytics pipeline endpoint"""
    print("\n=== Testing Analytics Endpoint ===")
    
    try:
        response = requests.get(f"{API_URL}/analytics/pipeline", timeout=10)
        if response.status_code == 200:
            analytics = response.json()
            
            # Check required fields
            required_fields = ["column_stats", "total_cards", "total_pipeline_value", "columns"]
            missing_fields = [field for field in required_fields if field not in analytics]
            
            if not missing_fields:
                log_test("Analytics Structure", True, "All required fields present")
                
                # Validate data types and content
                if isinstance(analytics["total_cards"], int) and analytics["total_cards"] >= 0:
                    log_test("Analytics Total Cards", True, f"Total cards: {analytics['total_cards']}")
                else:
                    log_test("Analytics Total Cards", False, f"Invalid total_cards: {analytics['total_cards']}")
                
                if isinstance(analytics["total_pipeline_value"], (int, float)) and analytics["total_pipeline_value"] >= 0:
                    log_test("Analytics Pipeline Value", True, f"Pipeline value: ${analytics['total_pipeline_value']}")
                else:
                    log_test("Analytics Pipeline Value", False, f"Invalid pipeline value: {analytics['total_pipeline_value']}")
                
                if isinstance(analytics["column_stats"], dict):
                    log_test("Analytics Column Stats", True, f"Column stats for {len(analytics['column_stats'])} columns")
                else:
                    log_test("Analytics Column Stats", False, "Column stats not a dictionary")
                
                return True
            else:
                log_test("Analytics Structure", False, f"Missing fields: {missing_fields}")
        else:
            log_test("Analytics Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Analytics Endpoint", False, f"Exception: {str(e)}")
        return False
    
    return False

def test_database_integration():
    """Test database connectivity and data persistence"""
    print("\n=== Testing Database Integration ===")
    
    # This is tested implicitly through other operations
    # We'll verify by creating, reading, and deleting data
    
    try:
        # Test that we can create and retrieve data consistently
        response = requests.get(f"{API_URL}/boards", timeout=10)
        if response.status_code == 200:
            boards_before = response.json()
            
            # Create a test board
            board_data = {"title": "Database Test Board", "description": "Testing database persistence"}
            response = requests.post(f"{API_URL}/boards", json=board_data, timeout=10)
            
            if response.status_code == 200:
                new_board = response.json()
                board_id = new_board["id"]
                
                # Verify it was persisted
                response = requests.get(f"{API_URL}/boards", timeout=10)
                if response.status_code == 200:
                    boards_after = response.json()
                    if len(boards_after) == len(boards_before) + 1:
                        log_test("Database Persistence", True, "Data successfully persisted to database")
                        
                        # Clean up - note: there's no delete board endpoint, so we'll leave it
                        return True
                    else:
                        log_test("Database Persistence", False, "Board count mismatch after creation")
                else:
                    log_test("Database Persistence", False, "Could not verify board creation")
            else:
                log_test("Database Integration", False, f"Could not create test board: {response.status_code}")
        else:
            log_test("Database Integration", False, f"Could not retrieve boards: {response.status_code}")
            
    except Exception as e:
        log_test("Database Integration", False, f"Exception: {str(e)}")
        return False
    
    return False

def run_all_tests():
    """Run all backend tests in sequence"""
    print("🚀 Starting Comprehensive Backend API Testing")
    print("=" * 60)
    
    # Test 1: Initialize default data
    test_initialize_endpoint()
    
    # Test 2: Board management
    board_id, columns = test_board_management()
    
    # Test 3: Card CRUD operations
    if columns:
        test_card_crud_operations(columns)
    
    # Test 4: Drag and drop API
    if columns:
        test_drag_drop_api(columns)
    
    # Test 5: Analytics endpoint
    test_analytics_endpoint()
    
    # Test 6: Database integration
    test_database_integration()
    
    # Print final results
    print("\n" + "=" * 60)
    print("🏁 BACKEND API TESTING COMPLETE")
    print("=" * 60)
    print(f"✅ Tests Passed: {test_results['passed']}")
    print(f"❌ Tests Failed: {test_results['failed']}")
    print(f"📊 Success Rate: {(test_results['passed'] / (test_results['passed'] + test_results['failed']) * 100):.1f}%")
    
    if test_results["errors"]:
        print("\n🔍 FAILED TESTS DETAILS:")
        for error in test_results["errors"]:
            print(f"   • {error}")
    
    print("\n" + "=" * 60)
    
    return test_results["failed"] == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)