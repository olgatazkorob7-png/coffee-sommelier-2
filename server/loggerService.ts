export async function sendQueryLog(message: string, category: string, source: string) {
  const baseLogUrl = process.env.LOG_URL || 'https://script.google.com/macros/s/AKfycbwk8ldVnnjSzAm6JN7NtwcZ1H7RJmKiJUzI3rrYtmIoYsiElbwObHjdG0AfbW1vWVUS7w/exec';
  if (!baseLogUrl) {
    return;
  }

  // Гарантируем передачу action=log и вкладки "логи" как в URL, так и в теле запроса
  const separator = baseLogUrl.includes('?') ? '&' : '?';
  const logUrl = baseLogUrl.includes('action=')
    ? baseLogUrl
    : `${baseLogUrl}${separator}action=log&sheet=${encodeURIComponent('логи')}`;

  const now = new Date();
  const dateFormatted = now.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const payload = {
    action: 'log',
    sheet: 'логи',
    sheetName: 'логи',
    sheet_name: 'логи',
    tab: 'логи',
    table: 'логи',

    // Точные названия колонок согласно ТЗ:
    'дата_и_время': dateFormatted,
    'текст_вопроса': message,
    'категория': category || 'Общий',
    'ответ_из_базы_или_общий': source || 'общий',

    // Дублирующие поля для совместимости с различными версиями скриптов:
    date_and_time: dateFormatted,
    iso_date: now.toISOString(),
    question: message,
    message: message,
    category: category || 'Общий',
    source: source || 'общий',
    answer_source: source || 'общий',
  };

  try {
    await fetch(logUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to log query to Google Sheets (вкладка логи):', err);
  }
}
