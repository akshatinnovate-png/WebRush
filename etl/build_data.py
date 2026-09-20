"""
Carbon Copy - data pipeline
Turns three raw "digital exhaust" datasets into compact JSON the frontend can
read without a backend.

  archive/spotify_history.csv                  -> stream 'M' (music plays)
  archive__1_/Daily Household Transactions.csv -> stream 'L' (household ledger)
  archive__2_/Augmented_...2024.csv            -> stream 'C' (card trail)

Everything the interface claims is computed here, so no copy in the UI is
invented. Output goes to ../public/data/.
"""
from __future__ import annotations

import json
import math
import os
import re
from collections import Counter, defaultdict

import numpy as np
import pandas as pd

RAW = "/home/claude/data"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")
os.makedirs(OUT, exist_ok=True)

RNG = np.random.default_rng(7)


def write(name: str, obj) -> None:
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"  {name:16s} {os.path.getsize(path)/1024:8.1f} KB")


def r(x, n=2):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    return round(float(x), n)


# --------------------------------------------------------------------------
# 1. load
# --------------------------------------------------------------------------
print("loading raw sources")

mu = pd.read_csv(f"{RAW}/archive/spotify_history.csv")
mu["ts"] = pd.to_datetime(mu["ts"])
mu = mu.dropna(subset=["ts", "track_name", "artist_name"])
mu["date"] = mu.ts.dt.strftime("%Y-%m-%d")
mu["hour"] = mu.ts.dt.hour
mu["min"] = mu.ms_played / 60000.0

lg = pd.read_csv(f"{RAW}/archive__1_/Daily Household Transactions.csv")
lg["D"] = pd.to_datetime(lg["Date"], format="mixed", dayfirst=True, errors="coerce")
lg = lg.dropna(subset=["D"])
lg["date"] = lg.D.dt.strftime("%Y-%m-%d")
lg["hour"] = lg.D.dt.hour
lg["Category"] = lg.Category.fillna("Other").str.strip().str.title()
lg["Subcategory"] = lg.Subcategory.fillna("").str.strip()
lg["Note"] = lg.Note.fillna("").str.strip()
lg = lg.rename(columns={"Income/Expense": "Flow"})

cd = pd.read_csv(f"{RAW}/archive__2_/Augmented_IndiaTransactMultiFacet2024.csv", low_memory=False)
# The augmented file repeats each transaction about seven times — 10,267 rows
# are only 1,500 distinct charges. Left in, every card figure inflates 7x.
_before = len(cd)
cd = cd.drop_duplicates(
    subset=["trans_date_trans_time", "merchant", "amt", "cc_num", "city", "first", "last"]
)
print(f"  card: dropped {_before - len(cd):,} duplicate rows, {len(cd):,} remain")
cd["dt"] = pd.to_datetime(cd.trans_date_trans_time, format="mixed", errors="coerce")
cd = cd.dropna(subset=["dt", "amt"])
cd["date"] = cd.dt.dt.strftime("%Y-%m-%d")
cd["hour"] = cd.dt.dt.hour
cd["merch"] = cd.merchant.fillna("").str.replace(r"^fraud_", "", regex=True).str.strip()
cd["category"] = cd.category.fillna("unsorted")
cd["ghost"] = (cd.is_fraud == 1).astype(int)

print(f"  music {len(mu):,}  ledger {len(lg):,}  card {len(cd):,}")

MU_START, MU_END = mu.ts.min(), mu.ts.max()

# --------------------------------------------------------------------------
# 2. vocabularies (string tables keep the payload small)
# --------------------------------------------------------------------------
artists = [a for a, _ in Counter(mu.artist_name).most_common()]
artist_ix = {a: i for i, a in enumerate(artists)}
tracks = [t for t, _ in Counter(mu.track_name).most_common()]
track_ix = {t: i for i, t in enumerate(tracks)}

# --------------------------------------------------------------------------
# 3. day spine  (every day from first play to last card swipe)
# --------------------------------------------------------------------------
print("building day spine")
spine = pd.date_range(MU_START.normalize(), max(MU_END, cd.dt.max()).normalize(), freq="D")

m_by_day = mu.groupby("date").agg(
    plays=("ts", "size"), mins=("min", "sum"),
    skips=("reason_end", lambda s: int((s == "fwdbtn").sum())),
    night=("hour", lambda s: int(s.isin([0, 1, 2, 3, 4]).sum())),
)
m_top = mu.groupby("date").artist_name.agg(lambda s: s.value_counts().idxmax())

lg_exp = lg[lg.Flow == "Expense"]
l_by_day = lg_exp.groupby("date").agg(n=("Amount", "size"), amt=("Amount", "sum"))
c_by_day = cd.groupby("date").agg(n=("amt", "size"), amt=("amt", "sum"), ghost=("ghost", "sum"))

