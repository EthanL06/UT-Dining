import json,statistics as st,collections,sys
M=[json.loads(l) for l in open(sys.argv[1])]
runs=collections.defaultdict(list)
for m in M: runs[(m.get('scenario'),m.get('run'))].append(m)
def first(r,n):
  for m in r:
    if m['name']==n: return m
rows=collections.defaultdict(list)
for k,r in runs.items():
  L=first(r,'launch')
  if not L: continue
  t0=L['t']; d={}
  for n in ['js.start','splash.hide','sync.start','sync.fetched','sync.inserted','home.ready','cycle.done','counts']:
    m=first(r,n)
    if m: d[n]=m['t']-t0
  s=[x['ms'] for x in r if x['name']=='stall']
  d['maxstall']=max(s) if s else 0
  c=first(r,'counts')
  d['food']=c and c['food']; d['loc']=c and c['location']; d['lastSync']=c and (c['lastSync'] and c['lastSync']-t0)
  d['fs']=c and c['accum'].get('filterAndSort')
  d['fetched']=first(r,'sync.fetched') and first(r,'sync.fetched').get('ok')
  t=first(r,'traffic'); d['req']=t and t['req']; d['MB']=t and round(t['bytes']/1e6,2)
  d['nostall']=[x['ms'] for x in r if x['name']=='stall' and x['ms']>200]
  print(k,{a:b for a,b in d.items() if b not in (None,[])})
  rows[k[0]].append(d)
print()
for sc,v in rows.items():
  o={}
  for n in ['js.start','sync.fetched','sync.inserted','home.ready','maxstall','req','MB']:
    a=[x[n] for x in v if x.get(n) is not None]
    if a: o[n]=(st.median(a),min(a),max(a))
  print(sc,len(v),o)
print()
for m in M:
  if m['name'] in('sql.bench','sql.plan','write.bench','db.size'): print({k:v for k,v in m.items() if k not in('t','scenario','run','profile')})
nav=[m for m in M if m.get('scenario')=='nav']
pairs=collections.defaultdict(list); st_={}
for m in nav:
  n=m['name']
  if not n.startswith('nav.'): continue
  p=n.split('.'); key=(p[1],m.get('label'),m.get('loc') or m.get('tab'))
  if p[2]=='start': st_[key]=m['t']
  elif key in st_: pairs[key+(p[2],)].append(m['t']-st_[key])
for k,v in sorted(pairs.items(),key=str): print(k,'median',st.median(v),v)
for m in nav:
  if m['name']=='loc.ready' : pass
print([ (m['ms']) for m in nav if m['name']=='stall'][:60])
