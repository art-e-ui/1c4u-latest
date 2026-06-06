import { ShoppingCart, Search, User, Menu } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-bottom border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <span className="text-xl font-bold tracking-tight text-gray-900 cursor-pointer">
              QUICK<span className="text-indigo-600">SHOP</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-indigo-600 transition-colors">Shop</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Categories</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Deals</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Support</a>
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-indigo-600 transition-colors">
              <Search size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:text-indigo-600 transition-colors">
              <User size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:text-indigo-600 transition-colors relative">
              <ShoppingCart size={20} />
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                2
              </span>
            </button>
            <button className="p-2 md:hidden text-gray-500 hover:text-indigo-600 transition-colors">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