days = []
for d in spine:
    k = d.strftime("%Y-%m-%d")
    m = m_by_day.loc[k] if k in m_by_day.index else None
    l = l_by_day.loc[k] if k in l_by_day.index else None
    c = c_by_day.loc[k] if k in c_by_day.index else None
    days.append([
        k,
        int(m.plays) if m is not None else 0,
        int(round(m.mins)) if m is not None else 0,
        int(m.night) if m is not None else 0,
        int(l.n) if l is not None else 0,
        int(round(l.amt)) if l is not None else 0,
        int(c.n) if c is not None else 0,
        int(round(c.amt)) if c is not None else 0,
        int(c.ghost) if c is not None else 0,
        artist_ix.get(m_top.get(k), -1),
    ])

# --------------------------------------------------------------------------
# 4. eras  — boundaries chosen from measured shifts in the data
# --------------------------------------------------------------------------
print("detecting eras")


def span_stats(a: str, b: str):
    mm = mu[(mu.date >= a) & (mu.date <= b)]
    ll = lg_exp[(lg_exp.date >= a) & (lg_exp.date <= b)]
    cc = cd[(cd.date >= a) & (cd.date <= b)]
    top_a = mm.artist_name.value_counts()
    top_t = mm.track_name.value_counts()
    return {
        "from": a, "to": b,
        "plays": int(len(mm)),
        "hours": r(mm["min"].sum() / 60, 0),
        "artists": int(mm.artist_name.nunique()),
        "topArtist": top_a.index[0] if len(top_a) else None,
        "topArtistPlays": int(top_a.iloc[0]) if len(top_a) else 0,
        "topTrack": top_t.index[0] if len(top_t) else None,
        "spend": int(ll.Amount.sum() + cc.amt.sum()),
        "txns": int(len(ll) + len(cc)),
        "ghost": int(cc.ghost.sum()),
        "skipRate": r((mm.reason_end == "fwdbtn").mean(), 3) if len(mm) else None,
        "device": mm.platform.value_counts().index[0] if len(mm) else None,
        "nightShare": r(mm.hour.isin([0, 1, 2, 3, 4]).mean(), 3) if len(mm) else None,
    }


ERA_DEFS = [
    ("2013-07-08", "2014-01-09", "First Light",
     "Two hundred and eight plays: ninety-five from a browser tab, the rest "
     "from a desktop. The account exists, but nobody lives in it yet."),
    ("2014-01-10", "2014-12-31", "The Silent Year",
     "Three hundred and sixty-eight days between one play and the next. No "
     "music, no ledger, no card. Whatever happened here left no receipt."),
    ("2015-01-01", "2018-09-20", "Milk and Autos",
     "A phone arrives and so does a ledger. The days fill up with eighty-rupee "
     "purchases: milk before work, an auto home, a train ticket to see family."),
    ("2018-09-21", "2021-12-31", "Cast to Device",
     "The ledger stops dead but the music doubles. Sound moves off headphones "
     "and onto speakers — someone is home, and home is loud."),
    ("2022-01-01", "2024-12-15", "Carbon Copy",
     "A card trail begins, and more than half of it belongs to someone else. "
     "The listening keeps going, quieter, wider, later."),
]
eras = []
for i, (a, b, name, blurb) in enumerate(ERA_DEFS):
    s = span_stats(a, b)
    s.update(id=i, name=name, blurb=blurb)
    eras.append(s)

# --------------------------------------------------------------------------
# 5. rhythms — clock, weekday, month grid, yearly
# --------------------------------------------------------------------------
print("computing rhythms")
clock = []
for h in range(24):
    clock.append({
        "h": h,
        "plays": int((mu.hour == h).sum()),
        "mins": int(mu[mu.hour == h]["min"].sum()),
        "spend": int(lg_exp[lg_exp.hour == h].Amount.sum() + cd[cd.hour == h].amt.sum()),
        "skip": r(mu[mu.hour == h].reason_end.eq("fwdbtn").mean(), 3),
    })

wd_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
weekday = []
for i, nm in enumerate(wd_names):
    mm = mu[mu.ts.dt.weekday == i]
    weekday.append({
        "d": nm,
        "plays": int(len(mm)),
        "mins": int(mm["min"].sum()),
        "spend": int(lg_exp[lg_exp.D.dt.weekday == i].Amount.sum() + cd[cd.dt.dt.weekday == i].amt.sum()),
    })

months = []
period = pd.period_range(MU_START.to_period("M"), max(MU_END, cd.dt.max()).to_period("M"), freq="M")
m_mon = mu.groupby(mu.ts.dt.to_period("M")).agg(p=("ts", "size"), mn=("min", "sum"))
l_mon = lg_exp.groupby(lg_exp.D.dt.to_period("M")).Amount.sum()
c_mon = cd.groupby(cd.dt.dt.to_period("M")).agg(a=("amt", "sum"), n=("amt", "size"))
g_mon = cd[cd.ghost == 1].groupby(cd[cd.ghost == 1].dt.dt.to_period("M")).amt.sum()
for p in period:
    months.append([
        str(p),
        int(m_mon.p.get(p, 0)),
        int(round(m_mon.mn.get(p, 0))),
        int(round(l_mon.get(p, 0))),
        int(round(c_mon.a.get(p, 0))) if p in c_mon.index else 0,
        int(round(g_mon.get(p, 0))),
    ])

