# Model Training and Dataset Structure

This directory contains all files related to YOLO model training and inference for person detection.

## Dataset Structure

Your dataset should be organized as follows:

```
dataset/
├── images/
│   ├── train/
│   │   ├── img001.jpg
│   │   ├── img002.jpg
│   │   └── ...
│   ├── val/
│   │   ├── img101.jpg
│   │   ├── img102.jpg
│   │   └── ...
│   └── test/
│       ├── img201.jpg
│       ├── img202.jpg
│       └── ...
└── labels/
    ├── train/
    │   ├── img001.txt
    │   ├── img002.txt
    │   └── ...
    ├── val/
    │   ├── img101.txt
    │   ├── img102.txt
    │   └── ...
    └── test/
        ├── img201.txt
        ├── img202.txt
        └── ...
```

## Annotation Format

Each `.txt` file should contain one line per object:
```
class_id x_center y_center width height
```

Where:
- `class_id`: 0 (for person)
- All coordinates are normalized (0-1)
- `x_center, y_center`: center of bounding box
- `width, height`: width and height of bounding box

### Example annotation file (img001.txt):
```
0 0.5 0.3 0.2 0.4
0 0.8 0.7 0.15 0.3
```

This represents two persons in the image.

## Training Process

1. Upload your dataset to Google Drive
2. Update the `DATASET_PATH` in the Colab notebook
3. Run the training cells
4. The trained model will be saved to Google Drive

## Model Output

The trained model will output:
- Person detection with confidence scores
- Bounding box coordinates (both pixel and normalized)
- Position data for each detected person

## Inference Format

The model returns position data in this format:
```json
{
  "total_persons": 2,
  "average_confidence": 0.85,
  "positions": [
    {
      "id": 0,
      "x_center": 320.5,
      "y_center": 240.3,
      "width": 64.2,
      "height": 128.4,
      "confidence": 0.92,
      "normalized_x": 0.5,
      "normalized_y": 0.3,
      "normalized_width": 0.2,
      "normalized_height": 0.4
    }
  ],
  "timestamp": 1640995200000
}
```
