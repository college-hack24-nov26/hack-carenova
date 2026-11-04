import sounddevice as sd
import scipy.io.wavfile as wav

print("Recording for 5 seconds. Please speak...")

audio = sd.rec(
    80000,
    samplerate=16000,
    channels=1,
    dtype="int16"
)

sd.wait()

wav.write(
    "test_recording.wav",
    16000,
    audio
)

print("Recording saved successfully!")