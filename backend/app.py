"""
FastAPI Backend for Vacation Planner - Deployable on AWS Bedrock AgentCore / ECS
"""
import os
import sys
import ssl
import urllib3

# SSL fixes for corporate/proxy environments - MUST be before any crewai/litellm/httpx imports
os.environ["SSL_VERIFY"] = "false"
os.environ["PYTHONHTTPSVERIFY"] = "0"
os.environ["HTTPX_VERIFY"] = "false"
os.environ["REQUESTS_CA_BUNDLE"] = ""
os.environ["CURL_CA_BUNDLE"] = ""

# Patch ssl module globally
ssl._create_default_https_context = ssl._create_unverified_context

# Disable urllib3 warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch httpx module functions before they're used
try:
    import httpx._config as httpx_config
    original_create_ssl_context = httpx_config.create_ssl_context
    
    def patched_create_ssl_context(verify=True, cert=None, trust_env=True):
        """Patched SSL context that skips certificate verification."""
        try:
            # Try to create without verification first
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            return context
        except Exception as e:
            # Fallback: create minimal SSL context
            import ssl as ssl_module
            context = ssl_module.SSLContext(ssl_module.PROTOCOL_TLS_CLIENT)
            context.check_hostname = False
            context.verify_mode = ssl_module.CERT_NONE
            return context
    
    httpx_config.create_ssl_context = patched_create_ssl_context
except Exception:
    pass  # httpx not available yet, will patch later

from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

# Don't import VacationPlanner here - it will be lazy loaded to allow SSL patches to work

app = FastAPI(
    title="Vacation Planner API",
    description="AI-powered vacation planning API using CrewAI and AWS Bedrock",
    version="1.0.0"
)

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlanRequest(BaseModel):
    source_city: str
    destination: str
    number_of_days: int = 5


class PlanResponse(BaseModel):
    destination: str
    source_city: str
    number_of_days: int
    report: Optional[str] = None
    weather: Optional[str] = None
    itinerary: Optional[str] = None
    hotels: Optional[str] = None
    restaurants: Optional[str] = None
    activities: Optional[str] = None


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "vacation-planner-api"}


@app.post("/plan", response_model=PlanResponse)
def create_plan(request: PlanRequest):
    """Run the full vacation planning crew and return all results."""
    try:
        # Lazy import VacationPlanner here to ensure SSL patches are applied first
        from vacation_planner.crew import VacationPlanner
        
        inputs = {
            "topic": request.destination,
            "source_city": request.source_city,
            "current_year": str(datetime.now().year),
            "number_of_days": str(request.number_of_days)
        }

        result = VacationPlanner().crew().kickoff(inputs=inputs)

        # Read output files
        response_data = {
            "destination": request.destination,
            "source_city": request.source_city,
            "number_of_days": request.number_of_days,
        }

        # Read report
        if os.path.exists("report.md"):
            with open("report.md", "r", encoding="utf-8") as f:
                response_data["report"] = f.read()

        # Weather from task output
        if hasattr(result, 'tasks_output') and len(result.tasks_output) > 2:
            response_data["weather"] = result.tasks_output[2].raw

        # Read detailed itinerary
        if os.path.exists("detailed_itinerary.md"):
            with open("detailed_itinerary.md", "r", encoding="utf-8") as f:
                response_data["itinerary"] = f.read()

        # Read hotels
        if os.path.exists("hotels.md"):
            with open("hotels.md", "r", encoding="utf-8") as f:
                response_data["hotels"] = f.read()

        # Read restaurants
        if os.path.exists("restaurants.md"):
            with open("restaurants.md", "r", encoding="utf-8") as f:
                response_data["restaurants"] = f.read()

        # Read activities
        if os.path.exists("activities.md"):
            with open("activities.md", "r", encoding="utf-8") as f:
                response_data["activities"] = f.read()

        return PlanResponse(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cities")
def get_cities():
    """Return the list of supported cities for autocomplete."""
    cities = [
        "Abu Dhabi", "Accra", "Addis Ababa", "Adelaide", "Agra", "Ahmedabad", "Alexandria",
        "Algiers", "Amman", "Amsterdam", "Anchorage", "Ankara", "Antalya", "Antwerp", "Athens",
        "Atlanta", "Auckland", "Austin", "Baghdad", "Baku", "Bali", "Baltimore", "Bangalore",
        "Bangkok", "Barcelona", "Basel", "Beijing", "Beirut", "Belfast", "Belgrade", "Bergen",
        "Berlin", "Bern", "Bogota", "Bologna", "Boston", "Brasilia", "Bratislava", "Brisbane",
        "Brussels", "Bucharest", "Budapest", "Buenos Aires", "Cairo", "Calgary", "Cancun",
        "Cape Town", "Caracas", "Chennai", "Chicago", "Colombo", "Copenhagen", "Dallas",
        "Delhi", "Denver", "Detroit", "Dhaka", "Doha", "Dubai", "Dublin", "Dubrovnik",
        "Edinburgh", "Florence", "Frankfurt", "Geneva", "Goa", "Hamburg", "Hanoi", "Helsinki",
        "Ho Chi Minh City", "Hong Kong", "Honolulu", "Houston", "Hyderabad", "Istanbul",
        "Jaipur", "Jakarta", "Jerusalem", "Johannesburg", "Karachi", "Kathmandu", "Kochi",
        "Kolkata", "Krakow", "Kuala Lumpur", "Kyoto", "Lagos", "Las Vegas", "Lisbon",
        "Liverpool", "London", "Los Angeles", "Madrid", "Male", "Manchester", "Manila",
        "Marrakech", "Melbourne", "Mexico City", "Miami", "Milan", "Montreal", "Moscow",
        "Mumbai", "Munich", "Nairobi", "Nashville", "New Orleans", "New York", "Nice",
        "Orlando", "Osaka", "Oslo", "Paris", "Perth", "Philadelphia", "Phuket", "Portland",
        "Porto", "Prague", "Pune", "Queenstown", "Reykjavik", "Rio de Janeiro", "Rome",
        "San Diego", "San Francisco", "Santiago", "Sao Paulo", "Seattle", "Seoul", "Shanghai",
        "Singapore", "Stockholm", "Sydney", "Taipei", "Tel Aviv", "Tokyo", "Toronto",
        "Vancouver", "Venice", "Vienna", "Warsaw", "Washington DC", "Wellington", "Zurich"
    ]
    return {"cities": cities}