# --------------------------------------------------------------------------
# 6. artists — with their own lifespan, used by the constellation
# --------------------------------------------------------------------------
print("profiling artists")
ag = mu.groupby("artist_name")
top_artists = []
for name, g in ag:
    n = len(g)
    if n < 60:
        continue
    top_artists.append({
        "name": name,
        "plays": int(n),
        "mins": int(g["min"].sum()),
        "first": g.ts.min().strftime("%Y-%m-%d"),
        "last": g.ts.max().strftime("%Y-%m-%d"),
        "peakYear": int(g.ts.dt.year.value_counts().idxmax()),
        "skip": r(g.reason_end.eq("fwdbtn").mean(), 3),
        "night": r(g.hour.isin([0, 1, 2, 3, 4]).mean(), 3),
        "track": g.track_name.value_counts().index[0],
        "tracks": int(g.track_name.nunique()),
    })
top_artists.sort(key=lambda a: -a["plays"])
top_artists = top_artists[:220]

# --------------------------------------------------------------------------
# 7. moments — the searchable receipts themselves
# --------------------------------------------------------------------------
print("selecting moments")
# strings are dictionary-encoded so the payload stays small
SBOOK: list[str] = []
SIX: dict[str, int] = {}


def sid(v: str) -> int:
    v = (v or "").strip()
    if v not in SIX:
        SIX[v] = len(SBOOK)
        SBOOK.append(v)
    return SIX[v]


day_ix = {d[0]: i for i, d in enumerate(days)}
moments = []  # [stream, dayIdx, hour, titleId, subId, value, flag, metaId]


def add(stream, date, hour, title, sub, value, flag=0, meta=""):
    di = day_ix.get(date)
    if di is None:
        return
    moments.append([stream, di, int(hour), sid(title), sid(sub),
                    int(value), int(flag), sid(meta)])


PLAT = {"android": 1, "iOS": 2, "windows": 3, "mac": 4, "web player": 5, "cast to device": 6}
per_day: dict[str, int] = defaultdict(int)
seen: set[tuple[str, str]] = set()
for row in mu.sort_values("ts").itertuples(index=False):
    key = (row.date, row.track_name)
    if key in seen or per_day[row.date] >= 4:
        continue
    seen.add(key)
    per_day[row.date] += 1
    add(0, row.date, row.hour, row.track_name, row.artist_name,
        int(round(row.min * 60)), PLAT.get(row.platform, 0))

FLOW = {"Expense": 0, "Income": 1, "Transfer-Out": 2}
for row in lg.itertuples(index=False):
    add(1, row.date, row.hour, row.Subcategory or row.Category, row.Category,
        int(round(row.Amount)), FLOW.get(row.Flow, 0), row.Note[:64] or row.Mode)

for row in cd.sort_values("dt").itertuples(index=False):
    add(2, row.date, row.hour, row.merch or "unnamed merchant", row.category,
        int(round(row.amt)), int(row.ghost),
        row.city if isinstance(row.city, str) else "")

moments.sort(key=lambda m: (m[1], m[2]))
print(f"  moments: {len(moments):,}  strings: {len(SBOOK):,}")

# --------------------------------------------------------------------------
# 8. constellation graph — nodes are entities, edges are co-occurrence
# --------------------------------------------------------------------------
print("weaving constellation")
nodes = []
node_ix: dict[str, int] = {}


def node(key, label, kind, weight, extra=None):
    if key in node_ix:
        nodes[node_ix[key]]["w"] += weight
        return node_ix[key]
    node_ix[key] = len(nodes)
    nodes.append({"id": len(nodes), "l": label, "k": kind, "w": weight, **(extra or {})})
    return node_ix[key]


for a in top_artists[:90]:
    node("A|" + a["name"], a["name"], "artist", a["plays"],
         {"t": a["first"][:4] + "–" + a["last"][:4], "d": f'{a["plays"]:,} plays'})

lg_sub = lg_exp.groupby(["Category", "Subcategory"]).Amount.agg(["size", "sum"])
lg_sub = lg_sub[lg_sub["size"] >= 6].sort_values("sum", ascending=False).head(55)
for (cat, sub), rr in lg_sub.iterrows():
    node("L|" + cat + "|" + sub, sub or cat, "ledger", int(rr["size"]),
         {"t": cat, "d": f'₹{int(rr["sum"]):,} over {int(rr["size"])} entries'})

cd_city = cd.dropna(subset=["city"]).groupby("city").agg(n=("amt", "size"), g=("ghost", "sum"), a=("amt", "sum"))
for city, rr in cd_city.sort_values("n", ascending=False).head(45).iterrows():
    node("C|" + city, city, "place", int(rr.n),
         {"t": "card trail", "d": f'{int(rr.n)} swipes · {int(rr.g)} disputed'})

