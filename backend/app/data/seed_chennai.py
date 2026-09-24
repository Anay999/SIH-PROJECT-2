import json
import os
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.models.city_ward import City, Zone, Ward
from app.models.weather import WeatherObservation, WeatherForecast
from app.models.thermal import ThermalMetric
from app.models.vulnerability import VulnerabilityProfile
from app.models.health_risk import MortalityRiskEstimate, HospitalizationRiskEstimate
from app.models.alert_intervention import HeatwaveEvent, Alert, Intervention
from app.models.facilities import CoolingCenter, Hospital
from app.models.user import User, UserRole
from app.core.auth import hash_password

logger = logging.getLogger("heatshield.seed")

def seed_default_users(db: Session):
    default_users = [
        {
            "id": "usr_admin_01",
            "username": "admin",
            "full_name": "Municipal System Administrator",
            "phone_number": "+919876543212",
            "email": "admin@thermosafe.gov.in",
            "password_hash": hash_password("Admin@123"),
            "role": UserRole.ADMIN.value,
            "city": "Chennai",
            "is_active": True,
            "phone_verified": True,
        },
        {
            "id": "usr_officer_01",
            "username": "officer",
            "full_name": "Senior Municipal Heat Officer",
            "phone_number": "+919876543211",
            "email": "officer@thermosafe.gov.in",
            "password_hash": hash_password("Officer@123"),
            "role": UserRole.MUNICIPAL_OFFICER.value,
            "city": "Chennai",
            "is_active": True,
            "phone_verified": True,
        },
        {
            "id": "usr_officer_chennai_01",
            "username": "chennai_officer",
            "full_name": "Chennai Corporation Heat Officer",
            "phone_number": "+919876543299",
            "email": "officer@chennaicorp.gov.in",
            "password_hash": hash_password("Officer@123"),
            "role": UserRole.MUNICIPAL_OFFICER.value,
            "city": "Chennai",
            "is_active": True,
            "phone_verified": True,
        },
        {
            "id": "usr_citizen_01",
            "username": "citizen",
            "full_name": "Public Citizen User",
            "phone_number": "+919876543210",
            "email": "citizen@gmail.com",
            "password_hash": hash_password("Citizen@123"),
            "role": UserRole.CITIZEN.value,
            "city": "Chennai",
            "is_active": True,
            "phone_verified": True,
        },
    ]

    for u_data in default_users:
        existing = db.query(User).filter((User.username == u_data["username"]) | (User.id == u_data["id"])).first()
        if not existing:
            u = User(**u_data)
            db.add(u)
    db.commit()

