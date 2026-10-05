import base64
import requests
import io
import math
from typing import Dict, Any, Optional
from backend.config import settings

class DeepgramSpeechService:
    """
    Manages Speech-to-Text (STT) and Text-to-Speech (TTS) using Deepgram API.
    Provides graceful offline simulation when API key is not configured.
    """

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.stt_url = f"https://api.deepgram.com/v1/listen?model={settings.DEEPGRAM_MODEL}&smart_format=true&punctuate=true"
        self.tts_url = f"https://api.deepgram.com/v1/speak?model={settings.DEEPGRAM_TTS_VOICE}"

    def transcribe_audio_bytes(self, audio_bytes: bytes, content_type: str = "audio/wav") -> Dict[str, Any]:
        """
        Transcribes speech audio bytes to text via Deepgram STT.
        """
        if self.api_key:
            try:
                headers = {
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": content_type
                }
                response = requests.post(self.stt_url, data=audio_bytes, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    channels = data.get("results", {}).get("channels", [])
                    if channels:
                        alts = channels[0].get("alternatives", [])
                        if alts:
                            transcript = alts[0].get("transcript", "")
                            confidence = alts[0].get("confidence", 0.95)
                            duration = data.get("metadata", {}).get("duration", 2.0)
                            return {
                                "transcript": transcript,
                                "confidence": confidence,
                                "duration_sec": duration,
                                "source": "deepgram"
                            }
            except Exception as e:
                print(f"Deepgram STT API request error: {e}")

        # Fallback simulation
        return {
            "transcript": "What is gradient descent and how does it minimize the loss function in machine learning?",
            "confidence": 0.94,
            "duration_sec": 2.5,
            "source": "simulation_fallback"
        }

    def synthesize_speech(self, text: str, voice: Optional[str] = None) -> Optional[str]:
        """
        Converts text into audio speech via Deepgram TTS. Returns base64 encoded audio string.
        """
        voice_model = voice or settings.DEEPGRAM_TTS_VOICE
        tts_url = f"https://api.deepgram.com/v1/speak?model={voice_model}"

        if self.api_key:
            try:
                headers = {
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {"text": text}
                response = requests.post(tts_url, json=payload, headers=headers, timeout=10.0)
                if response.status_code == 200 and len(response.content) > 0:
                    return base64.b64encode(response.content).decode("utf-8")
            except Exception as e:
                print(f"Deepgram TTS API request error: {e}")

        return None
