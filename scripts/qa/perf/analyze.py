import collections
import json
import statistics
import sys

marks = [json.loads(line) for line in open(sys.argv[1])]
runs = collections.defaultdict(list)
for m in marks:
    runs[(m.get('ref'), m.get('scenario'), m.get('run'))].append(m)
refs = list(dict.fromkeys(k[0] for k in runs if k[0]))


def first(rows, name):
    return next((m for m in rows if m['name'] == name), None)


def dig(obj, path):
    for part in path.split('.'):
        if not isinstance(obj, dict):
            return None
        obj = obj.get(part)
    return obj


values = collections.defaultdict(list)
notes = collections.defaultdict(list)
for (ref, scenario, _run), rows in runs.items():
    launch = first(rows, 'launch')
    if not launch or not first(rows, 'cycle.done'):
        notes[ref].append(f'{scenario} run without cycle.done')
        continue
    t0 = launch['t']
    if scenario in ('warm', 'cold'):
        if first(rows, 'sync.start'):
            notes[ref].append(f'{scenario} run synced; dropped')
            continue
        values[(ref, f'a. {scenario} launch to Home painted (ms)')].append(first(rows, 'home.ready')['t'] - t0)
        values[(ref, f'a. {scenario} launch to JS start (ms)')].append(first(rows, 'js.start')['t'] - t0)
    if scenario == 'prime':
        c = first(rows, 'counts')
        notes[ref].append(f"data: {c['food']} food items, per day {[(d['d'], d['foods']) for d in c['perDay']]}, indexes {c['indexes']}, hermes profiler {c['hermesProfiler']}")
    result = first(rows, 'result')
    if not result:
        continue
    if scenario in ('foreground', 'full'):
        label = 'b' if scenario == 'foreground' else 'c'
        for key, path in [
            ('sync duration (ms)', 'syncMs'),
            ('onDatabaseChange events', 'events'),
            ('Home renders', 'renders.home'),
            ('Home commits', 'commits.home'),
            ('query fetches', 'fetches'),
            ('longest JS gap (ms)', 'maxGapMs'),
            ('JS stall time over 50 ms gaps (ms)', 'stallMsOver50'),
            ('sync start to last Home commit (ms)', 'lastCommitMs'),
        ]:
            v = dig(result, path)
            values[(ref, f'{label}. {key}')].append(v if v is not None else 0)
        writes = [m['ms'] for m in rows if m['name'] == 'sync.dayWrite']
        shared = [m['ms'] for m in rows if m['name'] == 'sync.sharedWrite']
        values[(ref, f'{label}. menu day writes')].append(len(writes))
        values[(ref, f'{label}. shared tables written')].append(len(shared))
        if writes:
            values[(ref, f'{label}. total day write time (ms)')].append(sum(writes))
    if scenario == 'location':
        for key, path in [
            ('open to list painted (ms)', 'openMs'),
            ('getLocationMenuData (ms)', 'getLocationMenuData.median'),
            ('getLocationMenuNames (ms)', 'getLocationMenuNames.median'),
            ('getLocationIdsWithMenus (ms)', 'getLocationIdsWithMenus.median'),
            ('search tab SQL searchToday (ms)', 'searchTodaySql.median'),
            ('longest JS gap while opening (ms)', 'openMaxGapMs'),
        ]:
            v = dig(result, path)
            if v is not None:
                values[(ref, f'd. {key}')].append(v)
        for a in result.get('actions') or []:
            if a.get('ms') is not None:
                values[(ref, f"e. {a['action']}: JS time to painted (ms)")].append(a['ms'])
            values[(ref, f"e. {a['action']}: FoodItemRow renders")].append(a.get('foodRowRenders', 0))
        notes[ref].append(f"location {result.get('loc')} ({result.get('foodsToday')} foods today), search '{result.get('word')}'")

    if scenario.startswith('place') and result.get('metric') == 'place':
        opens = [('first open', result['open'])] if scenario == 'place-first' else []
        if scenario == 'place':
            opens.append(('open after relaunch', result['open']))
        if scenario == 'place-offline':
            opens.append(('open after relaunch, network blocked', result['open']))
        else:
            opens.append(('reopen in the same launch', result['reopen']))
        for label, o in opens:
            if o['ms'] is not None:
                values[(ref, f'f. place photo {label} (ms)')].append(o['ms'])
            values[(ref, f'f. place photo {label}: shown')].append(1 if o['outcome'] == 'loaded' else 0)
        notes[ref].append(f"place {result.get('place')}")
    if scenario == 'home' and result.get('metric') == 'home':
        for a in result['actions']:
            if a['ms'] is not None:
                values[(ref, f"g. {a['action']}: dispatch to painted (ms)")].append(a['ms'])
            if a['renderMs'] is not None:
                values[(ref, f"g. {a['action']}: render to commit (ms)")].append(a['renderMs'])

metrics = list(dict.fromkeys(k[1] for k in values))
metrics.sort(key=lambda m: m[:2])


def fmt(v):
    if not v:
        return '-'
    med = statistics.median(v)
    r = f'{min(v):g}-{max(v):g}'
    return f'{med:g} ({r}, n={len(v)})'


print('| metric | ' + ' | '.join(refs) + ' |')
print('|---|' + '---|' * len(refs))
for metric in metrics:
    print(f'| {metric} | ' + ' | '.join(fmt(values[(ref, metric)]) for ref in refs) + ' |')
print()
for ref in refs:
    for note in sorted(set(notes[ref])):
        print(f'{ref}: {note}')
