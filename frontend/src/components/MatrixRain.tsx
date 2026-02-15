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
            // Using a very slight red tint in the fade for atmosphere
            ctx.fillStyle = 'rgba(15, 3, 5, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Random char
                const text = chars[Math.floor(Math.random() * chars.length)];

                // Color: Red Matrix Shower
                // Head of the drop is bright, trail is darker
                const isHead = Math.random() > 0.95;
                if (isHead) {
                    ctx.fillStyle = '#fff'; // White tip for sparkle
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#fff';
                } else {
                    ctx.fillStyle = '#be123c'; // Rose-700 Red
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#f43f5e'; // Rose-500 Glow
                }

                ctx.fillText(text, i * dropSize, drops[i] * dropSize);

                // Reset drop or move it down
                if (drops[i] * dropSize > canvas.height && Math.random() > 0.975) {
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
            className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen"
            style={{ filter: 'blur(0.5px)' }}
        />
    );
};

export default MatrixRain;