def seed_database(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Check if already seeded
        existing_city = db.query(City).filter(City.id == "chennai").first()
        if existing_city:
            seed_default_users(db)
            logger.info("Database already contains Chennai demo data. Seeded/verified users.")
            return {
                "status": "already_seeded",
                "city": existing_city.name,
                "wards_count": db.query(Ward).count()
            }

        logger.info("Seeding Chennai demo city and 15 wards...")

        # 1. City
        city = City(
            id="chennai",
            name="Chennai",
            state="Tamil Nadu",
            country="India",
            latitude=13.0827,
            longitude=80.2707,
            timezone="Asia/Kolkata"
        )
        db.add(city)
        db.flush()

        # Load GeoJSON from workspace root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        geojson_path = os.path.join(base_dir, "data", "geojson", "chennai_wards.geojson")
        if not os.path.exists(geojson_path):
            # Fallback relative paths
            candidate_paths = [
                os.path.join("..", "data", "geojson", "chennai_wards.geojson"),
                os.path.join("data", "geojson", "chennai_wards.geojson"),
                r"c:\Users\anayp\sih 2nd project\data\geojson\chennai_wards.geojson"
            ]
            for p in candidate_paths:
                if os.path.exists(p):
                    geojson_path = p
                    break

        with open(geojson_path, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        zones_created = {}

        # 2. Zones & Wards
        for feature in geojson_data["features"]:
            props = feature["properties"]
            zone_id = props["zone_id"]
            
            if zone_id not in zones_created:
                zone = Zone(
                    id=zone_id,
                    city_id=city.id,
                    zone_number=int(props["ward_number"]),
                    name=props["zone_name"]
                )
                db.add(zone)
                db.flush()
                zones_created[zone_id] = zone

            ward = Ward(
                id=props["ward_id"],
                city_id=city.id,
                zone_id=zone_id,
                ward_number=props["ward_number"],
                name=props["name"],
                latitude=props["latitude"],
                longitude=props["longitude"],
                geometry_geojson=feature["geometry"],
                area_sq_km=props.get("area_sq_km", 6.5),
                total_population=props["total_population"],
                elderly_population=props["elderly_population"],
                children_population=props["children_population"],
                outdoor_worker_population=props["outdoor_worker_population"],
                poverty_rate_proxy=props["poverty_rate_proxy"],
                vegetation_ndvi_proxy=props["vegetation_ndvi_proxy"],
                builtup_surface_fraction=props["builtup_surface_fraction"]
            )
            db.add(ward)
            db.flush()

            # 3. Vulnerability Profile calculation
            # Multi-criteria scoring (0-100)
            elderly_ratio = ward.elderly_population / ward.total_population
            worker_ratio = ward.outdoor_worker_population / ward.total_population
            
            demographic_sub = min(100.0, (elderly_ratio * 3.5 + (ward.children_population / ward.total_population) * 2.0) * 100)
            socio_sub = min(100.0, (ward.poverty_rate_proxy * 0.55 + worker_ratio * 0.45) * 100)
            cooling_sub = min(100.0, (1.0 - ward.vegetation_ndvi_proxy) * 60 + ward.builtup_surface_fraction * 40)
            health_access_sub = 45.0 if int(ward.ward_number) in [4, 5, 6, 7] else 25.0

            vuln_score = round(0.30 * demographic_sub + 0.30 * socio_sub + 0.25 * cooling_sub + 0.15 * health_access_sub, 1)
            vuln_category = (
                "Extreme" if vuln_score >= 80 else
                "Very High" if vuln_score >= 65 else
                "High" if vuln_score >= 50 else
                "Moderate" if vuln_score >= 35 else "Low"
            )

            vuln_profile = VulnerabilityProfile(
                id=f"vuln_{ward.id}",
                ward_id=ward.id,
                vulnerability_score=vuln_score,
                vulnerability_category=vuln_category,
                demographic_subscore=round(demographic_sub, 1),
                socioeconomic_subscore=round(socio_sub, 1),
                healthcare_access_subscore=round(health_access_sub, 1),
                cooling_access_subscore=round(cooling_sub, 1),
                explanation=(
                    f"Elevated vulnerability driven by high outdoor labor density ({round(worker_ratio*100, 1)}%) "
                    f"and impervious built-up surface ({round(ward.builtup_surface_fraction*100, 1)}%)."
                )
            )
            db.add(vuln_profile)

            # 4. Baseline Microclimate Weather & Thermal Metrics
            # Coastal wards have higher RH; inland have higher air temp
            is_coastal = int(ward.ward_number) in [1, 4, 5, 13, 14, 15]
            base_temp = 37.5 if is_coastal else 39.2
            base_rh = 74.0 if is_coastal else 58.0
            wind_speed = 3.2 if is_coastal else 1.8
            solar_rad = 720.0

            obs = WeatherObservation(
                id=f"obs_{ward.id}_latest",
                ward_id=ward.id,
                timestamp=datetime.now(timezone.utc),
                air_temp_c=base_temp,
                relative_humidity=base_rh,
                wind_speed_ms=wind_speed,
                solar_radiation_wm2=solar_rad,
                dew_point_c=round(base_temp - ((100 - base_rh) / 5), 1),
                source="synthetic_scenario_seed"
            )
            db.add(obs)

            # Preliminary calculated thermal outputs
            # (In Phase 3, these will be dynamically refreshed through the validated engines)
            hi_c = round(base_temp + (base_rh / 100 * 12.5), 1)
            wbgt_c = round(0.7 * (base_temp * 0.72) + 0.2 * (base_temp + 4.5) + 0.1 * base_temp, 1)
            utci_c = round(base_temp + 3.8 + (base_rh / 100 * 4.2), 1)
            htsi_score = min(98.0, round((hi_c / 60 * 45) + (vuln_score * 0.25) + 18.0, 1))
            htsi_cat = (
                "Extreme" if htsi_score >= 80 else
                "Very High" if htsi_score >= 65 else
                "High" if htsi_score >= 45 else "Moderate"
            )

            thermal = ThermalMetric(
                id=f"therm_{ward.id}_latest",
                ward_id=ward.id,
                timestamp=datetime.now(timezone.utc),
                mode="observed",
                air_temp_c=base_temp,
                relative_humidity=base_rh,
                wind_speed_ms=wind_speed,
                solar_radiation_wm2=solar_rad,
                heat_index_c=hi_c,
                heat_index_category="Danger" if hi_c >= 41 else "Extreme Caution",
                wbgt_c=wbgt_c,
                wbgt_mode="estimated_outdoor",
                wbgt_category="High Stress" if wbgt_c >= 31 else "Moderate",
                utci_c=utci_c,
                utci_category="Very Strong Heat Stress" if utci_c >= 38 else "Strong Heat Stress",
                htsi_score=htsi_score,
                htsi_category=htsi_cat,
                component_scores={"thermal": 78.0, "persistence": 62.0, "vulnerability": vuln_score, "urban": 74.0},
                weights={"thermal": 0.45, "persistence": 0.20, "vulnerability": 0.20, "urban": 0.15},
                explanation="High relative humidity combined with elevated ambient temperature restricts evaporative sweat cooling."
            )
            db.add(thermal)

            # 5. HAMRI & Hospital Surge
            hamri = round(htsi_score * 0.92, 1)
            mortality = MortalityRiskEstimate(
                id=f"mort_{ward.id}_latest",
                ward_id=ward.id,
                timestamp=datetime.now(timezone.utc),
                model_mode="demo_rule_based",
                hamri_score=hamri,
                risk_category="Very High" if hamri >= 65 else "High",
                relative_risk_estimate=round(1.15 + (hamri - 40) * 0.015, 2),
                excess_mortality_range="0 - 2 per 100k (Illustrative Demo)",
                uncertainty_lower=round(1.02 + (hamri - 40) * 0.01, 2),
                uncertainty_upper=round(1.35 + (hamri - 40) * 0.02, 2),
                model_confidence=0.85
            )
            db.add(mortality)

            surge_idx = min(95.0, round(hamri * 0.85 + 10.0, 1))
            hosp_risk = HospitalizationRiskEstimate(
                id=f"hosp_risk_{ward.id}_latest",
                ward_id=ward.id,
                timestamp=datetime.now(timezone.utc),
                surge_index=surge_idx,
                readiness_alert_level="Severe" if surge_idx >= 70 else "Elevated",
                estimated_heat_related_cases=int(ward.total_population / 25000 * (surge_idx / 20)),
                icu_bed_pressure_pct=round(surge_idx * 0.42, 1)
            )
            db.add(hosp_risk)

            # 6. 5-Day Forecast series
            now = datetime.now(timezone.utc)
            for d in range(1, 6):
                # Simulated developing heat trend over 5 days
                f_temp = round(base_temp + (d * 0.6), 1)
                f_rh = max(40.0, round(base_rh - (d * 1.5), 1))
                forecast = WeatherForecast(
                    id=f"fc_{ward.id}_d{d}",
                    ward_id=ward.id,
                    forecast_for_time=now + timedelta(days=d),
                    horizon_hours=d * 24,
                    air_temp_c=f_temp,
                    relative_humidity=f_rh,
                    wind_speed_ms=wind_speed,
                    solar_radiation_wm2=solar_rad + (d * 15.0),
                    min_temp_c=round(f_temp - 8.5, 1),
                    max_temp_c=round(f_temp + 2.0, 1),
                    confidence_score=round(0.92 - (d * 0.06), 2),
                    source="synthetic_scenario_engine"
                )
                db.add(forecast)

        # 7. Facilities from JSON
        facilities_path = os.path.join(base_dir, "data", "synthetic", "facilities_chennai.json")
        if not os.path.exists(facilities_path):
            candidate_paths = [
                os.path.join("..", "data", "synthetic", "facilities_chennai.json"),
                os.path.join("data", "synthetic", "facilities_chennai.json"),
                r"c:\Users\anayp\sih 2nd project\data\synthetic\facilities_chennai.json"
            ]
            for p in candidate_paths:
                if os.path.exists(p):
                    facilities_path = p
                    break

        with open(facilities_path, "r", encoding="utf-8") as f:
            fac_data = json.load(f)

        for cc in fac_data["cooling_centers"]:
            cooling_center = CoolingCenter(
                id=cc["id"],
                ward_id=cc["ward_id"],
                name=cc["name"],
                address=cc["address"],
                latitude=cc["latitude"],
                longitude=cc["longitude"],
                total_capacity=cc["total_capacity"],
                current_occupancy=cc["current_occupancy"],
                operating_hours=cc["operating_hours"],
                water_available=cc["water_available"],
                power_backup=cc["power_backup"],
                status=cc["status"],
                contact=cc["contact"]
            )
            db.add(cooling_center)

        for h in fac_data["hospitals"]:
            hosp = Hospital(
                id=h["id"],
                ward_id=h["ward_id"],
                name=h["name"],
                hospital_type=h["hospital_type"],
                latitude=h["latitude"],
                longitude=h["longitude"],
                total_beds=h["total_beds"],
                icu_beds=h["icu_beds"],
                current_admissions=h["current_admissions"],
                heat_stroke_cases_today=h["heat_stroke_cases_today"],
                readiness_status=h["readiness_status"],
                contact=h["contact"]
            )
            db.add(hosp)

        # 8. Active Heatwave Event
        heatwave = HeatwaveEvent(
            id="hw_chennai_2026_01",
            city_id="chennai",
            event_type="humid_heat_crisis",
            severity="Severe",
            start_time=datetime.now(timezone.utc) - timedelta(days=1),
            expected_end_time=datetime.now(timezone.utc) + timedelta(days=4),
            peak_temperature_c=41.2,
            peak_wbgt_c=33.8,
            consecutive_days=3,
            active=True
        )
        db.add(heatwave)

        # 9. Initial Alerts & Heat Action Plan Directives
        alert1 = Alert(
            id="alert_chn_001",
            ward_id="ward_04_tondiarpet",
            severity="Extreme Warning",
            status="ACTIVE",
            trigger_metric="HTSI & WBGT",
            headline="Severe Humid Heat Stress Warning in Tondiarpet",
            message="WBGT expected to exceed 33.2°C with high nocturnal persistence. Extreme heatstroke risk for outdoor workers.",
            recommended_actions=[
                "Suspend strenuous outdoor manual labor between 11:30 AM and 16:00 PM.",
                "Open Community Cooling Pavilions to 24-hour operation.",
                "Deploy GCC mobile water distribution tankers along port corridors."
            ],
            target_audience="Port Workers, Fisherfolk, Street Vendors, Elderly Citizens"
        )
        alert2 = Alert(
            id="alert_chn_002",
            ward_id="ward_05_royapuram",
            severity="Warning",
            status="ACTIVE",
            trigger_metric="WBGT Surge",
            headline="High Wet-Bulb Heat Stress in Royapuram",
            message="WBGT reaching 31.8°C along maritime transit terminals. Hydration breaks mandatory every 30 minutes.",
            recommended_actions=[
                "Establish shaded rest stations near fishing harbor.",
                "Distribute oral rehydration packets at transit bus stations."
            ],
            target_audience="Harbor Laborers & Transit Commuters"
        )
        alert3 = Alert(
            id="alert_chn_003",
            ward_id="ward_06_thiruvika_nagar",
            severity="Watch",
            status="ACTIVE",
            trigger_metric="Nocturnal Heat Retention",
            headline="Nocturnal Heat Advisory in Thiru Vi Ka Nagar",
            message="Nighttime temperature forecast above 29.0°C restricting cardiovascular recovery in dense settlements.",
            recommended_actions=[
                "Advise elderly residents to sleep in well-ventilated rooms.",
                "Keep local community health centers on standby."
            ],
            target_audience="Elderly Residents & Families in Informal Settlements"
        )
        db.add(alert1)
        db.add(alert2)
        db.add(alert3)

        interventions = [
            Intervention(
                id="int_01",
                ward_id="ward_04_tondiarpet",
                department="Labor & Outdoor Work",
                action_name="Mandatory Outdoor Work Shift Re-scheduling",
                priority="Urgent",
                status="Dispatched",
                deadline=datetime.now(timezone.utc) + timedelta(hours=12),
                reason="Wet-bulb globe temperature exceeds OSHA/ISO threshold for unshaded physical work."
            ),
            Intervention(
                id="int_02",
                ward_id="ward_05_royapuram",
                department="Public Health",
                action_name="Preemptive ORS Hydration Booths at Harbour Gate",
                priority="High",
                status="In-Progress",
                deadline=datetime.now(timezone.utc) + timedelta(hours=6),
                reason="High density of transit laborers with restricted potable water access."
            ),
            Intervention(
                id="int_03",
                ward_id="ward_09_teynampet",
                department="Municipal Cooling",
                action_name="Extend Operating Hours for Transit Cooling Kiosks",
                priority="High",
                status="Recommended",
                deadline=datetime.now(timezone.utc) + timedelta(hours=24),
                reason="Urban Heat Island retention in commercial corridor preventing night cooling."
            ),
            Intervention(
                id="int_04",
                ward_id="ward_06_thiruvika_nagar",
                department="Power & Water Infrastructure",
                action_name="Standby Transformer Cooling & Water Tanker Routing",
                priority="Critical",
                status="Recommended",
                deadline=datetime.now(timezone.utc) + timedelta(hours=8),
                reason="Peak residential AC loads risk feeder overloads during nocturnal heat spikes."
            )
        ]
        for it in interventions:
            db.add(it)

        db.commit()
        logger.info("Database seeding completed successfully: 15 wards, facilities, observations, forecasts, alerts.")
        return {
            "status": "seeded",
            "city": city.name,
            "wards_count": len(geojson_data["features"]),
            "cooling_centers_count": len(fac_data["cooling_centers"]),
            "hospitals_count": len(fac_data["hospitals"])
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise e
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_database()