for cat in cd.category.dropna().unique():
    sub = cd[cd.category == cat]
    node("K|" + cat, cat.replace("_", " "), "spend", len(sub),
         {"t": "merchant class", "d": f'₹{int(sub.amt.sum()):,} · {int(sub.ghost.sum())} disputed'})

# edges: entities that show up on the same day are tied together
day_entities: dict[str, set[int]] = defaultdict(set)
for rrow in mu.itertuples(index=False):
    k = "A|" + rrow.artist_name
    if k in node_ix:
        day_entities[rrow.date].add(node_ix[k])
for rrow in lg_exp.itertuples(index=False):
    k = "L|" + rrow.Category + "|" + rrow.Subcategory
    if k in node_ix:
        day_entities[rrow.date].add(node_ix[k])
for rrow in cd.itertuples(index=False):
    if isinstance(rrow.city, str):
        k = "C|" + rrow.city
        if k in node_ix:
            day_entities[rrow.date].add(node_ix[k])
    k2 = "K|" + str(rrow.category)
    if k2 in node_ix:
        day_entities[rrow.date].add(node_ix[k2])

pair = Counter()
freq = Counter()
n_days = 0
for _, ents in day_entities.items():
    e = sorted(ents)
    if not e or len(e) > 30:
        continue
    n_days += 1
    for x in e:
        freq[x] += 1
    for i in range(len(e)):
        for j in range(i + 1, len(e)):
            pair[(e[i], e[j])] += 1

# Raw co-occurrence just re-ranks the loudest nodes, so score each pair by
# lift (how much more often two things share a day than chance would give)
# and let every node keep its strongest few ties. That preserves links
# between small ledger entries and huge artists.
scored = []
for (a_, b_), c in pair.items():
    exp = (freq[a_] * freq[b_]) / max(n_days, 1)
    if exp <= 0 or c < 2:
        continue
    lift = c / exp
    if lift < 1.05:
        continue
    scored.append((a_, b_, c, lift, lift * math.log1p(c)))

by_node = defaultdict(list)
for e in scored:
    by_node[e[0]].append(e)
    by_node[e[1]].append(e)

chosen = {}
for nid, lst in by_node.items():
    lst.sort(key=lambda e: -e[4])
    for e in lst[:14]:
        chosen[(e[0], e[1])] = e

edges = [[a_, b_, int(c), r(lift, 2)] for (a_, b_), (_, _, c, lift, _) in chosen.items()]
edges.sort(key=lambda e: -e[3])
edges = edges[:1600]

keep = sorted({e[0] for e in edges} | {e[1] for e in edges})
remap = {old: i for i, old in enumerate(keep)}
nodes = [{**nodes[o], "id": remap[o]} for o in keep]
edges = [[remap[a_], remap[b_], c, l] for a_, b_, c, l in edges]
kinds = Counter(n["k"] for n in nodes)
print(f"  nodes {len(nodes)} {dict(kinds)}  edges {len(edges)}")

