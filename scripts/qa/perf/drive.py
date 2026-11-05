import json
import os
import subprocess
import sys
import time
import urllib.request

OUT = os.path.abspath(sys.argv[1])
UDID = sys.argv[2]
MARKS = sys.argv[3]
BID = 'com.ethanl06.ut-dining.dev'


def post(path, obj):
    req = urllib.request.Request(f'http://localhost:9199{path}', data=json.dumps(obj).encode(), method='POST')
    urllib.request.urlopen(req).read()


def sim(*a):
    return subprocess.run(['xcrun', 'simctl', *a], capture_output=True, text=True)


def done(scenario, run):
    if not os.path.exists(MARKS):
        return False
    for line in open(MARKS):
        m = json.loads(line)
        if m.get('name') == 'cycle.done' and m.get('scenario') == scenario and m.get('run') == run:
            return True
    return False


def shot(name):
    sim('io', UDID, 'screenshot', f'{OUT}/shots/{name}.png')


def cycle(scenario, run, profile, control=None, timeout=60, shots=None):
    sim('terminate', UDID, BID)
    time.sleep(1)
    post('/set', {'profile': profile, 'control': control or {}, 'scenario': scenario, 'run': run})
    t0 = int(time.time() * 1000)
    sim('launch', UDID, BID)
    post('/marks', [{'name': 'launch', 't': t0}])
    start = time.time()
    pending = sorted((shots or {}).items(), key=lambda kv: kv[1])
    while time.time() - start < timeout:
        if pending and time.time() - start >= pending[0][1]:
            shot(pending.pop(0)[0])
        if done(scenario, run):
            break
        time.sleep(0.25)
    post('/set', {'traffic': True})
    print(scenario, run, profile, 'done' if done(scenario, run) else 'TIMEOUT', round(time.time() - start, 1), flush=True)
    time.sleep(1)


def reinstall(app):
    sim('terminate', UDID, BID)
    sim('uninstall', UDID, BID)
    sim('install', UDID, f'{OUT}/{app}')
    sim('privacy', UDID, 'grant', 'all', BID)


stale = {'setStale': True}
os.makedirs(f'{OUT}/shots', exist_ok=True)

if len(sys.argv) > 4 and sys.argv[4] == 'nav':
    reinstall('app-proxied')
    cycle('prime', 0, 'pass', {}, timeout=60)
    cycle('nav', 0, 'pass', {'nav': True}, timeout=240)
    sys.exit(0)

reinstall('app-direct')
cycle('direct-first-install', 0, 'pass', stale, timeout=60)
for r in range(7):
    cycle('direct-stale', r, 'pass', stale, timeout=60)
cycle('direct-warm-prime', 0, 'pass', {}, timeout=60)
for r in range(5):
    cycle('direct-warm', r, 'pass', {}, timeout=30, shots={'warm-home': 4} if r == 1 else None)

reinstall('app-proxied')
cycle('prime', 0, 'pass', stale, timeout=60)
for r in range(3):
    cycle('stale-slow', r, 'slow', stale, timeout=120)
for r in range(2):
    cycle('stale-blackhole', r, 'blackhole', stale, timeout=60, shots={'blackhole-3s': 3} if r == 0 else None)
    shot(f'blackhole-end-{r}')
cycle('stale-reconnect', 0, 'pass', stale, timeout=40)
cycle('no-change', 0, 'pass', {**stale, 'dropToday': True}, timeout=40)
cycle('one-day-changed', 0, 'pass', {}, timeout=40)
reinstall('app-proxied')
cycle('install-503', 0, 'fail503', {}, timeout=8)
shot('install-503')
cycle('install-503-next', 0, 'pass', {}, timeout=30)
shot('install-503-next')
reinstall('app-proxied')
cycle('install-blackhole', 0, 'blackhole', {}, timeout=30, shots={'install-blackhole-3s': 3, 'install-blackhole-28s': 28})
reinstall('app-proxied')
cycle('prime2', 0, 'pass', {}, timeout=60)
cycle('nav', 0, 'pass', {'nav': True}, timeout=240)
cycle('sql-write', 0, 'pass', {'sql': True, 'write': True}, timeout=120)
print('ALL DONE', flush=True)
