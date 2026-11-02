import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getPronunciationFeedback(targetText: string, spokenText: string, isThirdAttempt: boolean = false, level: string = '5th') {
  const isFirstGrade = level === '1st';
  const prompt = `
    A student is learning English. 
    Level: ${level} Grade.
    Target ${isFirstGrade ? 'word' : 'sentence/phrase'}: "${targetText}".
    Student said: "${spokenText}".
    
    Is the pronunciation of the target ${isFirstGrade ? 'word' : 'sentence'} correct or very close? 
    ${isFirstGrade ? `
    CRITICAL: Be ULTRA PERMISSIVE. This is a 1st grader. If they say anything that sounds remotely like the word, or even just a part of it, mark it as correct. 
    We want to encourage them! Even a very rough attempt is a "success".
    ` : `
    CRITICAL: Be VERY PERMISSIVE. This is a 5th grader. While they should aim for accuracy, do NOT be overly picky about small transcript errors or minor mispronunciations. 
    If the core meaning and most words are clear, mark it as correct. 
    For example, if they say "everythin" instead of "every day" but the rest of the sentence is perfect, it might be a transcript slip—be forgiving!
    Aim for a "7 out of 10" on the permissiveness scale.
    `}
    
    If correct:
    - Set isCorrect to true.
    - feedback: "Excellent! You said it perfectly! ✨"
    
    If incorrect:
    - Set isCorrect to false.
    ${isThirdAttempt ? `
    - feedback: "${isFirstGrade ? 'בוא ננסה שוב ביחד...' : "Let's practice this sentence together..."}"
    ` : `
    - feedback: "${isFirstGrade ? 'כמעט! נסה שוב.' : "Almost! Try repeating the whole sentence one more time."}"
    `}
    
    Return JSON:
    {
      "isCorrect": boolean,
      "feedback": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Error getting feedback:", error);
    
    // Check for rate limit / quota error
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return { 
        isCorrect: spokenText.toLowerCase().includes(targetText.toLowerCase().split(' ')[0]), 
        feedback: "Buddy is a bit tired right now! Let's try again in a minute. 😴",
        isQuotaExhausted: true
      };
    }

    return { isCorrect: spokenText.toLowerCase().includes(targetText.toLowerCase().split(' ')[0]), feedback: "Try again!" };
  }
}

export async function getDetailedPronunciationAnalysis(targetText: string, spokenText: string, level: string = '5th') {
  const isFirstGrade = level === '1st';
  const prompt = `
    A student is struggling to pronounce the English ${isFirstGrade ? 'word' : 'sentence'}: "${targetText}".
    They just said: "${spokenText}".
    Level: ${level} Grade.
    
    Analyze the pronunciation. 
    ${isFirstGrade ? `
    IMPORTANT: The student is in 1st grade and DOES NOT understand English explanations. 
    Provide the analysis and tip ONLY in Hebrew. 
    Keep it very simple, encouraging, and easy for a 6-7 year old to understand.
    ` : `
    Analyze the pronunciation of the sentence. 
    1. Keep the English analysis and tip very short (one sentence each).
    2. Provide a clear, detailed Hebrew tip explaining how to say the difficult parts.
    3. Focus on being helpful and encouraging.
    `}
    
    Keep it friendly and encouraging.
    
    Return JSON:
    {
      "analysis": "string (Short English analysis)",
      "tip": "string (Short English tip)",
      "hebrewTip": "string (Detailed Hebrew tip)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Error getting detailed analysis:", error);

    // Check for rate limit / quota error
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return { 
        analysis: `Buddy is resting for a moment.`,
        tip: "Please wait a minute and try again!",
        hebrewTip: "באדי נח לרגע. אנא נסה שוב בעוד דקה!",
        isQuotaExhausted: true
      };
    }

    return { 
      analysis: `It sounds like you're having a bit of trouble with this sentence.`,
      tip: "Try to listen to the sentence again and repeat slowly.",
      hebrewTip: "נסה להקשיב למשפט שוב ולחזור עליו לאט."
    };
  }
}

export async function generateExamSentences(words: string[]) {
  const prompt = `
    I have a list of English vocabulary words: ${words.join(', ')}.
    For each word, generate one clear, simple sentence that a elementary school student would understand.
    In each sentence, replace the target word with "____" (four underscores).
    
    Return a JSON array of objects, where each object has:
    - word: the original word
    - sentence: the sentence with the "____" placeholder
    
    Example:
    If the word is "apple", the sentence could be "I like to eat a red ____ for a snack."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating exam sentences:", error);
    return [];
  }
}

export async function generateVocabPracticeData(words: string[]) {
  const prompt = `
    I have a list of English vocabulary words: ${words.join(', ')}.
    For each word, generate a complete JSON object following this structure:
    {
      "word": "string",
      "translation": "Hebrew translation of the word",
      "category": "string (e.g., Objects, Actions, Nature)",
      "example": "A simple English sentence for 5th graders using the word",
      "exampleTranslation": "Hebrew translation of the example sentence"
    }
    
    Return a JSON array of these objects for all words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating vocab practice data:", error);
    return [];
  }
}

export async function generateTranslationsOnly(words: string[]) {
  const prompt = `
    I have a list of English vocabulary words: ${words.join(', ')}.
    For each word, generate its Hebrew translation(s). If there are multiple direct translations, separate them with Hebrew commas (,) or slashes (/).
    The translation must be accurate and simple.
    
    Return a JSON array of objects following this structure:
    [
      {
        "word": "English word",
        "translation": "Hebrew translation(s)"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating fast translations:", error);
    return words.map(w => ({ word: w, translation: "" }));
  }
}

