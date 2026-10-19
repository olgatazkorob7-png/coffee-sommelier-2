import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, CATALOG, classifyQueryLocally, ProductItem } from '@/lib/coffee-data';

interface SommelierResponse {
  content: string;
  category: string;
  source: 'из базы' | 'из каталога' | 'общий';
  recommendedProducts: ProductItem[];
  suggestedFollowUps: string[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function processSommelierQuery(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<SommelierResponse> {
  const localAnalysis = classifyQueryLocally(question);
  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const systemInstruction = buildSystemPrompt();
      const contents = [
        ...history.slice(-4).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: question }]
        }
      ];

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 25000)
      );

      const response = await Promise.race([
        gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.4,
          }
        }),
        timeoutPromise
      ]);

      const rawText = response.text || '';
      let source = localAnalysis.source;
      let category = localAnalysis.category;
      let productIds = [...localAnalysis.recommendedProductIds];

      const sourceMatch = rawText.match(/\[SOURCE:\s*(из базы|из каталога|общий)\]/i);
      if (sourceMatch) {
        source = sourceMatch[1].toLowerCase() as any;
      }

      const catMatch = rawText.match(/\[CATEGORY:\s*([^\]]+)\]/i);
      if (catMatch) {
        category = catMatch[1].trim();
      }

      const prodMatch = rawText.match(/\[PRODUCTS:\s*([^\]]+)\]/i);
      if (prodMatch) {
        const found = prodMatch[1].split(',').map((s: string) => s.trim().toLowerCase());
        const validIds = CATALOG.filter(p => found.some(f => p.id.toLowerCase().includes(f) || p.name.toLowerCase().includes(f))).map(p => p.id);
        if (validIds.length > 0) {
          productIds = validIds;
        }
      }

      CATALOG.forEach(p => {
        if ((rawText.includes(p.name) || rawText.includes(p.country)) && !productIds.includes(p.id)) {
          productIds.push(p.id);
        }
      });

      const cleanedContent = rawText
        .replace(/\[SOURCE:[^\]]+\]/gi, '')
        .replace(/\[CATEGORY:[^\]]+\]/gi, '')
        .replace(/\[PRODUCTS:[^\]]+\]/gi, '')
        .trim();

      const recommendedProducts = CATALOG.filter(p => productIds.includes(p.id)).slice(0, 3);
      if (recommendedProducts.length === 0 && localAnalysis.recommendedProductIds.length > 0) {
        recommendedProducts.push(...CATALOG.filter(p => localAnalysis.recommendedProductIds.includes(p.id)));
      }

      return {
        content: cleanedContent || localAnalysis.matchedKbAnswer || 'Здравствуйте! Чем могу помочь?',
        category,
        source,
        recommendedProducts,
        suggestedFollowUps: ['Какой помол нужен?', 'Сравнить сорта', 'Условия подписки']
      };
    } catch (err) {
      console.warn('[Gemini Error, using local fallback]:', err);
    }
  }

  const fallbackProducts = CATALOG.filter(p => localAnalysis.recommendedProductIds.includes(p.id));
  return {
    content: localAnalysis.matchedKbAnswer || 'Здравствуйте! Помогу подобрать кофе под ваш способ заваривания и вкус.',
    category: localAnalysis.category,
    source: localAnalysis.source,
    recommendedProducts: fallbackProducts.length > 0 ? fallbackProducts : CATALOG.slice(0, 2),
    suggestedFollowUps: ['Подобрать помол', 'Как оформить подписку', 'Правила хранения']
  };
}
