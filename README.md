# AI Car Damage Estimator

A full-stack web application that uses computer vision to detect car damage from photos and automatically estimates repair costs. 

The app uses a custom YOLOv8 model to identify exactly which parts are damaged, draws bounding boxes over the uploaded image in real-time, and calculates a dynamic price based on the car's make and manufacturing year.

---

## ✨ Features

- **Object Detection:** Custom-trained YOLOv8 model that identifies specific damaged parts (e.g., front bumper, headlights, doors).
- **Dynamic Bounding Boxes:** The React frontend receives normalized coordinates from the API and dynamically draws boxes over the image without modifying the original file.
- **Smart Pricing Engine:** Repair costs aren't static. A damaged 2024 BMW costs more to fix than a 2010 Dacia. The backend adjusts base prices on the fly using a multiplier matrix.
- **Database Integration:** Base prices for each car part are pulled directly from a local Microsoft SQL Server database.
- **UI:** Clean, responsive interface built with React and TypeScript, handling async API calls and state management.

---

## 💻 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** FastAPI (Python), Uvicorn, Pydantic
- **Database:** Microsoft SQL Server, `pyodbc`
- **Machine Learning:** YOLOv8 (Ultralytics), Roboflow for dataset management

---

## ⚙️ How It Works (Data Flow)

1. **Upload:** The user uploads a photo of a crashed car and selects the car's make and year in the UI.
2. **Inference:** The React app sends this data to the FastAPI backend. The YOLOv8 model scans the image and returns the detected classes, confidence scores, and bounding box coordinates.
3. **Database Query:** The backend queries the SQL Server to find the base replacement/repair cost for the detected parts.
4. **Dynamic Calculation:** The pricing engine applies multipliers based on the brand (luxury vs. budget) and the year (newer cars have more sensors/complex parts).
5. **Render:** The frontend receives the JSON response, lists the itemized bill, and draws the bounding boxes directly on the user's screen.

---

## 🧮 The Pricing Logic

The final is calculated using a simple but effective formula:
`Final Cost = Base Price * Brand Multiplier * Year Multiplier`

* **Brand Multipliers:** Dacia (0.8x), Ford (1.0x), VW (1.1x), Audi (1.4x), BMW (1.5x), Mercedes (1.6x).
* **Year Multipliers:** Older than 2010 (0.8x) up to newer than 2022 (1.3x to account for ADAS sensors and complex calibration).

---

## 🛠️ Local Setup

### Prerequisites
- Python 3.9+
- Node.js (v16+)
- Microsoft SQL Server

### Backend
Clone the repo and navigate to the backend folder. Create a `.env` file for your database connection:
DB_SERVER=YOUR_SERVER_NAME
DB_NAME=YOUR_DATABASE_NAME
DB_DRIVER={ODBC Driver 17 for SQL Server}

### Frontend
Open a new terminal and navigate to the frontend folder (frontend-daune). Install the dependencies and start the dev server:
- npm install
- npm run dev
