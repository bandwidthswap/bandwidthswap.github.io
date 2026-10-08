#!/bin/sh
# Rebuilds everything the site serves from the sources in paper/ and OPEN-QUESTIONS.md.
#   paper/BANDWIDTH-whitepaper-v0.2.md  ->  docs/paper.html (LaTeX-style, via pandoc + latex.css)
#                                       ->  docs/BANDWIDTH-whitepaper-v0.2.md and .txt (downloads)
#   paper/v0.1.md vs v0.2.md            ->  docs/whitepaper-diff.html (side-by-side)
#   OPEN-QUESTIONS.md                   ->  docs/OPEN-QUESTIONS.md
# Needs: pandoc, python3. Run from anywhere; then commit and push to deploy.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/paper/BANDWIDTH-whitepaper-v0.2.md"
docs="$root/docs"
mkdir -p "$docs"
cp "$src" "$docs/BANDWIDTH-whitepaper-v0.2.md"
cp "$src" "$docs/BANDWIDTH-whitepaper-v0.2.txt"
cp "$root/OPEN-QUESTIONS.md" "$docs/OPEN-QUESTIONS.md"

python3 -I - "$src" > "$docs/.paper-body.md" <<'PY'
import sys,re
s=open(sys.argv[1]).read()
body=s.split("\n---\n",1)[1]
head,rest=body.split("\n## 1. ",1)
paras=[p for p in head.strip().split("\n\n") if p.strip()]
rev=[p for p in paras if p.startswith("*Version")]
abst=[p for p in paras if not p.startswith("*Version")]
def unitalic(p):
    p=re.sub(r"^\*\*Abstract\.\*\*\s*","",p.strip())
    return p[1:-1] if p.startswith("*") and p.endswith("*") else p
out=""
if rev: out+="::: {.revnote}\n"+rev[0].strip("*")+"\n:::\n\n"
out+="::: {.abstract}\n"+"\n\n".join(unitalic(p) for p in abst)+"\n:::\n\n## 1. "+rest
out=re.sub(r"\n---\n\n## Footnotes\n","\n",out)
out=re.sub(r"\n## Author's draft comments\n\n\*The original document[^\n]*\n","\n",out)
print(out)
PY
pandoc "$docs/.paper-body.md" -f markdown+footnotes+fenced_divs -t html5 --standalone \
  --template "$root/tools/paper.tmpl" \
  -M title="Bandwidth Swap: A Peer-to-Peer Bandwidth Exchange" \
  -M authors="Robert Douglas and Chris Odom" \
  -M email="bandwidthswap@pm.me" \
  -M date="October 8, 2026" \
  -M version="0.2 (draft)" \
  -o "$docs/paper.html"
rm "$docs/.paper-body.md"

python3 -I "$root/tools/mkdiff.py" "$root/paper/BANDWIDTH-whitepaper-v0.1.md" "$src" "$docs/whitepaper-diff.html" \
  '$BANDWIDTH whitepaper: version 0.1 to version 0.2' 'Before: v0.1, Aug 23 2021' 'After: v0.2 draft, Oct 8 2026' >/dev/null
echo "built: docs/paper.html docs/whitepaper-diff.html docs/OPEN-QUESTIONS.md docs/BANDWIDTH-whitepaper-v0.2.{md,txt}"
