import cv2
import numpy as np
from ultralytics import YOLO
import json
import time
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class PersonDetector:
    def __init__(self, model_path: str, conf_threshold: float = 0.5):
        """
        Initialize the person detector
        
        Args:
            model_path: Path to the trained YOLO model
            conf_threshold: Confidence threshold for detections
        """
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the YOLO model"""
        try:
            self.model = YOLO(self.model_path)
            logger.info(f"Model loaded successfully from {self.model_path}")
        except Exception as e:
            logger.error(f"Failed to load model from {self.model_path}: {e}")
            # fallback
            try:
                self.model = YOLO('yolov8n.pt')
                logger.info("Using pre-trained YOLOv8n model as fallback")
            except Exception as e2:
                logger.error(f"Failed to load fallback model: {e2}")
                self.model = None
    
    def detect_persons(self, image: np.ndarray) -> List[Dict]:
        """
        Detect persons in an image and return their positions
        
        Args:
            image: Input image as numpy array
            
        Returns:
            List of dictionaries containing person positions and metadata
        """
        if self.model is None:
            logger.error("Model not loaded")
            return []
        
        if image is None or image.size == 0:
            logger.error("Invalid image provided")
            return []
        
        try:
            results = self.model(image, conf=self.conf_threshold, verbose=False)
            
            person_positions = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        
                        if cls == 0 and conf > self.conf_threshold:  # Person class
                            # Get bounding box coordinates
                            x_center, y_center, width, height = box.xywh[0].cpu().numpy()
                            
                            # Convert to image coordinates
                            img_height, img_width = result.orig_shape
                            x_center_px = x_center * img_width
                            y_center_px = y_center * img_height
                            width_px = width * img_width
                            height_px = height * img_height
                            
                            person_positions.append({
                                'id': len(person_positions),
                                'x_center': float(x_center_px),
                                'y_center': float(y_center_px),
                                'width': float(width_px),
                                'height': float(height_px),
                                'confidence': float(conf),
                                'normalized_x': float(x_center),
                                'normalized_y': float(y_center),
                                'normalized_width': float(width),
                                'normalized_height': float(height)
                            })
            
            return person_positions
            
        except Exception as e:
            logger.error(f"Error during detection: {e}")
            return []
    
    def get_detection_summary(self, person_positions: List[Dict]) -> Dict:
        """
        Get a summary of detections
        
        Args:
            person_positions: List of person positions
            
        Returns:
            Dictionary with detection summary
        """
        if not person_positions:
            return {
                'total_persons': 0,
                'average_confidence': 0.0,
                'positions': [],
                'timestamp': int(time.time() * 1000)
            }
        
        avg_confidence = sum(pos['confidence'] for pos in person_positions) / len(person_positions)
        
        return {
            'total_persons': len(person_positions),
            'average_confidence': avg_confidence,
            'positions': person_positions,
            'timestamp': int(time.time() * 1000)
        }
    
    def process_video_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict]:
        """
        Process a single video frame and return annotated frame with detection data
        
        Args:
            frame: Input video frame
            
        Returns:
            Tuple of (annotated_frame, detection_summary)
        """
        if frame is None or frame.size == 0:
            logger.error("Invalid frame provided")
            return frame, self.get_detection_summary([])
        
        try:
            # Detect persons
            person_positions = self.detect_persons(frame)
            
            # Get detection summary
            detection_summary = self.get_detection_summary(person_positions)
            
            # Create annotated frame
            annotated_frame = frame.copy()
        except Exception as e:
            logger.error(f"Error processing video frame: {e}")
            return frame, self.get_detection_summary([])
        
        # Draw bounding boxes on the frame
        try:
            for pos in person_positions:
                x_center = pos['x_center']
                y_center = pos['y_center']
                width = pos['width']
                height = pos['height']
                confidence = pos['confidence']
                
                # Calculate bounding box coordinates
                x1 = int(x_center - width / 2)
                y1 = int(y_center - height / 2)
                x2 = int(x_center + width / 2)
                y2 = int(y_center + height / 2)
                
                # Draw bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Draw label
                label = f"Person {pos['id']}: {confidence:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Draw center point
                cv2.circle(annotated_frame, (int(x_center), int(y_center)), 3, (255, 0, 0), -1)
        except Exception as e:
            logger.error(f"Error drawing bounding boxes: {e}")
        
        return annotated_frame, detection_summary