import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        console.log("MatrixRain V5 Clean - 18px, Fast Fade, Explicit Optimized Trail");

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%&ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
        const dropSize = 18;
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100);

        let lastTime = 0;
        const fps = 20;
        const interval = 1000 / fps;
        let animationFrameId: number;

        const draw = (currentTime: number) => {
            animationFrameId = requestAnimationFrame(draw);

            const deltaTime = currentTime - lastTime;
            if (deltaTime < interval) return;

            lastTime = currentTime - (deltaTime % interval);

            // "Destination-Out" Blending:
            // High Alpha (0.1) = CLEAN BACKGROUND.
            // This aggressively wipes the previous frame, removing the "messy blur line" the user hated.
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Switch back to normal drawing
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `bold ${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                const y = drops[i];

                // OPTIMIZED EXPLICIT LOOP
                // We draw the trail explicitly since we are erasing the background fast.
                // We optimize by turning off Glow for the tail to save GPU/CPU.

                // 1. The Head (Bright + Glow)
                ctx.fillStyle = '#ff3333';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0000';
                ctx.fillText(text, i * dropSize, y * dropSize);

                // 2. The Trail (15 Chars)
                for (let k = 1; k <= 15; k++) {
                    const trailY = y - k;
                    if (trailY > 0) {
                        const trailChar = chars[Math.floor(Math.random() * chars.length)];

                        // Performance Optimization:
                        // Only glow the first 3 chars. 
                        // The rest (4-15) are just flat colored text (Very cheap to render).

                        if (k <= 3) {
                            ctx.fillStyle = '#cc0000';
                            ctx.shadowBlur = 5;
                            ctx.shadowColor = '#800000';
                        } else {
                            ctx.shadowBlur = 0; // Disable heavy glow
                            // Gradient Fade logic for tail
                            if (k <= 8) ctx.fillStyle = '#990000';
                            else if (k <= 12) ctx.fillStyle = '#660000';
                            else ctx.fillStyle = '#330000';
                        }

                        ctx.fillText(trailChar, i * dropSize, trailY * dropSize);
                    }
                }

                if (y * dropSize > canvas.height && Math.random() > 0.985) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        animationFrameId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
                // Keep the "Hazy" look via GPU
                filter: 'blur(1.5px)',
                opacity: 0.8,
            }}
        />
    );
};

export default MatrixRain;
