export interface Word {
  word: string;
  translation: string;
  category: string;
  example: string;
  exampleTranslation: string;
}

export const GRADE_1_VOCABULARY: Word[] = [
  { word: "dog", translation: "כלב", category: "Animals", example: "The dog says woof.", exampleTranslation: "הכלב אומר הב." },
  { word: "cat", translation: "חתול", category: "Animals", example: "The cat is small.", exampleTranslation: "החתול קטן." },
  { word: "bird", translation: "ציפור", category: "Animals", example: "The bird can fly.", exampleTranslation: "הציפור יכולה לעוף." },
  { word: "fish", translation: "דג", category: "Animals", example: "The fish lives in water.", exampleTranslation: "הדג חי במים." },
  { word: "red", translation: "אדום", category: "Colors", example: "The apple is red.", exampleTranslation: "התפוח אדום." },
  { word: "blue", translation: "כחול", category: "Colors", example: "The sky is blue.", exampleTranslation: "השמיים כחולים." },
  { word: "green", translation: "ירוק", category: "Colors", example: "The grass is green.", exampleTranslation: "הדשא ירוק." },
  { word: "yellow", translation: "צהוב", category: "Colors", example: "The sun is yellow.", exampleTranslation: "השמש צהובה." },
  { word: "one", translation: "אחת", category: "Numbers", example: "I have one apple.", exampleTranslation: "יש לי תפוח אחד." },
  { word: "two", translation: "שתיים", category: "Numbers", example: "I have two hands.", exampleTranslation: "יש לי שתי ידיים." },
  { word: "three", translation: "שלוש", category: "Numbers", example: "I see three birds.", exampleTranslation: "אני רואה שלוש ציפורים." },
  { word: "mom", translation: "אמא", category: "Family", example: "I love my mom.", exampleTranslation: "אני אוהב את אמא שלי." },
  { word: "dad", translation: "אבא", category: "Family", example: "My dad is tall.", exampleTranslation: "אבא שלי גבוה." },
  { word: "boy", translation: "ילד", category: "People", example: "He is a happy boy.", exampleTranslation: "הוא ילד שמח." },
  { word: "girl", translation: "ילדה", category: "People", example: "She is a nice girl.", exampleTranslation: "היא ילדה נחמדה." },
  { word: "book", translation: "ספר", category: "School", example: "This is my book.", exampleTranslation: "זה הספר שלי." },
  { word: "pen", translation: "עט", category: "School", example: "I have a blue pen.", exampleTranslation: "יש לי עט כחול." },
  { word: "sun", translation: "שמש", category: "Nature", example: "The sun is hot.", exampleTranslation: "השמש חמה." },
  { word: "moon", translation: "ירח", category: "Nature", example: "The moon is white.", exampleTranslation: "הירח לבן." },
  { word: "star", translation: "כוכב", category: "Nature", example: "I see a star.", exampleTranslation: "אני רואה כוכב." },
];

export const GRADE_5_VOCABULARY: Word[] = [
  // Family & People
  { word: "family", translation: "משפחה", category: "People", example: "I love my family.", exampleTranslation: "אני אוהב את המשפחה שלי." },
  { word: "friend", translation: "חבר", category: "People", example: "She is my best friend.", exampleTranslation: "היא החברה הכי טובה שלי." },
  { word: "teacher", translation: "מורה", category: "People", example: "The teacher is in the classroom.", exampleTranslation: "המורה בכיתה." },
  { word: "student", translation: "תלמיד", category: "People", example: "I am a student in 5th grade.", exampleTranslation: "אני תלמיד בכיתה ה'." },
  
  // School & Learning
  { word: "school", translation: "בית ספר", category: "School", example: "I go to school every morning.", exampleTranslation: "אני הולך לבית הספר כל בוקר." },
  { word: "book", translation: "ספר", category: "School", example: "I like to read this book.", exampleTranslation: "אני אוהב לקרוא את הספר הזה." },
  { word: "pencil", translation: "עיפרון", category: "School", example: "Can I borrow your pencil?", exampleTranslation: "אפשר לשאול את העיפרון שלך?" },
  { word: "lesson", translation: "שיעור", category: "School", example: "We have an English lesson now.", exampleTranslation: "יש לנו שיעור אנגלית עכשיו." },
  
  // Food & Drink
  { word: "apple", translation: "תפוח", category: "Food", example: "I eat an apple for snack.", exampleTranslation: "אני אוכל תפוח לחטיף." },
  { word: "water", translation: "מים", category: "Food", example: "I drink a lot of water.", exampleTranslation: "אני שותה הרבה מים." },
  { word: "bread", translation: "לחם", category: "Food", example: "I like bread with butter.", exampleTranslation: "אני אוהב לחם עם חמאה." },
  { word: "breakfast", translation: "ארוחת בוקר", category: "Food", example: "What did you have for breakfast?", exampleTranslation: "מה אכלת לארוחת בוקר?" },
  
  // Animals
  { word: "dog", translation: "כלב", category: "Animals", example: "My dog is very friendly.", exampleTranslation: "הכלב שלי מאוד ידידותי." },
  { word: "cat", translation: "חתול", category: "Animals", example: "The cat is sleeping on the sofa.", exampleTranslation: "החתול ישן על הספה." },
  { word: "bird", translation: "ציפור", category: "Animals", example: "The bird is singing in the tree.", exampleTranslation: "הציפור שרה על העץ." },
  { word: "elephant", translation: "פיל", category: "Animals", example: "The elephant is a big animal.", exampleTranslation: "הפיל הוא חיה גדולה." },
  
  // Colors & Shapes
  { word: "red", translation: "אדום", category: "Colors", example: "The apple is red.", exampleTranslation: "התפוח אדום." },
  { word: "blue", translation: "כחול", category: "Colors", example: "The sky is blue today.", exampleTranslation: "השמיים כחולים היום." },
  { word: "green", translation: "ירוק", category: "Colors", example: "The grass is green.", exampleTranslation: "הדשא ירוק." },
  { word: "circle", translation: "עיגול", category: "Shapes", example: "The sun looks like a circle.", exampleTranslation: "השמש נראית כמו עיגול." },
  
  // Actions
  { word: "read", translation: "לקרוא", category: "Actions", example: "I read every day.", exampleTranslation: "אני קורא כל יום." },
  { word: "write", translation: "לכתוב", category: "Actions", example: "I write in my notebook.", exampleTranslation: "אני כותב במחברת שלי." },
  { word: "speak", translation: "לדבר", category: "Actions", example: "I want to speak English well.", exampleTranslation: "אני רוצה לדבר אנגלית היטב." },
  { word: "listen", translation: "להקשיב", category: "Actions", example: "Listen to the music.", exampleTranslation: "תקשיב למוזיקה." },
  
  // Home
  { word: "house", translation: "בית", category: "Home", example: "This is my house.", exampleTranslation: "זה הבית שלי." },
  { word: "room", translation: "חדר", category: "Home", example: "My room is clean.", exampleTranslation: "החדר שלי נקי." },
  { word: "bed", translation: "מיטה", category: "Home", example: "I sleep in my bed.", exampleTranslation: "אני ישן במיטה שלי." },
  { word: "kitchen", translation: "מטבח", category: "Home", example: "Mom is in the kitchen.", exampleTranslation: "אמא במטבח." },
];
