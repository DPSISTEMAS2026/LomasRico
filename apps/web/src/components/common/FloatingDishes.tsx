'use client';

import { useEffect, useRef, useState } from 'react';
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
    swapAt: number;
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

function pickPhoto(photos: string[], avoid: string) {
    const pool = photos.filter((p) => p !== avoid);
    if (pool.length === 0) return avoid;
    return pool[Math.floor(Math.random() * pool.length)];
}

type Hole = { x: number; y: number; w: number; h: number };

function cardHole(w: number, h: number): Hole {
    const holeW = Math.min(460, w * 0.86);
    const holeH = Math.min(540, h * 0.72);
    return { x: (w - holeW) / 2, y: (h - holeH) / 2, w: holeW, h: holeH };
}

function overlapsHole(x: number, y: number, r: number, hole: Hole) {
    const closestX = Math.max(hole.x, Math.min(x, hole.x + hole.w));
    const closestY = Math.max(hole.y, Math.min(y, hole.y + hole.h));
    return (x - closestX) ** 2 + (y - closestY) ** 2 < (r + 4) ** 2;
}

function spawnOutside(w: number, h: number, r: number, hole: Hole) {
    for (let i = 0; i < 24; i++) {
        const zone = i % 4;
        let x = r + 8;
        let y = r + 8;
        if (zone === 0) {
            x = r + 8 + Math.random() * Math.max(8, w - r * 2);
            y = r + 8;
        } else if (zone === 1) {
            x = r + 8 + Math.random() * Math.max(8, w - r * 2);
            y = h - r - 8;
        } else if (zone === 2) {
            x = r + 8;
            y = r + 8 + Math.random() * Math.max(8, h - r * 2);
        } else {
            x = w - r - 8;
            y = r + 8 + Math.random() * Math.max(8, h - r * 2);
        }
        if (!overlapsHole(x, y, r, hole)) return { x, y };
    }
    return { x: r + 8, y: r + 8 };
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

export default function FloatingDishes() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const ballsRef = useRef<Ball[]>([]);
    const photosRef = useRef<string[]>(FALLBACK_PHOTOS);
    const frameRef = useRef(0);
    const lastLogRef = useRef(0);
    const [balls, setBalls] = useState<Ball[]>([]);
    const [photoTick, setPhotoTick] = useState(0);
    const reduced = useRef(false);

    useEffect(() => {
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/products/active`);
                const data = res.ok ? await res.json() : [];
                const all = Array.isArray(data) ? data : [];
                const plates = all.filter((p: { category?: string; name?: string; imageUrl?: string }) =>
                    isShowcasePlate(p.category, p.name) && typeof p.imageUrl === 'string' && p.imageUrl.length > 4,
                );
                const excluded = all.filter((p: { category?: string; name?: string }) => !isShowcasePlate(p.category, p.name));
                const urls = plates.map((p: { imageUrl: string }) => p.imageUrl);
                if (urls.length >= 4) photosRef.current = [...new Set(urls)];
                setPhotoTick((n) => n + 1);
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon',hypothesisId:'H-FLOAT',location:'FloatingDishes.tsx:load',message:'floating dish photos loaded',data:{count:photosRef.current.length,fromApi:urls.length,excludedCount:excluded.length,excludedSample:excluded.slice(0,8).map((p:{name?:string;category?:string})=>({name:p.name,category:p.category}))},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            } catch {
                photosRef.current = FALLBACK_PHOTOS;
            }
        })();
    }, []);

    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) return;

        const spawn = () => {
            const w = wrap.clientWidth;
            const h = wrap.clientHeight;
            const photos = photosRef.current;
            const mobile = w < 768;
            const count = mobile ? 8 : 18;
            const hole = cardHole(w, h);
            const next: Ball[] = [];
            for (let i = 0; i < count; i++) {
                const r = mobile ? 40 : 62;
                const speed = mobile ? 0.18 + Math.random() * 0.16 : 0.6 + Math.random() * 0.9;
                const pos = spawnOutside(w, h, r, hole);
                next.push({
                    id: i,
                    x: pos.x,
                    y: pos.y,
                    vx: (Math.random() < 0.5 ? -1 : 1) * speed,
                    vy: (Math.random() < 0.5 ? -1 : 1) * speed,
                    r,
                    src: photos[i % photos.length],
                    swapAt: 0,
                });
            }
            ballsRef.current = next;
            setBalls(next.map((b) => ({ ...b })));
            // #region agent log
            fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon',hypothesisId:'H-FLOAT',location:'FloatingDishes.tsx:spawn',message:'spawned floating dishes',data:{mobile,count,w,h},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        };

        spawn();
        if (reduced.current) return;

        const tick = () => {
            const w = wrap.clientWidth;
            const h = wrap.clientHeight;
            const hole = cardHole(w, h);
            const now = Date.now();
            const items = ballsRef.current;
            let swapped = 0;
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
                        const overlap = (min - dist) / 2;
                        a.x -= nx * overlap;
                        a.y -= ny * overlap;
                        b.x += nx * overlap;
                        b.y += ny * overlap;
                        const dvx = a.vx - b.vx;
                        const dvy = a.vy - b.vy;
                        const impact = dvx * nx + dvy * ny;
                        if (impact > 0) {
                            a.vx -= impact * nx;
                            a.vy -= impact * ny;
                            b.vx += impact * nx;
                            b.vy += impact * ny;
                        }
                        if (now - a.swapAt > 450 && now - b.swapAt > 450) {
                            a.src = pickPhoto(photosRef.current, a.src);
                            b.src = pickPhoto(photosRef.current, b.src);
                            a.swapAt = now;
                            b.swapAt = now;
                            swapped += 1;
                        }
                    }
                }
            }

            for (const b of items) {
                if (resolveCard(b, hole) === 'eject') ejected += 1;
            }

            if ((swapped || ejected) && now - lastLogRef.current > 3000) {
                lastLogRef.current = now;
                // #region agent log
                fetch('http://127.0.0.1:7828/ingest/0cf486ac-6acc-4365-b51d-aafc32d937ed',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'88a466'},body:JSON.stringify({sessionId:'88a466',runId:'coming-soon',hypothesisId:'H-TRAP',location:'FloatingDishes.tsx:tick',message:'dishes tick',data:{swapped,ejected},timestamp:Date.now()})}).catch(()=>{});
                // #endregion
            }

            setBalls(items.map((b) => ({ ...b })));
            frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        const onResize = () => spawn();
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', onResize);
        };
    }, [photoTick]);

    return (
        <div ref={wrapRef} className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {balls.map((b) => (
                <div
                    key={b.id}
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