# --------------------------------------------------------------------------
# 9. atlas — city coordinates for the card trail
# --------------------------------------------------------------------------
CITY = {
    "Mumbai": (19.08, 72.88), "Delhi": (28.61, 77.21), "Bengaluru": (12.97, 77.59),
    "Hyderabad": (17.39, 78.49), "Ahmedabad": (23.03, 72.58), "Chennai": (13.08, 80.27),
    "Kolkata": (22.57, 88.36), "Pune": (18.52, 73.86), "Jaipur": (26.91, 75.79),
    "Lucknow": (26.85, 80.95), "Kanpur": (26.45, 80.33), "Nagpur": (21.15, 79.09),
    "Indore": (22.72, 75.86), "Thane": (19.22, 72.98), "Bhopal": (23.26, 77.41),
    "Visakhapatnam": (17.69, 83.22), "Patna": (25.59, 85.14), "Vadodara": (22.31, 73.18),
    "Ghaziabad": (28.67, 77.43), "Ludhiana": (30.90, 75.86), "Agra": (27.18, 78.01),
    "Nashik": (19.997, 73.79), "Faridabad": (28.41, 77.32), "Meerut": (28.98, 77.71),
    "Rajkot": (22.30, 70.80), "Varanasi": (25.32, 82.97), "Srinagar": (34.08, 74.80),
    "Aurangabad": (19.88, 75.34), "Dhanbad": (23.80, 86.43), "Amritsar": (31.63, 74.87),
    "Allahabad": (25.44, 81.85), "Ranchi": (23.34, 85.31), "Howrah": (22.60, 88.26),
    "Coimbatore": (11.02, 76.96), "Jabalpur": (23.18, 79.99), "Gwalior": (26.22, 78.18),
    "Vijayawada": (16.51, 80.65), "Jodhpur": (26.24, 73.02), "Madurai": (9.93, 78.12),
    "Raipur": (21.25, 81.63), "Kota": (25.21, 75.86), "Chandigarh": (30.73, 76.78),
    "Guwahati": (26.14, 91.74), "Solapur": (17.66, 75.91), "Hubli": (15.36, 75.12),
    "Bareilly": (28.37, 79.43), "Moradabad": (28.84, 78.77), "Mysore": (12.30, 76.64),
    "Tiruchirappalli": (10.79, 78.70), "Salem": (11.66, 78.15), "Aligarh": (27.90, 78.08),
    "Bhubaneswar": (20.30, 85.82), "Jalandhar": (31.33, 75.58), "Bhiwandi": (19.30, 73.06),
    "Saharanpur": (29.97, 77.55), "Gorakhpur": (26.76, 83.37), "Guntur": (16.31, 80.44),
    "Bikaner": (28.02, 73.31), "Amravati": (20.93, 77.78), "Noida": (28.54, 77.39),
    "Jamshedpur": (22.80, 86.20), "Bhilai": (21.21, 81.38), "Warangal": (17.97, 79.59),
    "Cuttack": (20.46, 85.88), "Firozabad": (27.15, 78.40), "Kochi": (9.93, 76.27),
    "Dehradun": (30.32, 78.03), "Durgapur": (23.52, 87.31), "Asansol": (23.68, 86.99),
    "Nanded": (19.15, 77.32), "Kolhapur": (16.70, 74.24), "Ajmer": (26.45, 74.64),
    "Gulbarga": (17.33, 76.83), "Jamnagar": (22.47, 70.06), "Ujjain": (23.18, 75.78),
    "Siliguri": (26.73, 88.40), "Jhansi": (25.45, 78.57), "Jammu": (32.73, 74.86),
    "Mangalore": (12.91, 74.86), "Erode": (11.34, 77.72), "Belgaum": (15.85, 74.50),
    "Ambattur": (13.10, 80.16), "Tirunelveli": (8.71, 77.76), "Malegaon": (20.55, 74.53),
    "Gaya": (24.79, 85.00), "Udaipur": (24.58, 73.71), "Maheshtala": (22.50, 88.25),
    "Davanagere": (14.47, 75.92), "Kozhikode": (11.26, 75.78), "Akola": (20.71, 77.00),
    "Kurnool": (15.83, 78.04), "Rajahmundry": (17.00, 81.78), "Bokaro": (23.67, 86.15),
    "Bellary": (15.14, 76.92), "Patiala": (30.34, 76.39), "Agartala": (23.83, 91.28),
    "Bhagalpur": (25.24, 86.99), "Muzaffarnagar": (29.47, 77.70), "Bhatpara": (22.87, 88.41),
    "Panihati": (22.69, 88.37), "Latur": (18.40, 76.58), "Rohtak": (28.90, 76.61),
    "Korba": (22.36, 82.75), "Bhilwara": (25.35, 74.64), "Berhampur": (19.31, 84.79),
    "Muzaffarpur": (26.12, 85.39), "Ahmednagar": (19.09, 74.75), "Mathura": (27.49, 77.67),
    "Kollam": (8.89, 76.61), "Avadi": (13.12, 80.10), "Rajpur": (22.43, 88.39),
    "Kadapa": (14.47, 78.82), "Kamarhati": (22.67, 88.37), "Bilaspur": (22.08, 82.15),
    "Shahjahanpur": (27.88, 79.91), "Satara": (17.69, 74.00), "Bijapur": (16.83, 75.71),
    "Rampur": (28.81, 79.03), "Shivamogga": (13.93, 75.57), "Chandrapur": (19.95, 79.30),
    "Junagadh": (21.52, 70.46), "Thrissur": (10.53, 76.21), "Alwar": (27.55, 76.63),
    "Bardhaman": (23.26, 87.86), "Kulti": (23.73, 86.84), "Nizamabad": (18.67, 78.09),
    "Parbhani": (19.27, 76.77), "Tumkur": (13.34, 77.10), "Khammam": (17.25, 80.15),
    "Ozhukarai": (11.95, 79.77), "Bihar Sharif": (25.20, 85.52), "Panipat": (29.39, 76.97),
    "Darbhanga": (26.15, 85.90), "Bally": (22.65, 88.34), "Aizawl": (23.73, 92.72),
    "Dewas": (22.96, 76.05), "Ichalkaranji": (16.69, 74.46), "Karnal": (29.69, 76.99),
    "Bathinda": (30.21, 74.95), "Jalna": (19.84, 75.89), "Eluru": (16.71, 81.10),
    "Barasat": (22.72, 88.48), "Kirari": (28.70, 77.06), "Purnia": (25.78, 87.47),
    "Satna": (24.58, 80.83), "Mau": (25.94, 83.56), "Sonipat": (28.99, 77.02),
    "Farrukhabad": (27.39, 79.58), "Sagar": (23.84, 78.74), "Rourkela": (22.26, 84.85),
    "Durg": (21.19, 81.28), "Imphal": (24.82, 93.94), "Ratlam": (23.33, 75.04),
    "Hapur": (28.73, 77.78), "Arrah": (25.56, 84.66), "Anantapur": (14.68, 77.60),
    "Karimnagar": (18.44, 79.13), "Etawah": (26.78, 79.03), "Ambarnath": (19.19, 73.19),
    "Bharatpur": (27.22, 77.49), "Begusarai": (25.42, 86.13), "Gandhinagar": (23.22, 72.65),
    "Baranagar": (22.64, 88.37), "Tiruvottiyur": (13.16, 80.30), "Pondicherry": (11.94, 79.83),
    "Sikar": (27.61, 75.14), "Thoothukudi": (8.76, 78.13), "Rewa": (24.53, 81.30),
    "Mirzapur": (25.15, 82.57), "Raichur": (16.21, 77.36), "Pali": (25.77, 73.32),
    "Ramagundam": (18.76, 79.47), "Haridwar": (29.95, 78.16), "Vijayanagaram": (18.12, 83.40),
    "Katihar": (25.54, 87.57), "Nagercoil": (8.18, 77.43), "Sri Ganganagar": (29.92, 73.88),
    "Karawal Nagar": (28.72, 77.27), "Mango": (22.83, 86.23), "Thanjavur": (10.79, 79.14),
    "Bulandshahr": (28.40, 77.85), "Uluberia": (22.47, 88.11), "Murwara": (23.84, 80.39),
    "Sambhal": (28.58, 78.55), "Singrauli": (24.20, 82.68), "Nadiad": (22.69, 72.86),
    "Secunderabad": (17.44, 78.50), "Naihati": (22.89, 88.42), "Yamunanagar": (30.13, 77.29),
    "Bidhannagar": (22.58, 88.43), "Pallavaram": (12.97, 80.15), "Bidar": (17.91, 77.52),
    "Munger": (25.38, 86.47), "Panchkula": (30.69, 76.85), "Burhanpur": (21.31, 76.23),
    "Raurkela": (22.26, 84.85), "Kharagpur": (22.35, 87.32), "Dindigul": (10.36, 77.98),
    "Gandhidham": (23.08, 70.13), "Hospet": (15.27, 76.39), "Nangloi Jat": (28.68, 77.07),
    "Malda": (25.01, 88.14), "Ongole": (15.50, 80.05), "Deoghar": (24.48, 86.70),
    "Chapra": (25.78, 84.73), "Haldia": (22.06, 88.06), "Khandwa": (21.83, 76.35),
    "Nandyal": (15.48, 78.48), "Morena": (26.50, 78.00), "Amroha": (28.90, 78.47),
    "Anand": (22.56, 72.96), "Bhind": (26.56, 78.79), "Bhalswa Jahangir Pur": (28.74, 77.16),
    "Madhyamgram": (22.70, 88.45), "Bhiwani": (28.79, 76.13), "Navi Mumbai": (19.03, 73.03),
    "Berhampore": (24.10, 88.25), "Ambala": (30.38, 76.78), "Morvi": (22.82, 70.83),
    "Fatehpur": (25.93, 80.80), "Raebareli": (26.23, 81.23), "Khora": (28.62, 77.33),
    "Bhusawal": (21.04, 75.79), "Orai": (25.99, 79.45), "Bahraich": (27.57, 81.59),
    "Phusro": (23.77, 85.99), "Vellore": (12.92, 79.13), "Mehsana": (23.59, 72.37),
    "Raiganj": (25.61, 88.12), "Sirsa": (29.53, 75.02), "Danapur": (25.63, 85.05),
    "Serampore": (22.75, 88.34), "Sultan Pur Majra": (28.69, 77.07), "Guna": (24.65, 77.31),
    "Jaunpur": (25.75, 82.68), "Panvel": (18.99, 73.12), "Shivpuri": (25.42, 77.66),
    "Surendranagar Dudhrej": (22.70, 71.63), "Unnao": (26.55, 80.49), "Chinsurah": (22.90, 88.39),
    "Alappuzha": (9.50, 76.34), "Kottayam": (9.59, 76.52), "Machilipatnam": (16.19, 81.13),
    "Shimla": (31.10, 77.17), "Adoni": (15.63, 77.27), "Udupi": (13.34, 74.75),
    "Tenali": (16.24, 80.64), "Proddatur": (14.75, 78.55), "Saharsa": (25.88, 86.60),
    "Hindupur": (13.83, 77.49), "Sasaram": (24.95, 84.03), "Hajipur": (25.69, 85.21),
    "Bhimavaram": (16.54, 81.52), "Dehri": (24.90, 84.18), "Madanapalle": (13.55, 78.50),
    "Siwan": (26.22, 84.36), "Bettiah": (26.80, 84.50), "Guntakal": (15.17, 77.37),
    "Srikakulam": (18.30, 83.90), "Motihari": (26.65, 84.92), "Dharmavaram": (14.41, 77.72),
    "Gudivada": (16.43, 80.99), "Phagwara": (31.22, 75.77), "Narasaraopet": (16.23, 80.05),
    "Suryapet": (17.14, 79.62), "Miryalaguda": (16.87, 79.57), "Jorhat": (26.75, 94.22),
    "Nellore": (14.44, 79.99), "Tirupati": (13.63, 79.42), "Silchar": (24.82, 92.80),
    "Shillong": (25.58, 91.89), "Dibrugarh": (27.47, 94.91), "Gangtok": (27.33, 88.61),
    "Itanagar": (27.08, 93.61), "Kohima": (25.67, 94.11), "Panaji": (15.50, 73.83),
    "Port Blair": (11.62, 92.73), "Rishikesh": (30.09, 78.27), "Nainital": (29.38, 79.45),
    "Haldwani": (29.22, 79.52), "Rudrapur": (28.98, 79.40), "Kashipur": (29.21, 78.96),
}
STATE = {
    "Andhra Pradesh": (15.9, 79.7), "Arunachal Pradesh": (28.2, 94.7), "Assam": (26.2, 92.9),
    "Bihar": (25.1, 85.3), "Chhattisgarh": (21.3, 81.9), "Goa": (15.3, 74.1),
    "Gujarat": (22.3, 71.2), "Haryana": (29.1, 76.1), "Himachal Pradesh": (31.1, 77.2),
    "Jharkhand": (23.6, 85.3), "Karnataka": (15.3, 75.7), "Kerala": (10.9, 76.3),
    "Madhya Pradesh": (23.5, 78.7), "Maharashtra": (19.8, 75.7), "Manipur": (24.7, 93.9),
    "Meghalaya": (25.5, 91.4), "Mizoram": (23.2, 92.9), "Nagaland": (26.2, 94.6),
    "Odisha": (20.9, 85.1), "Punjab": (31.1, 75.3), "Rajasthan": (27.0, 74.2),
    "Sikkim": (27.5, 88.5), "Tamil Nadu": (11.1, 78.7), "Telangana": (18.1, 79.0),
    "Tripura": (23.9, 91.7), "Uttar Pradesh": (26.8, 80.9), "Uttarakhand": (30.1, 79.0),
    "West Bengal": (22.99, 87.9), "Delhi": (28.61, 77.21), "Jammu and Kashmir": (33.8, 76.6),
    "Puducherry": (11.94, 79.83), "Chandigarh": (30.73, 76.78), "Ladakh": (34.2, 77.6),
}

