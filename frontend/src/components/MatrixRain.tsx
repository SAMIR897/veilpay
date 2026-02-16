import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        console.log("MatrixRain V6 Train Mode - ClearRect, 18px, Explicit Snake");

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%&ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
        const dropSize = 18;
        const columns = Math.ceil(canvas.width / dropSize);
        // Drops store the Y position of the HEAD
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100);

        let lastTime = 0;
        const fps = 14;
        const interval = 1000 / fps;
        let animationFrameId: number;

        const draw = (currentTime: number) => {
            animationFrameId = requestAnimationFrame(draw);

            const deltaTime = currentTime - lastTime;
            if (deltaTime < interval) return;

            lastTime = currentTime - (deltaTime % interval);

            // V6 "TRAIN MODE" LOGIC:
            // 1. CLEAR EVERYTHING. No fading. No ghosts. 
            // This ensures "once the line fully pass... nothing left at all."
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.font = `bold ${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                const y = drops[i];

                // 2. DRAW THE TRAIN (HEAD + BODY)
                // We draw the entire snake every frame because we wiped the canvas.

                // Draw Head
                ctx.fillStyle = '#ff3333';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ff0000';
                ctx.fillText(text, i * dropSize, y * dropSize);

                // Draw Body (The "Compartments" of the train)
                // 15 Character long train
                for (let k = 1; k <= 15; k++) {
                    const trailY = y - k;
                    // Only draw if it's on screen (or slightly above to flow in)
                    if (trailY > 0 || trailY > -20) {
                        // We strictly don't care about memory here, just draw coordinates.

                        const trailChar = chars[Math.floor(Math.random() * chars.length)];

                        // Reuse Gradient Logic for the "Train Compartments"
                        if (k <= 3) {
                            ctx.fillStyle = '#cc0000';
                            ctx.shadowBlur = 5;
                            ctx.shadowColor = '#800000';
                        } else {
                            ctx.shadowBlur = 0;
                            if (k <= 8) ctx.fillStyle = '#990000';
                            else if (k <= 12) ctx.fillStyle = '#660000';
                            else ctx.fillStyle = '#330000';
                        }

                        ctx.fillText(trailChar, i * dropSize, trailY * dropSize);
                    }
                }

                // 3. MOVE TRAIN
                // Reset if the TAIL (y - 15) has gone off screen
                if ((y - 15) * dropSize > canvas.height && Math.random() > 0.985) {
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
