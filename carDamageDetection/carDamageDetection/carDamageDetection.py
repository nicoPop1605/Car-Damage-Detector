from ultralytics import YOLO

model = YOLO('best.pt')
results = model.predict('good-car2.png', save=True, conf=0.5)

for result in results:
    boxes = result.boxes
    print(f"Am detectat {len(boxes)} daune în această imagine.")
    for box in boxes:
        cls_id = int(box.cls[0])
        print(f"- Dauna detectată: {model.names[cls_id]}")