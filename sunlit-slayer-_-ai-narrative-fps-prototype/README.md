# ☀️ Project: SUNLIT-PROTOCOL
> **Web-based AI Combat Simulation & Level Design Testbed**
>
> DEMO PLAY: https://huggingface.co/spaces/devmeta/Sunlit_Slayer

![Generic badge](https://img.shields.io/badge/Tech-Three.js%20%7C%20WebGL-blue)
![Generic badge](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-orange)
![Generic badge](https://img.shields.io/badge/Focus-Level%20Design%20%26%20Balancing-green)

## 📖 Overview
**Project: SUNLIT-PROTOCOL** is a WebGL-based FPS survival simulation built with **Three.js**. It goes beyond traditional gameplay by integrating **Generative AI (Gemini 1.5 Flash)** into real-time loops. The system dynamically generates "Commander Communications" based on current wave status and player performance, creating a non-linear narrative experience within a browser environment.

This project was developed as a **'Vibe Coding' experiment**, aimed at verifying the efficiency of AI-assisted game prototyping and the potential of LLMs in dynamic in-game storytelling.

---

## 🎯 Level Design & Balancing Testbed
This project serves as a **spatial prototyping environment** to verify FPS level metrics and combat pacing before full-scale production.

* **📏 Spatial Metrics Verification**
    * The "Sunlit Arena" (open field) acts as a control group to test **Player Movement Speed vs. Enemy Density** variables without the interference of complex cover structures.
* **📈 Dynamic Pacing Stress-Test**
    * Implements an exponential difficulty algorithm to identify the "Break Point" where player skill is overwhelmed by level difficulty.
    * **Logic:** `Zombie Count * 1.5x` per wave / `Speed +0.015` increment per wave.
* **🧠 Information Architecture (UX)**
    * Tests how audio-visual cues influence player decision-making in high-stress scenarios using a **Tactical Radar (65m radius)** and **AI-generated Commander Comms**.

---

## ⚙️ Key Features (Tech & AI)

### 🤖 AI-Driven Narrative
* Utilizes `gemini-1.5-flash` to generate **context-aware tactical briefings**.
* Delivers real-time encouragement or warnings at the start/end of each wave based on player performance (HP, Ammo efficiency).

### 🌊 Progressive Wave Logic
* Designed to stress-test combat mechanics through algorithmic difficulty spikes.
* Ensures a consistent challenge curve that adapts as the simulation progresses.

### ⚡ Performance Optimization
* Custom WebGL rendering pipeline ensuring a stable **60 FPS** performance.
* Features dynamic particle effects including Muzzle Flash and Blood Impacts within the "Sunlit Arena" environment.

### 🎯 Core FPS Mechanics
* **ADS (Aim Down Sights):** Precision targeting mechanics.
* **Recoil Patterns:** Procedural recoil generation for realistic shooting feedback.
* **Tactical Radar:** Real-time threat detection system (65m detection radius).

---

## 🛠️ Tech Stack
* **Engine:** Three.js (WebGL)
* **Language:** TypeScript / JavaScript
* **AI Model:** Google Gemini 1.5 Flash (via API)
* **Physics:** Custom AABB Physics Engine

---

## 📸 Screenshots & Demo
*(Optional: Add your screenshots or GIFs here to demonstrate the gameplay and AI interaction)*

---
*Disclaimer: This project is a prototype developed for research purposes to explore the intersection of Generative AI and Game Level Design.*
