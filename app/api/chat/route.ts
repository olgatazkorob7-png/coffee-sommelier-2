import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { buildSystemPrompt } from '@/lib/coffee-data';
import { sendQueryLog } from '@/server/loggerService';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
});

interface SheetProduct {
  название_сорта: string;
  страна: string;
  вкусовой_профиль: string;
  цена: string;
  ссылка_на_товар: string;
}

async function fetchFromSheets(): Promise<{
  knowledge: string;
  catalog: string;
  products: SheetProduct[];
}> {
  const logUrl = process.env.LOG_URL || 'https://script.google.com/macros/s/AKfycbwk8ldVnnjSzAm6JN7NtwcZ1H7RJmKiJUzI3rrYtmIoYsiElbwObHjdG0AfbW1vWVUS7w/exec';
  if (!logUrl) return { knowledge: '', catalog: '', products: [] };

  try {
    const [kbRes, catRes] = await Promise.all([
      fetch(`${logUrl}?action=get_knowledge`),
      fetch(`${logUrl}?action=get_catalog`),
    ]);
    const kbJson = await kbRes.json();
    const catJson = await catRes.json();
    const products: SheetProduct[] = catJson.data || [];

    const knowledge = (kbJson.data || [])
      .map(
        (e: any) =>
          `- category: ${e.category}\n  question: ${e.question}\n  answer: ${e.answer}\n  tags: ${e.tags}`
      )
      .join('\n\n');

    const catalog = products
      .map(
        (c) =>
          `- Название: ${c.название_сорта}\n  Страна: ${c.страна}\n  Вкусовой профиль: ${c.вкусовой_профиль}\n  Цена: ${c.цена}\n  Ссылка: ${c.ссылка_на_товар}`
      )
      .join('\n\n');

    return { knowledge, catalog, products };
  } catch (err) {
    console.error('Failed to load from Sheets:', err);
    return { knowledge: '', catalog: '', products: [] };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];
    const activeCategory = typeof body.category === 'string' ? body.category : 'Подбор сорта';

    if (!message) {
      return NextResponse.json({
        content:
          'Похоже, сообщение пустое. Напишите, пожалуйста, что хотите подобрать: кофе, помол, оборудование или подписку?',
        category: activeCategory,
        source: 'общий',
        recommendedProducts: [],
        suggestedFollowUps: [
          'Какой помол нужен для турки?',
          'Как оформить подписку?',
          'Сколько хранится свежеобжаренный кофе?',
        ],
      });
    }

    const storeName = process.env.STORE_NAME || 'Обжарочная «Терруар»';
    const supportContact = process.env.SUPPORT_CONTACT || 'support@terroir-coffee.ru';

    const { knowledge, catalog, products } = await fetchFromSheets();

    const systemInstruction = buildSystemPrompt(
      storeName,
      supportContact,
      knowledge || process.env.KNOWLEDGE_BASE,
      catalog || process.env.CATALOG
    );

    const contents = [
      ...history.slice(-6).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Ответ клиенту на русском языке. 3–7 предложений или короткий список.',
            },
            category: {
              type: Type.STRING,
              description:
                'Категория вопроса: Подбор сорта / Помол / Подписка / Хранение / Доставка и оплата / Оборудование / Общий.',
            },
            sourceType: {
              type: Type.STRING,
              description: 'Источник ответа: "из базы", "из каталога" или "общий".',
            },
            recommendedProducts: {
              type: Type.ARRAY,
              description:
                'Массив названий сортов из КАТАЛОГА. Название должно ТОЧНО совпадать с названием в каталоге. Если ничего не рекомендуется — пустой массив.',
              items: { type: Type.STRING },
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              description: '2–4 коротких вопроса-подсказки.',
              items: { type: Type.STRING },
            },
          },
          required: ['reply', 'category', 'sourceType', 'recommendedProducts', 'suggestedFollowUps'],
        },
      },
    });

    const raw = response.text || '';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        reply: raw,
        category: activeCategory,
        sourceType: 'общий',
        recommendedProducts: [],
        suggestedFollowUps: [],
      };
    }

    // Сопоставляем названия из ответа с каталогом из таблицы
    const recommendedNames: string[] = parsed.recommendedProducts || [];
    const recommendedItems = products
      .filter((p) =>
        recommendedNames.some(
          (name) =>
            name.toLowerCase().trim() === p.название_сорта.toLowerCase().trim() ||
            p.название_сорта.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.название_сорта.toLowerCase())
        )
      )
      .slice(0, 3)
      .map((p) => ({
        name: p.название_сорта,
        country: p.страна,
        flavorProfile: p.вкусовой_профиль,
        whyFits: 'Подобрано по Вашему запросу из свежеобжаренного каталога.',
        price: p.цена,
        link: p.ссылка_на_товар,
      }));

    // Логирование — асинхронно, не блокирует ответ
    sendQueryLog(message, parsed.category || activeCategory, parsed.sourceType || 'общий').catch(() => {});

    return NextResponse.json({
      reply: parsed.reply || 'Не удалось сформировать ответ.',
      content: parsed.reply || 'Не удалось сформировать ответ.',
      category: parsed.category || activeCategory,
      source: parsed.sourceType || 'общий',
      recommendedProduct: recommendedItems[0] || null,
      recommendedProducts: recommendedItems,
      suggestedFollowUps: parsed.suggestedFollowUps || [],
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}