import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const UP = process.env.UP;
const OUT = process.env.OUT;
const state = { profile: 'pass', control: {}, scenario: 'init', run: 0 };
let traffic = { req: 0, bytes: 0, first: 0, last: 0 };
const profiles = { pass: { lat: 0, bps: 0 }, slow: { lat: 150, bps: 200000 } };
let bucketFree = 0;
const log = (o) => fs.appendFileSync(OUT, `${JSON.stringify(o)}\n`);
const agent = new https.Agent({ keepAlive: true, maxSockets: 16 });
http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/set') {
      let b = '';
      req.on('data', (d) => {
        b += d;
      });
      req.on('end', () => {
        const o = JSON.parse(b);
        if (o.traffic)
          log({ name: 'traffic', scenario: state.scenario, run: state.run, ...traffic });
        Object.assign(state, o);
        delete state.traffic;
        traffic = { req: 0, bytes: 0, first: 0, last: 0 };
        res.end('ok');
      });
      return;
    }
    if (u.pathname === '/control') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(state.control));
    }
    if (u.pathname === '/marks') {
      let b = '';
      req.on('data', (d) => {
        b += d;
      });
      req.on('end', () => {
        for (const m of JSON.parse(b))
          log({ ...m, scenario: state.scenario, run: state.run, profile: state.profile });
        res.end('ok');
      });
      return;
    }
    if (!u.pathname.startsWith('/sb/')) {
      res.statusCode = 404;
      return res.end();
    }
    const p = state.profile;
    traffic.req++;
    traffic.first ||= Date.now();
    if (p === 'blackhole') return;
    if (p === 'reset') return req.socket.destroy();
    if (p === 'fail503') {
      res.statusCode = 503;
      return res.end('{"message":"down"}');
    }
    const { lat, bps } = profiles[p];
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () =>
      setTimeout(() => {
        const h = { ...req.headers };
        delete h.host;
        delete h.connection;
        const up = https.request(
          UP + req.url.slice(3),
          { method: req.method, headers: h, agent },
          (r) => {
            const rh = { ...r.headers };
            delete rh.connection;
            delete rh['transfer-encoding'];
            res.writeHead(r.statusCode, rh);
            r.on('data', (d) => {
              traffic.bytes += d.length;
              if (!bps) {
                res.write(d);
                return;
              }
              const now = Date.now();
              bucketFree = Math.max(bucketFree, now) + (d.length / bps) * 1000;
              r.pause();
              setTimeout(() => {
                res.write(d);
                r.resume();
              }, bucketFree - now);
            });
            r.on('end', () => {
              const fin = () => {
                res.end();
                traffic.last = Date.now();
              };
              bps ? setTimeout(fin, Math.max(0, bucketFree - Date.now()) + lat / 2) : fin();
            });
          },
        );
        up.on('error', () => res.destroy());
        up.end(Buffer.concat(chunks));
      }, lat),
    );
  })
  .listen(9199, () => console.log('up'));
