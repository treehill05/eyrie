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

## Usage Instructions

### 1. Prepare Dataset
- Organize your images and labels following the structure above
- Upload to Google Drive in the specified path

### 2. Train Model
- Open `yolo_training_notebook.ipynb` in Google Colab
- Update the `DATASET_PATH` variable
- Run all cells to train the model

### 3. Download Model
- After training, download the `best_person_detection.pt` file
- Place it in the `Model/` directory of your project

### 4. Use in Backend
- The backend will automatically load the trained model
- If no custom model is found, it will use pre-trained YOLOv8n

## File Descriptions

- `yolo_training_notebook.ipynb` - Complete training pipeline for Google Colab
- `README.md` - This documentation file
- `best_person_detection.pt` - Trained model weights (created after training)

## Tips for Better Results

1. **Dataset Quality**: Use diverse images with various lighting conditions
2. **Annotation Accuracy**: Ensure precise bounding box annotations
3. **Data Augmentation**: The notebook includes automatic augmentation
4. **Training Time**: More epochs generally improve accuracy but take longer
5. **Model Size**: YOLOv8n is fast but less accurate than larger versions

## Troubleshooting

### Common Issues
1. **Dataset not found**: Check Google Drive path and permissions
2. **Out of memory**: Reduce batch size or image size
3. **Poor accuracy**: Increase training data or adjust hyperparameters
4. **Training too slow**: Use GPU runtime in Colab

### Performance Tips
- Use GPU runtime in Google Colab for faster training
- Monitor training metrics to avoid overfitting
- Save checkpoints regularly during long training sessions