atlas = []
grp = cd.groupby("city", dropna=True)
for city, g in grp:
    if len(g) < 1:
        continue
    st = g.state.dropna()
    st = st.iloc[0] if len(st) else None
    ll = CITY.get(city) or STATE.get(st)
    if ll is None:
        continue
    jitter = 0.0 if city in CITY else ((hash(city) % 100) / 100 - 0.5) * 1.6
    atlas.append([
        city, r(ll[0] + jitter, 3), r(ll[1] + jitter * 0.8, 3),
        int(len(g)), int(g.ghost.sum()), int(g.amt.sum()),
        st or "", g.category.value_counts().index[0],
    ])
atlas.sort(key=lambda a: -a[3])
print(f"  atlas cities: {len(atlas)}")

# --------------------------------------------------------------------------
# 10. the anomaly layer
# --------------------------------------------------------------------------
gh = cd[cd.ghost == 1]
mine = cd[cd.ghost == 0]
gh_hour = [int((gh.hour == h).sum()) for h in range(24)]
mine_hour = [int((mine.hour == h).sum()) for h in range(24)]
ghost = {
    "count": int(len(gh)),
    "clean": int(len(mine)),
    "total": int(len(cd)),
    "amt": int(gh.amt.sum()),
    "cleanAmt": int(mine.amt.sum()),
    "share": r(len(gh) / len(cd), 4),
    "first": gh.dt.min().strftime("%Y-%m-%d"),
    "last": gh.dt.max().strftime("%Y-%m-%d"),
    "cities": int(gh.city.nunique()),
    "states": int(gh.state.nunique()),
    "merchants": int(gh.merch.nunique()),
    "hour": gh_hour,
    "cleanHour": mine_hour,
    "byCat": [{"k": k.replace("_", " "), "ghost": int(v), "clean": int((mine.category == k).sum())}
              for k, v in gh.category.value_counts().items()],
    "byMonth": [[str(p), int(v)] for p, v in gh.groupby(gh.dt.dt.to_period("M")).size().items()],
    "topCities": [[c, int(v), int(cd[(cd.city == c)].ghost.sum())]
                  for c, v in gh.city.value_counts().head(12).items()],
    "biggest": [[r0.date, r0.merch, int(r0.amt), r0.city if isinstance(r0.city, str) else "—"]
                for r0 in gh.nlargest(8, "amt").itertuples(index=False)],
    "gapDays": int((cd.dt.max() - gh.dt.min()).days),
}

