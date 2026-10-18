#!/bin/sh
# Rebuilds everything the site serves from the sources in paper/ and OPEN-QUESTIONS.md.
#   paper/BANDWIDTH-whitepaper-v0.6.md  ->  docs/paper.html (LaTeX-style, via pandoc + latex.css)
#                                       ->  docs/BANDWIDTH-whitepaper-v0.6.md and .txt (downloads)
#   paper/v0.1.md vs v0.2.md            ->  docs/whitepaper-diff.html (side-by-side, historical)
#   paper/v0.2.md vs v0.3.md            ->  docs/whitepaper-diff-v0.3.html (side-by-side, historical)
#   paper/v0.3.md vs v0.4.md            ->  docs/whitepaper-diff-v0.4.html (side-by-side, historical)
#   paper/v0.4.md vs v0.5.md            ->  docs/whitepaper-diff-v0.5.html (side-by-side, historical)
#   paper/v0.5.md vs v0.6.md            ->  docs/whitepaper-diff-v0.6.html (side-by-side)
#   paper/BANDWIDTH-whitepaper-v0.5-plain.md      ->  docs/paper-plain.html (+ .md/.txt downloads; the v0.5 readings until v0.6's are approved)
#   paper/BANDWIDTH-whitepaper-v0.5-operators.md  ->  docs/paper-operators.html (+ .md/.txt downloads)
#   OPEN-QUESTIONS.md                   ->  docs/OPEN-QUESTIONS.md
# Needs: pandoc, python3. Run from anywhere; then commit and push to deploy.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/paper/BANDWIDTH-whitepaper-v0.6.md"
prev="$root/paper/BANDWIDTH-whitepaper-v0.5.md"
v04="$root/paper/BANDWIDTH-whitepaper-v0.4.md"
v03="$root/paper/BANDWIDTH-whitepaper-v0.3.md"
v02="$root/paper/BANDWIDTH-whitepaper-v0.2.md"
docs="$root/docs"
mkdir -p "$docs"
cp "$src" "$docs/BANDWIDTH-whitepaper-v0.6.md"
cp "$src" "$docs/BANDWIDTH-whitepaper-v0.6.txt"
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
  -M date="October 18, 2026" \
  -M version="0.6 (draft)" \
  -M slug="BANDWIDTH-whitepaper-v0.6" \
  -o "$docs/paper.html"
rm "$docs/.paper-body.md"

# The two readings by audience share the template; their title block is the part before the first rule.
render_reading() {  # <source.md> <docs basename> <title> <version>
  local md="$1" base="$2" title="$3" ver="$4"
  cp "$md" "$docs/$(basename "$md")"
  cp "$md" "$docs/$(basename "$md" .md).txt"
  python3 -I -c 'import sys; print(open(sys.argv[1]).read().split("\n---\n",1)[1])' "$md" > "$docs/.reading-body.md"
  pandoc "$docs/.reading-body.md" -f markdown+footnotes -t html5 --standalone \
    --template "$root/tools/paper.tmpl" \
    -M title="$title" \
    -M authors="Robert Douglas and Chris Odom" \
    -M email="bandwidthswap@pm.me" \
    -M date="October 17, 2026" \
    -M version="$ver" \
    -M slug="$(basename "$md" .md)" \
    -o "$docs/$base.html"
  rm "$docs/.reading-body.md"
}
render_reading "$root/paper/BANDWIDTH-whitepaper-v0.5-plain.md" paper-plain "Bandwidth Swap, in plain words" "0.5 (draft), plain reading"
render_reading "$root/paper/BANDWIDTH-whitepaper-v0.5-operators.md" paper-operators "Bandwidth Swap for operators" "0.5 (draft), for operators"

python3 -I "$root/tools/mkdiff.py" "$root/paper/BANDWIDTH-whitepaper-v0.1.md" "$v02" "$docs/whitepaper-diff.html" \
  '$BANDWIDTH whitepaper: version 0.1 to version 0.2' 'Before: v0.1, Aug 23 2021' 'After: v0.2 draft, Oct 8 2026' >/dev/null
python3 -I "$root/tools/mkdiff.py" "$v02" "$v03" "$docs/whitepaper-diff-v0.3.html" \
  'Bandwidth Swap whitepaper: version 0.2 to version 0.3' 'Before: v0.2 draft, Oct 8 2026' 'After: v0.3 draft, Oct 17 2026' >/dev/null
python3 -I "$root/tools/mkdiff.py" "$v03" "$v04" "$docs/whitepaper-diff-v0.4.html" \
  'Bandwidth Swap whitepaper: version 0.3 to version 0.4' 'Before: v0.3 draft, Oct 17 2026' 'After: v0.4 draft, Oct 17 2026' >/dev/null
python3 -I "$root/tools/mkdiff.py" "$v04" "$prev" "$docs/whitepaper-diff-v0.5.html" \
  'Bandwidth Swap whitepaper: version 0.4 to version 0.5' 'Before: v0.4 draft, Oct 17 2026' 'After: v0.5 draft, Oct 17 2026' >/dev/null
python3 -I "$root/tools/mkdiff.py" "$prev" "$src" "$docs/whitepaper-diff-v0.6.html" \
  'Bandwidth Swap whitepaper: version 0.5 to version 0.6' 'Before: v0.5 draft, Oct 17 2026' 'After: v0.6 draft, Oct 18 2026' >/dev/null
echo "built: docs/paper.html docs/paper-plain.html docs/paper-operators.html docs/whitepaper-diff.html docs/whitepaper-diff-v0.3.html docs/whitepaper-diff-v0.4.html docs/whitepaper-diff-v0.5.html docs/whitepaper-diff-v0.6.html docs/OPEN-QUESTIONS.md docs/BANDWIDTH-whitepaper-v0.6.{md,txt}"
