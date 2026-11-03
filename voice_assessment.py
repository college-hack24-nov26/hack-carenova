import os
import tempfile

import sounddevice as sd
import scipy.io.wavfile as wav

from faster_whisper import WhisperModel
from gtts import gTTS

from create_memory_with_llm import ask_question



print("Loading speech recognition model...")

model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)




def record_audio(duration=8, sample_rate=16000):

    print(f"\nRecording for {duration} seconds...")
    print("Please speak your first-aid question.")

    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="int16"
    )

    sd.wait()

    with tempfile.NamedTemporaryFile(
        suffix=".wav",
        delete=False
    ) as temp_file:

        audio_path = temp_file.name

    wav.write(
        audio_path,
        sample_rate,
        audio
    )

    print("Recording completed.")

    return audio_path



def speech_to_text(audio_path, language=None):

    # Optional language selection
    language_codes = {
        "English": "en",
        "Hindi": "hi",
        "Marathi": "mr"
    }

    if language:
        language = language_codes.get(
            language,
            language
        )

    segments, info = model.transcribe(
        audio_path,
        task="transcribe",
        language=language,
        beam_size=5,
        vad_filter=True
    )

    question = " ".join(
        segment.text for segment in segments
    ).strip()

    return question, info.language




def get_rag_response(question, response_language="English"):
    language_rules = {
        "English": """
            Answer only in clear, simple English.
            """,
        "Hindi": """
            उत्तर केवल हिंदी भाषा और देवनागरी लिपि में दें।
            अंग्रेज़ी में उत्तर न दें, सिवाय आवश्यक चिकित्सा संक्षिप्त शब्दों के।
            प्राथमिक उपचार के निर्देश सरल, स्पष्ट और क्रमबद्ध रखें।
            retrieved जानकारी का हिंदी में अनुवाद करें।
            चिकित्सा संबंधी तथ्यों या निर्देशों को न बदलें।
            """,
        "Marathi": """
            उत्तर फक्त मराठी भाषेत आणि देवनागरी लिपीत द्या.
            आवश्यक वैद्यकीय संज्ञा वगळता इंग्रजीत उत्तर देऊ नका.
            प्रथमोपचाराच्या सूचना सोप्या, स्पष्ट आणि क्रमवार द्या.
            retrieved माहितीचे मराठीत भाषांतर करा.
            वैद्यकीय तथ्ये किंवा सूचना बदलू नका.
            """
    }

    language_instruction = f"""
    You are a careful first-aid assistant.

    STRICT LANGUAGE REQUIREMENT:
    {language_rules.get(response_language, language_rules["English"])}

    Answer the user's question using the retrieved first-aid information.
    If the retrieved information is in another language, translate it
    into the required response language.
    Do not invent medical instructions.
    If the information is insufficient, clearly say so in the required language.

    User question:
    {question}
    """

    answer = ask_question(language_instruction)

    if isinstance(answer, dict):
        answer = (
            answer.get("answer")
            or answer.get("response")
            or answer.get("output")
            or str(answer)
        )

    return str(answer).strip()





def text_to_speech(text, language="en"):

    tts = gTTS(
        text=text,
        lang=language
    )

    with tempfile.NamedTemporaryFile(
        suffix=".mp3",
        delete=False
    ) as temp_file:

        audio_path = temp_file.name

    tts.save(audio_path)

    return audio_path



def voice_assessment(duration=8):

    recorded_audio = None
    response_audio = None

    try:

       
        recorded_audio = record_audio(
            duration=duration
        )

        
        question, detected_language = speech_to_text(
            recorded_audio
        )

        if not question:

            print("No speech detected. Please try again.")
            return

        print("\nYour Question:")
        print(question)

        print("\nDetected language:")
        print(detected_language)

        
        language_map = {
            "en": "English",
            "hi": "Hindi",
            "mr": "Marathi"
        }

        response_language = language_map.get(
            detected_language,
            "English"
        )

        
        answer = get_rag_response(
            question,
            response_language
        )

        print("\nFirst Aid RAG Response:")
        print(answer)

        
        tts_language_map = {
            "en": "en",
            "hi": "hi",
            "mr": "mr"
        }

        tts_language = tts_language_map.get(
            detected_language,
            "en"
        )

        
        response_audio = text_to_speech(
            answer,
            tts_language
        )

        print("\nSpeaking RAG response...")

        
        return response_audio

    except Exception as error:

        print(f"\nVoice assessment failed: {error}")
        return None

    finally:

        if recorded_audio and os.path.exists(recorded_audio):

            try:
                os.remove(recorded_audio)

            except OSError:
                pass




if __name__ == "__main__":

    print("=" * 50)
    print("FIRST AID GUIDE AI - VOICE ASSISTANT")
    print("=" * 50)

    audio_path = voice_assessment()

    if audio_path:

        import pygame

        try:

            pygame.mixer.init()
            pygame.mixer.music.load(audio_path)
            pygame.mixer.music.play()

            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)

        finally:

            pygame.mixer.music.unload()
            pygame.mixer.quit()

            if os.path.exists(audio_path):
                os.remove(audio_path)
