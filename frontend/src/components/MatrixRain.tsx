import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters (Katakana + Latin)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
        const dropSize = 14;
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100); // Stagger start

        const draw = () => {
            // "Destination-Out" Blending:
            // Instead of drawing a black rectangle (which covers the background image),
            // we use this mode to "erase" the previous frame's pixels, making them transparent.
            // This reveals the CSS background-image behind the canvas.
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Control fade speed (higher = faster fade)
            ctx.fillRect(0, 0, canvas.width, canvas.height); // Clears the canvas slowly

            // Switch back to normal drawing for the new characters
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Get characters
                const text = chars[Math.floor(Math.random() * chars.length)];
                const prevText = chars[Math.floor(Math.random() * chars.length)];

                const y = drops[i];

                // 1. Repair the Trail (The spot ABOVE the head)
                if (y > 0) {
                    ctx.fillStyle = '#f43f5e'; // Rose-500
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#be123c'; // Rose-700 glow
                    ctx.fillText(prevText, i * dropSize, (y - 1) * dropSize);
                }

                // 2. Draw the Head (New sparkling Leading Edge)
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#ffffff'; // White glow
                ctx.fillText(text, i * dropSize, y * dropSize);

                // Reset drop or move it down
                if (y * dropSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 33); // ~30 FPS

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
                filter: 'blur(0.5px)',
                // No background color here! We want transparency to see the CSS background.
            }}
        />
    );
};

export default MatrixRain;
