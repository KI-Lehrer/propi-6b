(() => {
'use strict';
/* ================= Basis ================= */
const T = 40, COLS = 24, ROWS = 13, VW = COLS * T, VH = ROWS * T;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let dpr = 1;
function resize(){ dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = VW * dpr; cv.height = VH * dpr; }
resize(); window.addEventListener('resize', resize);
const $ = id => document.getElementById(id);
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
if (inFrame) $('btnPrint').hidden = true;
/* ================= Speicher ================= */
const SKEY = 'propi64_v1';
const save = { ver:2, name:'', unlocked:0, best:[], log:[], sound:true, allUnlocked:false };
try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && typeof s === 'object') Object.assign(save, s); } catch (e) {}
if (!Array.isArray(save.best)) save.best = [];
if (!save.ver){ // alte Spielstände (3 Level) auf 9 Level umschreiben
const ob = save.best; save.best = []; [0,3,6].forEach((ni, oi) => { save.best[ni] = ob[oi] || null; });
if (Array.isArray(save.log)) save.log.forEach(l => { l.lv = [0,3,6][l.lv] ?? l.lv; });
save.unlocked = 0; save.ver = 2;
}
for (let i=0; i<9; i++) if (save.best[i] === undefined) save.best[i] = null;
if (!Array.isArray(save.log)) save.log = [];
function persist(){ try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
/* ================= Ton ================= */
let actx = null;
const SFX = {
jump:[[520,.12,'square',780]], coin:[[988,.06,'square'],[1319,.12,'square']],
bump:[[180,.08,'triangle',110]], stomp:[[320,.1,'square',110]], hurt:[[420,.28,'sawtooth',110]],
right:[[660,.09,'square'],[880,.09,'square'],[1175,.2,'square']], wrong:[[300,.16,'sawtooth'],[210,.3,'sawtooth']],
gate:[[392,.1,'square'],[523,.1,'square'],[659,.1,'square'],[784,.28,'square']],
win:[[523,.12,'square'],[659,.12,'square'],[784,.12,'square'],[1047,.4,'square']],
heart:[[700,.08,'triangle'],[1050,.16,'triangle']], open:[[440,.06,'square'],[660,.1,'square']],
power:[[523,.06,'square'],[784,.06,'square'],[1047,.06,'square'],[1568,.25,'square']],
shoot:[[880,.07,'square',440]], fire:[[220,.16,'sawtooth',90]], crumble:[[160,.22,'triangle',55]],
egg:[[523,.1,'triangle'],[659,.1,'triangle'],[784,.1,'triangle'],[1047,.1,'triangle'],[1319,.4,'triangle']]
};
function snd(name){
if (!save.sound) return;
try {
if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
if (actx.state === 'suspended') actx.resume();
let t = actx.currentTime;
for (const [f,d,w,f2] of SFX[name]) {
const o = actx.createOscillator(), g = actx.createGain();
o.type = w; o.frequency.setValueAtTime(f, t);
if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
}
} catch (e) {}
}
/* ================= Hilfen ================= */
const R = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const gcd = (a,b) => { a=Math.abs(Math.round(a)); b=Math.abs(Math.round(b)); while(b){ [a,b]=[b,a%b]; } return a; };
const rnd2 = n => Math.round(n*100)/100;
function fmt(n){
const r = rnd2(n); let [i,d] = String(r).split('.');
if (Math.abs(r) >= 10000){ const neg = i[0] === '-'; let a = neg ? i.slice(1) : i, o = ''; while (a.length > 3){ o = String.fromCharCode(8201) + a.slice(-3) + o; a = a.slice(0, -3); } i = (neg ? '-' : '') + a + o; }
return d ? i + '.' + d : i;
}
function fmtTime(min){
min = rnd2(min); const h = Math.floor(min/60); const m = rnd2(min - h*60);
if (h && m) return `${h} h ${fmt(m)} min`;
if (h) return `${h} h`;
return `${fmt(m)} min`;
}
const fr = n => 'Fr. ' + (Math.round(n*100)/100).toFixed(2);
const divisors = (n, lo, hi) => { const r=[]; for (let d=lo; d<=hi; d++) if (n % d === 0) r.push(d); return r; };
function opts(c, ds, f){
const cs = f(c); const out = [cs];
for (const d of ds){ if (!isFinite(d) || d <= 0) continue; const s = f(rnd2(d)); if (!out.includes(s)) out.push(s); if (out.length === 4) break; }
const ks = [1.5, 0.5, 2, 1.25, 0.75, 3, 1.1];
for (const k of ks){ if (out.length >= 4) break; const v = rnd2(c*k); if (v <= 0) continue; const s = f(v); if (!out.includes(s)) out.push(s); }
return { options: out, correct: cs };
}
const unitF = u => n => `${fmt(n)} ${u}`;
/* ================= Aufgaben-Generatoren ================= */
// ---------- 6.4.1 Proportionalität ----------
function gSpeedDist(){
const combos = [];
for (const v of [30,36,45,48,60,72,75,90,120]) for (const t of [10,15,20,30,40,45,50,80,90,100])
if ((v*t) % 30 === 0) combos.push([v,t]);
const [v,t] = pick(combos); const d = v*t/60; const g = gcd(60,t);
const ex = [`1 h = 60 min → ${v} km`];
if (60/g > 1) ex.push(`: ${60/g} → ${g} min → ${fmt(v*g/60)} km`);
if (t/g > 1) ex.push(`· ${t/g} → ${t} min → ${fmt(d)} km`);
ex.push(`Antwort: In ${fmtTime(t)} kommt es ${fmt(d)} km weit.`);
return { tag:'6.4.1 Geschwindigkeit', text:`Ein Fahrzeug fährt mit ${v} km/h. Wie weit kommt es in ${fmtTime(t)}?`,
table:{h:['Zeit','Strecke'], rows:[['1 h',`${v} km`],[fmtTime(t),'?']]},
...opts(d, [v*t/100, d*2, d/2, v*60/t, d+10], unitF('km')), explain:ex };
}
function gTimeForDist(){
const combos = [];
for (const v of [30,40,45,50,60,75,80,90,100,120]) for (const t of [6,9,12,15,18,20,24,30,36,40,45,48,72,80,90,96,120,150])
if ((v*t) % 60 === 0) { const d = v*t/60; if (d >= 3 && d <= 300) combos.push([v,t,d]); }
const [v,t,d] = pick(combos); const g = gcd(v,d);
const ex = [`${v} km → 60 min`];
if (v/g > 1) ex.push(`: ${v/g} → ${g} km → ${fmt(60*g/v)} min`);
if (d/g > 1) ex.push(`· ${d/g} → ${d} km → ${fmt(t)} min`);
ex.push(`Antwort: Es braucht ${fmtTime(t)}.`);
return { tag:'6.4.1 Geschwindigkeit', text:`Ein Fahrzeug fährt mit ${v} km/h. Wie lange braucht es für ${d} km?`,
table:{h:['Strecke','Zeit'], rows:[[`${v} km`,'1 h'],[`${d} km`,'?']]},
...opts(t, [t*2, t/2, d*v/60, t+15, d], fmtTime), explain:ex };
}
function gAvgSpeed(){
const combos = [[36,45],[2.4,20],[90,90],[4,12]].map(([d,t]) => [d*60/t, t, d]);
for (const v of [12,15,18,20,24,36,48,60,72,80,90]) for (const t of [5,6,10,12,15,20,30,40,45,50,90]) {
const d = v*t/60; if (Math.abs(Math.round(d*10) - d*10) < 1e-9 && d >= 0.5) combos.push([v,t,d]);
}
const [v,t,d] = pick(combos);
const who = v <= 24 ? pick(['Ein Velo','Ein Dampfschiff','Eine Joggerin auf dem Velo']) : v <= 50 ? pick(['Ein Mofa','Ein Motorboot','Ein E-Bike']) : pick(['Ein Auto','Ein Zug','Ein Reisecar']);
const g = gcd(t,60); const ex = [`${fmtTime(t)} → ${fmt(d)} km`];
if (t/g > 1) ex.push(`: ${t/g} → ${g} min → ${fmt(d*g/t)} km`);
if (60/g > 1) ex.push(`· ${60/g} → 60 min → ${fmt(v)} km`);
ex.push(`In 1 h wären es ${fmt(v)} km, also ${fmt(v)} km/h.`);
return { tag:'6.4.1 Durchschnittsgeschwindigkeit', text:`${who} legt ${fmt(d)} km in ${fmtTime(t)} zurück. Wie gross ist die durchschnittliche Geschwindigkeit?`,
table:{h:['Zeit','Strecke'], rows:[[fmtTime(t),`${fmt(d)} km`],['60 min','?']]},
...opts(v, [v/2, v*2, d+t, d*t/60, v+12], unitF('km/h')), explain:ex };
}
const ITEMS = [
{n:'Äpfel', u:'kg', s:'kg', ps:[1.5,2,2.5,3,3.5,2.8]},
{n:'Birnen', u:'kg', s:'kg', ps:[2,2.5,3.2,3.5,4]},
{n:'Stoff', u:'m', s:'m', ps:[4,6,7.5,12,2.5]},
{n:'Kabel', u:'m', s:'m', ps:[1.2,1.5,2.5,3]},
{n:'Hefte', cnt:true, s:'Heft', ps:[1.2,1.5,2.5]},
{n:'Kinokarten', cnt:true, s:'Kinokarte', ps:[14,16,18]},
{n:'Glacekugeln', cnt:true, s:'Glacekugel', ps:[2.5,3,3.5]}
];
function gPrice(forceItem){
const it = forceItem || pick(ITEMS); const p = pick(it.ps); const a = R(2,6);
const c = pick((it.cnt ? [5,7,8,9,10,12] : [1,5,7,8,9,10,12]).filter(x => x !== a));
const b = p*a, ans = p*c;
const lab = n => it.cnt ? `${n} ${it.n}` : `${n} ${it.u}`;
const txt = it.cnt ? `${a} ${it.n} kosten ${fr(b)}. Was kosten ${c} ${it.n}?` : `${a} ${it.u} ${it.n} kosten ${fr(b)}. Was kosten ${c} ${it.u}?`;
return { tag:'6.4.1 Preise', text:txt, table:{h:['Menge','Preis'], rows:[[lab(a),fr(b)],[lab(c),'?']]},
...opts(ans, [b+(c-a), b*c, ans+p, ans*2, ans-p], fr),
explain:[`${lab(a)} → ${fr(b)}`, `: ${a} → 1 ${it.s} → ${fr(p)}`, `· ${c} → ${lab(c)} → ${fr(ans)}`] };
}
function gFlow(){
const r = pick([6,8,9,12,15,20]); const k = pick([2,3,5,6,8,10,12,15,20,25,30,45,60,90]); const V = r*k;
const box = pick(['ein Aquarium','eine Giesskanne','eine Badewanne','ein Planschbecken','ein Regenfass']);
if (Math.random() < 0.6) {
return { tag:'6.4.1 Durchfluss', text:`Aus einem Schlauch fliessen ${r} l Wasser pro Minute. Wie lange dauert es, bis ${box} mit ${V} l gefüllt ist?`,
table:{h:['Wasser','Zeit'], rows:[[`${r} l`,'1 min'],[`${V} l`,'?']]},
...opts(k, [V*r/60, k*2, k+r, V-r, k/2], fmtTime),
explain:[`${r} l → 1 min`, `${V} l : ${r} l = ${k}`, `· ${k} → ${V} l → ${fmtTime(k)}`] };
}
return { tag:'6.4.1 Durchfluss', text:`Aus einem Schlauch fliessen ${r} l Wasser pro Minute. Wie viele Liter sind nach ${fmtTime(k)} im Becken?`,
table:{h:['Zeit','Wasser'], rows:[['1 min',`${r} l`],[fmtTime(k),'?']]},
...opts(V, [r+k, V/2, V*2, V+r], unitF('l')),
explain:[`1 min → ${r} l`, `· ${k} → ${fmtTime(k)} → ${V} l`] };
}
function gTableMissing(){
const [a,b] = pick([[1,12],[3,4],[2,5],[4,3],[1,6],[2,3],[5,8],[1,7]]);
const ms = shuffle([1,2,3,4,5,6,7,8,9,10,12]).slice(0,3);
const rows = ms.map(m => [a*m, b*m]);
const ask = rows[2]; const left = Math.random() < 0.3;
const shown = rows.map((r,i) => i < 2 ? [fmt(r[0]), fmt(r[1])] : (left ? ['?', fmt(r[1])] : [fmt(r[0]), '?']));
const ans = left ? ask[0] : ask[1];
const m3 = ms[2];
const ex = [`Verhältnis: ${a} → ${b} (aus ${rows[0][0]} → ${rows[0][1]} mit : ${ms[0]})`];
ex.push(left ? `${ask[1]} = ${b} · ${m3}, also ${a} · ${m3} = ${ask[0]}` : `${ask[0]} = ${a} · ${m3}, also ${b} · ${m3} = ${ask[1]}`);
const wrongAdd = left ? ask[1] - (rows[0][1]-rows[0][0]) : ask[0] + (rows[0][1]-rows[0][0]);
return { tag:'6.4.1 Wertetabelle', text:'Alle Zahlenpaare in der Tabelle sind proportional. Welche Zahl fehlt?',
table:{h:['Wert 1','Wert 2'], rows:shown},
...opts(ans, [wrongAdd, ans + (left ? a : b), ans - (left ? a : b), ans*2], fmt), explain:ex };
}
function gConceptP(){
if (Math.random() < 0.5) {
return { tag:'6.4.1 Merkwissen', text:'Woran erkennst du in einer Wertetabelle eine Proportionalität?',
options:['Verdoppelt sich der eine Wert, verdoppelt sich auch der andere.','Verdoppelt sich der eine Wert, halbiert sich der andere.','Beide Werte werden immer um gleich viel grösser.','Das Produkt der beiden Werte bleibt immer gleich.'],
correct:'Verdoppelt sich der eine Wert, verdoppelt sich auch der andere.',
explain:['Proportional heisst: doppelt so viel → doppelt so viel, dreimal so viel → dreimal so viel.','Darum ist der Quotient (Wert 2 : Wert 1) in jeder Zeile gleich.'] };
}
return { tag:'6.4.1 Merkwissen', text:'Was bleibt bei einer Proportionalität in jeder Zeile der Wertetabelle gleich?',
options:['Der Quotient (Wert 2 : Wert 1)','Das Produkt (Wert 1 · Wert 2)','Die Summe (Wert 1 + Wert 2)','Die Differenz (Wert 2 − Wert 1)'],
correct:'Der Quotient (Wert 2 : Wert 1)',
explain:['Beispiel: 4 kg → Fr. 12, 7 kg → Fr. 21.','12 : 4 = 3 und 21 : 7 = 3. Der Quotient ist immer 3 (der Preis pro kg).'] };
}
function gBikes(){
const perDay = pick([220,150,180,120,250]); const total = perDay*360; const d = pick([45,30,90,120,40,60]);
if (Math.random() < 0.5) {
return { tag:'6.4.1 Produktion', text:`Eine Firma produziert ${fmt(total)} Velos in 360 Tagen. Wie viele Velos produziert sie in ${d} Tagen?`,
table:{h:['Tage','Velos'], rows:[['360',fmt(total)],[String(d),'?']]},
...opts(perDay*d, [perDay*d*2, perDay*d/2, total/d, perDay*d+1000], fmt),
explain:[`360 Tage → ${fmt(total)} Velos`, `: ${360/d} → ${d} Tage → ${fmt(perDay*d)} Velos`] };
}
const want = perDay*d;
return { tag:'6.4.1 Produktion', text:`Eine Firma produziert ${fmt(total)} Velos in 360 Tagen. Wie viele Tage braucht sie für ${fmt(want)} Velos?`,
table:{h:['Velos','Tage'], rows:[[fmt(total),'360'],[fmt(want),'?']]},
...opts(d, [d*2, d/2, 360-d, d+10], unitF('Tage')),
explain:[`${fmt(total)} Velos → 360 Tage`, `: 360 → ${perDay} Velos pro Tag`, `${fmt(want)} : ${perDay} = ${d} Tage`] };
}
// ---------- 6.4.2 Umgekehrte Proportionalität ----------
function gCards(){
const N = pick([36,48,60,72,96,120,144]); const ds = divisors(N,2,24);
if (Math.random() < 0.4) {
const p = pick(ds);
return { tag:'6.4.2 Verteilen', text:`${N} Spielkarten werden gleichmässig verteilt. Wie viele Karten erhält jede Person, wenn ${p} Personen mitspielen?`,
table:{h:['Personen','Karten pro Person'], rows:[['1',String(N)],[String(p),'?']]},
...opts(N/p, [N*p/10, N-p, N/p+p, N/(p+1)], fmt),
explain:[`1 Person → ${N} Karten`, `${p}-mal so viele Personen → ${p}-mal weniger Karten`, `${N} : ${p} = ${N/p}`] };
}
const [p1,p2] = shuffle(ds).slice(0,2); const k1 = N/p1, ans = N/p2;
return { tag:'6.4.2 Verteilen', text:`Bei ${p1} Personen erhält jede Person ${k1} Karten. Alle Karten werden neu verteilt. Wie viele Karten erhält jede Person bei ${p2} Personen?`,
table:{h:['Personen','Karten pro Person'], rows:[[String(p1),String(k1)],[String(p2),'?']]},
...opts(ans, [k1*p2/p1, k1+(p2-p1), k1-(p2-p1), ans*2], fmt),
explain:[`Alle Karten: ${p1} · ${k1} = ${N}`, `${N} : ${p2} = ${ans} Karten pro Person`, 'Mehr Personen → weniger Karten pro Person. Das Produkt bleibt gleich.'] };
}
function gSameDist(){
let D, s1, s2, tries = 0;
do {
D = pick([120,180,240,300,360,480]);
const sp = [30,40,45,48,50,60,72,75,80,90,100,120].filter(s => (D*60) % s === 0 && D/s <= 12);
[s1,s2] = shuffle(sp).slice(0,2); tries++;
} while ((!s1 || !s2) && tries < 50);
const t1 = D/s1*60, t2 = D/s2*60;
return { tag:'6.4.2 Gleiche Strecke', text:`Für dieselbe Strecke braucht ein Auto mit ${s1} km/h genau ${fmtTime(t1)}. Wie lange braucht es mit ${s2} km/h?`,
table:{h:['Geschwindigkeit','Fahrzeit'], rows:[[`${s1} km/h`,fmtTime(t1)],[`${s2} km/h`,'?']]},
...opts(t2, [t1*s2/s1, t2/2, t2+60, t1, t2*2], fmtTime),
explain:[`Strecke: ${s1} km/h · ${fmt(t1/60)} h = ${D} km`, `${D} km : ${s2} km/h = ${fmt(t2/60)} h = ${fmtTime(t2)}`, 'Schneller fahren → weniger Zeit.'] };
}
function gMachines(){
if (Math.random() < 0.5) {
const Tt = pick([120,180,240,360,480]); const n = pick([2,3,4,5,6,8,10,12].filter(x => Tt % x === 0));
return { tag:'6.4.2 Maschinen', text:`1 Maschine braucht für einen Auftrag ${Tt} Arbeitstage. Wie lange brauchen ${n} gleiche Maschinen?`,
table:{h:['Maschinen','Arbeitstage'], rows:[['1',String(Tt)],[String(n),'?']]},
...opts(Tt/n, [Tt*n/10, Tt-n, Tt/n+n, Tt/(n+1)], unitF('Tage')),
explain:[`1 Maschine → ${Tt} Tage`, `${n}-mal so viele Maschinen → ${Tt} : ${n} = ${Tt/n} Tage`] };
}
const P = pick([60,72,90,120,180]); const ds = divisors(P,2,12).filter(d => P/d <= 60);
const [m,n] = shuffle(ds).slice(0,2); const d0 = P/m, ans = P/n;
return { tag:'6.4.2 Maschinen', text:`${m} gleiche Maschinen brauchen für einen Auftrag ${d0} Arbeitstage. Wie lange brauchen ${n} Maschinen?`,
table:{h:['Maschinen','Arbeitstage'], rows:[[String(m),String(d0)],[String(n),'?']]},
...opts(ans, [d0*n/m, d0+(n-m), Math.abs(d0-(n-m)), ans*2], unitF('Tage')),
explain:[`1 Maschine bräuchte ${m} · ${d0} = ${P} Tage`, `${P} : ${n} = ${ans} Tage`] };
}
function gAnimals(){
const an = pick([{pl:'Hühner',f:'Körner'},{pl:'Pferde',f:'Hafer'},{pl:'Kaninchen',f:'Heu'},{pl:'Ziegen',f:'Heu'}]);
const P = pick([24,36,48,60,72,90,120]); const ds = divisors(P,2,15).filter(d => P/d <= 40);
const [a,c] = shuffle(ds).slice(0,2); const b = P/a, ans = P/c;
return { tag:'6.4.2 Futtervorrat', text:`Ein Vorrat ${an.f} reicht für ${a} ${an.pl} ${b} Tage. Wie lange reicht er für ${c} ${an.pl}?`,
table:{h:['Tiere','Tage'], rows:[[String(a),String(b)],[String(c),'?']]},
...opts(ans, [b*c/a, b+(c-a), Math.abs(b-(c-a)), ans*2], unitF('Tage')),
explain:[`Vorrat: ${a} · ${b} = ${P} Tagesportionen`, `${P} : ${c} = ${ans} Tage`, 'Mehr Tiere → der Vorrat reicht weniger lang.'] };
}
function gStairs(){
let H, s1, s2, tries = 0;
do {
H = pick([180,240,288,300,360]);
const ss = [12,15,16,18,20,24,25,30].filter(s => H % s === 0 && H/s >= 6 && H/s <= 30);
[s1,s2] = shuffle(ss).slice(0,2); tries++;
} while ((!s1 || !s2) && tries < 50);
const n1 = H/s1, n2 = H/s2;
return { tag:'6.4.2 Treppe', text:`Eine Treppe hat ${n1} Stufen zu je ${s1} cm. Wie viele Stufen zu je ${s2} cm braucht es für dieselbe Höhe?`,
table:{h:['Stufenhöhe','Anzahl Stufen'], rows:[[`${s1} cm`,String(n1)],[`${s2} cm`,'?']]},
...opts(n2, [n1*s2/s1, n1+(s1-s2), n1-(s1-s2), n2+2], unitF('Stufen')),
explain:[`Höhe: ${n1} · ${s1} cm = ${H} cm`, `${H} cm : ${s2} cm = ${n2} Stufen`] };
}
function gWorkers(){
const task = pick(['ein Schulzimmer zu streichen','den Schulgarten umzugraben','die Turnhalle aufzuräumen','alle Plakate aufzuhängen']);
const P = pick([12,24,36,48,60]); const ds = divisors(P,2,12).filter(d => P/d <= 24);
const [a,c] = shuffle(ds).slice(0,2); const b = P/a, ans = P/c;
return { tag:'6.4.2 Arbeit teilen', text:`${a} Personen brauchen ${b} Stunden, um ${task}. Wie lange brauchen ${c} Personen, wenn alle gleich schnell arbeiten?`,
table:{h:['Personen','Stunden'], rows:[[String(a),String(b)],[String(c),'?']]},
...opts(ans, [b*c/a, b+(c-a), Math.abs(b-(c-a)), ans*2], unitF('h')),
explain:[`1 Person bräuchte ${a} · ${b} = ${P} h`, `${P} h : ${c} = ${fmt(ans)} h`] };
}
function gMandarins(){
const M = pick([48,60,72,96,120]); const ds = divisors(M,4,30);
const [k1,k2] = shuffle(ds).slice(0,2); const e1 = M/k1, ans = M/k2;
return { tag:'6.4.2 Teilen', text:`${k1} Kinder teilen ${M} Mandarinen gerecht, jedes Kind erhält ${e1}. Wie viele erhält jedes Kind, wenn es ${k2} Kinder sind?`,
table:{h:['Kinder','Mandarinen pro Kind'], rows:[[String(k1),String(e1)],[String(k2),'?']]},
...opts(ans, [e1*k2/k1, e1+(k2-k1), Math.abs(e1-(k2-k1)), ans+1], fmt),
explain:[`Alle Mandarinen: ${k1} · ${e1} = ${M}`, `${M} : ${k2} = ${ans}`] };
}
function gConceptU(){
const v = R(0,2);
if (v === 0) return { tag:'6.4.2 Merkwissen', text:'Was bleibt bei einer umgekehrten Proportionalität in jeder Zeile gleich?',
options:['Das Produkt der beiden Werte','Der Quotient der beiden Werte','Die Summe der beiden Werte','Die Differenz der beiden Werte'],
correct:'Das Produkt der beiden Werte', explain:['Beispiel: 2 Maschinen → 12 h, 3 Maschinen → 8 h, 6 Maschinen → 4 h.','2 · 12 = 3 · 8 = 6 · 4 = 24. Das Produkt bleibt gleich.'] };
if (v === 1) return { tag:'6.4.2 Merkwissen', text:'72 Karten werden verteilt. Was passiert mit den Karten pro Person, wenn sich die Anzahl Personen verdoppelt?',
options:['Sie halbieren sich.','Sie verdoppeln sich.','Sie bleiben gleich.','Es sind 2 Karten weniger.'],
correct:'Sie halbieren sich.', explain:['Umgekehrt proportional: doppelt so viele Personen → halb so viele Karten pro Person.','Beispiel: 3 Personen → 24 Karten, 6 Personen → 12 Karten.'] };
return { tag:'6.4.2 Merkwissen', text:'Warum sind «Anzahl Personen» und «Karten pro Person» umgekehrt proportional?',
options:['Je mehr Personen, desto weniger Karten pro Person, und alle Karten zusammen bleiben gleich viele.','Je mehr Personen, desto mehr Karten pro Person.','Weil jede Person immer gleich viele Karten erhält, egal wie viele mitspielen.','Weil man Karten nicht teilen kann.'],
correct:'Je mehr Personen, desto weniger Karten pro Person, und alle Karten zusammen bleiben gleich viele.',
explain:['Personen · Karten pro Person = Gesamtzahl Karten. Dieses Produkt ändert sich nicht.'] };
}
// ---------- 6.4.3 Wertepaare und Wertetabellen ----------
const CL = ['proportional','umgekehrt proportional','weder noch'];
function gClassTable(){
const kind = R(0,2); let rows, ex;
if (kind === 0) {
const k = R(2,9); const xs = shuffle([1,2,3,4,5,6,8,10]).slice(0,3).sort((a,b) => a-b);
rows = xs.map(x => [x, k*x]); ex = [`Teste den Quotienten: ${rows.map(r => `${r[1]} : ${r[0]} = ${k}`).join(', ')}`, 'Der Quotient ist immer gleich → proportional.'];
} else if (kind === 1) {
const P = pick([12,24,36,48,60,72]); const xs = shuffle(divisors(P,1,12)).slice(0,3).sort((a,b) => a-b);
rows = xs.map(x => [x, P/x]); ex = [`Teste das Produkt: ${rows.map(r => `${r[0]} · ${r[1]} = ${P}`).join(', ')}`, 'Das Produkt ist immer gleich → umgekehrt proportional.'];
} else {
const m = R(1,4), c = R(1,5); const xs = shuffle([1,2,3,4,5,6]).slice(0,3).sort((a,b) => a-b);
rows = xs.map(x => [x, m*x + c]);
ex = [`Quotienten: ${rows.map(r => `${r[1]} : ${r[0]} = ${fmt(r[1]/r[0])}`).join(', ')} → nicht gleich`, `Produkte: ${rows.map(r => `${r[0] * r[1]}`).join(', ')} → nicht gleich`, 'Weder Quotient noch Produkt bleiben gleich → weder noch.'];
}
return { tag:'6.4.3 Tabellen einordnen', text:'Welche Zuordnung zeigt die Wertetabelle?',
table:{h:['x','y'], rows:rows.map(r => [fmt(r[0]), fmt(r[1])])}, options:CL.slice(), correct:CL[kind], explain:ex };
}
const SITS = [
['Anzahl Kinokarten → Preis', 0, 'Doppelt so viele Karten kosten doppelt so viel.'],
['Anzahl Hefte → Preis', 0, 'Jedes Heft kostet gleich viel, also doppelt so viele → doppelter Preis.'],
['Fahrzeit → Strecke (gleiche Geschwindigkeit)', 0, 'Doppelt so lange fahren → doppelt so weit.'],
['Liter Benzin → Preis', 0, 'Jeder Liter kostet gleich viel.'],
['Seitenlänge eines Quadrats → Umfang', 0, 'Umfang = 4 · Seitenlänge, also proportional.'],
['Anzahl Personen → Stück Pizza pro Person (gleiche Pizza)', 1, 'Mehr Personen → weniger Stück pro Person. Die ganze Pizza bleibt gleich.'],
['Geschwindigkeit → Fahrzeit (gleiche Strecke)', 1, 'Doppelt so schnell → halb so lange.'],
['Anzahl Arbeiter → Arbeitszeit (gleiche Arbeit)', 1, 'Doppelt so viele Arbeiter → halb so lange.'],
['Anzahl Kinder → Mandarinen pro Kind (gleicher Korb)', 1, 'Mehr Kinder → weniger Mandarinen pro Kind.'],
['Anzahl Lesetage → Seiten pro Tag (gleiches Buch)', 1, 'Mehr Tage → weniger Seiten pro Tag.'],
['Alter → Schuhgrösse', 2, 'Mit doppeltem Alter hat man nicht doppelt so grosse Füsse. Es gibt keine feste Regel.'],
['Alter → Körpergrösse', 2, 'Man wächst nicht gleichmässig und hört irgendwann auf zu wachsen.'],
['Uhrzeit → Temperatur', 2, 'Die Temperatur steigt und sinkt ohne feste Regel.'],
['Taxifahrt mit Grundgebühr: Strecke → Preis', 2, 'Wegen der Grundgebühr kostet die doppelte Strecke nicht das Doppelte.'],
['Handy-Abo mit Grundgebühr: Minuten → Rechnung', 2, 'Die Grundgebühr bezahlt man immer, deshalb nicht proportional.']
];
function gClassSit(){
const [s,k,why] = pick(SITS);
return { tag:'6.4.3 Zuordnen', text:`Wie hängen diese Grössen zusammen? «${s}»`, options:CL.slice(), correct:CL[k], explain:[why] };
}
function gWhyNot(){
if (Math.random() < 0.5) return { tag:'6.4.3 Begründen', text:'Warum bilden Alter und Schuhgrösse keine Proportionalität?',
options:['Mit doppeltem Alter hat man nicht automatisch die doppelte Schuhgrösse. Es gibt keine feste Regel.','Weil die Schuhgrösse mit dem Alter kleiner wird.','Weil das Produkt von Alter und Schuhgrösse immer gleich bleibt.','Weil Schuhgrössen nur ganze Zahlen sind.'],
correct:'Mit doppeltem Alter hat man nicht automatisch die doppelte Schuhgrösse. Es gibt keine feste Regel.',
explain:['Beispiel: Mit 6 Jahren Grösse 30, mit 12 Jahren nicht Grösse 60.','Weder der Quotient noch das Produkt bleiben gleich.'] };
return { tag:'6.4.3 Begründen', text:'Ein Taxi kostet Fr. 6.00 Grundgebühr plus Fr. 3.00 pro km. Warum ist der Preis nicht proportional zur Strecke?',
options:['Wegen der Grundgebühr kostet die doppelte Strecke nicht das Doppelte.','Weil das Taxi manchmal schneller fährt.','Weil der Preis pro km immer gleich ist.','Weil das Produkt aus Strecke und Preis gleich bleibt.'],
correct:'Wegen der Grundgebühr kostet die doppelte Strecke nicht das Doppelte.',
explain:['2 km → Fr. 12.00, 4 km → Fr. 18.00. Das ist nicht das Doppelte.','Bei 0 km müsste ein proportionaler Preis Fr. 0.00 sein.'] };
}
function gBook(){
const P = pick([120,180,240,360]); const ds = divisors(P,2,12);
const [d1,d2] = shuffle(ds).slice(0,2); const s1 = P/d1, ans = P/d2;
return { tag:'6.4.3 Wertepaare', text:`Ein Buch hat ${P} Seiten. Wenn du es in ${d1} Tagen liest, sind es ${s1} Seiten pro Tag. Wie viele Seiten pro Tag sind es bei ${d2} Tagen?`,
table:{h:['Tage','Seiten pro Tag'], rows:[[String(d1),String(s1)],[String(d2),'?']]},
...opts(ans, [s1*d2/d1, s1+(d2-d1), Math.abs(s1-(d2-d1)), ans*2], unitF('Seiten')),
explain:['Umgekehrt proportional: Das Produkt bleibt gleich.', `${d1} · ${s1} = ${P} Seiten`, `${P} : ${d2} = ${ans} Seiten pro Tag`] };
}
function gFabric(){ const q = gPrice(ITEMS[2]); q.tag = '6.4.3 Wertepaare'; return q; }
function mixFrom(pool){ return () => { const q = pick(pool)(); q.tag = '6.4.3 Mix · proportional oder umgekehrt?'; return q; }; }
function gFlowRate(){
const r = pick([4,5,6,8,10,12,15]), t = pick([10,15,20,25,30,40,50]); const V = r*t;
return { tag:'6.4.1 Durchfluss · Niveau 2', text:`In ${t} min fliessen ${V} l Wasser aus einem Hahn. Wie gross ist der Durchfluss in Litern pro Stunde (l/h)?`,
table:{h:['Zeit','Wasser'], rows:[[`${t} min`,`${V} l`],['60 min','?']]},
...opts(r*60, [V, r, V*2, r*100, V+60], unitF('l/h')),
explain:[`${t} min → ${V} l`, `: ${t} → 1 min → ${r} l`, `· 60 → 60 min → ${r*60} l, also ${r*60} l/h`] };
}
function gPedalo(){
const combos = [];
for (const sec of [6,8,9,10,12,15,18,20,24,30]) for (const m of [5,10,15,20,25,30,40,50,60,100]){
const v = m*3600/sec/1000; if (Math.abs(v*10 - Math.round(v*10)) < 1e-9 && v >= 2 && v <= 30) combos.push([m,sec,v]);
}
const [m,sec,v] = pick(combos); const who = pick(['Ein Pedalo','Ein Ruderboot','Ein Spielzeugboot','Ein Kickboard']);
return { tag:'6.4.1 Geschwindigkeit · Niveau 2', text:`${who} legt ${m} m in ${sec} s zurück. Wie schnell ist das in km/h?`,
table:{h:['Zeit','Strecke'], rows:[[`${sec} s`,`${m} m`],['3600 s (1 h)','?']]},
...opts(v, [m/sec, v*10, m*60/sec/1000, v/2, v+3.6], unitF('km/h')),
explain:[`${sec} s → ${m} m`, `· ${3600/sec} → 3600 s = 1 h → ${fmt(m*3600/sec)} m`, `${fmt(m*3600/sec)} m = ${fmt(v)} km, also ${fmt(v)} km/h`] };
}
function gInvTable(){
const P = pick([24,36,48,60,72,120]); const xs = shuffle(divisors(P,1,12)).slice(0,3).sort((a,b) => a-b);
const miss = R(1,2); const rows = xs.map((x,i) => i === miss ? [String(x),'?'] : [String(x), String(P/x)]);
const ans = P/xs[miss];
return { tag:'6.4.2 Wertetabelle · Niveau 2', text:'Alle Zahlenpaare in der Tabelle sind umgekehrt proportional. Welche Zahl fehlt?',
table:{h:['Wert 1','Wert 2'], rows},
...opts(ans, [P/xs[0]*xs[miss]/xs[0], ans + xs[miss], Math.abs(P/xs[0] - (xs[miss] - xs[0])), ans*2], fmt),
explain:[`Produkt: ${xs[0]} · ${P/xs[0]} = ${P}`, `${P} : ${xs[miss]} = ${ans}`] };
}
function gHorseFeed(){
const kg = pick([1.5,2,2.5,3,4]), an = pick(['Pferde','Kühe','Esel']);
const P = pick([24,36,48,60,72]); const ds = divisors(P,2,15).filter(x => P/x <= 30);
const [a,c] = shuffle(ds).slice(0,2); const b = P/a;
if (Math.random() < 0.5){
const tot = kg*P;
return { tag:'6.4.2 Zwei Schritte · Niveau 2', text:`Ein Tier frisst ${fmt(kg)} kg Futter pro Tag. Der Vorrat reicht für ${a} ${an} genau ${b} Tage. Wie viele kg Futter sind im Vorrat?`,
...opts(tot, [kg*a, kg*b, P, kg*(a+b), tot/2], unitF('kg')),
explain:[`Tagesportionen: ${a} · ${b} = ${P}`, `${P} · ${fmt(kg)} kg = ${fmt(tot)} kg`] };
}
return { tag:'6.4.2 Zwei Schritte · Niveau 2', text:`Ein Tier frisst ${fmt(kg)} kg Futter pro Tag. Der Vorrat reicht für ${a} ${an} genau ${b} Tage. Wie lange reicht er für ${c} ${an}?`,
table:{h:['Tiere','Tage'], rows:[[String(a),String(b)],[String(c),'?']]},
...opts(P/c, [b*c/a, kg*P/c, b + (c - a), P/c*2], unitF('Tage')),
explain:['Die kg pro Tag brauchst du hier nicht.', `Tagesportionen: ${a} · ${b} = ${P}`, `${P} : ${c} = ${fmt(P/c)} Tage`] };
}
function gWhichTable(){
const want = R(0,1), k = R(2,6), P = pick([24,36,48,60]);
const fT = rows => rows.map(r => `(${r[0]} | ${r[1]})`).join('  ');
const prop = [2,3,4].map(x => [x, k*x]);
const inv = shuffle(divisors(P,2,12)).slice(0,3).sort((a,b) => a-b).map(x => [x, P/x]);
const n1 = [1,2,3].map(x => [x, x + k]), n2 = [2,3,4].map(x => [x, k*x + 1]), n3 = [2,4,6].map(x => [x, 30 - 3*x]);
const right = want === 0 ? prop : inv; const others = want === 0 ? [inv, n1, n2] : [prop, n3, n1];
return { tag:'6.4.3 Tabellen vergleichen · Niveau 2', text: want === 0 ? 'Welche Wertetabelle ist proportional?' : 'Welche Wertetabelle ist umgekehrt proportional?',
options:[fT(right), ...others.map(fT)], correct:fT(right),
explain: want === 0 ? [`Bei ${fT(prop)} ist der Quotient immer ${k}.`, 'Bei den anderen Tabellen ändert sich der Quotient.']
: [`Bei ${fT(inv)} ist das Produkt immer ${P}.`, `Achtung: ${fT(n3)} wird zwar kleiner, aber das Produkt bleibt nicht gleich.`] };
}
const HARD = [[gFlowRate, gPedalo, gTableMissing], [gInvTable, gHorseFeed, gSameDist], [gWhichTable, gWhichTable, gClassTable]];
const POOLS = [
[gSpeedDist, gTimeForDist, gAvgSpeed, gPrice, gFlow, gTableMissing, gConceptP, gBikes, gPrice, gTableMissing],
[gCards, gSameDist, gMachines, gAnimals, gStairs, gWorkers, gMandarins, gConceptU, gCards],
[gClassTable, gClassSit, gClassTable, gWhyNot, gFabric, gBook, gClassSit,
mixFrom([gPrice, gSpeedDist, gTableMissing]), mixFrom([gCards, gAnimals, gSameDist, gStairs])]
];
let bag = [], recent = [];
function nextQuestion(){
const ch = L.c.chap, d = L.c.diff;
let q, tries = 0;
do {
if (!bag.length) bag = shuffle(POOLS[ch].concat(d >= 2 ? HARD[ch] : [], d >= 3 ? HARD[ch] : []));
q = bag.pop()(); tries++;
} while (recent.includes(q.text) && tries < 12);
recent.push(q.text); if (recent.length > 25) recent.shift();
return q;
}
/* ================= Welten ================= */
const THEMES = [
{ sky:['#55c3f0','#cdf1ff'], hill1:'#9ad99b', hill2:'#5fb86c', ground:'#b06a35', groundDark:'#86491f', grass:'#57c35a', grassDark:'#3b9a42',
brick:'#c4572f', brickLine:'#7a2f17', stone:'#9aa3b8', stoneDark:'#646d86', cloud:'rgba(255,255,255,.95)' },
{ sky:['#ff8556','#ffe2a6'], hill1:'#f4bd76', hill2:'#d8904a', ground:'#d49a55', groundDark:'#a67133', grass:'#f2cf80', grassDark:'#d4a650',
brick:'#b34a32', brickLine:'#6b281a', stone:'#c9a07a', stoneDark:'#946b4a', cloud:'rgba(255,242,228,.8)', sun:'#fff3b0' },
{ sky:['#14173a','#43378a'], hill1:'#2e2a68', hill2:'#211e50', ground:'#53466e', groundDark:'#372d4c', grass:'#927ed6', grassDark:'#6a58aa',
brick:'#6d5a9c', brickLine:'#3a2e60', stone:'#7c7fa2', stoneDark:'#515476', cloud:'rgba(180,170,255,.22)', moon:'#fff6d5', stars:true }
];
const BASE = [
{ name:'Proportional-Wiese', code:'6.4.1', topic:'Proportionalität', w:170,
pits:[[24,2],[47,3],[90,3],[114,2],[138,3]], pillars:[[38,2],[42,3],[72,2]], stairs:[[134,4,'up'],[141,4,'down']],
bricks:[[11,7,5],[64,7,6],[97,7,4],[102,4,3]], wood:[[52,8,4]],
crumbs:[[57,8,3],[114,11,2]], plants:[28,75], fire:[[90,3]], cannons:[], egg:[7,7],
q:[[13,7],[32,7],[53,4],[66,7],[80,7],[99,7]],
coins:[[12,6,3],[58,9,4],[65,6,3],[102,3,3],[118,9,5],[148,9,4]],
enemies:[20,35,44,58,70,77,84,95,105,110,120,128], cp:86 },
{ name:'Umgekehrt-Wüste', code:'6.4.2', topic:'Umgekehrte Proportionalität', w:180,
pits:[[18,3],[40,2],[58,4],[83,3],[105,2],[121,4],[142,3]], pillars:[[46,2],[50,3],[54,4]], stairs:[[138,4,'up'],[145,4,'down']],
bricks:[[8,7,5],[26,7,3],[35,5,3],[64,7,5],[94,7,6],[114,5,4]], wood:[[31,8,3],[110,8,3]],
crumbs:[[59,8,2],[122,8,2],[83,11,3]], plants:[22,68,100,131], fire:[[40,2],[105,2],[142,3]], cannons:[[54,6]],
q:[[10,7],[27,7],[36,5],[66,7],[76,7],[95,7],[116,5]],
coins:[[9,6,3],[31,7,3],[64,6,5],[88,9,3],[114,4,4],[130,9,5],[152,9,4]],
enemies:[14,24,30,44,48,63,70,73,79,88,93,101,109,112,128,132,135], cp:90 },
{ name:'Wertepaar-Burg', code:'6.4.3', topic:'Wertepaare & Wertetabellen', w:190,
pits:[[20,3],[44,3],[70,4],[96,3],[124,4],[146,3]], pillars:[[38,3],[41,4],[64,2]], stairs:[[142,4,'up'],[149,4,'down']],
bricks:[[9,7,4],[30,5,4],[50,7,5],[102,7,8]], wood:[[26,8,3]],
crumbs:[[71,8,2],[125,8,2],[96,11,3]], plants:[47,66,90,134], fire:[[20,3],[44,3],[146,3]], cannons:[[41,6],[85,10],[162,10]],
q:[[10,7],[16,7],[32,5],[51,7],[54,7],[80,7],[104,7],[108,7]],
coins:[[9,6,4],[30,4,4],[58,9,5],[102,6,8],[132,9,5],[156,9,4]],
enemies:[13,25,29,35,48,56,60,62,67,76,78,84,92,100,112,115,118,132,136,139], cp:88 }
];
/* Weitere Level: aus geprüften Bausteinen zusammengesetzt, fester Startwert = jedes Mal gleiches Level */
function mulberry(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SEG = {
flatQ(c,x,d){ c.bricks.push([x+2,7,3]); c.q.push([x+3,7]); c.coins.push([x+2,6,3]); c.enemies.push(x+6); return 8; },
highQ(c,x,d){ c.wood.push([x+2,8,4]); c.q.push([x+3,4]); c.coins.push([x+4,6,2]); if (d >= 3) c.enemies.push(x+7); return 9; },
brickQ(c,x,d,r){ c.bricks.push([x+2,7,6]); c.q.push([x+3 + Math.floor(r()*4),7]); c.coins.push([x+2,6,6]); c.enemies.push(x+4); if (d >= 3) c.enemies.push(x+7); return 10; },
pit(c,x,d,r){ const n = d === 2 ? 2 + (r() < 0.5 ? 1 : 0) : 3 + (r() < 0.45 ? 1 : 0); c.pits.push([x+2,n]); c.coins.push([x+2,7,n]); if (d >= 3 || r() < 0.4) c.fire.push([x+2,n]); return n + 4; },
pillars(c,x,d){ c.pillars.push([x+2,2],[x+6,3]); c.enemies.push(x+4); return 9; },
plant(c,x,d){ c.plants.push(x+3); if (d >= 3){ c.plants.push(x+6); return 9; } return 7; },
stepPit(c,x,d){ c.pits.push([x+2,6]); if (d >= 3) c.crumbs.push([x+4,8,2]); else c.wood.push([x+4,8,2]); c.coins.push([x+4,7,2]); return 10; },
crumb(c,x,d){ c.pits.push([x+2,4]); c.crumbs.push([x+2,11,4]); return 8; },
stairsPit(c,x,d,r){ c.stairs.push([x+1,4,'up'],[x+8,4,'down']); c.pits.push([x+5,3]); if (d >= 3 || r() < 0.5) c.fire.push([x+5,3]); return 13; },
enemies(c,x,d){ c.enemies.push(x+2, x+4, x+6); if (d >= 3) c.enemies.push(x+7); c.coins.push([x+2,8,5]); return 9; },
cannon(c,x,d){ c.cannons.push([x+4,10]); return 8; },
tower(c,x,d){ c.pillars.push([x+3,2]); c.cannons.push([x+3,8]); c.plants.push(x+6); return 9; }
};
function genOnce(m){
const r = mulberry(m.seed), rp = a => a[Math.floor(r()*a.length)], d = m.diff;
const c = { ...m, pits:[], pillars:[], stairs:[], bricks:[], wood:[], crumbs:[], plants:[], fire:[], cannons:[], q:[], coins:[[4,8,3]], enemies:[] };
const haz = d === 2 ? ['pit','pillars','plant','stepPit','enemies','crumb','stairsPit','pit','cannon']
: ['pit','plant','cannon','stepPit','crumb','stairsPit','tower','enemies','pit','plant','crumb'];
const seq = [];
for (let i=0; i<m.qn; i++){
seq.push(rp(['flatQ','highQ','brickQ']));
const nh = Math.floor(m.hz + r());
for (let k=0; k<nh; k++) seq.push(rp(haz));
}
let x = 8; const mid = Math.floor(seq.length / 2);
seq.forEach((sg, i) => { if (i === mid){ c.cp = x + 1; x += 4; } x += SEG[sg](c, x, d, r); });
c.w = x + 20;
return c;
}
const danger = c => c.enemies.length + 2*(c.plants.length + c.cannons.length + c.fire.length) + c.crumbs.length;
function genLevel(m){ // sucht deterministisch eine Variante, deren Gefahrenwert im Zielbereich liegt
let best = null, bd = Infinity;
for (let t=0; t<300; t++){
const c = genOnce({ ...m, seed: m.seed + t*7919 }); const sc = danger(c);
const dd = sc < m.score[0] ? m.score[0] - sc : sc > m.score[1] ? sc - m.score[1] : 0;
if (dd < bd){ bd = dd; best = c; } if (dd === 0) break;
}
return best;
}
const LEVELS = [
{ ...BASE[0], chap:0, diff:1 },
genLevel({ name:'Dreisatz-Hügel', code:'6.4.1', topic:'Proportionalität', chap:0, diff:2, seed:4101, qn:7, hz:1.6, score:[27,37], sky:['#4aa3df','#c4ecff'], espeed:70, ccd:2.6, fwait:0.9 }),
genLevel({ name:'Tempo-Gipfel', code:'6.4.1', topic:'Proportionalität', chap:0, diff:3, seed:4102, qn:8, hz:2.4, score:[48,64], sky:['#3d6fb0','#f7c6a3'], espeed:85, ccd:2.1, fwait:0.75 }),
{ ...BASE[1], chap:1, diff:1 },
genLevel({ name:'Oasen-Tausch', code:'6.4.2', topic:'Umgekehrte Proportionalität', chap:1, diff:2, seed:4201, qn:7, hz:2.7, score:[44,54], sky:['#f79d65','#ffeccf'], espeed:70, ccd:2.6, fwait:0.9 }),
genLevel({ name:'Dünen-Sturm', code:'6.4.2', topic:'Umgekehrte Proportionalität', chap:1, diff:3, seed:4202, qn:8, hz:2.7, score:[62,78], sky:['#a8452f','#f2b36b'], espeed:85, ccd:2.1, fwait:0.75 }),
{ ...BASE[2], chap:2, diff:1 },
genLevel({ name:'Tabellen-Turm', code:'6.4.3', topic:'Wertepaare & Wertetabellen', chap:2, diff:2, seed:4301, qn:7, hz:3.0, score:[50,60], sky:['#1f2a5c','#5b4a9e'], espeed:70, ccd:2.6, fwait:0.9 }),
genLevel({ name:'Zuordnungs-Kerker', code:'6.4.3', topic:'Wertepaare & Wertetabellen', chap:2, diff:3, seed:4302, qn:8, hz:3.0, score:[68,84], sky:['#0b0d24','#2c2457'], espeed:85, ccd:2.1, fwait:0.75 })
];
const E0=0, GROUND=1, BRICK=2, QB=3, USED=4, STONE=5, GATE=6, WOOD=7, CRUMB=8, POT=9, CANNON=10, HIDDEN=11, EGG=12;
let L = null;       // laufendes Level
let P = null;       // Spieler
let state = 'title';
let camX = 0, time = 0;
const keys = { left:false, right:false, jump:false, run:false };
let jumpBuf = 0, shootBuf = 0;
function buildLevel(i){
const c = LEVELS[i], W = c.w;
const g = []; for (let y=0; y<ROWS; y++) g.push(new Uint8Array(W));
for (let x=0; x<W; x++){ g[11][x] = GROUND; g[12][x] = GROUND; }
c.pits.forEach(([x,n]) => { for (let k=0;k<n;k++){ g[11][x+k]=0; g[12][x+k]=0; } });
c.pillars.forEach(([x,h]) => { for (let k=0;k<h;k++) g[10-k][x] = STONE; });
c.stairs.forEach(([x,n,dir]) => { for (let i2=0;i2<n;i2++){ const h = dir==='down' ? n-i2 : i2+1; for (let k=0;k<h;k++) g[10-k][x+i2] = STONE; } });
c.bricks.forEach(([x,y,n]) => { for (let k=0;k<n;k++) g[y][x+k] = BRICK; });
c.wood.forEach(([x,y,n]) => { for (let k=0;k<n;k++) g[y][x+k] = WOOD; });
c.q.forEach(([x,y]) => g[y][x] = QB);
(c.crumbs||[]).forEach(([x,y,n]) => { for (let k=0;k<n;k++) g[y][x+k] = CRUMB; });
const plants = (c.plants||[]).map(x => { g[10][x] = POT; return { tx:x, ext:0, t:Math.random()*4, alive:true, dead:0 }; });
const cannons = (c.cannons||[]).map(([x,y]) => { g[y][x] = CANNON; return { tx:x, ty:y, cd:1 + Math.random()*2, dir:-1 }; });
const jumpers = (c.fire||[]).map(([x,n],k) => ({ x:(x + n/2)*T, y:VH + 30, vy:0, wait:0.6 + k*0.8, px:x, pn:n }));
if (c.egg) g[c.egg[1]][c.egg[0]] = HIDDEN;
const gateX = W - 14; for (let y=0; y<=10; y++) g[y][gateX] = GATE;
const flagX = W - 8; g[10][flagX] = STONE;
const coins = []; c.coins.forEach(([x,y,n]) => { for (let k=0;k<n;k++) coins.push({ x:(x+k)*T+T/2, y:y*T+T/2, taken:false }); });
const enemies = c.enemies.map(ex => ({ x:ex*T+5, y:11*T-28, w:30, h:28, vx:-(c.espeed || 55), vy:0, alive:true, dead:0, active:false, onG:false }));
const th = Object.assign({}, THEMES[c.chap], c.sky ? { sky:c.sky } : {});
return { i, c, W, g, th, gateX, flagX, coins, enemies, plants, cannons, jumpers, shots:[], fireballs:[], crumbs:{}, crumbRe:{}, cpX:c.cp, cpOn:false, gateOpen:false,
solved:0, total:c.q.length, firstTry:0, wrong:0, score:0, coinN:0, hearts:3,
attempts:{}, bumps:{}, parts:[], pops:[], items:[], hintCd:0, winT:0, fanfare:false };
}
function newPlayer(x){ return { x, y:11*T-38, w:26, h:38, vx:0, vy:0, onG:false, face:1, inv:0, walkT:0, coyote:0, shootCd:0, shootAnim:0, star:0, fly:0, triple:0, magnet:0, thrust:false }; }
function startLevel(i){
L = buildLevel(i); P = newPlayer(3*T); camX = 0; bag = []; state = 'play';
hideAll(); clearKeys();
}
function tile(x,y){ if (x < 0 || x >= L.W) return STONE; if (y < 0 || y >= ROWS) return E0; return L.g[y][x]; }
const solid = id => id !== E0 && id !== HIDDEN;
/* ================= Physik ================= */
const ACC = 1700, FRIC = 1900, MAXW = 235, MAXR = 350, GRAV = 2250, JUMP = 870, MAXFALL = 950;
function moveBody(b, dt, onHead){
// horizontal
b.x += b.vx * dt;
let y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
if (b.vx > 0){ const tx = Math.floor((b.x + b.w) / T); for (let ty=y0; ty<=y1; ty++) if (solid(tile(tx,ty))){ b.x = tx*T - b.w - 0.01; b.vx = b.isEnemy ? -Math.abs(b.vx) : 0; b.hitWall = true; break; } }
else if (b.vx < 0){ const tx = Math.floor(b.x / T); for (let ty=y0; ty<=y1; ty++) if (solid(tile(tx,ty))){ b.x = (tx+1)*T + 0.01; b.vx = b.isEnemy ? Math.abs(b.vx) : 0; b.hitWall = true; break; } }
// vertikal
b.y += b.vy * dt; b.onG = false;
const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
if (b.vy > 0){
const ty = Math.floor((b.y + b.h) / T);
for (let tx=x0; tx<=x1; tx++) if (solid(tile(tx,ty))){ b.y = ty*T - b.h; b.vy = 0; b.onG = true; break; }
} else if (b.vy < 0){
const ty = Math.floor(b.y / T); let best = null, bestOv = 0;
for (let tx=x0; tx<=x1; tx++){ const tt = tile(tx,ty); if (solid(tt) || (onHead && tt === HIDDEN)){
const ov = Math.min(b.x + b.w, (tx+1)*T) - Math.max(b.x, tx*T);
if (ov > bestOv){ bestOv = ov; best = tx; }
}}
if (best !== null){ b.y = (ty+1)*T; b.vy = 0; if (onHead) onHead(best, ty); }
}
}
function update(dt){
time += dt;
if (state === 'win'){ L.winT += dt; P.vx = 0; if (L.winT > 1.6 && !L.shownWin){ L.shownWin = true; showLevelDone(); } updateFx(dt); return; }
if (state !== 'play') return;
// Eingabe
const max = keys.run ? MAXR : MAXW;
if (keys.left && !keys.right){ P.vx -= ACC*dt; P.face = -1; }
else if (keys.right && !keys.left){ P.vx += ACC*dt; P.face = 1; }
else { const s = Math.sign(P.vx); P.vx -= s*FRIC*dt; if (Math.sign(P.vx) !== s) P.vx = 0; }
P.vx = Math.max(-max, Math.min(max, P.vx));
if (P.onG) P.coyote = 0.09; else P.coyote -= dt;
if (jumpBuf > 0) jumpBuf -= dt;
if (jumpBuf > 0 && P.coyote > 0){ P.vy = -JUMP; P.coyote = 0; jumpBuf = 0; P.jt = 0; snd('jump'); }
P.jt = (P.jt || 0) + dt;
if (P.fly > 0){
P.thrust = keys.jump && P.jt > 0.05;
if (P.thrust) P.vy = Math.max(-430, P.vy - 3600*dt);
P.vy = Math.min(380, P.vy + 1200*dt);
} else {
P.thrust = false;
if (!keys.jump && P.jt > 0.12 && P.vy < -380) P.vy = -380;
P.vy = Math.min(MAXFALL, P.vy + GRAV*dt);
}
moveBody(P, dt, headBump);
if (P.x < 0) P.x = 0;
if (P.y < 48){ P.y = 48; if (P.vy < 0) P.vy = 0; }
if (Math.abs(P.vx) > 10 && P.onG) P.walkT += dt;
if (P.inv > 0) P.inv -= dt;
for (const k in POWERS){ if (P[k] > 0){ P[k] -= dt; if (P[k] <= 0){ P[k] = 0; pop(P.x + P.w/2, P.y - 24, POWERS[k].short + ' vorbei', '#aeb0dc'); } } }
if (state !== 'play') return; // Frage oder Geheimblock geöffnet
// Bröckelsteine
if (P.onG){
const fy = Math.floor((P.y + P.h + 1) / T);
for (let tx = Math.floor(P.x / T); tx <= Math.floor((P.x + P.w - 0.01) / T); tx++){
const k = tx + ',' + fy; if (tile(tx, fy) === CRUMB && L.crumbs[k] === undefined) L.crumbs[k] = 0.5;
}
}
// Schiessen
P.shootCd -= dt; if (P.shootAnim > 0) P.shootAnim -= dt;
if (shootBuf > 0){
shootBuf = 0;
if (P.shootCd <= 0 && L.shots.length < (P.triple > 0 ? 9 : 3)){
(P.triple > 0 ? [-170, 0, 170] : [0]).forEach(vy => L.shots.push({ x: P.face > 0 ? P.x + P.w : P.x - 10, y: P.y + 21, vx: P.face*580 + P.vx*0.3, vy, t: 1.1 }));
P.shootCd = 0.28; P.shootAnim = 0.15; snd('shoot');
}
}
// Loch
if (P.y > VH + 60){ loseHeart(true); return; }
// Checkpoint
if (!L.cpOn && P.x > L.cpX*T){ L.cpOn = true; pop(L.cpX*T+T/2, 7*T, 'CHECKPOINT!', '#3ad1c4'); snd('open'); }
// Tor
if (!L.gateOpen && P.x + P.w >= L.gateX*T - 2){
L.hintCd -= dt;
if (L.hintCd <= 0){ pop(L.gateX*T, 3*T - 6, `Zuerst alle ∝-Blöcke lösen! (${L.solved}/${L.total})`, '#ffc83d'); L.hintCd = 2.5; }
}
// Ziel
if (P.x + P.w > L.flagX*T + T/2 - 4){ state = 'win'; L.winT = 0; snd('win'); return; }
// Münzen
if (P.magnet > 0) for (const c of L.coins){
if (c.taken) continue; const dx = P.x + P.w/2 - c.x, dy = P.y + P.h/2 - c.y, d = Math.hypot(dx, dy);
if (d < 220 && d > 1){ c.x += dx/d*460*dt; c.y += dy/d*460*dt; }
}
for (const c of L.coins){ if (!c.taken && Math.abs(P.x + P.w/2 - c.x) < 22 && Math.abs(P.y + P.h/2 - c.y) < 28){ c.taken = true; L.coinN++; L.score += 10; snd('coin'); } }
// Gegner
for (const e of L.enemies){
if (!e.alive){ e.dead -= dt; continue; }
if (!e.active){ if (e.x < camX + VW + 60) e.active = true; else continue; }
e.isEnemy = true; e.vy = Math.min(MAXFALL, e.vy + GRAV*dt);
if (e.onG){
const fx = e.vx < 0 ? Math.floor((e.x - 2) / T) : Math.floor((e.x + e.w + 2) / T);
const fy = Math.floor((e.y + e.h + 2) / T);
if (!solid(tile(fx, fy))) e.vx = -e.vx;
}
moveBody(e, dt);
if (e.y > VH + 100){ e.alive = false; e.dead = 0; continue; }
// Kontakt
if (P.x < e.x + e.w && P.x + P.w > e.x && P.y < e.y + e.h && P.y + P.h > e.y){
if (P.star > 0){ e.alive = false; e.dead = 0.5; L.score += 50; snd('stomp'); pop(e.x + e.w/2, e.y - 6, '+50', '#fff'); burst(e.x + e.w/2, e.y + e.h/2, '#ff4f8b', 8); }
else if (P.vy > 50 && (P.y + P.h) - e.y < 22){
e.alive = false; e.dead = 0.5; P.vy = -560; L.score += 50; snd('stomp');
pop(e.x + e.w/2, e.y - 6, '+50', '#fff');
for (let k=0;k<8;k++) L.parts.push({ x:e.x+e.w/2, y:e.y+e.h/2, vx:R(-160,160), vy:R(-260,-60), t:0.6, c:'#ff4f8b', s:5 });
} else if (P.inv <= 0){
P.vx = (P.x < e.x ? -1 : 1) * 260; P.vy = -380; loseHeart(false);
}
}
}
// Fressblumen
for (const pl of L.plants){
if (!pl.alive){ pl.dead -= dt; continue; }
const cx = pl.tx*T + T/2;
const near = Math.abs(P.x + P.w/2 - cx) < T*1.4;
if (!((pl.t % 4) < 1.2 && near)) pl.t += dt;
const ph = pl.t % 4;
pl.ext = ph < 1.2 ? 0 : ph < 1.8 ? (ph - 1.2)/0.6 : ph < 3.2 ? 1 : ph < 3.8 ? 1 - (ph - 3.2)/0.6 : 0;
if (pl.ext > 0.25 && (P.inv <= 0 || P.star > 0)){
const top = 10*T - 58*pl.ext;
if (P.x < cx + 13 && P.x + P.w > cx - 13 && P.y < 10*T && P.y + P.h > top + 6){
if (P.star > 0){ pl.alive = false; pl.dead = 0.6; L.score += 80; snd('stomp'); pop(cx, top - 6, '+80', '#fff'); burst(cx, top + 16, '#c77dff', 10); continue; }
P.vx = (P.x + P.w/2 < cx ? -1 : 1) * 280; P.vy = -420; loseHeart(false);
pop(cx, top - 10, 'HAPP!', '#c77dff');
}
}
}
// Feuerspucker
for (const cn of L.cannons){
const cx = cn.tx*T + T/2, cy = cn.ty*T + T/2;
if (cx < camX - 40 || cx > camX + VW + 40) continue;
const dx = (P.x + P.w/2) - cx; cn.dir = dx < 0 ? -1 : 1; cn.cd -= dt;
if (cn.cd <= 0 && Math.abs(dx) > T*1.5 && Math.abs(dx) < T*11){
cn.cd = L.c.ccd || 3; L.fireballs.push({ x: cx + cn.dir*24, y: cy, y0: cy, vx: cn.dir*210, t: 6, ph: 0 }); snd('fire');
}
}
L.fireballs = L.fireballs.filter(f => {
f.t -= dt; f.x += f.vx*dt; f.ph += dt*6; f.y = f.y0 + Math.sin(f.ph)*6;
if (f.t <= 0) return false;
const id = tile(Math.floor(f.x / T), Math.floor(f.y / T));
if (solid(id) && id !== CANNON){ burst(f.x, f.y, '#ff9f1c', 6); return false; }
if (Math.random() < 0.3) L.parts.push({ x:f.x - Math.sign(f.vx)*8, y:f.y + R(-4,4), vx:-f.vx*0.2, vy:R(-60,-10), t:0.3, c:'#ffd166', s:4 });
hitFire(f.x, f.y, 12);
return true;
});
// Feuerbälle aus der Lava
for (const j of L.jumpers){
if (j.wait > 0){ j.wait -= dt; if (j.wait <= 0){ j.y = VH + 20; j.vy = -1000; } continue; }
j.vy += 1400*dt; j.y += j.vy*dt;
if (j.y > VH + 30 && j.vy > 0){ j.wait = (1.4 + Math.random()*1.4) * (L.c.fwait || 1); continue; }
if (Math.random() < 0.4) L.parts.push({ x:j.x + R(-6,6), y:j.y + (j.vy < 0 ? 12 : -12), vx:R(-20,20), vy:0, t:0.35, c:'#ff9f1c', s:4 });
hitFire(j.x, j.y, 13);
}
// Schüsse
L.shots = L.shots.filter(sh => {
sh.t -= dt; sh.x += sh.vx*dt; sh.y += (sh.vy || 0)*dt;
if (sh.t <= 0) return false;
if (solid(tile(Math.floor(sh.x / T), Math.floor(sh.y / T)))){ burst(sh.x, sh.y, '#5ff2e3', 5); return false; }
for (const e of L.enemies){
if (e.alive && sh.x > e.x - 4 && sh.x < e.x + e.w + 4 && sh.y > e.y - 4 && sh.y < e.y + e.h + 4){
e.alive = false; e.dead = 0.5; L.score += 50; snd('stomp'); pop(e.x + e.w/2, e.y - 6, '+50', '#fff'); burst(sh.x, sh.y, '#ff4f8b', 8); return false;
}
}
for (const pl of L.plants){
const cx = pl.tx*T + T/2, top = 10*T - 58*pl.ext;
if (pl.alive && pl.ext > 0.2 && Math.abs(sh.x - cx) < 16 && sh.y > top && sh.y < 10*T){
pl.alive = false; pl.dead = 0.6; L.score += 80; snd('stomp'); pop(cx, top - 6, '+80', '#fff'); burst(cx, top + 16, '#c77dff', 10); return false;
}
}
return true;
});
// Tor öffnen
if (!L.gateOpen && L.solved >= L.total){
L.gateOpen = true;
for (let y=0; y<=10; y++){ L.g[y][L.gateX] = E0; for (let k=0;k<5;k++) L.parts.push({ x:L.gateX*T+T/2, y:y*T+T/2, vx:R(-200,200), vy:R(-300,0), t:0.8, c:'#c7cbe0', s:6 }); }
pop(P.x + P.w/2, P.y - 30, 'TOR OFFEN!', '#3ddc84'); snd('gate');
}
// Kamera
const target = Math.max(0, Math.min(L.W*T - VW, P.x - VW*0.4));
camX += (target - camX) * Math.min(1, dt*8);
updateFx(dt);
}
function updateFx(dt){
for (const k in L.crumbs){
L.crumbs[k] -= dt;
if (L.crumbs[k] <= 0){
delete L.crumbs[k]; const [x,y] = k.split(',').map(Number); L.g[y][x] = E0; L.crumbRe[k] = 5; snd('crumble');
for (let n=0;n<8;n++) L.parts.push({ x:x*T + R(4,36), y:y*T + R(4,36), vx:R(-60,60), vy:R(-120,40), t:0.8, c:'#b8915e', s:R(4,8) });
}
}
for (const k in L.crumbRe){
L.crumbRe[k] -= dt;
if (L.crumbRe[k] <= 0){
const [x,y] = k.split(',').map(Number);
const over = P.x < (x+1)*T && P.x + P.w > x*T && P.y < (y+1)*T && P.y + P.h > y*T;
if (!over){ delete L.crumbRe[k]; L.g[y][x] = CRUMB; }
}
}
for (const k in L.bumps){ L.bumps[k] -= dt; if (L.bumps[k] <= 0) delete L.bumps[k]; }
L.parts = L.parts.filter(p => { p.t -= dt; p.x += p.vx*dt; p.vy += 900*dt; p.y += p.vy*dt; return p.t > 0; });
L.pops = L.pops.filter(p => { p.t -= dt; p.y -= 30*dt; return p.t > 0; });
L.items = L.items.filter(it => {
it.t -= dt; it.y -= 90*dt;
if (it.t <= 0){ if (it.kind === 'heart'){ L.hearts = Math.min(3, L.hearts + 1); snd('heart'); pop(it.x, it.y, '+1 ♥', '#ff5470'); }
else if (it.kind === 'power') givePower(it.p);
return false; }
return true;
});
}
function pop(x,y,text,color){ L.pops.push({ x, y, text, color, t:1.4 }); }
const POWERS = {
star:   { name:'Unbesiegbar-Stern', short:'Stern', dur:10, color:'#ffc83d', desc:'10 Sekunden unbesiegbar: Gegner, Fressblumen und Feuer können dir nichts anhaben. Renn einfach durch! (Löcher bleiben gefährlich.)' },
fly:    { name:'Jetpack', short:'Jetpack', dur:10, color:'#5ff2e3', desc:'10 Sekunden fliegen: Halte die Sprungtaste gedrückt, dann steigst du in die Luft.' },
triple: { name:'Dreifach-Schuss', short:'Dreifach-Schuss', dur:15, color:'#3ad1c4', desc:'15 Sekunden lang teilt sich jeder Schuss in drei Energiekugeln.' },
magnet: { name:'Münz-Magnet', short:'Magnet', dur:15, color:'#ff5470', desc:'15 Sekunden lang fliegen Münzen in der Nähe zu dir.' }
};
function givePower(k){ P[k] = POWERS[k].dur; snd('power'); pop(P.x + P.w/2, P.y - 30, POWERS[k].name.toUpperCase() + '!', POWERS[k].color); }
function drawPower(k, x, y, sc){
ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
if (k === 'star'){
ctx.fillStyle = '#ffc83d'; ctx.beginPath();
for (let i=0;i<10;i++){ const r = i % 2 ? 6 : 14, a = -Math.PI/2 + i*Math.PI/5; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5700'; ctx.lineWidth = 2; ctx.stroke();
ctx.fillStyle = '#1b1300'; ctx.fillRect(-4, -3, 2, 4); ctx.fillRect(2, -3, 2, 4);
} else if (k === 'fly'){
ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-9, -2, 9, 5, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(9, -2, 9, 5, 0.5, 0, 7); ctx.fill();
ctx.fillStyle = '#8a8fb0'; rr(-4, -9, 8, 16, 3); ctx.fill();
ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(3, 7); ctx.lineTo(0, 14); ctx.fill();
} else if (k === 'triple'){
[[-9,4],[0,-6],[9,4]].forEach(([a,b]) => { ctx.fillStyle = '#3ad1c4'; ctx.beginPath(); ctx.arc(a, b, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a, b, 2, 0, 7); ctx.fill(); });
} else if (k === 'magnet'){
ctx.strokeStyle = '#ff5470'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0); ctx.stroke();
ctx.fillStyle = '#ff5470'; ctx.fillRect(-11.5, -2, 7, 8); ctx.fillRect(4.5, -2, 7, 8);
ctx.fillStyle = '#e8ecf5'; ctx.fillRect(-11.5, 6, 7, 5); ctx.fillRect(4.5, 6, 7, 5);
}
ctx.restore();
}
function burst(x,y,c,n){ for (let k=0;k<n;k++) L.parts.push({ x, y, vx:R(-180,180), vy:R(-260,-40), t:0.5, c, s:4 }); }
function hitFire(x,y,r){
if (P.inv > 0 || P.star > 0 || state !== 'play') return;
const nx = Math.max(P.x, Math.min(x, P.x + P.w)), ny = Math.max(P.y, Math.min(y, P.y + P.h));
if ((x-nx)*(x-nx) + (y-ny)*(y-ny) < r*r){ P.vx = (P.x + P.w/2 < x ? -1 : 1) * 260; P.vy = -360; loseHeart(false); pop(P.x + P.w/2, P.y - 20, 'AUTSCH!', '#ff9f1c'); }
}
function showEgg(){
state = 'egg'; clearKeys(); L.score += 500; save.eggFound = true; persist(); snd('egg');
const cols = ['#ffc83d','#ff5470','#3ad1c4','#c77dff','#3ddc84','#ff7a1a'];
for (let k=0;k<70;k++) L.parts.push({ x:P.x + P.w/2, y:P.y - 30, vx:R(-320,320), vy:R(-650,-150), t:1.6, c:pick(cols), s:R(4,7) });
pop(P.x + P.w/2, P.y - 50, '+500 GEHEIM!', '#ffc83d');
$('ovEgg').hidden = false;
setTimeout(() => $('eggOk').focus({ preventScroll:true }), 30);
}
function closeEgg(){ $('ovEgg').hidden = true; state = 'play'; clearKeys(); }
function headBump(tx, ty){
const id = L.g[ty][tx];
L.bumps[tx+','+ty] = 0.18;
if (id === QB){ snd('open'); openQuestion(tx, ty); }
else if (id === HIDDEN){ L.g[ty][tx] = EGG; showEgg(); }
else snd('bump');
}
function loseHeart(fell){
if (state !== 'play') return;
L.hearts--; snd('hurt'); try { if (navigator.vibrate) navigator.vibrate(90); } catch (er) {}
if (L.hearts <= 0){ gameOver(); return; }
P.inv = 1.6;
if (fell){ respawn(); pop(P.x + P.w/2, P.y - 20, '−1 ♥', '#ff5470'); }
else pop(P.x + P.w/2, P.y - 20, '−1 ♥', '#ff5470');
}
function respawn(){
const x = L.cpOn ? L.cpX*T : 3*T;
P.x = x; P.y = 11*T - 38 - 120; P.vx = 0; P.vy = 0; P.inv = 1.6;
camX = Math.max(0, Math.min(L.W*T - VW, P.x - VW*0.4));
}
/* ================= Zeichnen ================= */
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
const STARS = Array.from({length:70}, (_,i) => ({ x:(i*137.5)%VW, y:((i*71.3)%300), r:(i%3)+1 }));
function drawBG(th){
const gr = ctx.createLinearGradient(0,0,0,VH); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]);
ctx.fillStyle = gr; ctx.fillRect(0,0,VW,VH);
if (th.stars){ for (const s of STARS){ ctx.globalAlpha = 0.5 + 0.5*Math.sin(time*2 + s.x); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); } ctx.globalAlpha = 1; }
if (th.sun){ ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(760, 120, 56, 0, 7); ctx.fill(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(760,120,80,0,7); ctx.fill(); ctx.globalAlpha = 1; }
if (th.moon){ ctx.fillStyle = th.moon; ctx.beginPath(); ctx.arc(780, 100, 38, 0, 7); ctx.fill(); ctx.fillStyle = th.sky[0]; ctx.beginPath(); ctx.arc(796, 90, 34, 0, 7); ctx.fill(); }
// Wolken
ctx.fillStyle = th.cloud;
for (let i=0;i<7;i++){
const wx = ((i*260 - camX*0.25) % (VW+300) + VW+300) % (VW+300) - 150; const wy = 50 + (i*53)%110;
ctx.beginPath(); ctx.arc(wx, wy, 22, 0, 7); ctx.arc(wx+26, wy-10, 28, 0, 7); ctx.arc(wx+56, wy, 22, 0, 7); ctx.rect(wx, wy, 56, 22); ctx.fill();
}
hills(th.hill1, 0.15, 330, 60, 0.004);
hills(th.hill2, 0.35, 390, 45, 0.007);
}
function hills(col, par, base, amp, fq){
ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
for (let x=0; x<=VW; x+=8){ const wx = x + camX*par; ctx.lineTo(x, base - (Math.sin(wx*fq)*amp + Math.sin(wx*fq*2.7+1)*amp*0.4)); }
ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
}
function drawTile(id, x, y, tx, ty, th){
const px = tx*T, py = ty*T;
if (id === GROUND){
ctx.fillStyle = th.ground; ctx.fillRect(px, py, T, T);
ctx.fillStyle = th.groundDark;
for (let k=0;k<3;k++){ const ox = ((tx*17 + ty*31 + k*13) % 30) + 4, oy = ((tx*7 + ty*11 + k*19) % 28) + 6; ctx.fillRect(px+ox, py+oy, 4, 4); }
if (tile(tx, ty-1) === E0){ ctx.fillStyle = th.grass; ctx.fillRect(px, py, T, 10); ctx.fillStyle = th.grassDark; ctx.fillRect(px, py+10, T, 3); for (let k=0;k<4;k++) ctx.fillRect(px + k*10 + 3, py + 8, 4, 6); }
} else if (id === BRICK){
ctx.fillStyle = th.brick; ctx.fillRect(px, py, T, T);
ctx.fillStyle = th.brickLine;
ctx.fillRect(px, py, T, 2); ctx.fillRect(px, py+T/2-1, T, 2); ctx.fillRect(px, py+T-2, T, 2);
ctx.fillRect(px+T/2-1, py, 2, T/2); ctx.fillRect(px+10, py+T/2, 2, T/2); ctx.fillRect(px+30, py+T/2, 2, T/2);
ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(px+2, py+2, T-4, 3);
} else if (id === QB || id === USED){
const used = id === USED;
ctx.fillStyle = used ? '#7d5d3f' : '#f2a90e'; ctx.fillRect(px, py, T, T);
if (!used){
const sh = 0.5 + 0.5*Math.sin(time*4 + tx);
ctx.fillStyle = `rgba(255,236,150,${0.35 + 0.35*sh})`; ctx.fillRect(px+3, py+3, T-6, T/2-3);
}
ctx.strokeStyle = used ? '#4b3522' : '#8a5700'; ctx.lineWidth = 3; ctx.strokeRect(px+1.5, py+1.5, T-3, T-3);
ctx.fillStyle = used ? '#4b3522' : '#8a5700';
[[5,5],[T-8,5],[5,T-8],[T-8,T-8]].forEach(([a,b]) => ctx.fillRect(px+a, py+b, 3, 3));
if (!used){
ctx.font = `bold 28px 'Baloo 2', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.fillStyle = '#6e3d00'; ctx.fillText('∝', px+T/2+2, py+T/2+3);
ctx.fillStyle = '#fff'; ctx.fillText('∝', px+T/2, py+T/2+1);
} else {
ctx.fillStyle = '#3ddc84'; ctx.font = `bold 22px 'Baloo 2', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', px+T/2, py+T/2+1);
}
} else if (id === STONE){
ctx.fillStyle = th.stone; ctx.fillRect(px, py, T, T);
ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(px, py, T, 4); ctx.fillRect(px, py, 4, T);
ctx.fillStyle = th.stoneDark; ctx.fillRect(px, py+T-4, T, 4); ctx.fillRect(px+T-4, py, 4, T);
} else if (id === WOOD){
ctx.fillStyle = '#b77b3c'; ctx.fillRect(px, py, T, T/2+4);
ctx.fillStyle = '#7f4f1f'; ctx.fillRect(px, py+T/2+2, T, 3); ctx.fillRect(px+T-2, py, 2, T/2+4);
ctx.fillStyle = '#e0a96b'; ctx.fillRect(px, py, T, 3);
ctx.fillStyle = '#5a3612'; ctx.fillRect(px+5, py+8, 3, 3); ctx.fillRect(px+T-9, py+8, 3, 3);
} else if (id === CRUMB){
const left = L.crumbs[tx+','+ty];
ctx.fillStyle = left !== undefined ? '#e2c08f' : '#d4ad78'; ctx.fillRect(px, py, T, T);
ctx.fillStyle = '#9c7445'; ctx.fillRect(px, py+T-5, T, 5); ctx.fillStyle = '#f2d9ae'; ctx.fillRect(px, py, T, 4);
ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2; ctx.beginPath();
ctx.moveTo(px+8, py+4); ctx.lineTo(px+15, py+16); ctx.lineTo(px+11, py+27); ctx.lineTo(px+18, py+36);
ctx.moveTo(px+30, py+5); ctx.lineTo(px+25, py+15); ctx.lineTo(px+33, py+24);
ctx.moveTo(px+15, py+16); ctx.lineTo(px+25, py+15); ctx.stroke();
ctx.fillStyle = '#7a5530'; ctx.fillRect(px+5, py+30, 3, 3); ctx.fillRect(px+30, py+31, 3, 3);
} else if (id === POT){
ctx.fillStyle = '#b5532d'; ctx.beginPath(); ctx.moveTo(px+5, py+10); ctx.lineTo(px+T-5, py+10); ctx.lineTo(px+T-9, py+T); ctx.lineTo(px+9, py+T); ctx.closePath(); ctx.fill();
ctx.fillStyle = '#d9703f'; ctx.fillRect(px+1, py+2, T-2, 11);
ctx.fillStyle = '#7e3417'; ctx.fillRect(px+1, py+11, T-2, 3); ctx.fillRect(px+4, py+2, T-8, 3);
ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(px+10, py+16, 4, 18);
} else if (id === CANNON){
ctx.fillStyle = '#34375a'; rr(px+1, py+1, T-2, T-2, 7); ctx.fill();
ctx.fillStyle = '#4b4f7a'; ctx.fillRect(px+4, py+4, T-8, 6);
ctx.fillStyle = '#ffd166'; [[6,T-9],[T-9,T-9]].forEach(([a,b]) => ctx.fillRect(px+a, py+b, 3, 3));
} else if (id === HIDDEN){
const tw = (time*0.5 + tx*0.37) % 6;
if (tw < 0.3){ ctx.globalAlpha = 0.7*Math.sin(tw/0.3*Math.PI); ctx.fillStyle = '#fff'; ctx.fillRect(px+T/2-1, py+T/2-6, 2, 12); ctx.fillRect(px+T/2-6, py+T/2-1, 12, 2); ctx.globalAlpha = 1; }
} else if (id === EGG){
const gr = ctx.createLinearGradient(px, py, px+T, py+T);
['#ff5470','#ffc83d','#3ddc84','#3ad1c4','#c77dff'].forEach((c,k) => gr.addColorStop(k/4, c));
ctx.fillStyle = gr; ctx.fillRect(px, py, T, T);
ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 3; ctx.strokeRect(px+1.5, py+1.5, T-3, T-3);
ctx.fillStyle = '#fff'; ctx.font = `bold 24px 'Baloo 2', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', px+T/2, py+T/2+1);
} else if (id === GATE){
ctx.fillStyle = '#23253f'; ctx.fillRect(px, py, T, T);
ctx.fillStyle = '#a5abc4'; for (let k=0;k<4;k++) ctx.fillRect(px + 4 + k*10, py, 4, T);
ctx.fillStyle = '#6c7290'; ctx.fillRect(px, py + 16, T, 6);
if (ty === 7){ ctx.fillStyle = '#ffc83d'; rr(px+10, py+12, 20, 18, 3); ctx.fill(); ctx.strokeStyle = '#ffc83d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px+20, py+12, 7, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#5a3d00'; ctx.fillRect(px+18, py+18, 4, 7); }
}
}
function drawHero(p){
if (p.inv > 0 && Math.floor(time*20) % 2) return;
ctx.save(); ctx.translate(Math.round(p.x + p.w/2), Math.round(p.y)); ctx.scale(p.face, 1);
if (p.star > 0 && !(p.star < 2 && Math.floor(time*10) % 2)){ ctx.fillStyle = `hsla(${(time*600) % 360},100%,60%,.5)`; ctx.beginPath(); ctx.ellipse(0, 17, 23, 27, 0, 0, 7); ctx.fill(); }
if (p.fly > 0){
ctx.fillStyle = '#8a8fb0'; rr(-20, 13, 8, 17, 3); ctx.fill(); ctx.fillStyle = '#5ff2e3'; ctx.fillRect(-19, 16, 6, 3);
if (p.thrust){ ctx.fillStyle = Math.floor(time*30) % 2 ? '#ffb627' : '#ff5a1f'; ctx.beginPath(); ctx.moveTo(-20, 30); ctx.lineTo(-12, 30); ctx.lineTo(-16, 40 + Math.random()*7); ctx.fill(); }
}
const moving = p.onG && Math.abs(p.vx) > 20; const w = moving ? Math.sin(p.walkT*16) : 0; const air = !p.onG;
ctx.fillStyle = '#2b2d42';
if (air){ ctx.fillRect(-10, 28, 8, 8); ctx.fillRect(3, 26, 8, 8); }
else { ctx.fillRect(-10, 30 - Math.max(0,w)*3, 8, 8); ctx.fillRect(3, 30 - Math.max(0,-w)*3, 8, 8); }
ctx.fillStyle = '#d95d00'; ctx.fillRect(-15, 18 + w*2, 5, 10); // hinterer Arm
ctx.fillStyle = '#ff7a1a'; rr(-12, 15, 24, 17, 5); ctx.fill();
ctx.fillStyle = '#d95d00'; ctx.fillRect(-12, 27, 24, 3);
ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(1, 22, 3.5, 0, 7); ctx.fill();
ctx.fillStyle = '#ff9a4d';
if (p.shootAnim > 0){ ctx.fillRect(10, 19, 12, 5); ctx.fillStyle = '#5ff2e3'; ctx.beginPath(); ctx.arc(23, 21.5, 4, 0, 7); ctx.fill(); }
else ctx.fillRect(10, 18 - w*2 - (air?6:0), 5, 10); // vorderer Arm
ctx.fillStyle = '#e9f1f7'; rr(-11, 0, 22, 17, 5); ctx.fill();
ctx.fillStyle = '#1d3557'; rr(-7, 4, 17, 9, 3); ctx.fill();
const blink = (Math.floor(time*10) % 37) === 0;
ctx.fillStyle = '#5ff2e3'; if (!blink){ ctx.fillRect(0, 6, 3, 5); ctx.fillRect(5, 6, 3, 5); } else { ctx.fillRect(0, 9, 3, 1); ctx.fillRect(5, 9, 3, 1); }
ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-2, -6); ctx.stroke();
ctx.fillStyle = (Math.floor(time*3) % 2) ? '#ef233c' : '#ff8fa3'; ctx.beginPath(); ctx.arc(-2, -7, 3, 0, 7); ctx.fill();
ctx.restore();
}
function drawEnemy(e){
const cx = e.x + e.w/2, by = e.y + e.h;
if (!e.alive){
if (e.dead <= 0) return;
ctx.globalAlpha = Math.min(1, e.dead*2); ctx.fillStyle = '#c2185b'; ctx.beginPath(); ctx.ellipse(cx, by-5, 17, 5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return;
}
const s = Math.sin(time*12 + e.x*0.1), bob = s*1.2;
ctx.fillStyle = '#4a1030';
ctx.beginPath(); ctx.ellipse(cx-8, by-3 - Math.max(0,s)*2, 7, 4, 0, 0, 7); ctx.fill();
ctx.beginPath(); ctx.ellipse(cx+8, by-3 - Math.max(0,-s)*2, 7, 4, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#ffd166';
ctx.beginPath(); ctx.moveTo(cx-12, e.y+6+bob); ctx.lineTo(cx-8, e.y-4+bob); ctx.lineTo(cx-4, e.y+5+bob); ctx.fill();
ctx.beginPath(); ctx.moveTo(cx+4, e.y+5+bob); ctx.lineTo(cx+8, e.y-4+bob); ctx.lineTo(cx+12, e.y+6+bob); ctx.fill();
ctx.fillStyle = '#c2185b'; ctx.beginPath(); ctx.ellipse(cx, e.y + 15 + bob, 15, 12, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#f06292'; ctx.beginPath(); ctx.ellipse(cx, e.y + 20 + bob, 9, 5, 0, 0, 7); ctx.fill();
const look = e.vx < 0 ? -1.5 : 1.5;
ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx-5, e.y+12+bob, 4, 0, 7); ctx.arc(cx+5, e.y+12+bob, 4, 0, 7); ctx.fill();
ctx.fillStyle = '#1a0710'; ctx.fillRect(cx-6+look, e.y+11+bob, 2.5, 3.5); ctx.fillRect(cx+4+look, e.y+11+bob, 2.5, 3.5);
ctx.strokeStyle = '#1a0710'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx-9, e.y+6+bob); ctx.lineTo(cx-2, e.y+9+bob); ctx.moveTo(cx+9, e.y+6+bob); ctx.lineTo(cx+2, e.y+9+bob); ctx.stroke();
ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×', cx, e.y+20+bob);
}
function drawHeart(x, y, full, sz){
sz = sz || 1; ctx.save(); ctx.translate(x, y); ctx.scale(sz, sz);
ctx.fillStyle = full ? '#ff5470' : 'rgba(255,255,255,.18)';
ctx.beginPath(); ctx.moveTo(10, 18); ctx.bezierCurveTo(-6, 8, 0, -4, 10, 4); ctx.bezierCurveTo(20, -4, 26, 8, 10, 18); ctx.fill();
if (full){ ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(4, 4, 3, 3); }
ctx.restore();
}
function drawCoin(x, y){
const w = Math.abs(Math.cos(time*5 + x*0.05)) * 10 + 2;
ctx.fillStyle = '#b77d00'; ctx.beginPath(); ctx.ellipse(x+1, y+1, w, 13, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(x, y, w, 13, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - w*0.3, y - 7, Math.max(1, w*0.3), 10);
}
function drawGoal(){
const fx = L.flagX*T + T/2;
ctx.fillStyle = '#e8ecf5'; ctx.fillRect(fx-3, 2*T, 6, 8*T);
ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.arc(fx, 2*T, 8, 0, 7); ctx.fill();
const fy = state === 'win' ? Math.max(2*T + 8, 8*T - L.winT*220) : 8*T;
ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.moveTo(fx+3, fy); ctx.lineTo(fx+60, fy+18); ctx.lineTo(fx+3, fy+36); ctx.fill();
ctx.fillStyle = '#0d3b22'; ctx.font = `10px 'Press Start 2P', monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(L.c.code, fx+8, fy+18);
// Zielhaus
const hx = (L.flagX + 3)*T, hy = 11*T;
ctx.fillStyle = '#6c7290'; ctx.fillRect(hx, hy - 4*T, 4*T, 4*T);
ctx.fillStyle = '#8b91b0'; for (let k=0;k<4;k++) ctx.fillRect(hx + k*T + 4, hy - 4*T - 16, T - 8, 16);
ctx.fillStyle = '#23253f'; rr(hx + 1.3*T, hy - 2*T, 1.4*T, 2*T, 20); ctx.fill(); ctx.fillRect(hx + 1.3*T, hy - T, 1.4*T, T);
ctx.fillStyle = '#ffc83d'; ctx.fillRect(hx + 0.4*T, hy - 3.2*T, 0.6*T, 0.6*T); ctx.fillRect(hx + 3*T, hy - 3.2*T, 0.6*T, 0.6*T);
ctx.fillStyle = '#fff'; ctx.font = `10px 'Press Start 2P', monospace`; ctx.textAlign = 'center'; ctx.fillText('ZIEL', hx + 2*T, hy - 3.6*T);
}
function drawCheckpoint(){
const x = L.cpX*T + T/2;
ctx.fillStyle = '#d9dcea'; ctx.fillRect(x-2, 9*T, 4, 2*T);
ctx.fillStyle = L.cpOn ? '#3ad1c4' : '#8a8fb0';
ctx.beginPath(); ctx.moveTo(x+2, 9*T); ctx.lineTo(x+26, 9*T+10); ctx.lineTo(x+2, 9*T+20); ctx.fill();
}
function drawGateLabel(){
if (L.gateOpen) return;
const x = L.gateX*T + T/2, y = 3*T + 10;
const txt = `∝ ${L.solved}/${L.total}`;
ctx.font = `12px 'Press Start 2P', monospace`; const w = ctx.measureText(txt).width + 20;
ctx.fillStyle = 'rgba(20,22,46,.85)'; rr(x - w/2, y - 14, w, 28, 6); ctx.fill();
ctx.fillStyle = '#ffc83d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1);
}
function drawHUD(){
ctx.fillStyle = 'rgba(12,13,32,.62)'; ctx.fillRect(0, 0, VW, 42);
for (let i=0;i<3;i++) drawHeart(12 + i*30, 11, i < L.hearts, 1.1);
ctx.font = `13px 'Press Start 2P', monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(122, 21, 7, 10, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#fff'; ctx.fillText('×' + L.coinN, 134, 22);
ctx.fillText('PUNKTE ' + L.score, 220, 22);
ctx.fillStyle = '#ffc83d'; ctx.fillText('∝ ' + L.solved + '/' + L.total, 470, 22);
ctx.font = `10px 'Press Start 2P', monospace`; ctx.textAlign = 'right'; ctx.fillStyle = '#9fe9e1';
ctx.fillText(`${L.c.code}·${L.c.diff}  ${L.c.name.toUpperCase()}`, VW - 12, 22);
let hx = 10;
for (const k in POWERS){
if (!(P[k] > 0)) continue; const pw = POWERS[k];
ctx.fillStyle = 'rgba(12,13,32,.66)'; rr(hx, 48, 122, 28, 6); ctx.fill();
drawPower(k, hx + 15, 62, 0.8);
ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(hx + 32, 58, 80, 8);
ctx.fillStyle = (P[k] < 2 && Math.floor(time*8) % 2) ? '#fff' : pw.color; ctx.fillRect(hx + 32, 58, 80 * P[k] / pw.dur, 8);
hx += 130;
}
}
function drawLava(){
for (const j of L.jumpers){
const x = j.px*T, w = j.pn*T, y = 12*T + 8;
ctx.fillStyle = '#ff5a1f'; ctx.fillRect(x, y, w, VH - y);
ctx.fillStyle = '#ffb627';
for (let k=0; k<w; k+=10) ctx.fillRect(x + k, y - 3 + Math.sin(time*4 + k*0.3)*3, 10, 6);
ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff7b00'; ctx.fillRect(x, y - 40, w, 40); ctx.globalAlpha = 1;
}
}
function drawPlant(pl){
if (!pl.alive || pl.ext <= 0) return;
const cx = pl.tx*T + T/2, top = 10*T - 58*pl.ext, base = 10*T + 8;
ctx.fillStyle = '#2f9e44'; ctx.fillRect(cx-3, top + 24, 6, Math.max(0, base - top - 24));
if (pl.ext > 0.6){
ctx.fillStyle = '#40c057';
ctx.beginPath(); ctx.ellipse(cx-10, top + 44, 10, 4, -0.5, 0, 7); ctx.fill();
ctx.beginPath(); ctx.ellipse(cx+10, top + 40, 10, 4, 0.5, 0, 7); ctx.fill();
}
const open = (Math.sin(time*9 + pl.tx) + 1) / 2;
const hy = top + 15;
ctx.fillStyle = '#7b2cbf'; ctx.beginPath(); ctx.arc(cx, hy, 16, 0, 7); ctx.fill();
ctx.fillStyle = '#c77dff'; [[-9,-8],[8,-9],[-2,-12],[10,4]].forEach(([a,b]) => { ctx.beginPath(); ctx.arc(cx+a, hy+b, 2.5, 0, 7); ctx.fill(); });
const mh = 3 + open*10;
ctx.fillStyle = '#2a0a3d'; ctx.beginPath(); ctx.ellipse(cx, hy + 3, 12, mh/2 + 1, 0, 0, 7); ctx.fill();
ctx.fillStyle = '#fff';
for (let k=-2; k<=2; k++){
const tx2 = cx + k*4.5;
ctx.beginPath(); ctx.moveTo(tx2-2, hy + 3 - mh/2); ctx.lineTo(tx2+2, hy + 3 - mh/2); ctx.lineTo(tx2, hy + 3 - mh/2 + 4); ctx.fill();
ctx.beginPath(); ctx.moveTo(tx2-2, hy + 3 + mh/2); ctx.lineTo(tx2+2, hy + 3 + mh/2); ctx.lineTo(tx2, hy + 3 + mh/2 - 4); ctx.fill();
}
ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(cx-6, hy - 7, 3, 0, 7); ctx.arc(cx+6, hy - 7, 3, 0, 7); ctx.fill();
ctx.fillStyle = '#1a0710'; ctx.fillRect(cx-7, hy - 8, 2, 3); ctx.fillRect(cx+5, hy - 8, 2, 3);
}
function drawCannons(){
for (const cn of L.cannons){
const cx = cn.tx*T + T/2, cy = cn.ty*T + T/2;
if (cx < camX - 40 || cx > camX + VW + 40) continue;
const mx = cx + cn.dir*10; const hot = cn.cd < 0.6;
ctx.fillStyle = '#1b1c30'; ctx.beginPath(); ctx.arc(mx, cy, 10, 0, 7); ctx.fill();
ctx.fillStyle = hot ? '#ffb627' : '#ff5a1f'; ctx.beginPath(); ctx.arc(mx, cy, hot ? 7 : 5, 0, 7); ctx.fill();
ctx.fillStyle = '#ffd166'; ctx.fillRect(cx - cn.dir*8 - 2, cy - 10, 4, 4);
}
}
function drawFire(x, y){
const fl = Math.sin(time*30 + x) * 2;
ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(x, y, 13 + fl*0.5, 0, 7); ctx.fill();
ctx.fillStyle = '#ffb627'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x - 2, y - 2, 4.5, 0, 7); ctx.fill();
}
function drawShot(sh){
ctx.globalAlpha = 0.35; ctx.fillStyle = '#5ff2e3'; ctx.beginPath(); ctx.arc(sh.x - Math.sign(sh.vx)*10, sh.y, 5, 0, 7); ctx.fill();
ctx.globalAlpha = 1; ctx.fillStyle = '#3ad1c4'; ctx.beginPath(); ctx.arc(sh.x, sh.y, 7, 0, 7); ctx.fill();
ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sh.x, sh.y, 3, 0, 7); ctx.fill();
}
function render(){
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
const th = L ? L.th : THEMES[0];
if (!L){ drawTitleBG(); return; }
drawBG(th);
ctx.save(); ctx.translate(-Math.round(camX), 0);
const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(L.W - 1, c0 + COLS + 2);
drawGoal(); drawCheckpoint(); drawLava();
for (const pl of L.plants) drawPlant(pl);
for (let ty=0; ty<ROWS; ty++) for (let tx=c0; tx<=c1; tx++){
const id = L.g[ty][tx]; if (!id) continue;
const b = L.bumps[tx+','+ty]; const off = b ? -Math.sin((0.18 - b) / 0.18 * Math.PI) * 10 : 0;
const shk = L.crumbs[tx+','+ty] !== undefined ? (Math.random() - 0.5)*4 : 0;
ctx.save(); ctx.translate(shk, off); drawTile(id, 0, 0, tx, ty, th); ctx.restore();
}
drawGateLabel();
for (const c of L.coins) if (!c.taken && c.x > camX - 40 && c.x < camX + VW + 40) drawCoin(c.x, c.y);
for (const e of L.enemies) if (e.x > camX - 60 && e.x < camX + VW + 60) drawEnemy(e);
drawCannons();
for (const f of L.fireballs) drawFire(f.x, f.y);
for (const j of L.jumpers) if (j.wait <= 0) drawFire(j.x, j.y);
for (const sh of L.shots) drawShot(sh);
for (const it of L.items){
if (it.kind === 'heart') drawHeart(it.x - 10, it.y - 10, true, 1.2);
else if (it.kind === 'power'){ ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(it.x, it.y, 20 + Math.sin(time*12)*3, 0, 7); ctx.fill(); drawPower(it.p, it.x, it.y, 1.2); }
else drawCoin(it.x, it.y);
}
drawHero(P);
for (const p of L.parts){ ctx.globalAlpha = Math.min(1, p.t*2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
ctx.globalAlpha = 1;
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
for (const p of L.pops){
ctx.globalAlpha = Math.min(1, p.t); ctx.font = `11px 'Press Start 2P', monospace`;
ctx.fillStyle = '#000'; ctx.fillText(p.text, p.x + 2, p.y + 2); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
}
ctx.globalAlpha = 1;
ctx.restore();
drawHUD();
}
function drawTitleBG(){
camX = time * 40; drawBG(THEMES[0]);
ctx.fillStyle = THEMES[0].ground; ctx.fillRect(0, 11*T, VW, 2*T);
ctx.fillStyle = THEMES[0].grass; ctx.fillRect(0, 11*T, VW, 10);
const fake = { x:220 + Math.sin(time)*30, y:11*T-38, w:26, h:38, onG:true, vx:100, face:1, inv:0, walkT:time };
drawHero(fake);
}
/* ================= Fragen-Dialog ================= */
let curQ = null;
function openQuestion(tx, ty){
state = 'question'; clearKeys();
const q = nextQuestion(); const key = tx + ',' + ty;
curQ = { q, tx, ty, key, attempt:L.attempts[key] || 0, answered:false, order:shuffle(q.options) };
$('qTag').textContent = q.tag;
$('qHearts').textContent = '♥'.repeat(L.hearts) + '♡'.repeat(3 - L.hearts);
$('qText').textContent = q.text;
const tb = $('qTable'); tb.innerHTML = '';
if (q.table){
const wrap = document.createElement('div'); wrap.className = 'wt-wrap';
const t = document.createElement('table'); t.className = 'wt';
const thead = t.createTHead().insertRow(); q.table.h.forEach(h => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
const body = t.createTBody(); q.table.rows.forEach(r => { const tr = body.insertRow(); r.forEach(c => { const td = tr.insertCell(); td.textContent = c; if (c === '?') td.className = 'miss'; }); });
wrap.appendChild(t); tb.appendChild(wrap);
}
const box = $('qAnswers'); box.innerHTML = '';
curQ.order.forEach((o, i) => {
const b = document.createElement('button'); b.className = 'ans'; b.type = 'button';
b.innerHTML = `<span class='k'>${i+1}</span><span></span>`; b.lastChild.textContent = o;
b.addEventListener('click', () => answer(i)); box.appendChild(b);
});
$('qFeedback').hidden = true; $('qNext').hidden = true;
$('ovQ').hidden = false;
setTimeout(() => { const f = box.querySelector('button'); if (f) f.focus({ preventScroll:true }); }, 30);
}
function answer(i){
if (!curQ || curQ.answered) return;
curQ.answered = true;
const chosen = curQ.order[i], ok = chosen === curQ.q.correct;
const btns = [...$('qAnswers').children];
btns.forEach((b, k) => { b.disabled = true; if (curQ.order[k] === curQ.q.correct) b.classList.add('ok'); else if (k === i) b.classList.add('no'); });
const fb = $('qFeedback'); fb.className = 'feedback ' + (ok ? 'good' : 'bad'); fb.innerHTML = '';
const h = document.createElement('h3');
if (ok){
const first = curQ.attempt === 0; const pts = first ? 150 : 100;
h.textContent = first ? `Richtig! +${pts} Punkte` : `Richtig! +${pts} Punkte`;
L.g[curQ.ty][curQ.tx] = USED; L.solved++; L.score += pts; if (first) L.firstTry++;
const ix = curQ.tx*T + T/2, iy = curQ.ty*T - 6;
if (L.hearts < 3) L.items.push({ kind:'heart', x:ix, y:iy, t:0.7 });
else { L.items.push({ kind:'coin', x:ix, y:iy, t:0.5 }); L.coinN++; }
if (first){ const pw = pick(Object.keys(POWERS)); curQ.power = pw; L.items.push({ kind:'power', p:pw, x:ix, y:iy - 34, t:1.0 }); }
snd('right');
} else {
L.attempts[curQ.key] = curQ.attempt + 1; L.wrong++; L.hearts--;
h.textContent = L.hearts > 0 ? 'Leider falsch. −1 Herz' : 'Leider falsch. Keine Herzen mehr!';
snd('wrong');
}
$('qHearts').textContent = '♥'.repeat(Math.max(0,L.hearts)) + '♡'.repeat(3 - Math.max(0,L.hearts));
fb.appendChild(h);
if (ok && curQ.power){ const pw = POWERS[curQ.power]; const d = document.createElement('div'); d.className = 'win-power'; d.innerHTML = '<b></b> <span></span>'; d.firstChild.textContent = '🎁 Gewonnen: ' + pw.name + '!'; d.lastChild.textContent = pw.desc; fb.appendChild(d); }
else if (ok){ const d = document.createElement('div'); d.className = 'step'; d.style.color = 'var(--muted)'; d.textContent = 'Tipp: Wer beim ersten Versuch richtig antwortet, gewinnt ein Power-up.'; fb.appendChild(d); }
if (!ok){ const d = document.createElement('div'); d.className = 'step'; d.textContent = `Richtig ist: ${curQ.q.correct}`; fb.appendChild(d); }
curQ.q.explain.forEach(s => { const d = document.createElement('div'); d.className = 'step'; d.textContent = s; fb.appendChild(d); });
if (!ok){ const d = document.createElement('div'); d.className = 'step'; d.style.color = 'var(--muted)'; d.textContent = 'Der Block bleibt aktiv. Beim nächsten Sprung kommt eine neue Aufgabe.'; fb.appendChild(d); }
fb.hidden = false; $('qNext').hidden = false; $('qNext').focus({ preventScroll:true });
save.log.push({ lv:L.i, tag:curQ.q.tag, text:curQ.q.text, given:chosen, correct:curQ.q.correct, ok, ts:Date.now(), name:save.name });
if (save.log.length > 300) save.log = save.log.slice(-300);
persist();
}
function closeQuestion(){
if (!curQ || !curQ.answered) return;
$('ovQ').hidden = true; curQ = null; clearKeys();
if (L.hearts <= 0) gameOver(); else state = 'play';
}
$('qNext').addEventListener('click', closeQuestion);
/* ================= Meldungen ================= */
function hideAll(){ $('ovTitle').hidden = true; $('ovQ').hidden = true; $('ovMsg').hidden = true; $('ovEgg').hidden = true; }
$('eggOk').addEventListener('click', closeEgg);
function showMsg(html, buttons){
const card = $('msgCard'); card.innerHTML = html;
const row = document.createElement('div'); row.className = 'btnrow';
buttons.forEach((b, i) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'btn' + (b.ghost ? ' ghost' : ''); el.textContent = b.label; el.addEventListener('click', b.on); if (i === 0) el.dataset.primary = '1'; row.appendChild(el); });
card.appendChild(row); $('ovMsg').hidden = false;
setTimeout(() => { const p = card.querySelector('[data-primary]'); if (p) p.focus({ preventScroll:true }); }, 30);
}
function gameOver(){
state = 'over'; clearKeys();
showMsg(`<p class='msg-title'>GAME OVER</p><p>Keine Herzen mehr. Du kannst beim letzten Fähnchen weiterspielen (gelöste Blöcke bleiben gelöst, −200 Punkte) oder das Level neu starten.</p>
<div class='stat'><span>Gelöste ∝-Blöcke</span><span>${L.solved} / ${L.total}</span><span>Punkte</span><span>${L.score}</span></div>`,
[ { label:'Ab Fähnchen weiter', on:() => { L.hearts = 3; L.score = Math.max(0, L.score - 200); respawn(); hideAll(); state = 'play'; } },
{ label:'Level neu starten', ghost:true, on:() => startLevel(L.i) },
{ label:'Zur Übersicht', ghost:true, on:showTitle } ]);
}
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf7ciZZLjFfZPF-zEP9TRuFWIJCL35OnvRsfeolafO762440A/formResponse';
function sendScore(){ // schickt das Ergebnis an das Google-Formular der Lehrperson
try {
const body = new URLSearchParams();
body.append('entry.290371893', (save.name || '').trim() || '(ohne Name)');
body.append('entry.1561840988', `${L.c.code} · L${L.c.diff} ${L.c.name}`);
body.append('entry.2059420787', String(L.score));
body.append('entry.988968341', String(L.wrong));
body.append('entry.1713762866', String(starsFor(L)));
fetch(FORM_URL, { method:'POST', mode:'no-cors', body }).catch(() => {});
} catch (e) {}
}
function starsFor(lv){ const r = lv.total ? lv.firstTry / lv.total : 0; return r >= 0.85 ? 3 : r >= 0.6 ? 2 : 1; }
function starHTML(n){ return [0,1,2].map(i => i < n ? '★' : '<span class=off>★</span>').join(''); }
function showLevelDone(){
state = 'done';
const bonus = L.hearts * 100; L.score += bonus;
const st = starsFor(L);
const prev = save.best[L.i];
if (!prev || L.score > prev.score) save.best[L.i] = { score:L.score, stars:Math.max(st, prev ? prev.stars : 0), first:L.firstTry, total:L.total, date:Date.now() };
else if (st > prev.stars) prev.stars = st;
save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, L.i + 1));
persist();
sendScore();
const last = L.i === LEVELS.length - 1, chapEnd = L.c.diff === 3;
const nm = save.name ? `, ${escapeHTML(save.name)}` : '';
showMsg(`<p class='msg-title'>${last ? 'ALLE 9 LEVEL GESCHAFFT!' : chapEnd ? 'KAPITEL ' + L.c.code + ' GESCHAFFT!' : L.c.code + ' · LEVEL ' + L.c.diff + ' GESCHAFFT!'}</p>
<div class='stars' aria-label='${st} von 3 Sternen'>${starHTML(st)}</div>
<p>${last ? `Super${nm}! Du kennst dich jetzt mit proportionalen, umgekehrt proportionalen und «weder noch»-Zuordnungen aus.` : `Gut gemacht${nm}! Nächste Station: ${LEVELS[L.i+1].name} (${LEVELS[L.i+1].topic}).`}</p>
<div class='stat'>
<span>Beim 1. Versuch richtig</span><span>${L.firstTry} / ${L.total}</span>
<span>Falsche Antworten</span><span>${L.wrong}</span>
<span>Münzen</span><span>${L.coinN}</span>
<span>Herz-Bonus</span><span>+${bonus}</span>
<span>Punkte</span><span>${L.score}</span>
</div>`,
last ? [ { label:'Zur Übersicht', on:showTitle }, { label:'Nochmals spielen', ghost:true, on:() => startLevel(L.i) } ]
: [ { label:'Nächstes Level ▶', on:() => startLevel(L.i + 1) }, { label:'Nochmals', ghost:true, on:() => startLevel(L.i) }, { label:'Zur Übersicht', ghost:true, on:showTitle } ]);
}
function pauseGame(){
if (state !== 'play') return; state = 'pause'; clearKeys();
showMsg(`<p class='msg-title'>PAUSE</p><p>Gelöste ∝-Blöcke: ${L.solved} / ${L.total} · Punkte: ${L.score}</p>`,
[ { label:'Weiterspielen', on:resume }, { label:'Level neu starten', ghost:true, on:() => startLevel(L.i) }, { label:'Zur Übersicht', ghost:true, on:showTitle } ]);
}
function resume(){ hideAll(); state = 'play'; clearKeys(); }
function escapeHTML(s){ return String(s).split('').map(c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c.charCodeAt(0) === 34 ? '&quot;' : c.charCodeAt(0) === 39 ? '&#39;' : c).join(''); }
/* ================= Titelbildschirm ================= */
function isOpen(i){
if (save.allUnlocked || i === 0 || i <= save.unlocked) return true;
if (save.best[i-1]) return true;
const c = LEVELS[i];
if (c.diff === 1){ const pf = LEVELS.findIndex(l => l.chap === c.chap - 1 && l.diff === 1); return pf >= 0 && !!save.best[pf]; }
return false;
}
function showTitle(){
state = 'title'; L = null; hideAll(); clearKeys();
const box = $('levelCards'); box.innerHTML = '';
LEVELS.forEach((lv, i) => {
const open = isOpen(i);
const b = document.createElement('button'); b.type = 'button'; b.className = 'lvl'; b.disabled = !open;
const best = save.best[i];
b.innerHTML = `<span class='code'>${lv.code} · LEVEL ${lv.diff} ${'●'.repeat(lv.diff)}${'○'.repeat(3 - lv.diff)}</span><span class='nm'></span><span class='tp'></span><span class='st'></span>`;
b.querySelector('.nm').textContent = (open ? '' : '🔒 ') + lv.name;
b.querySelector('.tp').textContent = lv.topic;
b.querySelector('.st').innerHTML = best ? `${starHTML(best.stars)} · ${best.score} P.` : (open ? 'Noch nicht gespielt' : 'Zuerst das Level davor schaffen');
b.addEventListener('click', () => { if (!save.name){ $('nameHint').hidden = false; $('nameInput').focus(); return; } snd('open'); startLevel(i); });
box.appendChild(b);
});
$('ovTitle').hidden = false;
}
const nameIn = $('nameInput'); nameIn.value = save.name || '';
nameIn.addEventListener('input', () => { save.name = nameIn.value.trim(); persist(); if (save.name) $('nameHint').hidden = true; });
const chkS = $('chkSound'); chkS.checked = !!save.sound; chkS.addEventListener('change', () => { save.sound = chkS.checked; persist(); if (save.sound) snd('coin'); });
const chkU = $('chkUnlock'); chkU.checked = !!save.allUnlocked; chkU.addEventListener('change', () => { save.allUnlocked = chkU.checked; persist(); showTitle(); });
/* ================= Eingabe ================= */
const KMAP = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'jump', KeyW:'jump', Space:'jump', ShiftLeft:'run', ShiftRight:'run' };
function clearKeys(){ keys.left = keys.right = keys.jump = keys.run = false; jumpBuf = 0; shootBuf = 0; }
window.addEventListener('keydown', e => {
if (e.target && e.target.tagName === 'INPUT') return;
if (state === 'question'){
const m = /^(Digit|Numpad)([1-4])$/.exec(e.code);
if (m && curQ && !curQ.answered){ e.preventDefault(); const i = +m[2] - 1; if (i < curQ.order.length) answer(i); return; }
if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && curQ && curQ.answered){ e.preventDefault(); closeQuestion(); }
return;
}
if (state === 'egg'){ if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'Escape'){ e.preventDefault(); closeEgg(); } return; }
if (state === 'play'){
if ((e.code === 'KeyF' || e.code === 'KeyX' || e.code === 'KeyJ') && !e.repeat){ e.preventDefault(); shootBuf = 1; return; }
const k = KMAP[e.code];
if (k){ e.preventDefault(); if (k === 'jump' && !keys.jump) jumpBuf = 0.14; keys[k] = true; }
if (e.code === 'KeyP' || e.code === 'Escape'){ e.preventDefault(); pauseGame(); }
return;
}
if (state === 'pause' && (e.code === 'KeyP' || e.code === 'Escape')){ e.preventDefault(); resume(); }
});
window.addEventListener('keyup', e => { const k = KMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', clearKeys);
/* ---------- Touch-Steuerung ---------- */
function enableTouch(){ document.body.classList.add('is-touch'); }
if ((window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || navigator.maxTouchPoints > 0) enableTouch();
window.addEventListener('touchstart', enableTouch, { once:true, passive:true });
const pad = $('tcPad'); let padId = null;
function padSet(e){
const r = pad.getBoundingClientRect(); const dx = (e.clientX - (r.left + r.width/2)) / (r.width/2);
if (state !== 'play'){ keys.left = keys.right = keys.run = false; return; }
keys.left = dx < -0.12; keys.right = dx > 0.12; keys.run = Math.abs(dx) > 0.72;
pad.dataset.dir = keys.left ? 'l' : keys.right ? 'r' : ''; pad.dataset.run = keys.run ? '1' : '';
}
function padUp(e){ if (e.pointerId !== padId) return; padId = null; keys.left = keys.right = keys.run = false; pad.dataset.dir = ''; pad.dataset.run = ''; }
pad.addEventListener('pointerdown', e => { e.preventDefault(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (er) {} padSet(e); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padId) padSet(e); });
['pointerup','pointercancel','lostpointercapture'].forEach(t => pad.addEventListener(t, padUp));
const frameEl = $('frame');
function toggleFull(){
if (!frameEl.classList.contains('full')){
frameEl.classList.add('full');
try { const rq = frameEl.requestFullscreen || frameEl.webkitRequestFullscreen; if (rq){ const pr = rq.call(frameEl); if (pr && pr.catch) pr.catch(() => {}); } } catch (er) {}
try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (er) {}
} else {
frameEl.classList.remove('full');
try { if (document.fullscreenElement) document.exitFullscreen(); else if (document.webkitFullscreenElement) document.webkitExitFullscreen(); } catch (er) {}
}
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) frameEl.classList.remove('full'); });
document.querySelectorAll('#tc button').forEach(b => {
const k = b.dataset.k;
b.addEventListener('pointerdown', ev => {
ev.preventDefault(); b.classList.add('on'); try { b.setPointerCapture(ev.pointerId); } catch (er) {}
if (k === 'full'){ toggleFull(); return; }
if (k === 'pause'){ if (state === 'play') pauseGame(); else if (state === 'pause') resume(); return; }
if (state !== 'play') return;
if (k === 'shoot'){ shootBuf = 1; return; }
if (k === 'jump'){ if (!keys.jump) jumpBuf = 0.14; keys.jump = true; }
});
const up = () => { b.classList.remove('on'); if (k === 'jump') keys.jump = false; };
['pointerup','pointercancel','lostpointercapture'].forEach(t => b.addEventListener(t, up));
});
/* ================= Lernprotokoll (Druck) ================= */
function buildPrint(){
const pa = $('printArea');
const d = new Date().toLocaleDateString('de-CH');
const rows = save.log.slice(-60).map(l => `<tr><td>${LEVELS[l.lv] ? LEVELS[l.lv].code : ''}</td><td>${escapeHTML(l.text)}</td><td>${escapeHTML(l.given)}</td><td class='${l.ok ? 'ok' : 'no'}'>${l.ok ? '✓ richtig' : '✗ falsch'}</td><td>${l.ok ? '' : escapeHTML(l.correct)}</td></tr>`).join('');
const tot = save.log.length, okN = save.log.filter(l => l.ok).length;
pa.innerHTML = `<h1>Lernprotokoll · Propis Zahlen-Abenteuer</h1>
<p class='meta'>Mathematik 6.4 Proportionalität · Klasse 6b · Name: <b>${escapeHTML(save.name || '________________')}</b> · Datum: ${d}</p>
<h2>Level</h2>
<table><tr><th>Level</th><th>Thema</th><th>Sterne</th><th>Beste Punktzahl</th><th>1. Versuch richtig</th></tr>
${LEVELS.map((lv,i) => { const b = save.best[i]; return `<tr><td>${lv.code} · L${lv.diff} ${lv.name}</td><td>${lv.topic}</td><td>${b ? '★'.repeat(b.stars) + '☆'.repeat(3-b.stars) : '–'}</td><td>${b ? b.score : '–'}</td><td>${b ? b.first + ' / ' + b.total : '–'}</td></tr>`; }).join('')}
</table>
${save.eggFound ? '<p class=meta>★ Geheimen Block gefunden</p>' : ''}
<h2>Beantwortete Aufgaben (${okN} von ${tot} richtig${tot > 60 ? ', die letzten 60 sind aufgelistet' : ''})</h2>
${tot ? `<table><tr><th>Thema</th><th>Aufgabe</th><th>Antwort</th><th>Ergebnis</th><th>Richtige Lösung</th></tr>${rows}</table>` : '<p>Noch keine Aufgaben beantwortet.</p>'}
<p class='meta' style='margin-top:14pt'>Klasse 6b · 2026/27 · S. Lüscher</p>`;
}
$('btnPrint').addEventListener('click', () => { buildPrint(); window.print(); });
window.addEventListener('beforeprint', buildPrint);
/* ================= Schleife ================= */
let last = performance.now();
function loop(now){
let dt = Math.min(0.05, (now - last) / 1000); last = now;
if (L){ const steps = dt > 1/60 ? 2 : 1; for (let s=0; s<steps; s++) update(dt/steps); }
else time += dt;
render();
requestAnimationFrame(loop);
}
showTitle();
requestAnimationFrame(loop);
})();
