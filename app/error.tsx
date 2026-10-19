'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-[#1C1917] p-4 text-center">
      <div>
        <h1 className="text-4xl font-bold font-serif mb-2">Ошибка</h1>
        <p className="text-sm text-[#78716C] mb-4">Произошла ошибка при загрузке страницы</p>
        <button
          onClick={() => reset()}
          className="inline-block px-4 py-2 bg-[#2C1E18] text-[#FAF8F5] rounded-xl text-xs font-medium cursor-pointer"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
