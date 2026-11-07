#!/usr/bin/env bash
# Watch what the agents are doing, live. Run inside the Codespace:
#   bash deploy/logs.sh            all four agents
#   bash deploy/logs.sh designer   one agent
#   bash deploy/logs.sh controller the Switch agent controller
set -euo pipefail
who="${1:-all}"
if [ "$who" = controller ]; then exec tail -n 30 -f "$HOME/.switch-controller/controller.log"; fi
files=()
for d in "$HOME"/.claude/projects/-home-vscode--switch-agents-codespace-weft-*; do
  role="${d##*-weft-}"
  [ "$who" = all ] || [ "$who" = "$role" ] || continue
  f=$(ls -t "$d"/*.jsonl 2>/dev/null | head -1) && [ -n "$f" ] && files+=("$f")
done
[ ${#files[@]} -gt 0 ] || { echo "No agent sessions yet."; exit 0; }
tail -n 20 -q -F "${files[@]}" 2>/dev/null | node -e '
const rl=require("readline").createInterface({input:process.stdin});
const cut=(s,n=160)=>String(s).replace(/\s+/g," ").slice(0,n);
rl.on("line",l=>{let e;try{e=JSON.parse(l)}catch{return}
  const role=(e.cwd||"").split("weft-")[1]||"?"; const t=(e.timestamp||"").slice(11,19);
  const c=e.message&&e.message.content; if(!Array.isArray(c))return;
  for(const p of c){
    if(p.type==="tool_use") console.log(`${t} ${role.padEnd(8)} → ${p.name} ${cut(JSON.stringify(p.input),120)}`);
    else if(p.type==="text"&&e.type==="assistant"&&p.text.trim()) console.log(`${t} ${role.padEnd(8)} says: ${cut(p.text)}`);
    else if(p.type==="tool_result"&&p.is_error) console.log(`${t} ${role.padEnd(8)} ✗ error: ${cut(typeof p.content==="string"?p.content:JSON.stringify(p.content))}`);
  }});'
