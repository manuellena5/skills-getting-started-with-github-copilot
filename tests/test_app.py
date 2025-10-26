import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_data():
    """Snapshot and restore the in-memory DB around each test for isolation."""
    snapshot = copy.deepcopy(activities)
    try:
        yield
    finally:
        activities.clear()
        activities.update(copy.deepcopy(snapshot))


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Expect at least a couple of predefined activities
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "Programming Class" in data
    # Validate expected fields
    club = data["Chess Club"]
    assert {"description", "schedule", "max_participants", "participants"} <= set(club.keys())


def test_signup_success_and_duplicate_rejected(client):
    activity = "Chess Club"
    email = "newstudent@mergington.edu"

    # First signup should succeed
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Activity now contains the email
    get_after = client.get("/activities").json()
    assert email in get_after[activity]["participants"]

    # Duplicate signup should be rejected
    resp_dup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp_dup.status_code == 400
    assert resp_dup.json().get("detail") == "Student is already signed up"


def test_unregister_success_and_not_registered_error(client):
    activity = "Programming Class"
    email = "toremove@mergington.edu"

    # Ensure student is registered first
    resp_signup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp_signup.status_code == 200

    # Unregister should succeed
    resp_del = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert resp_del.status_code == 200
    assert "Unregistered" in resp_del.json().get("message", "")

    # Participant no longer present
    get_after = client.get("/activities").json()
    assert email not in get_after[activity]["participants"]

    # Unregister again should error (not registered)
    resp_del_again = client.delete(f"/activities/{activity}/signup", params={"email": email})
    assert resp_del_again.status_code == 400
    assert resp_del_again.json().get("detail") == "Student is not registered for this activity"


def test_404_on_unknown_activity(client):
    unknown = "Underwater Basket Weaving"
    email = "student@mergington.edu"

    # GET activities exists but unknown will 404 for signup and delete
    resp_signup = client.post(f"/activities/{unknown}/signup", params={"email": email})
    assert resp_signup.status_code == 404
    assert resp_signup.json().get("detail") == "Activity not found"

    resp_delete = client.delete(f"/activities/{unknown}/signup", params={"email": email})
    assert resp_delete.status_code == 404
    assert resp_delete.json().get("detail") == "Activity not found"
