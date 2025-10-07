# Eyrie - Preventing Crowd Crush Before It Happens

Best Use of Cloudflare at HackHarvard '25🏆

!["landing_page"](image.png "landing_page")

![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white)
![React](https://img.shields.io/badge/-React-61DAFB?style=flat-square&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Next.js](https://img.shields.io/badge/-Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![WebRTC](https://img.shields.io/badge/-WebRTC-333333?style=flat-square&logo=webrtc&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/-Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![OpenCV](https://img.shields.io/badge/-OpenCV-5C3EE8?style=flat-square&logo=opencv&logoColor=white)
![PyTorch](https://img.shields.io/badge/-PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)
![D3.js](https://img.shields.io/badge/-D3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white)

A project built to monitor high-density gatherings in real-time, detect dangerous crowd formations, and predict deadly crowd crush events before they occur using AI-powered drones.

## Overview

Eyrie automatically streams live video from drones, detects people using YOLOv8, calculates spatial density, and generates predictive alerts.
It helps authorities prevent crowd crush tragedies by providing critical minutes to respond before disaster strikes.


## Features

* Multi-Source Streaming – WebRTC video from drones or cameras with real-time person detection overlays
* YOLOv8 Detection – Uses pre-trained or custom models to detect and track individuals with bounding boxes
* Spatial Analytics – Computes crowd density using Gaussian kernel algorithms with normalized coordinates
* Predictive Alerts – Machine learning algorithms identify high-risk formations before crush events occur
* Live Visualization – Interactive overlays with tracking points, risk heatmaps, and time-series analytics graphs
* Scalable Architecture – Supports multiple simultaneous drone feeds with shared video processing


## Tech Stack

* TypeScript + React + Next.js 15 with `d3.js` for heatmap visualization
* Python `FastAPI` for APIs & `aiortc` for WebRTC streaming
* YOLOv8 (Ultralytics) for real-time person detection
* OpenCV for video processing & PyTorch for ML inference

## Usage
```bash
cd frontend
pnpm install
pnpm dev
