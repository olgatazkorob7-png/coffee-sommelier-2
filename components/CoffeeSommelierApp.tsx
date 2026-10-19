'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Coffee,
  Sliders,
  Calendar,
  Archive,
  Truck,
  Send,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  X,
  Loader2
} from 'lucide-react';
import { CATEGORIES, CategoryItem, RecommendedProduct } from '@/lib/coffee-data';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedProduct?: RecommendedProduct | null;
  source?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  selection: Coffee,
  grind: Sliders,
  subscription: Calendar,
  storage: Archive,
  delivery: Truck,
};

function formatMessageText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} className="h-2.5" />;
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={lineIdx} className="leading-relaxed">
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="font-semibold text-[#1C1917]">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={partIdx}>{part}</React.Fragment>;
        })}
      </p>
    );
  });
}

export default function CoffeeSommelierApp() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Здравствуйте! Я «Кофейный сомелье» обжарочной «Терруар».\n\nПомогу подобрать свежеобжаренный кофе под Ваши вкусовые предпочтения, выбрать помол под способ заваривания, настроить подписку или расскажу о правилах хранения и доставке.\n\nВыберите тему в списке слева или напишите Ваш вопрос в поле ввода.',
      source: 'из базы',
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RecommendedProduct | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const sendMessage = async (textToSend: string, categoryTitle?: string) => {
    const trimmed = textToSend.trim();
    if (isLoading) return;

    setErrorText(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || '(пустое сообщение)',
    };

    const currentHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const currentCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: currentHistory,
          category: categoryTitle || currentCategoryObj?.title || 'Подбор сорта',
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Не удалось получить ответ от сервера.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.content || '',
        recommendedProduct: data.recommendedProduct || (data.recommendedProducts && data.recommendedProducts[0]) || null,
        source: data.source || 'из базы',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.recommendedProduct) {
        setSelectedProduct(data.recommendedProduct);
      }
    } catch (err) {
      setErrorText(
        err instanceof Error
          ? err.message
          : 'Произошла ошибка соединения. Попробуйте отправить сообщение ещё раз.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (cat: CategoryItem) => {
    setActiveCategory(cat.id);
    if (!isLoading) {
      sendMessage(cat.defaultPrompt, cat.title);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <main className="min-h-screen lg:h-screen w-full bg-[#FAF8F5] text-[#1C1917] flex flex-col lg:grid lg:grid-cols-[280px_1fr_340px] lg:overflow-hidden">
      {/* ЛЕВАЯ КОЛОНКА: Категории */}
      <aside className="border-b lg:border-b-0 lg:border-r border-[#E5E0D5] bg-[#F7F4EE] flex flex-col p-4 lg:overflow-y-auto">
        <div className="flex items-center gap-2.5 px-2 py-3 mb-3 border-b border-[#E5E0D5]">
          <div className="w-8 h-8 rounded-lg bg-[#2C1E18] text-[#FAF8F5] flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#1C1917]">Терруар</h1>
            <p className="text-[11px] text-[#78716C]">Обжарочная мануфактура</p>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-[#78716C] px-2 mb-2 uppercase tracking-wider">
          Темы консультации
        </div>

        <nav className="space-y-1.5 flex-1">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Coffee;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-[#2C1E18] text-[#FAF8F5] shadow-sm'
                    : 'bg-transparent text-[#2C1E18] hover:bg-[#EBE6DC]'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-[#FAF8F5]' : 'text-[#78716C]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-tight">{cat.title}</div>
                  <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-[#D6D3D1]' : 'text-[#78716C]'}`}>
                    {cat.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 pt-3 border-t border-[#E5E0D5] px-2">
          <div className="text-[11px] text-[#78716C] leading-relaxed">
            Поддержка обжарщика:
            <span className="block font-medium text-[#2C1E18]">support@terroir-coffee.ru</span>
          </div>
        </div>
      </aside>

      {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Диалог сомелье */}
      <section className="flex flex-col flex-1 h-full min-w-0 bg-[#FAF8F5] relative">
        {/* Заголовок чата */}
        <header className="px-6 py-4 border-b border-[#E5E0D5] bg-[#FAF8F5]/90 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-[#1C1917]">Кофейный сомелье</h2>
            <span className="text-[#A8A29E]">·</span>
            <span className="text-xs text-[#78716C]">{currentCategoryObj.title}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setMessages([
                {
                  id: 'welcome-reset',
                  role: 'assistant',
                  content: 'Здравствуйте! Я готов помочь вам с новым вопросом по кофе, помолу или оборудованию.',
                  source: 'из базы',
                },
              ]);
              setSelectedProduct(null);
            }}
            className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 transition-colors"
            title="Очистить диалог"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>
        </header>

        {/* Список сообщений */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-1.5 px-1 text-xs">
                  {isUser ? (
                    <span className="font-medium text-[#78716C]">Ваш вопрос</span>
                  ) : (
                    <span className="font-medium text-[#78716C]">Ответ сомелье</span>
                  )}
                </div>

                {/* Сама плашка */}
                <div
                  className={`max-w-2xl rounded-2xl px-5 py-4 text-sm ${
                    isUser
                      ? 'bg-[#2C1E18] text-[#FAF8F5] shadow-sm'
                      : 'bg-white text-[#1C1917] border border-[#E5E0D5] shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="leading-relaxed text-[#FAF8F5]">{msg.content}</p>
                  ) : (
                    formatMessageText(msg.content)
                  )}

                  {msg.recommendedProduct && (
                    <div className="mt-4 pt-3 border-t border-[#E5E0D5] flex items-center justify-between gap-3">
                      <span className="text-xs text-[#78716C]">
                        Рекомендовано: {msg.recommendedProduct.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(msg.recommendedProduct || null)}
                        className="text-xs font-medium text-[#2C1E18] underline underline-offset-4 hover:text-[#57534E] transition-colors whitespace-nowrap shrink-0"
                      >
                        Показать в карточке
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="mb-1 px-1 text-xs text-[#78716C]">
                Кофейный сомелье
              </div>
              <div className="bg-white border border-[#E5E0D5] rounded-xl px-5 py-4 text-sm text-[#78716C] flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#2C1E18] animate-spin shrink-0" />
                <span>Подбираю ответ по каталогу и базе обжарщика...</span>
              </div>
            </div>
          )}

          {errorText && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorText}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Быстрые подсказки текущей темы */}
        {currentCategoryObj.sampleQuestions && currentCategoryObj.sampleQuestions.length > 0 && (
          <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto border-t border-[#E5E0D5] bg-[#FAF8F5]">
            <span className="text-[11px] text-[#78716C] whitespace-nowrap">Подсказки:</span>
            {currentCategoryObj.sampleQuestions.map((sq, sqIdx) => (
              <button
                key={sqIdx}
                type="button"
                onClick={() => sendMessage(sq)}
                className="text-xs px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] text-[#2C1E18] hover:bg-[#F4F1EA] transition-colors whitespace-nowrap shrink-0"
              >
                {sq}
              </button>
            ))}
          </div>
        )}

        {/* Поле ввода */}
        <form onSubmit={handleFormSubmit} className="p-4 border-t border-[#E5E0D5] bg-white flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Спросите о вкусе кофе, помоле, доставке или оборудовании..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2C1E18]/20 focus:border-[#2C1E18] transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#2C1E18] text-[#FAF8F5] text-sm font-medium hover:bg-[#3E2B22] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Отправить</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </section>

      {/* ПРАВАЯ КОЛОНКА: Карточка товара */}
      <aside className="border-t lg:border-t-0 lg:border-l border-[#E5E0D5] bg-[#F7F4EE] flex flex-col p-5 lg:overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#E5E0D5]">
          <ShoppingBag className="w-4 h-4 text-[#2C1E18]" />
          <h2 className="text-sm font-bold text-[#1C1917]">Карточка товара</h2>
        </div>

        {selectedProduct ? (
          <div className="flex flex-col flex-1 justify-between bg-white border border-[#E5E0D5] rounded-2xl p-4 shadow-sm">
            <div className="space-y-4">
              <div className="aspect-video w-full rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] flex items-center justify-center text-[#78716C]">
                <Coffee className="w-10 h-10 text-[#2C1E18] stroke-[1.2]" />
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                  {selectedProduct.country || 'Кофе'}
                </span>
                <h3 className="text-base font-bold text-[#1C1917] mt-0.5 leading-snug">
                  {selectedProduct.name}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#78716C] block">Вкусовой профиль:</span>
                  <p className="font-medium text-[#1C1917] mt-0.5 leading-relaxed">
                    {selectedProduct.flavorProfile}
                  </p>
                </div>

                <div>
                  <span className="text-[#78716C] block">Почему подходит:</span>
                  <p className="text-[#44403C] mt-0.5 leading-relaxed">
                    {selectedProduct.whyFits}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#E5E0D5] space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#78716C]">Цена:</span>
                <span className="text-lg font-bold text-[#1C1917]">
                  {typeof selectedProduct.price === 'number'
                    ? `${selectedProduct.price} ₽`
                    : selectedProduct.price}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2C1E18] text-[#FAF8F5] hover:bg-[#3E2B22] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Перейти к товару</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E5E0D5] rounded-2xl bg-white/50">
            <Coffee className="w-8 h-8 text-[#A8A29E] stroke-[1.2] mb-2" />
            <p className="text-xs font-medium text-[#1C1917]">Товар ещё не выбран</p>
            <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
              Спросите сомелье о сорте кофе или помоле — здесь появится подробная карточка позиции.
            </p>
          </div>
        )}
      </aside>

      {/* Модальное окно перехода к товару */}
      {showDemoModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E5E0D5] text-center relative">
            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917]"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E5E0D5] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-5 h-5 text-[#2C1E18]" />
            </div>
            <h3 className="text-base font-bold text-[#1C1917] mb-1">
              {selectedProduct.name}
            </h3>
            <p className="text-xs text-[#78716C] mb-4">
              {selectedProduct.flavorProfile}
            </p>
            <div className="p-3 bg-[#FAF8F5] rounded-xl text-xs text-[#44403C] mb-4 font-mono break-all">
              {selectedProduct.link}
            </div>
            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#2C1E18] text-[#FAF8F5] text-xs font-semibold hover:bg-[#3E2B22] transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
