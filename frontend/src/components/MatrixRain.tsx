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
        const dropSize = 24;
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100); // Stagger start

        const draw = () => {
            // "Destination-Out" Blending:
            // Very slow fade (0.03) for Extremely Long Trails
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Switch back to normal drawing for the new characters
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `bold ${dropSize}px monospace`; // Bold for visibility

            for (let i = 0; i < drops.length; i++) {
                // Get characters
                const text = chars[Math.floor(Math.random() * chars.length)];
                const prevText = chars[Math.floor(Math.random() * chars.length)];

                const y = drops[i];

                // 1. Repair the Trail (The spot ABOVE the head)
                if (y > 0) {
                    ctx.fillStyle = '#990000'; // Blood Red (Darker)
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#4a0000'; // Dark Glow
                    ctx.fillText(prevText, i * dropSize, (y - 1) * dropSize);
                }

                // 2. Draw the Head (Leading Edge)
                // Removed White entirely. Used Bright Neon Red for Skynet look.
                ctx.fillStyle = '#ff1a1a'; // Neon Red
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0000'; // Bright Red Glow
                ctx.fillText(text, i * dropSize, y * dropSize);

                // Reset drop or move it down
                if (y * dropSize > canvas.height && Math.random() > 0.985) { // 0.985 = fewer drops respawning at once
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        // Aggressively Slow Speed (75ms = ~13fps)
        const interval = setInterval(draw, 75);

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
            }}
        />
    );
};

export default MatrixRain;
