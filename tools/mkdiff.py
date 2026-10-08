import difflib, html, re, sys, json

old_path, new_path, out_path = sys.argv[1:4]
TITLE = sys.argv[4] if len(sys.argv)>4 else "$BANDWIDTH whitepaper: version 0.1 to version 0.2"
LBEFORE = sys.argv[5] if len(sys.argv)>5 else "Before: v0.1, Aug 23 2021"
LAFTER = sys.argv[6] if len(sys.argv)>6 else "After: v0.2 draft, Oct 8 2026"

def blocks(text):
    """Split markdown into blocks: paragraphs, headers, fenced code, list items."""
    out, buf, fence = [], [], False
    for line in text.splitlines():
        if line.strip().startswith("```"):
            buf.append(line); fence = not fence
            if not fence: out.append("\n".join(buf)); buf = []
            continue
        if fence: buf.append(line); continue
        if line.strip() == "":
            if buf: out.append("\n".join(buf)); buf = []
        else:
            buf.append(line)
    if buf: out.append("\n".join(buf))
    return out

def inline(s):
    s = html.escape(s)
    s = re.sub(r"\[\^([^\]]+)\]:", r'<span class="fnlabel">[\1]</span>', s)
    s = re.sub(r"\[\^([^\]]+)\]", r"<sup>[\1]</sup>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s, flags=re.S)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"(https?://[^\s<)]+)", r'<a href="\1">\1</a>', s)
    return s

def kind(b):
    t = b.lstrip()
    if t.startswith("```"): return "code"
    m = re.match(r"^(#{1,6})\s", t)
    if m: return "h%d" % len(m.group(1))
    if t.startswith(">"): return "quote"
    if re.match(r"^(\d+\.|-)\s", t): return "list"
    if t.startswith("---"): return "hr"
    return "p"

def render(b, body_html=None):
    k = kind(b)
    if k == "hr": return "<hr>"
    if k == "code":
        inner = "\n".join(b.splitlines()[1:-1])
        return "<pre>%s</pre>" % (body_html if body_html is not None else html.escape(inner))
    if k.startswith("h"):
        txt = re.sub(r"^#{1,6}\s+", "", b.strip())
        return "<%s>%s</%s>" % (k, body_html if body_html is not None else inline(txt), k)
    if k == "quote":
        txt = "\n".join(re.sub(r"^>\s?", "", l) for l in b.splitlines())
        paras = [p for p in re.split(r"\n\s*\n", txt) if p.strip()]
        if body_html is not None: return "<blockquote><p>%s</p></blockquote>" % body_html
        return "<blockquote>%s</blockquote>" % "".join("<p>%s</p>" % inline(p) for p in paras)
    if k == "list":
        items = re.split(r"\n(?=(?:\d+\.|-)\s)", b.strip())
        ordered = bool(re.match(r"^\d+\.", items[0]))
        if body_html is not None: return "<p>%s</p>" % body_html
        lis = "".join("<li>%s</li>" % inline(re.sub(r"^(\d+\.|-)\s+", "", i, count=1)) for i in items)
        return ("<ol>%s</ol>" if ordered else "<ul>%s</ul>") % lis
    return "<p>%s</p>" % (body_html if body_html is not None else inline(b))

def plain(b):
    k = kind(b)
    if k == "code": return "\n".join(b.splitlines()[1:-1])
    if k.startswith("h"): return re.sub(r"^#{1,6}\s+", "", b.strip())
    if k == "quote": return "\n".join(re.sub(r"^>\s?", "", l) for l in b.splitlines())
    return b

def tokens(s):
    return re.findall(r"\s+|[A-Za-z0-9$'’_-]+|[^\sA-Za-z0-9]", s)

def word_diff(a, b):
    ta, tb = tokens(a), tokens(b)
    sm = difflib.SequenceMatcher(None, ta, tb, autojunk=False)
    before, after = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        sa, sb = inline("".join(ta[i1:i2])), inline("".join(tb[j1:j2]))
        if op == "equal": before.append(sa); after.append(sb)
        elif op == "delete": before.append("<del>%s</del>" % sa)
        elif op == "insert": after.append("<ins>%s</ins>" % sb)
        else: before.append("<del>%s</del>" % sa); after.append("<ins>%s</ins>" % sb)
    return "".join(before), "".join(after)

A = blocks(open(old_path).read())
B = blocks(open(new_path).read())
norm = lambda s: re.sub(r"\s+", " ", s.strip())
sm = difflib.SequenceMatcher(None, [norm(x) for x in A], [norm(x) for x in B], autojunk=False)

rows = []  # (status, before_html, after_html, anchor_title)
stats = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op == "equal":
        for b in A[i1:i2]:
            rows.append(("same", render(b), render(b))); stats["unchanged"] += 1
        continue
    olds, news = A[i1:i2], B[j1:j2]
    # pair up similar blocks for word-level diff
    used = set()
    pairs = []
    for oi, ob in enumerate(olds):
        best, bj = 0, None
        for nj, nb in enumerate(news):
            if nj in used: continue
            r = difflib.SequenceMatcher(None, plain(ob), plain(nb), autojunk=False).ratio()
            if r > best: best, bj = r, nj
        if bj is not None and best >= 0.45:
            used.add(bj); pairs.append((oi, bj))
    # emit in new-document order, with unpaired deletions placed before the next paired insertion
    pj = dict((bj, oi) for oi, bj in pairs)
    paired_old = set(oi for oi, _ in pairs)
    pending_del = [oi for oi in range(len(olds)) if oi not in paired_old]
    def flush_dels(upto_oi):
        keep = []
        for oi in pending_del:
            if oi < upto_oi:
                rows.append(("removed", render(olds[oi]), "")); stats["removed"] += 1
            else: keep.append(oi)
        pending_del[:] = keep
    for nj, nb in enumerate(news):
        if nj in pj:
            oi = pj[nj]; flush_dels(oi)
            ob = olds[oi]
            bh, ah = word_diff(plain(ob), plain(nb))
            rows.append(("modified", render(ob, bh), render(nb, ah))); stats["modified"] += 1
        else:
            rows.append(("added", "", render(nb))); stats["added"] += 1
    flush_dels(10**9)

def row_html(status, b, a):
    return '<div class="row %s"><div class="cell before">%s</div><div class="cell after">%s</div></div>' % (status, b, a)

body = "\n".join(row_html(*r) for r in rows)

page = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Whitepaper Diff</title>
<meta name="description" content="Before and after comparison of the $BANDWIDTH whitepaper, version 0.1 to version 0.2">
<style>
:root{--bg:#fbfaf7;--fg:#1e1c18;--muted:#6f6a60;--line:#e4e0d6;--panel:#ffffff;
--add-bg:#e6f5ea;--add-fg:#13602c;--add-line:#8fd3a3;--del-bg:#fbe8e6;--del-fg:#8c1f14;--del-line:#f0a79e;
--mod-bg:#fff6dd;--mod-line:#f1d37a;--accent:#b4472e;--code:#f1efe9;}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#15130f;--fg:#ece7dc;--muted:#a19a8c;--line:#2d2922;--panel:#1d1a15;
--add-bg:#12301b;--add-fg:#9be0b0;--add-line:#2e6b40;--del-bg:#3a1613;--del-fg:#f3a79b;--del-line:#7a2d24;
--mod-bg:#332a10;--mod-line:#6e5a1f;--accent:#f08a5d;--code:#24201a;}}
:root[data-theme="dark"]{--bg:#15130f;--fg:#ece7dc;--muted:#a19a8c;--line:#2d2922;--panel:#1d1a15;
--add-bg:#12301b;--add-fg:#9be0b0;--add-line:#2e6b40;--del-bg:#3a1613;--del-fg:#f3a79b;--del-line:#7a2d24;
--mod-bg:#332a10;--mod-line:#6e5a1f;--accent:#f08a5d;--code:#24201a;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 Georgia,"Times New Roman",serif}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 16px}
.wrap{max-width:1400px;margin:0 auto}
h1.title{font-size:1.25rem;margin:0 0 6px;font-weight:600}
.meta{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--muted)}
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);background:var(--panel)}
.sw{width:10px;height:10px;border-radius:2px;display:inline-block}
.sw.add{background:var(--add-line)}.sw.del{background:var(--del-line)}.sw.mod{background:var(--mod-line)}
label.toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin-left:auto}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;padding:6px 16px;font:12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--line)}
main{padding:8px 16px 60px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;border-bottom:1px solid var(--line);padding:6px 0}
.cell{min-width:0;padding:4px 10px;border-radius:6px}
.row.same .cell{opacity:.72}
.row.added .after{background:var(--add-bg);border-left:3px solid var(--add-line)}
.row.removed .before{background:var(--del-bg);border-left:3px solid var(--del-line)}
.row.modified .cell{background:var(--mod-bg);border-left:3px solid var(--mod-line)}
.row.added .before,.row.removed .after{background:repeating-linear-gradient(45deg,transparent 0 6px,var(--line) 6px 7px);opacity:.5}
ins{background:var(--add-bg);color:var(--add-fg);text-decoration:none;border-radius:2px;padding:0 1px}
del{background:var(--del-bg);color:var(--del-fg);text-decoration:line-through;border-radius:2px;padding:0 1px}
.row.modified ins{box-shadow:inset 0 -2px 0 var(--add-line)}
.row.modified del{box-shadow:inset 0 -2px 0 var(--del-line)}
body.changes-only .row.same{display:none}
.cell p{margin:.35em 0}.cell h1,.cell h2,.cell h3{margin:.4em 0 .2em;line-height:1.25}
.cell h1{font-size:1.5rem}.cell h2{font-size:1.2rem}.cell h3{font-size:1.02rem}
blockquote{margin:.3em 0;padding:.2em .8em;border-left:3px solid var(--line);color:var(--fg)}
pre{background:var(--code);padding:8px 10px;border-radius:6px;overflow:auto;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre}
code{background:var(--code);padding:0 3px;border-radius:3px;font:0.92em ui-monospace,SFMono-Regular,Menlo,monospace}
a{color:var(--accent);word-break:break-all}
sup{font-size:.7em}.fnlabel{font-weight:600;color:var(--muted)}
ol,ul{margin:.3em 0;padding-left:1.4em}
hr{border:0;border-top:1px solid var(--line);margin:.5em 0}
@media (max-width:760px){.row,.cols{grid-template-columns:1fr;gap:6px 0}.cols .after-h{display:none}
.row.same .before,.row.removed .after,.row.added .before{display:none}
.row.modified .before{display:none}
.cell::before{display:block;font:11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
.row.removed .before::before{content:"removed"}.row.added .after::before{content:"added"}.row.modified .after::before{content:"modified (strikethrough = old)"}
}
</style></head>
<body class="changes-only">
<header><div class="wrap">
<h1 class="title">%(title)s</h1>
<div class="meta">
<span class="pill"><span class="sw add"></span>%(added)d added</span>
<span class="pill"><span class="sw mod"></span>%(modified)d modified</span>
<span class="pill"><span class="sw del"></span>%(removed)d removed</span>
<span class="pill">%(unchanged)d unchanged</span>
<label class="toggle"><input type="checkbox" id="only" checked> Show changes only</label>
</div></div></header>
<div class="cols wrap"><div>%(lbefore)s</div><div class="after-h">%(lafter)s</div></div>
<main class="wrap">
%(body)s
</main>
<script>
document.getElementById('only').addEventListener('change',function(e){document.body.classList.toggle('changes-only',e.target.checked)});
</script>
</body></html>
"""
open(out_path, "w").write(page % dict(stats, body=body, title=TITLE, lbefore=LBEFORE, lafter=LAFTER))
print(json.dumps(stats))
