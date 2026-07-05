from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from dotenv import load_dotenv
import shutil
import os
import pyodbc

load_dotenv()

app = FastAPI(title="InsurTech Auto Damage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO('best.pt')

def get_db_connection():
    """Stabilește conexiunea la baza de date SQL Server."""
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    driver = os.getenv("DB_DRIVER")
    
    connection_string = f"DRIVER={driver};SERVER={server};DATABASE={database};Trusted_Connection=yes;"
    return pyodbc.connect(connection_string)

@app.post("/estimate-damage/")
async def estimate_damage(
    file: UploadFile = File(...),
    car_make: str = Form("Generica"), 
    car_year: int = Form(2015)        
):
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    results = model.predict(temp_file_path, conf=0.25)
    
 
    make_multipliers = {
        "Dacia": 0.8,
        "Ford": 1.0,
        "Volkswagen": 1.1,
        "Audi": 1.4,
        "BMW": 1.5,
        "Mercedes-Benz": 1.6
    }
    multiplier_marca = make_multipliers.get(car_make, 1.0)
    
    multiplier_an = 1.0
    if car_year >= 2022:
        multiplier_an = 1.3
    elif car_year >= 2017:
        multiplier_an = 1.1
    elif car_year <= 2010:
        multiplier_an = 0.8
        
    coeficient_final = multiplier_marca * multiplier_an

    detected_damages = []
    total_price = 0
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            damage_name = model.names[cls_id]
            confidence_score = float(box.conf[0])
            
            x1, y1, x2, y2 = box.xyxyn[0].tolist()
            
            cursor.execute("SELECT PretCurentRON FROM CatalogPiese WHERE ClasaYOLO = ?", damage_name)
            row = cursor.fetchone()
            
            base_price = row[0] if row else 500
            
            part_price = int(base_price * coeficient_final)
            
            detected_damages.append({
                "part": damage_name,
                "estimated_cost": part_price,
                "confidence": confidence_score,
                "bounding_box": { "x1": x1, "y1": y1, "x2": x2, "y2": y2 }
            })
            total_price += part_price
            
    cursor.close()
    conn.close()
    os.remove(temp_file_path)
    
    if not detected_damages:
        return {
            "status": "success", 
            "message": "The car appears intact. No damages detected.", 
            "total_estimated_cost": 0
        }
        
    return {
        "status": "success",
        "detected_damages": detected_damages,
        "total_estimated_cost": total_price,
        "message": f"Found {len(detected_damages)} damaged parts for {car_make} ({car_year})."
    }