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
            // Pure black to ensure no red tint accumulates
            // Increased alpha to 0.1 to clear trails faster and prevent "red smear" background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${dropSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Current head position
                const headY = drops[i];

                // Draw trail (Head + 4 chars behind)
                // We redraw the column to create the specific glow effect without full clear
                // But simplified for this 2D canvas: we just draw the current char at (i, drops[i])
                // To do a "trail" with specific glow, we need to draw multiple chars per column or rely on the fade.
                // The user wants: "last 3-4 letter should glow in increaseing order"
                // This means we need to explicitly draw the trail chars with different styles.

                // Let's draw the Head and the Trailing 4 chars explicitly
                const text = chars[Math.floor(Math.random() * chars.length)];

                // 1. Draw Head (Brightest White)
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffffff';
                ctx.fillText(text, i * dropSize, headY * dropSize);

                // 2. Draw Trail (3 previous positions)
                // Position: headY - 1 (Bright Red) -> headY - 2 (Medium Red) -> headY - 3 (Dark Red)
                const trailColors = ['#ff0040', '#cc0033', '#990026']; // Bright -> Dark
                const trailShadows = [10, 5, 2]; // High Glow -> Low Glow

                for (let j = 1; j <= 3; j++) {
                    const trailY = headY - j;
                    if (trailY > 0) {
                        const trailChar = chars[Math.floor(Math.random() * chars.length)]; // Random char for trail or keep stable? Random is fine for glitch effect
                        ctx.fillStyle = trailColors[j - 1];
                        ctx.shadowBlur = trailShadows[j - 1];
                        ctx.shadowColor = '#ff0040'; // Red Glow
                        ctx.fillText(trailChar, i * dropSize, trailY * dropSize);
                    }
                }

                // Reset drop or move it down
                if (headY * dropSize > canvas.height && Math.random() > 0.975) {
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
