
import { GoogleGenAI, Type } from "@google/genai";

const PROMPT_TEMPLATE = `You are a professional transcription AI. Transcribe this audio into a STRUCTURED TABLE FORMAT.

CRITICAL RULES:

1. SPEAKER SEPARATION & ACCURACY:
   - Identify different speakers accurately.
   - Put speaker ID in "Speaker" column ONLY (e.g., "speaker_01", "speaker_02").
   - DO NOT include speaker labels in transcript text.
   - Example:
     ✅ CORRECT: Speaker="speaker_01", Transcript="Hello world"
     ❌ WRONG: Speaker="speaker_01", Transcript="[Speaker 1] Hello world"

2. NATIVE SCRIPT:
   - Use native script (Devanagari for Hindi, Kannada script for Kannada, etc.)
   - DO NOT romanize.
   - Support code-mixed languages (Hindi+English is common).

3. SEGMENTATION & SENTENCE COMPLETION:
   - Each row MUST represent a complete sentence.
   - DO NOT break a single sentence into multiple rows.
   - Ensure timing aligns with the start and end of that specific sentence.

4. TRANSCRIPT ACCURACY:
   - Ensure 100% accuracy of the spoken word.
   - Capture every nuance of the speech in the target language script.

5. OUTPUT FORMAT:
   Return JSON with this EXACT structure:
   {
     "columns": ["Speaker", "Start", "End", "Transcript", "Emotion", "Language", "Locale", "Accent"],
     "data": [
       ["speaker_01", 0.06, 2.53, "text in native script", "neutral", "Hindi", "hi_in", "Standard hindi"],
       ["speaker_02", 2.55, 2.88, "more text", "happy", "Hindi", "hi_in", "Standard hindi"]
     ]
   }

6. TIMING:
   - Start and End as decimal seconds (e.g., 0.06, 2.53)
   - Precision: 2 decimal places

7. LANGUAGE MAPPING:
   - Hindi → hi_in → Standard hindi
   - Bengali → bn_in → Standard bengali
   - Tamil → ta_in → Standard tamil
   - Telugu → te_in → Standard telugu
   - Kannada → kn_in → Standard kannada
   - Malayalam → ml_in → Standard malayalam
   - Marathi → mr_in → Standard marathi
   - Gujarati → gu_in → Standard gujarati
   - Punjabi → pa_in → Standard punjabi
   - Urdu → ur_in → Standard urdu
   - English → en_in → Indian english

REMEMBER: Complete sentences and high speaker accuracy are mandatory!`;

export async function transcribeAudio(file: File): Promise<any> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { text: PROMPT_TEMPLATE },
          { 
            inlineData: { 
              mimeType: file.type, 
              data: base64Data 
            } 
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          columns: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          data: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        },
        required: ["columns", "data"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse transcription JSON");
  }
}
