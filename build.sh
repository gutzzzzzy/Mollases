#!/bin/bash
# Builds film.html (preview UI + deterministic render API) and the character viewer. Works locally and in CI (uses ./node_modules esbuild if present).
set -e
cd "$(dirname "$0")"
ESB=./node_modules/.bin/esbuild
[ -x "$ESB" ] || ESB=../../tools/node_modules/.bin/esbuild
[ -x "$ESB" ] || ESB="npx --yes esbuild"
build() {  # entry template out
  $ESB "$1" --bundle --format=iife --minify --external:three --outfile=.build_app.js --log-level=warning
  python3 - "$2" "$3" <<'PY'
import sys
tpl,out=sys.argv[1],sys.argv[2]
h=open(tpl).read()
three=open('vendor/three.min.js').read().replace("console.warn(","void(").replace('</script>','<\\/script>')
app=open('.build_app.js').read().replace('</script>','<\\/script>')
open(out,'w').write(h.replace('/*THREE*/',three,1).replace('/*APP*/',app,1))
print('built',out,len(open(out).read()))
PY
}
build main.js film_page.html film.html
if [ -d ../../results ]; then build app.js page.html ../../results/pear_folk_3d.html; fi
rm -f .build_app.js
