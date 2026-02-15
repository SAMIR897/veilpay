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
            // Semi-transparent black fade to create trails
            // Increased alpha to 0.15 to aggressively clear previous frames and ensure pitch black bg
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Get characters
                const text = chars[Math.floor(Math.random() * chars.length)];
                const prevText = chars[Math.floor(Math.random() * chars.length)];

                const y = drops[i];

                // 1. Repair the Trail (The spot ABOVE the head was White last frame, make it Red now)
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
            style={{ filter: 'blur(0.5px)' }}
        />
    );
};

export default MatrixRain;
