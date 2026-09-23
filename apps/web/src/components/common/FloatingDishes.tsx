'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { isShowcasePlate } from '@lomasrico/shared-types';
import { API_URL } from '../../services/api';

type Ball = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    src: string;
};

const FALLBACK_PHOTOS = [
    '/assets/Ceviche LoMASRico.jpg',
    '/assets/Ceviche Tropical.jpg',
    '/assets/Ceviche Veg.jpg',
    '/assets/Ceviche Peruano 500g.jpeg',
    '/assets/2 Bowls LoMASRico.png',
    '/assets/Cevichada.png',
    '/assets/De Miedo.png',
    '/assets/AMOR AMOR.png',
];

type Hole = { x: number; y: number; w: number; h: number };

function fallbackHole(w: number, h: number): Hole {
    const holeW = Math.min(460, w * 0.86);
    const holeH = Math.min(540, h * 0.72);
    return { x: (w - holeW) / 2, y: (h - holeH) / 2, w: holeW, h: holeH };
}

function holeFromCard(wrap: HTMLElement, card: HTMLElement | null, w: number, h: number): Hole {
    if (!card) return fallbackHole(w, h);
    const wr = wrap.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const pad = 10;
    return {
        x: cr.left - wr.left - pad,
        y: cr.top - wr.top - pad,
        w: cr.width + pad * 2,
        h: cr.height + pad * 2,
    };
}

function overlapsHole(x: number, y: number, r: number, hole: Hole) {
    const closestX = Math.max(hole.x, Math.min(x, hole.x + hole.w));
    const closestY = Math.max(hole.y, Math.min(y, hole.y + hole.h));
    return (x - closestX) ** 2 + (y - closestY) ** 2 < (r + 4) ** 2;
}

function spawnInLane(w: number, h: number, r: number, hole: Hole, preferBottom: boolean) {
    const topY = r + 8;
    const botY = h - r - 8;
    const topFits = hole.y - topY >= r + 4;
    const botFits = botY - (hole.y + hole.h) >= r + 4;
    let y = topY;
    if (preferBottom && botFits) y = botY;
    else if (!preferBottom && topFits) y = topY;
    else if (botFits) y = botY;
    else if (topFits) y = topY;
    else return null;

    for (let i = 0; i < 16; i++) {
        const x = r + 8 + Math.random() * Math.max(8, w - r * 2);
        if (!overlapsHole(x, y, r, hole)) return { x, y };
    }
    return { x: w / 2, y };
}

function resolveCard(b: Ball, hole: Hole) {
    const inside = b.x >= hole.x && b.x <= hole.x + hole.w && b.y >= hole.y && b.y <= hole.y + hole.h;
    if (inside) {
        const left = b.x - hole.x;
        const right = hole.x + hole.w - b.x;
        const top = b.y - hole.y;
        const bottom = hole.y + hole.h - b.y;
        const nearest = Math.min(left, right, top, bottom);
        if (nearest === left) {
            b.x = hole.x - b.r - 2;
            b.vx = -Math.abs(b.vx || 0.35);
        } else if (nearest === right) {
            b.x = hole.x + hole.w + b.r + 2;
            b.vx = Math.abs(b.vx || 0.35);
        } else if (nearest === top) {
            b.y = hole.y - b.r - 2;
            b.vy = -Math.abs(b.vy || 0.35);
        } else {
            b.y = hole.y + hole.h + b.r + 2;
            b.vy = Math.abs(b.vy || 0.35);
        }
        return 'eject';
    }

    const closestX = Math.max(hole.x, Math.min(b.x, hole.x + hole.w));
    const closestY = Math.max(hole.y, Math.min(b.y, hole.y + hole.h));
    const dx = b.x - closestX;
    const dy = b.y - closestY;
    const dist = Math.hypot(dx, dy) || 0.01;
    if (dist < b.r) {
        const nx = dx / dist;
        const ny = dy / dist;
        const push = b.r - dist + 2;
        b.x += nx * push;
        b.y += ny * push;
        const impact = b.vx * nx + b.vy * ny;
        if (impact < 0) {
            b.vx -= 2 * impact * nx;
            b.vy -= 2 * impact * ny;
        }
        return 'bounce';
    }
    return null;
}

function preloadPhotos(urls: string[], ms = 2200) {
    return Promise.race([
        Promise.all(urls.map((src) => new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
        }))),
        new Promise<void>((resolve) => setTimeout(resolve, ms)),
    ]);
}