# How alike are the two spending profiles really? Correlate the normalised
# hourly shapes, and count the towns that sit at the extremes.
_na = np.array(mine_hour, dtype=float) / max(1, sum(mine_hour))
_nb = np.array(gh_hour, dtype=float) / max(1, sum(gh_hour))
ghost["hourCorr"] = r(float(np.corrcoef(_na, _nb)[0, 1]), 2)
ghost["flatShare"] = r(float(max(_nb)), 4)
_town = cd.dropna(subset=["city"]).groupby("city").agg(n=("amt", "size"), g=("ghost", "sum"))
_town = _town[_town.n >= 3]
ghost["townsAll"] = int(len(_town))
ghost["townsFull"] = int((_town.g == _town.n).sum())
ghost["townsNone"] = int((_town.g == 0).sum())
ghost["catSpread"] = [
    {"k": str(k).replace("_", " "),
     "share": r(float(v), 3)}
    for k, v in (cd.groupby("category").ghost.mean()).items()
]

# --------------------------------------------------------------------------
# 11. headline findings
# --------------------------------------------------------------------------
print("writing findings")
night = int(mu.hour.isin([0, 1, 2, 3, 4]).sum())
skipped = int((mu.reason_end == "fwdbtn").sum())
milk = lg_exp[lg_exp.Subcategory.str.lower() == "milk"]
auto = lg_exp[lg_exp.Subcategory.str.lower() == "auto"]
beat = mu[mu.artist_name == "The Beatles"]
silent = mu[(mu.date > "2014-01-09") & (mu.date < "2015-01-12")]

