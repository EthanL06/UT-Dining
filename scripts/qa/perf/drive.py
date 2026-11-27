import argparse
import json
import os
import subprocess
import time
import urllib.request

BID = 'com.ethanl06.ut-dining.dev'

parser = argparse.ArgumentParser(description='Run the timing scenarios for each harness app.')
parser.add_argument('out', help='directory with app-<name> folders from build.sh')
parser.add_argument('udid', help='temporary simulator UDID')
parser.add_argument('marks', help='marks.jsonl that proxy.mjs writes')
parser.add_argument('names', nargs='+', help='app names to compare, for example base head')
parser.add_argument('--rounds', type=int, default=2, help='visits per app; the order alternates')
parser.add_argument('--profile', default='pass', help='network profile of proxy.mjs for PERF_PROXY=1 apps')
parser.add_argument(
    '--scenarios',
    default='warm:3,foreground:3,full:3,location:3,home:2',
    help='scenario:runs per visit, in order. cold reboots the simulator first. '
    'place-first, place and place-offline open a place photo',
)
args = parser.parse_args()


def post(path, obj):
    req = urllib.request.Request(
        f'http://localhost:9199{path}', data=json.dumps(obj).encode(), method='POST'
    )
    urllib.request.urlopen(req).read()


def sim(*a):
    return subprocess.run(['xcrun', 'simctl', *a], capture_output=True, text=True)


def done(ref, scenario, run):
    if not os.path.exists(args.marks):
        return False
    with open(args.marks) as f:
        for line in f:
            m = json.loads(line)
            if (
                m.get('name') == 'cycle.done'
                and m.get('ref') == ref
                and m.get('scenario') == scenario
                and m.get('run') == run
            ):
                return True
    return False


def cycle(ref, scenario, run, timeout=90):
    sim('terminate', args.udid, BID)
    time.sleep(1.5)
    profile = 'blackhole' if scenario.endswith('-offline') else args.profile
    control = {'mode': 'warm' if scenario == 'cold' else scenario.split('-')[0]}
    if scenario == 'cold':
        sim('shutdown', args.udid)
        sim('boot', args.udid)
        sim('bootstatus', args.udid)
        time.sleep(10)
    post('/set', {'profile': profile, 'ref': ref, 'scenario': scenario, 'run': run, 'control': control})
    t0 = int(time.time() * 1000)
    sim('launch', args.udid, BID)
    post('/marks', [{'name': 'launch', 't': t0}])
    start = time.time()
    while time.time() - start < timeout and not done(ref, scenario, run):
        time.sleep(0.25)
    status = 'done' if done(ref, scenario, run) else 'TIMEOUT'
    print(ref, scenario, run, status, round(time.time() - start, 1), flush=True)


def reinstall(name):
    sim('terminate', args.udid, BID)
    sim('uninstall', args.udid, BID)
    sim('install', args.udid, os.path.join(args.out, f'app-{name}'))
    sim('privacy', args.udid, 'grant', 'all', BID)


run_ids = {}
for r in range(args.rounds):
    order = args.names if r % 2 == 0 else list(reversed(args.names))
    for name in order:
        reinstall(name)
        cycle(name, 'prime', r, timeout=180)
        for spec in args.scenarios.split(','):
            scenario, runs = spec.split(':')
            for _ in range(int(runs)):
                key = (name, scenario)
                run_ids[key] = run_ids.get(key, -1) + 1
                cycle(name, scenario, run_ids[key], timeout=180 if scenario == 'full' else 90)
sim('terminate', args.udid, BID)
print('ALL DONE', flush=True)
