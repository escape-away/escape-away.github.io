// A local stand-in for the Apps Script web app, for trying the forms without a Google account.
// It runs apps-script/Code.gs (in scripts/forms-script-sandbox.mjs) against an in-memory sheet and
// answers like Apps Script does: the POST gets a 302 to a GET that returns the JSON, both with CORS.
//
//   npm run forms:sink                      (port 4180; PORT=… to change it)
//   NEXT_PUBLIC_FORM_ENDPOINT=http://localhost:4180/exec in .env.development.local, then npm run dev
//   http://localhost:4180/rows              shows the tabs and the alert emails as JSON
//
// Nothing is written to disk; stopping the server forgets every row.
import http from 'node:http';
import { loadFormsScript } from './forms-script-sandbox.mjs';

const port = Number(process.env.PORT) || 4180;
const sandbox = loadFormsScript({ alertEmail: 'team@example.com' });
sandbox.context.setup();
const replies = new Map();
const cors = { 'Access-Control-Allow-Origin': '*' };

function read(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) req.destroy();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const json = (status, text) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(text);
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  if (req.method === 'POST' && url.pathname === '/exec') {
    const body = await read(req);
    const reply = sandbox.context.doPost({ postData: { contents: body, type: req.headers['content-type'] ?? '' } }).getContent();
    const key = Math.random().toString(36).slice(2);
    replies.set(key, reply);
    const parsed = JSON.parse(reply);
    let kind = '?';
    try {
      kind = JSON.parse(body).kind;
    } catch {
      /* not JSON */
    }
    const lead = kind === 'owner' && parsed.ok ? sandbox.table('Owner leads').at(-1) : null;
    console.log(`${new Date().toLocaleTimeString()}  ${kind}  ${reply}${lead ? `  score ${lead.Score} ${lead.Priority}` : ''}`);
    res.writeHead(302, { ...cors, Location: `/echo?key=${key}` });
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/echo') {
    const key = url.searchParams.get('key') ?? '';
    const reply = replies.get(key);
    replies.delete(key);
    return json(reply ? 200 : 404, reply ?? '{"ok":false}');
  }
  if (req.method === 'GET' && url.pathname === '/exec') return json(200, sandbox.context.doGet().getContent());
  if (req.method === 'GET' && url.pathname === '/rows') {
    return json(
      200,
      JSON.stringify({ stay: sandbox.table('Stay requests'), owner: sandbox.table('Owner leads'), emails: sandbox.mails }, null, 2),
    );
  }
  json(404, '{"ok":false,"error":"not-found"}');
});

server.listen(port, () => console.log(`Form sink on http://localhost:${port}/exec (rows at /rows)`));
