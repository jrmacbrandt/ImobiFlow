import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface ScrollVideoHeroProps {
  frameCount: number;
}

export const ScrollVideoHero: React.FC<ScrollVideoHeroProps> = ({ frameCount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track scroll progress over a specific range (e.g., 300vh for a satisfying scrub)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll progress slightly for a more premium feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Map progress to frame index
  const frameIndex = useTransform(smoothProgress, [0, 1], [0, frameCount - 1]);
  
  // Preload images
  const images = useMemo(() => {
    const imgs: HTMLImageElement[] = [];
    for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.src = `/hero-frames/frame_${i.toString().padStart(3, '0')}.webp`;
        imgs.push(img);
    }
    return imgs;
  }, [frameCount]);

  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
        const promises = images.map(img => {
            return new Promise((resolve) => {
                if (img.complete) resolve(true);
                img.onload = () => resolve(true);
                img.onerror = () => resolve(true); // Don't block everything if one fails
            });
        });
        await Promise.all(promises);
        setImagesLoaded(true);
    };
    loadImages();
  }, [images]);

  // Render to canvas
  useEffect(() => {
    const render = (index: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = images[Math.round(index)];

        if (!canvas || !ctx || !img || !img.complete) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image covering the canvas (cover effect)
        const canvasAspect = canvas.width / canvas.height;
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasAspect > imgAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgAspect;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawWidth = canvas.height * imgAspect;
            drawHeight = canvas.height;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    // Use requestAnimationFrame for smoother updates linked to frameIndex change
    const unsubscribe = frameIndex.on("change", (latest) => {
        render(latest);
    });

    // Initial render
    render(0);

    return () => unsubscribe();
  }, [images, frameIndex]);

  // Responsive canvas sizing
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            // Immediate re-render on resize
            const ctx = canvasRef.current.getContext('2d');
            const img = images[Math.round(frameIndex.get())];
            if (ctx && img && img.complete) {
                // ... reuse drawing logic or just trigger frameIndex change
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [images, frameIndex]);

  // Text Animations based on scroll ranges
  const titleOpacity = useTransform(smoothProgress, [0, 0.2, 0.4], [1, 1, 0]);
  const titleScale = useTransform(smoothProgress, [0, 0.4], [1, 0.8]);
  const transformTitleOpacity = useTransform(smoothProgress, [0, 0.2, 0.9], [0, 1, 1]);
  const transformTitleY = useTransform(smoothProgress, [0, 0.2], [50, 0]);

  return (
    <div ref={containerRef} className="relative h-[300vh] bg-zinc-950">
      {/* Sticky Background Canvas */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover opacity-80 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950/90" />
      </div>

      {/* Content Overlays */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        
        {/* Transformation Milestone Text */}
        <section className="h-[200vh] flex items-center justify-center sticky top-0 pointer-events-none">
            <motion.div 
                style={{ opacity: transformTitleOpacity, y: transformTitleY }}
                className="max-w-6xl mx-auto text-center px-4"
            >
                <h2 className="text-4xl md:text-8xl font-black text-white tracking-tight leading-none uppercase">
                   Não vendemos CASAS. <br />
                   <span className="bg-emerald-500 text-zinc-950 px-6 py-2 inline-block mt-6">Realizamos SONHOS...</span>
                </h2>
            </motion.div>
        </section>

      </div>

      {/* Scroll Indicator */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Role para transformar</span>
         <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-[1px] h-12 bg-emerald-500/50"
         />
      </div>
    </div>
  );
};
