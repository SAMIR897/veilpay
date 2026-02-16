import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        console.log("MatrixRain V3 Active - DropSize: 18, Speed: 50ms, Hazy Trails");

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Matrix characters (Katakana + Latin)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
        const dropSize = 18; // Increased from 15px per "look weird" feedback
        const columns = Math.ceil(canvas.width / dropSize);
        const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -100); // Stagger start

        const draw = () => {
            // "Destination-Out" Blending:
            // Slower fade for maintained background trail length
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Switch back to normal drawing
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `bold ${dropSize}px monospace`; // Bold for visibility

            for (let i = 0; i < drops.length; i++) {
                // Get characters
                const text = chars[Math.floor(Math.random() * chars.length)];

                const y = drops[i];

                // TRAIL LOGIC: 12-step gradient (40% bigger trail)
                // "Hazy" effect: Apply blur to the trail characters

                // 1. The Head (Brightest & Sharpest)
                ctx.filter = 'none'; // Sharp head
                ctx.fillStyle = '#ff3333'; // Neon Red (Brighter)
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ff0000'; // Max Glow
                ctx.fillText(text, i * dropSize, y * dropSize);

                // 2. The Trail (Previous 12 positions)
                // "Words go hazy": We apply blur to the trail
                ctx.filter = 'blur(1px)'; // Hazy effect

                for (let k = 1; k <= 12; k++) {
                    const trailY = y - k;
                    if (trailY > 0) {
                        const trailChar = chars[Math.floor(Math.random() * chars.length)];

                        // Gradient Logic:
                        if (k <= 3) {
                            // Close to head: Bright but Hazy
                            ctx.fillStyle = '#cc0000';
                            ctx.shadowBlur = 8;
                            ctx.shadowColor = '#cc0000';
                        } else if (k <= 7) {
                            // Mid trail: Medium Hazy
                            ctx.fillStyle = '#990000';
                            ctx.shadowBlur = 4;
                            ctx.shadowColor = '#800000';
                        } else {
                            // Tail Tip: Dim & Very Hazy
                            ctx.fillStyle = '#4d0000';
                            ctx.shadowBlur = 0;
                            ctx.shadowColor = 'transparent';
                        }

                        ctx.fillText(trailChar, i * dropSize, trailY * dropSize);
                    }
                }

                // Reset filter for next loop iteration safety? 
                // Context state persists, so we reset 'none' at start of loop for head.

                // Reset drop or move it down
                if (y * dropSize > canvas.height && Math.random() > 0.985) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        // Speed: 50ms (~20fps) - Slightly faster than 13fps to smooth out the haziness
        const interval = setInterval(draw, 50);

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
                // Removed global CSS blur to allow sharp head characters
                // filter: 'blur(0.5px)', 
            }}
        />
    );
};

export default MatrixRain;
