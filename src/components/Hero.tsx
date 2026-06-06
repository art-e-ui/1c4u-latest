import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Elevate Your Everyday <br />
            <span className="text-indigo-600">Essentials</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Experience the perfect blend of style and functionality. Discover our latest collection curated for the modern minimalist.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all flex items-center gap-2">
              Shop Now <ArrowRight size={18} />
            </button>
            <button className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors">
              View Collection <span aria-hidden="true">→</span>
            </button>
          </div>
        </motion.div>

        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
          <div
            className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