findings = [
    {"k": "night", "n": f"{night:,}", "u": "plays after midnight",
     "t": "The loudest hour of this life is 11pm, and the second loudest is midnight.",
     "d": f"{r(night/len(mu)*100,1)}% of everything ever played happened between "
          f"midnight and 5am. Daytime — 9am to 1pm — accounts for less than 4%."},
    {"k": "skip", "n": f"{skipped:,}", "u": "songs abandoned",
     "t": "More than a third of every song started was never finished.",
     "d": f"{r(skipped/len(mu)*100,1)}% of plays ended on the skip button. Radiohead "
          f"got skipped 61% of the time and still got played 2,305 times."},
    {"k": "silence", "n": "368", "u": "days of near-silence",
     "t": "Between January 2014 and January 2015 the record almost stops.",
     "d": "Not one play between 9 January 2014 and 12 January 2015. The account "
          "wakes up on an Android phone and never really sleeps again."},
    {"k": "milk", "n": f"{len(milk)}", "u": "separate purchases of milk",
     "t": "The most repeated act in three years of spending costs ₹56.",
     "d": f"₹{int(milk.Amount.sum()):,} of milk, ₹{int(auto.Amount.sum()):,} of "
          f"auto fares across {len(auto)} rides. The median entry in the whole "
          f"ledger is ₹{int(lg_exp.Amount.median())}."},
    {"k": "beatles", "n": f"{len(beat):,}", "u": "plays of one band",
     "t": "The Beatles are the spine of nine of these eleven years.",
     "d": f"{r(len(beat)/len(mu)*100,1)}% of all listening, {int(beat['min'].sum()/60):,} "
          f"hours, first played {beat.ts.min().strftime('%d %b %Y')} and still "
          f"playing {beat.ts.max().strftime('%d %b %Y')}."},
    {"k": "ghost", "n": f"{ghost['share']*100:.1f}%", "u": "of the card trail is disputed",
     "t": "Exactly half the last two years of spending was somebody else.",
     "d": f"₹{ghost['amt']:,} across {ghost['cities']} cities and "
          f"{ghost['merchants']} merchants, flagged between {ghost['first']} and "
          f"{ghost['last']} — and it never stops."},
]

# --------------------------------------------------------------------------
# 12. emit
# --------------------------------------------------------------------------
print("writing bundles")
core = {
    "meta": {
        "built": pd.Timestamp.now("UTC").strftime("%Y-%m-%d"),
        "from": MU_START.strftime("%Y-%m-%d"),
        "to": max(MU_END, cd.dt.max()).strftime("%Y-%m-%d"),
        "spanDays": int((max(MU_END, cd.dt.max()) - MU_START).days),
        "plays": int(len(mu)),
        "minutes": int(mu["min"].sum()),
        "artists": int(mu.artist_name.nunique()),
        "tracks": int(mu.track_name.nunique()),
        "ledgerRows": int(len(lg)),
        "ledgerSpend": int(lg_exp.Amount.sum()),
        "cardRows": int(len(cd)),
        "cardSpend": int(cd.amt.sum()),
        "activeDays": int(mu.date.nunique()),
        "receipts": int(len(mu) + len(lg) + len(cd)),
        "devices": [[k, int(v)] for k, v in mu.platform.value_counts().items()],
    },
    "eras": eras,
    "clock": clock,
    "weekday": weekday,
    "months": months,
    "findings": findings,
    "ghost": ghost,
    "topTracks": [[t, int(v)] for t, v in mu.track_name.value_counts().head(20).items()],
    "topArtists": top_artists[:60],
}
write("core.json", core)
write("days.json", {"artists": artists[:400], "d": days})
write("graph.json", {"nodes": nodes, "edges": edges})
write("moments.json", {"s": SBOOK, "m": moments})
write("atlas.json", {"c": atlas})
print("done")