export default function FloatingDishes({ cardRef }: { cardRef?: RefObject<HTMLDivElement | null> }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const ballsRef = useRef<Ball[]>([]);
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const photosRef = useRef<string[]>(FALLBACK_PHOTOS);
    const frameRef = useRef(0);
    const lastLogRef = useRef(0);
    const [balls, setBalls] = useState<Ball[]>([]);
    const [ready, setReady] = useState(false);
    const reduced = useRef(false);

    useEffect(() => {
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let cancelled = false;
        (async () => {
            let fromApi = 0;
            try {
                const res = await fetch(`${API_URL}/products/active`);
                const data = res.ok ? await res.json() : [];
                const all = Array.isArray(data) ? data : [];
                const plates = all.filter((p: { category?: string; name?: string; imageUrl?: string }) =>
                    isShowcasePlate(p.category, p.name) && typeof p.imageUrl === 'string' && p.imageUrl.length > 4,
                );
                const excluded = all.filter((p: { category?: string; name?: string }) => !isShowcasePlate(p.category, p.name));
                const urls = [...new Set(plates.map((p: { imageUrl: string }) => p.imageUrl))];
                fromApi = urls.length;
                if (urls.length >= 4) photosRef.current = urls;
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon-fix',hypothesisId:'H-FLASH',location:'FloatingDishes.tsx:load',message:'floating dish photos loaded',data:{count:photosRef.current.length,fromApi,usedFallback:fromApi<4,excludedCount:excluded.length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            } catch {
                photosRef.current = FALLBACK_PHOTOS;
            }
            const chosen = photosRef.current.slice(0, 16);
            await preloadPhotos(chosen);
            if (!cancelled) setReady(true);
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!ready) return;
        const wrap = wrapRef.current;
        if (!wrap) return;

        const spawn = () => {
            const w = wrap.clientWidth;
            const h = wrap.clientHeight;
            const photos = photosRef.current;
            const mobile = w < 768;
            const hole = holeFromCard(wrap, cardRef?.current || null, w, h);
            const topRoom = hole.y;
            const botRoom = h - (hole.y + hole.h);
            const lane = Math.max(0, Math.min(topRoom, botRoom));
            let r = mobile ? 28 : 62;
            while (r > 12 && topRoom < 2 * r + 12 && botRoom < 2 * r + 12) r -= 2;
            const count = mobile ? (lane < 48 ? 4 : 6) : 14;
            const next: Ball[] = [];
            let spawnFail = 0;
            let overlap = 0;
            for (let i = 0; i < count; i++) {
                const speed = mobile ? 0.22 + Math.random() * 0.2 : 0.6 + Math.random() * 0.9;
                const pos = spawnInLane(w, h, r, hole, i % 2 === 1);
                if (!pos) {
                    spawnFail += 1;
                    continue;
                }
                if (overlapsHole(pos.x, pos.y, r, hole)) overlap += 1;
                next.push({
                    id: i,
                    x: pos.x,
                    y: pos.y,
                    vx: (Math.random() < 0.5 ? -1 : 1) * speed,
                    vy: (Math.random() < 0.5 ? -1 : 1) * speed,
                    r,
                    src: photos[i % photos.length],
                });
            }
            ballsRef.current = next;
            setBalls(next.map((b) => ({ ...b })));
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon-fix',hypothesisId:'H-HOLE',location:'FloatingDishes.tsx:spawn',message:'spawned floating dishes',data:{mobile,count:next.length,w,h,r,hole,topRoom,botRoom,spawnFail,overlap,reduced:reduced.current,srcHost:(next[0]?.src||'').startsWith('http')?new URL(next[0].src).hostname:'local'},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        };

        spawn();
        if (reduced.current) {
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon-fix',hypothesisId:'H-TICK',location:'FloatingDishes.tsx:reduced',message:'animation skipped reduced motion',data:{reduced:true},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return;
        }

        const tick = () => {
            const w = wrap.clientWidth;
            const h = wrap.clientHeight;
            const hole = holeFromCard(wrap, cardRef?.current || null, w, h);
            const now = Date.now();
            const items = ballsRef.current;
            let ejected = 0;

            for (const b of items) {
                b.x += b.vx;
                b.y += b.vy;

                if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
                if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
                if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
                if (b.y > h - b.r) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }

                if (resolveCard(b, hole) === 'eject') ejected += 1;
            }

            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const a = items[i];
                    const b = items[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.hypot(dx, dy) || 0.01;
                    const min = a.r + b.r;
                    if (dist < min) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const overlapAmt = (min - dist) / 2;
                        a.x -= nx * overlapAmt;
                        a.y -= ny * overlapAmt;
                        b.x += nx * overlapAmt;
                        b.y += ny * overlapAmt;
                        const dvx = a.vx - b.vx;
                        const dvy = a.vy - b.vy;
                        const impact = dvx * nx + dvy * ny;
                        if (impact > 0) {
                            a.vx -= impact * nx;
                            a.vy -= impact * ny;
                            b.vx += impact * nx;
                            b.vy += impact * ny;
                        }
                    }
                }
            }

            for (const b of items) {
                if (resolveCard(b, hole) === 'eject') ejected += 1;
                const el = nodeRefs.current.get(b.id);
                if (el) el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
            }

            if (ejected && now - lastLogRef.current > 4000) {
                lastLogRef.current = now;
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon-fix',hypothesisId:'H-TICK',location:'FloatingDishes.tsx:tick',message:'dishes tick',data:{ejected,moving:true,n:items.length},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }

            frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        const onResize = () => spawn();
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', onResize);
        };
    }, [ready, cardRef]);

    return (
        <div ref={wrapRef} className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {balls.map((b) => (
                <div
                    key={b.id}
                    ref={(el) => {
                        if (el) nodeRefs.current.set(b.id, el);
                        else nodeRefs.current.delete(b.id);
                    }}
                    className="absolute rounded-full overflow-hidden shadow-xl ring-4 ring-white/70 bg-white"
                    style={{
                        width: b.r * 2,
                        height: b.r * 2,
                        transform: `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`,
                        willChange: 'transform',
                    }}
                >
                    <img src={b.src} alt="" className="h-full w-full object-cover" />
                </div>
            ))}
        </div>
    );
}
