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
  const frameIndex = useTransform(smoothProgress, [0, 0.7], [0, frameCount - 1], { clamp: true });
  
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

    // Initial render when images are loaded
    if (imagesLoaded) {
        render(frameIndex.get());
    }

    return () => unsubscribe();
  }, [images, frameIndex, imagesLoaded]);

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
                // Re-render handled by being in sync with state or effect
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [images, frameIndex]);

  // Text Animations based on scroll ranges
  const transformTitleOpacity = useTransform(smoothProgress, [0.5, 0.7, 1.0], [0, 1, 1]);
  const transformTitleY = useTransform(smoothProgress, [0.5, 0.7], [20, 0]);

  return (
    <div ref={containerRef} className="relative h-[500vh] bg-zinc-950">
      {/* Sticky Background Canvas */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover opacity-90 transition-all duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
      </div>

      {/* Content Overlays */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        
        {/* Transformation Milestone Text - REPOSITIONED & RESIZED */}
        <section className="sticky top-0 h-screen w-full flex flex-col items-center justify-between py-24 lg:py-40 pointer-events-none z-20">
            {/* Top Text (New) */}
            <motion.div 
                style={{ 
                  opacity: transformTitleOpacity,
                  y: useTransform(smoothProgress, [0.5, 0.7], [-20, 0])
                }}
                className="max-w-6xl mx-auto text-center px-6"
            >
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                   Casas e Apartamentos no <br />
                   <span className="text-emerald-500 italic">Rio, Niterói e Baixada.</span>
                </h1>
            </motion.div>

            {/* Bottom Text (Existing) */}
            <motion.div 
                style={{ opacity: transformTitleOpacity, y: transformTitleY }}
                className="max-w-4xl mx-auto text-center px-6"
            >
                <h2 className="text-xl md:text-3xl font-black text-white tracking-widest leading-none uppercase drop-shadow-xl">
                   Não vendemos CASAS. <br />
                   <span className="bg-emerald-500 text-zinc-950 px-4 py-2 inline-block mt-4 shadow-xl">Realizamos SONHOS...</span>
                </h2>
            </motion.div>
        </section>

      </div>
    </div>
  );
};
