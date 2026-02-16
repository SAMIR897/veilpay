import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true }); // Standard context
        if (!ctx) return;

        console.log("MatrixRain V4 Optimized - 18px, CSS Blur, 20fps RAF");

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters (Katakana + Latin)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%&ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
        const dropSize = 18;
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100);

        // Frame rate control
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
            // Very slow fade (0.02) = EXTREMELY LONG TRAILS without CPU cost
            // This replaces the explicit "12-char loop" which was killing CPU (100+ columns * 12 chars * Blur = Death)
            // By just fading slower, the previous frames persist longer, creating the same visual "long trail" effect for free.
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Switch back to normal drawing
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `bold ${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                const y = drops[i];

                // Simple 1-pass drawing (Head only)
                // The trail is created by the persistence of previous frames!

                // Head (Neon Red)
                ctx.fillStyle = '#ff3333';
                ctx.shadowBlur = 8; // Reduced blur radius for performance
                ctx.shadowColor = '#ff0000';
                ctx.fillText(text, i * dropSize, y * dropSize);

                // No Explicit Trail Loop needed -> O(N) instead of O(N*12)

                if (y * dropSize > canvas.height && Math.random() > 0.985) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        // Start Loop
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
                // FILTER MOVED TO CSS (GPU Accelerated)
                // This gives the "Words go hazy" effect without blocking the JS thread
                filter: 'blur(1.5px)',
                opacity: 0.8, // Slight transparency to blend
            }}
        />
    );
};

export default MatrixRain;
