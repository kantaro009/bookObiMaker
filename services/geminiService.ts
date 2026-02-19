import { GoogleGenAI, Type } from "@google/genai";
import { ObiContent } from "../types";

// Initialize Gemini client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateObiSuggestions = async (title: string, author: string): Promise<ObiContent[]> => {
  try {
    const prompt = `
      あなたはプロの書籍編集者です。
      以下の書籍のために、購買意欲をそそる魅力的な「帯（おび）」のコピーを3パターン作成してください。
      
      書籍タイトル: ${title}
      著者: ${author}
      
      出力はJSON形式で、以下の構造を持つ配列にしてください。
      各パターンはターゲット層やトーンを変えてください（例：感動的、衝撃的、ミステリアス、実用的など）。
      
      mainText: 帯の中で一番大きく表示するメインのキャッチコピー（15文字以内推奨）
      subText: メインコピーを補足する文章（30文字以内推奨）
      catchphrase: 著者の実績や「No.1」などの権威付け、あるいはあおり文句（10文字以内）
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              mainText: { type: Type.STRING },
              subText: { type: Type.STRING },
              catchphrase: { type: Type.STRING },
            },
            required: ["mainText", "subText", "catchphrase"],
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    return JSON.parse(jsonText) as ObiContent[];
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return [
      {
        mainText: "AI生成に失敗しました",
        subText: "もう一度お試しいただくか、手動で入力してください。",
        catchphrase: "エラー"
      }
    ];
  }
};
