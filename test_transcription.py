from faster_whisper import WhisperModel

print("Loading Whisper model...")

model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)

print("Transcribing test_recording.wav...")

segments, info = model.transcribe(
    "test_recording.wav",
    task="transcribe"
)

text = " ".join(
    segment.text for segment in segments
).strip()

print("Detected language:", info.language)
print("Transcription:", text)