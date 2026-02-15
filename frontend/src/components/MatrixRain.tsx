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
        const dropSize = 15; // 40% reduction from 24px
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100); // Stagger start

        const draw = () => {
            // "Destination-Out" Blending:
            // Slower fade for maintained trail length
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Switch back to normal drawing for the new characters
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `bold ${dropSize}px monospace`; // Bold for visibility

            for (let i = 0; i < drops.length; i++) {
                // Get characters
                const text = chars[Math.floor(Math.random() * chars.length)];

                const y = drops[i];

                // TRAIL LOGIC: 5-step gradient from Tail (Dim) to Head (Bright)
                // We draw the trail characters explicitly to control the specific "increasing glow" effect requested.

                // 1. The Head (Brightest)
                ctx.fillStyle = '#ff1a1a'; // Neon Red
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0000'; // Max Glow
                ctx.fillText(text, i * dropSize, y * dropSize);

                // 2. The Trail (Previous 4 positions)
                for (let k = 1; k <= 4; k++) {
                    const trailY = y - k;
                    if (trailY > 0) {
                        const trailChar = chars[Math.floor(Math.random() * chars.length)];

                        // Gradient Logic:
                        // k=1 (Immediate behind head): Bright
                        // k=4 (Furthest behind): Dim

                        if (k === 1) {
                            ctx.fillStyle = '#cc0000';
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = '#cc0000';
                        } else if (k === 2) {
                            ctx.fillStyle = '#990000';
                            ctx.shadowBlur = 6;
                            ctx.shadowColor = '#800000';
                        } else if (k === 3) {
                            ctx.fillStyle = '#660000';
                            ctx.shadowBlur = 3;
                            ctx.shadowColor = '#400000';
                        } else {
                            // k=4 (Tail Tip)
                            ctx.fillStyle = '#330000';
                            ctx.shadowBlur = 0; // No glow
                            ctx.shadowColor = 'transparent';
                        }

                        ctx.fillText(trailChar, i * dropSize, trailY * dropSize);
                    }
                }

                // Reset drop or move it down
                if (y * dropSize > canvas.height && Math.random() > 0.985) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        // Speed: 75ms (Keep the slow mechanical feel)
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
