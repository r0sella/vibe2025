const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const querystring = require('querystring');
const PORT = 3000;

// Настройки подключения к базе данных
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'todolist',
};

// Получение всех задач из базы данных
async function retrieveListItems() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    throw error;
  }
}

// Добавление новой задачи в базу данных
async function addListItem(text) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
    await connection.end();
  } catch (error) {
    console.error('Ошибка при добавлении задачи:', error);
    throw error;
  }
}

// Удаление задачи по id
async function deleteListItem(id) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM items WHERE id = ?', [id]);
    await connection.end();
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    throw error;
  }
}

// Генерация HTML-строк для задач
async function getHtmlRows() {
  const todoItems = await retrieveListItems();
  return todoItems.map((item, idx) =>
    `<tr>
      <td>${idx + 1}</td>
      <td>${item.text}</td>
      <td>
        <form method="POST" action="/delete" style="display:inline;">
          <input type="hidden" name="id" value="${item.id}">
          <button type="submit" onclick="return confirm('Удалить задачу?');">Удалить</button>
        </form>
      </td>
    </tr>`
  ).join('');
}

// Основной сервер
http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/add') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      if (parsed.text && parsed.text.trim()) {
        await addListItem(parsed.text.trim());
      }
      res.writeHead(302, { 'Location': '/' });
      res.end();
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/delete') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      if (parsed.id) {
        await deleteListItem(parsed.id);
      }
      res.writeHead(302, { 'Location': '/' });
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    const htmlTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const rows = await getHtmlRows();
    const page = htmlTemplate.replace('{{rows}}', rows);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}/`);
});
