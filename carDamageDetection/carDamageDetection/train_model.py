from roboflow import Roboflow
from ultralytics import YOLO

def main():
    print("=== PASUL 1: Descărcarea setului de date ===")
    

    rf = Roboflow(api_key="Ve1udsA1IQYymuLrIjKW")
    project = rf.workspace("nicoleta-pop").project("car-damage-recognition-rybp9")
    version = project.version(2)
    dataset = version.download("yolov8", location="D:/Dataset_Daune")    
    print(f"Dataset descărcat cu succes în: {dataset.location}")
    print("\n=== PASUL 2: Antrenarea Modelului AI ===")
    
    # Încărcăm arhitectura de bază YOLOv8
    model = YOLO('yolov8s.pt')
    
    # dataset.location conține automat calea corectă către folderul descărcat!
    yaml_path = f"{dataset.location}/data.yaml"
    
    # Pornim antrenamentul cu setările pentru clase dezechilibrate
   # Pornim antrenamentul cu setările standard (datele au fost deja augmentate în Roboflow)
    results = model.train(
        data=yaml_path,
        epochs=50,                  
        imgsz=640,                  
        batch=16,                   
        patience=10,                
        project='runs/train',       
        name='insurtech_model_v2'   
    )
    
    print("\nAntrenament finalizat! Noul tău best.pt este în folderul runs/train/insurtech_model_v2/weights/")

if __name__ == '__main__':
    main()